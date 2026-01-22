import { tickets as ticketsEdgeAPI } from "@/lib/edge/client";
import { supabase } from "@/lib/supabase/client";

/**
 * Fetch user's tickets (event IDs only) - ACTIVE tickets only
 */
export async function fetchUserTickets(): Promise<string[]> {
  try {
    console.log(
      "🎫 Fetching ACTIVE tickets via direct database query (RLS handled)...",
    );

    // Get the current user session (using RLS for security)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("⚠️ No user found, cannot fetch tickets.");
      return [];
    }

    // Fetch ONLY ACTIVE tickets from the database using RLS
    const { data, error } = await supabase
      .from("tickets")
      .select("event_id")
      .eq("user_id", user.id)
      .eq("status", "active"); // ✅ CRITICAL: Filter cancelled tickets

    if (error) throw error;

    const eventIds = data.map((ticket) => ticket.event_id);

    console.log("✅ ACTIVE tickets loaded via database:", eventIds.length);
    return eventIds;
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return [];
  }
}

/**
 * Check if user has a ticket for a specific event
 */
export async function hasTicketForEvent(eventId: string): Promise<boolean> {
  try {
    // Always fetch fresh tickets (no more cache issues!)
    console.log("🎫 Fetching fresh tickets for hasTicket check");
    const eventIds = await fetchUserTickets();
    return eventIds.includes(eventId);
  } catch (error) {
    console.error("Error checking ticket:", error);
    return false;
  }
}

/**
 * Purchase a ticket (calls edge function)
 */
export async function purchaseTicket(
  eventId: string,
  amount: number,
  paymentIntentId?: string,
  isDemoMode: boolean = false,
) {
  return await ticketsEdgeAPI.purchaseTicket(
    eventId,
    amount,
    paymentIntentId,
    isDemoMode,
  );
}

/**
 * Create a Stripe Payment Intent
 */
export async function createPaymentIntent(eventId: string, amount: number) {
  return await ticketsEdgeAPI.createPaymentIntent(eventId, amount);
}

/**
 * Cancel a ticket (with refund if applicable)
 */
export async function cancelTicket(ticketId: string) {
  return await ticketsEdgeAPI.cancelTicket(ticketId);
}

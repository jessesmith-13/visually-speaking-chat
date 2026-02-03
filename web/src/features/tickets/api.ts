import { tickets as ticketsEdgeAPI } from "@/lib/edge/client";
import { supabase } from "@/lib/supabase/client";
import type { Ticket } from "./types";

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

/**
 * Get detailed ticket information with event details for the current user
 */
export interface TicketWithEvent extends Ticket {
  events: {
    id: string;
    name: string;
    date: string;
    event_type: "virtual" | "in-person";
    venue_name?: string;
    venue_address?: string;
  };
}

export async function getMyTicketsWithDetails(): Promise<TicketWithEvent[]> {
  try {
    console.log("🎫 Fetching tickets with event details...");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("⚠️ No user found, cannot fetch tickets.");
      return [];
    }

    const { data, error } = await supabase
      .from("tickets")
      .select(
        `
        id,
        user_id,
        event_id,
        status,
        purchased_at,
        check_in_count,
        last_checked_in_at,
        events!inner (
          id,
          name,
          date,
          event_type,
          venue_name,
          venue_address,
          status
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .neq("events.status", "cancelled") // Filter out cancelled events
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching tickets:", error);
      throw error;
    }

    console.log("✅ Tickets with details loaded:", data?.length || 0);

    // Transform the data to match our TicketWithEvent type
    // Supabase returns events as an array, but we need a single object
    const transformedData = (data || []).map((ticket) => ({
      ...ticket,
      events: Array.isArray(ticket.events) ? ticket.events[0] : ticket.events,
    })) as TicketWithEvent[];

    return transformedData;
  } catch (error) {
    console.error("Error fetching tickets with details:", error);
    return [];
  }
}

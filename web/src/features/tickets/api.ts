import { tickets as ticketsEdgeAPI } from '@/lib/edge/client';
import { supabase } from '@/lib/supabase/client';

// Cache for tickets - avoid re-fetching on every hasTicket call
const ticketsCache: { eventIds: string[], timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Fetch user's tickets (event IDs only) via Edge Function
 */
export async function fetchUserTickets(): Promise<string[]> { // Parameter removed
  try {
    console.log('🎫 Fetching tickets via direct database query (RLS handled)...');
    
    // Get the current user session (using RLS for security)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('⚠️ No user found, cannot fetch tickets.');
      return [];
    }
    
    // Fetch from the database using RLS (no explicit token needed here)
    const { data, error } = await supabase
      .from('tickets')
      .select('event_id')
      .eq('user_id', user.id); // Ensure your column is named 'user_id'

    if (error) throw error;
    
    const eventIds = data.map((ticket) => ticket.event_id);
    
    // Update cache (if you use it)
    // ticketsCache = { eventIds, timestamp: Date.now() };

    console.log('✅ Tickets loaded via database:', eventIds.length);
    return eventIds;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
}

/**
 * Check if user has a ticket for a specific event
 * Uses cached tickets if available (avoids extra API calls)
 */
export async function hasTicketForEvent(eventId: string): Promise<boolean> {
  try {
    // Use cache if fresh (< 30 seconds old)
    if (ticketsCache && (Date.now() - ticketsCache.timestamp) < CACHE_DURATION) {
      console.log('🎫 Using cached tickets for hasTicket check');
      return ticketsCache.eventIds.includes(eventId);
    }

    // Otherwise fetch fresh tickets
    console.log('🎫 Fetching fresh tickets for hasTicket check');
    const eventIds = await fetchUserTickets();
    return eventIds.includes(eventId);
  } catch (error) {
    console.error('Error checking ticket:', error);
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
  isDemoMode: boolean = false
) {
  return await ticketsEdgeAPI.purchaseTicket(eventId, amount, paymentIntentId, isDemoMode);
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
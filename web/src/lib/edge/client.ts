/**
 * Edge Functions Client
 *
 * Helper utilities for calling Supabase Edge Functions
 * Use these instead of direct REST API calls with service role keys
 */

import { supabase, supabaseUrl } from "@/lib/supabase/client";
import { Event } from "@/features/events/types";
import { Ticket } from "@/features/tickets/types";
import { UserProfile } from "@/features/admin/types";

const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

// ============================================
// TYPES
// ============================================

interface EventUpdate {
  id: string;
  event_id: string;
  title: string;
  message: string;
  created_at: string;
}

interface EventParticipant {
  user_id: string;
  user_email: string;
  user_name: string;
  ticket_id: string;
  purchased_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface CreateEventData {
  name: string;
  description: string;
  date: string;
  duration: number;
  price: number;
  capacity: number;
  imageUrl: string;
}

interface UpdateEventData {
  name?: string;
  description?: string;
  date?: string;
  duration?: number;
  price?: number;
  capacity?: number;
  imageUrl?: string;
}

// One in-flight promise per request signature
const inFlight = new Map<string, Promise<unknown>>();

// Export for testing purposes (to clear cache between tests)
export function clearRequestCache(): void {
  inFlight.clear();
}

function stableKey(input: {
  fn: string;
  path: string;
  method: string;
  requireAuth: boolean;
  body?: unknown;
}) {
  // Body could be object; stringify consistently
  const bodyKey = input.body ? JSON.stringify(input.body) : "";
  return `${input.method}:${input.fn}:${input.path}:${input.requireAuth ? "auth" : "public"}:${bodyKey}`;
}

// ============================================
// HELPER: Call Edge Function
// ============================================

interface EdgeFunctionOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean; // default true
  dedupe?: boolean; // default true
}

async function callEdgeFunction<T>(
  functionName: string,
  path: string = "",
  options: EdgeFunctionOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    requireAuth = true,
    dedupe = true,
  } = options;

  const key = stableKey({ fn: functionName, path, method, requireAuth, body });

  // ✅ DEDUPE: if the same request is already running, reuse it
  if (dedupe && inFlight.has(key)) {
    return inFlight.get(key)! as Promise<T>;
  }

  const promise = (async () => {
    // Get auth token only if required
    let token: string | undefined;

    if (requireAuth) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token;

      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }
    }

    const url = `${FUNCTIONS_URL}/${functionName}${path}`;

    console.log(
      `📡 Calling Edge Function: ${method} ${url}${requireAuth ? " (authenticated)" : " (public)"}`,
    );

    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (token) {
      fetchHeaders["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Edge Function response:`, data);
    return data as T;
  })();

  if (dedupe) {
    inFlight.set(key, promise);
    // Remove from cache when settled (success or failure)
    // Catch errors here to prevent unhandled rejection warnings in tests
    promise
      .catch(() => {
        /* errors will be handled by caller */
      })
      .finally(() => inFlight.delete(key));
  }

  return promise;
}

// ============================================
// ADMIN OPERATIONS
// ============================================

export const adminOperations = {
  /**
   * Fetch all users (admin only)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    const result = await callEdgeFunction<{ users: UserProfile[] }>(
      "admin-operations",
      "/users",
    );
    return result.users;
  },

  /**
   * Update user admin status (admin only)
   */
  async updateAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    await callEdgeFunction("admin-operations", `/users/${userId}/admin`, {
      method: "PUT",
      body: { isAdmin },
    });
  },

  /**
   * Create a new event (admin only)
   */
  async createEvent(eventData: CreateEventData): Promise<Event> {
    const result = await callEdgeFunction<{ event: Event }>(
      "admin-operations",
      "/events",
      {
        method: "POST",
        body: eventData,
      },
    );
    return result.event;
  },

  /**
   * Update an event (admin only)
   */
  async updateEvent(
    eventId: string,
    eventData: UpdateEventData,
  ): Promise<Event> {
    const result = await callEdgeFunction<{ event: Event }>(
      "admin-operations",
      `/events/${eventId}`,
      {
        method: "PUT",
        body: eventData,
      },
    );
    return result.event;
  },

  /**
   * Cancel an event (admin only)
   */
  async cancelEvent(eventId: string): Promise<void> {
    await callEdgeFunction("admin-operations", `/events/${eventId}/cancel`, {
      method: "DELETE",
    });
  },

  /**
   * Post an event update (admin only)
   */
  async postEventUpdate(
    eventId: string,
    title: string,
    message: string,
  ): Promise<EventUpdate> {
    const result = await callEdgeFunction<{ update: EventUpdate }>(
      "admin-operations",
      `/events/${eventId}/updates`,
      {
        method: "POST",
        body: { title, message },
      },
    );
    return result.update;
  },

  /**
   * Get all updates for an event (PUBLIC - anyone can view)
   */
  async getEventUpdates(eventId: string): Promise<EventUpdate[]> {
    const result = await callEdgeFunction<{ updates: EventUpdate[] }>(
      "admin-operations",
      `/events/${eventId}/updates`,
      { requireAuth: false }, // ← Add this to make it public
    );
    return result.updates;
  },

  /**
   * Get all participants for an event (admin only)
   */
  async getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    const result = await callEdgeFunction<{ participants: EventParticipant[] }>(
      "admin-operations",
      `/events/${eventId}/participants`,
    );
    return result.participants;
  },
};

// ============================================
// TICKETS
// ============================================

export const tickets = {
  /**
   * Create a Stripe Checkout Session
   */
  async createPaymentIntent(
    eventId: string,
    amount: number,
    promoCodeId?: string,
  ): Promise<{
    sessionId: string;
    checkoutUrl: string;
  }> {
    return await callEdgeFunction("tickets", "/create-payment-intent", {
      method: "POST",
      body: { eventId, amount, promoCodeId },
    });
  },

  /**
   * Complete ticket purchase (with or without Stripe)
   */
  async purchaseTicket(
    eventId: string,
    amount: number,
    paymentIntentId?: string,
    isDemoMode: boolean = false,
  ): Promise<Ticket> {
    const result = await callEdgeFunction<{ ticket: Ticket }>(
      "tickets",
      "/purchase",
      {
        method: "POST",
        body: {
          eventId,
          amount,
          paymentIntentId,
          isDemoMode,
        },
      },
    );
    return result.ticket;
  },

  /**
   * Cancel a ticket (with refund if applicable)
   */
  async cancelTicket(ticketId: string): Promise<{ refunded: boolean }> {
    const result = await callEdgeFunction<{ refunded: boolean }>(
      "tickets",
      `/${ticketId}/cancel`,
      {
        method: "DELETE",
      },
    );
    return result;
  },

  /**
   * Get all tickets for current user
   */
  async getMyTickets(): Promise<Ticket[]> {
    const { data, error } = await supabase.functions.invoke<{
      tickets: Ticket[];
    }>("tickets", {
      method: "GET",
      headers: {
        // 👇 This tells your server-side router which internal route to use:
        "x-path": "/my-tickets",
      },
    });

    if (error) {
      console.error("Error fetching tickets via invoke:", error);
      throw new Error(error.message || "Failed to fetch tickets");
    }

    if (!data) {
      throw new Error("Did not receive data from the Edge Function.");
    }

    return data.tickets;
  },
};

// ============================================
// MATCHMAKING
// ============================================

export const matchmaking = {
  /**
   * Join matchmaking queue for an event
   */
  async joinQueue(eventId: string): Promise<{
    status: string;
    matched: boolean;
    roomId?: string;
  }> {
    return await callEdgeFunction("matchmaking", "/join", {
      method: "POST",
      body: { eventId },
    });
  },

  /**
   * Leave matchmaking queue
   */
  async leaveQueue(eventId: string): Promise<void> {
    await callEdgeFunction("matchmaking", "/leave", {
      method: "POST",
      body: { eventId },
    });
  },

  /**
   * Get current matchmaking status
   */
  async getStatus(eventId: string): Promise<{
    status: "waiting" | "matched" | "not_in_queue";
    roomId?: string;
  }> {
    return await callEdgeFunction("matchmaking", `/status?eventId=${eventId}`);
  },

  /**
   * Request next match (after current session ends)
   */
  async requestNextMatch(eventId: string): Promise<{
    matched: boolean;
    roomId?: string;
  }> {
    return await callEdgeFunction("matchmaking", "/next-match", {
      method: "POST",
      body: { eventId },
    });
  },

  /**
   * Manually trigger matching (admin/internal use)
   */
  async triggerMatching(eventId: string): Promise<{
    matched: boolean;
    roomId?: string;
    users?: string[];
  }> {
    return await callEdgeFunction("matchmaking", "/match-users", {
      method: "POST",
      body: { eventId },
    });
  },

  /**
   * Subscribe to matchmaking status changes
   * Real-time subscription using Supabase Realtime
   */
  subscribeToMatchmaking(
    eventId: string,
    userId: string,
    callback: (status: {
      is_matched: boolean;
      current_room_id: string | null;
    }) => void,
  ): () => void {
    const channel = supabase
      .channel(`matchmaking:${eventId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matchmaking_queue",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("📡 Matchmaking update:", payload);
          callback(
            payload.new as {
              is_matched: boolean;
              current_room_id: string | null;
            },
          );
        },
      )
      .subscribe();

    // 🔥 FIX: Wrap cleanup in try-catch to silence WebSocket errors
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Ignore WebSocket cleanup errors (happens during navigation)
        console.log("⚠️ Subscription cleanup (expected during navigation)");
      }
    };
  },
};

// ============================================
// EMAIL
// ============================================

export const email = {
  /**
   * Send email via Resend
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    message: string,
  ): Promise<{
    emailsSent: number;
    failed?: number;
    errors?: string[];
    message?: string;
  }> {
    const result = await callEdgeFunction<{
      emailsSent: number;
      failed?: number;
      errors?: string[];
      message?: string;
    }>("send-email", "", {
      method: "POST",
      body: { to, subject, message },
    });
    return result;
  },
};

export { callEdgeFunction };

import { callEdgeFunction } from "@/lib/edge/client";
import { supabase } from "@/lib/supabase/client";
import { UserProfile } from "./types";

interface TicketDetails {
  id: string;
  event_id: string;
  user_id: string;
  check_in_count: number;
  last_checked_in_at: string | null;
  events: {
    name: string;
    date: string;
    event_type: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

interface TicketVerificationResponse {
  success: boolean;
  ticket: {
    id: string;
    user_id: string;
    event_id: string;
    status: string;
    check_in_count: number;
    last_checked_in_at: string;
  };
  message: string;
}

/**
 * Fetch all users (admin only)
 * This calls the secure admin-operations Edge Function.
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    // The callEdgeFunction helper automatically attaches the user's JWT.
    // The backend (Edge Function) handles the admin key securely.
    const result = await callEdgeFunction<{ users: UserProfile[] }>(
      "admin-operations",
      "/users",
      {
        method: "GET",
      },
    );

    return result.users || [];
  } catch (error: unknown) {
    // Handle AbortError gracefully (standard client-side error handling)
    const err = error as { message?: string; name?: string; code?: number };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError" ||
      err.code === 20
    ) {
      console.log("⚠️ Fetch users aborted (component unmounted)");
      return [];
    }
    throw error;
  }
}

/**
 * Toggle admin status for a user (admin only)
 * This calls the secure admin-operations Edge Function.
 */
export async function toggleAdminStatus(
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  try {
    // The callEdgeFunction helper automatically attaches the user's JWT.
    // The body matches the expected input of your backend Edge Function handler.
    await callEdgeFunction("admin-operations", `/users/${userId}/admin`, {
      method: "PUT",
      body: { isAdmin },
    });
  } catch (error: unknown) {
    // Handle AbortError gracefully
    const err = error as { message?: string; name?: string; code?: number };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError" ||
      err.code === 20
    ) {
      console.log("⚠️ Toggle admin aborted (component unmounted)");
      throw new Error("Request aborted");
    }
    throw error;
  }
}

/**
 * Send email via edge function (admin only)
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  message: string,
): Promise<{ emailsSent: number }> {
  const result = await callEdgeFunction<{ emailsSent: number }>(
    "send-email",
    "",
    {
      method: "POST",
      body: { to, subject, message },
    },
  );
  return result;
}

/**
 * Get ticket details with event and user info (admin only)
 */
export async function getTicketDetails(
  ticketId: string,
): Promise<TicketDetails> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id,
      event_id,
      user_id,
      check_in_count,
      last_checked_in_at,
      events (
        name,
        date,
        event_type
      ),
      profiles (
        full_name,
        email
      )
    `,
    )
    .eq("id", ticketId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Ticket not found");
  }

  // Supabase returns events/profiles as arrays, so we need to transform
  const rawData = data as unknown as {
    id: string;
    event_id: string;
    user_id: string;
    check_in_count: number;
    last_checked_in_at: string | null;
    events: { name: string; date: string; event_type: string }[];
    profiles: { full_name: string; email: string }[];
  };

  return {
    id: rawData.id,
    event_id: rawData.event_id,
    user_id: rawData.user_id,
    check_in_count: rawData.check_in_count,
    last_checked_in_at: rawData.last_checked_in_at,
    events: Array.isArray(rawData.events) ? rawData.events[0] : rawData.events,
    profiles: Array.isArray(rawData.profiles)
      ? rawData.profiles[0]
      : rawData.profiles,
  };
}

/**
 * Verify and check in a ticket (admin only)
 */
export async function verifyAndCheckInTicket(
  ticketId: string,
): Promise<TicketVerificationResponse> {
  const { data, error } =
    await supabase.functions.invoke<TicketVerificationResponse>(
      "tickets/verify",
      {
        body: { ticketId },
        method: "POST",
      },
    );

  if (error || !data) {
    throw new Error(error?.message || "Failed to verify ticket");
  }

  return data;
}

// Export types for use in components
export type { TicketDetails, TicketVerificationResponse };

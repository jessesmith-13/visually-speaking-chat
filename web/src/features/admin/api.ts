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
  // Call Edge Function with admin privileges instead of direct DB query
  try {
    const result = await callEdgeFunction<{ ticket: TicketDetails }>(
      "admin-operations",
      `/tickets/${ticketId}`,
      {
        method: "GET",
      },
    );

    return result.ticket;
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string; code?: number };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError" ||
      err.code === 20
    ) {
      console.log("⚠️ Fetch ticket aborted (component unmounted)");
      throw new Error("Request aborted");
    }
    throw error;
  }
}

/**
 * Verify and check in a ticket (admin only)
 */
export async function verifyAndCheckInTicket(
  ticketId: string,
): Promise<TicketVerificationResponse> {
  const { data, error } = await supabase.functions.invoke<
    TicketVerificationResponse | { error: string }
  >("tickets/verify", {
    body: { ticketId },
    method: "POST",
  });

  // Handle network/invocation errors
  if (error) {
    const errorMessage = error.message || "Failed to verify ticket";
    console.error("❌ Ticket verification error:", errorMessage);
    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error("No response from ticket verification");
  }

  // Handle HTTP error responses (400, 404, etc.) - these come in data.error
  if ("error" in data && data.error) {
    console.error("❌ Ticket verification failed:", data.error);
    throw new Error(data.error);
  }

  // Handle success response with error flag
  if ("success" in data && !data.success && data.message) {
    throw new Error(data.message);
  }

  return data as TicketVerificationResponse;
}

// Export types for use in components
export type { TicketDetails, TicketVerificationResponse };

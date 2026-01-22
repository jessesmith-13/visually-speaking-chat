import { supabase } from "@/lib/supabase/client";
import { fetchUserTickets } from "@/features/tickets/api";
import { User } from "./types";
import { User as AuthUser } from "@supabase/supabase-js";

// Type for the database profile row
interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin: boolean | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch user profile from the database
 * Uses direct Supabase client for reads (per our architecture)
 */
export async function fetchUserProfile(
  authUser: AuthUser,
): Promise<User | null> {
  try {
    console.log("🔵 [PROFILE] Starting fetchUserProfile...");

    if (!authUser) {
      console.log("❌ [PROFILE] No auth user found");
      return null;
    }

    console.log("✅ [PROFILE] Auth user:", authUser.email, "ID:", authUser.id);

    // NO SESSION VALIDATION NEEDED - authUser is proof of authentication
    // We're being called from an auth state change callback where session is already validated

    // Fetch profile with timeout protection
    console.log("🔵 [PROFILE] Fetching profile from database...");

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.log("⏰ [PROFILE] TIMEOUT HIT - 10 seconds elapsed!");
        reject(new Error("Profile query timeout"));
      }, 10000);
    });

    // Race the query against the timeout
    const queryPromise = supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single<ProfileRow>();

    console.log("🔵 [PROFILE] Starting database query...");
    let profile: ProfileRow | null;
    let error;

    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      console.log("🔵 [PROFILE] Query completed");
      profile = result.data;
      error = result.error;
    } catch (err) {
      console.error("❌ [PROFILE] Query failed or timed out:", err);
      return null;
    }

    if (error) {
      console.log("🔵 [PROFILE] Error code:", error.code);
      // If profile doesn't exist, create a basic user object
      if (error.code === "PGRST116") {
        console.log("⚠️ Profile not found, creating basic user object");

        try {
          const tickets = await fetchUserTickets();
          return {
            id: authUser.id,
            name: authUser.email?.split("@")[0] || "User",
            email: authUser.email || "",
            purchasedTickets: tickets,
            isAdmin: false,
          };
        } catch (ticketError) {
          console.error("❌ Error fetching tickets:", ticketError);
          return {
            id: authUser.id,
            name: authUser.email?.split("@")[0] || "User",
            email: authUser.email || "",
            purchasedTickets: [],
            isAdmin: false,
          };
        }
      }

      console.error("❌ Error fetching profile:", error);
      return null;
    }

    console.log("✅ Profile found:", profile);

    // Guard against null profile
    if (!profile) {
      console.error("❌ [PROFILE] Profile is null despite no error");
      return null;
    }

    // Fetch user's tickets
    console.log("🔵 [PROFILE] Fetching user tickets...");
    try {
      const tickets = await fetchUserTickets();
      console.log("✅ Tickets loaded:", tickets.length);

      return {
        id: profile.id,
        name: profile.full_name || profile.email || "User",
        email: profile.email || authUser.email || "",
        purchasedTickets: tickets,
        isAdmin: profile.is_admin || false,
      };
    } catch (ticketError) {
      console.error("❌ Error fetching tickets:", ticketError);
      return {
        id: profile.id,
        name: profile.full_name || profile.email || "User",
        email: profile.email || authUser.email || "",
        purchasedTickets: [],
        isAdmin: profile.is_admin || false,
      };
    }
  } catch (error) {
    console.error("❌ Unexpected error in fetchUserProfile:", error);
    return null;
  }
}

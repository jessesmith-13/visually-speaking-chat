import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase/client";
import { env } from "@/lib/env";

// Use environment variable for Stripe publishable key
// Export this for use in Stripe Elements/payment forms
export const STRIPE_PUBLISHABLE_KEY =
  env.stripe.publishableKey || "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE";

export interface CreatePaymentIntentRequest {
  eventId: string;
  amount: number;
  userId: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

/**
 * Create a Stripe Payment Intent
 *
 * Calls the Supabase Edge Function to securely create a payment intent.
 * The Edge Function uses the Stripe secret key server-side.
 */
export async function createPaymentIntent(
  request: CreatePaymentIntentRequest,
): Promise<CreatePaymentIntentResponse> {
  try {
    // Get current session for authorization
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Not authenticated");
    }

    // Call the Edge Function - Supabase client automatically adds auth header
    const { data, error } = await supabase.functions.invoke(
      "stripe-create-payment-intent",
      {
        body: {
          eventId: request.eventId,
          amount: request.amount,
        },
      },
    );

    if (error) {
      console.error("Error calling stripe-create-payment-intent:", error);
      throw new Error(error.message || "Failed to create payment intent");
    }

    return {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating payment intent:", errorMessage);
    throw error;
  }
}

/**
 * Purchase a ticket with Stripe payment
 *
 * @param eventId - The event ID
 * @param amount - The ticket price
 * @param paymentIntentId - The Stripe Payment Intent ID (from successful payment)
 */
export async function purchaseTicketWithStripe(
  eventId: string,
  amount: number,
  paymentIntentId: string,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Insert the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        user_id: user.id,
        event_id: eventId,
        payment_amount: amount,
        stripe_payment_intent_id: paymentIntentId,
        status: "active",
      })
      .select()
      .single();

    if (ticketError) {
      // Check for AbortError
      if (
        ticketError.message?.includes("AbortError") ||
        ticketError.message?.includes("aborted")
      ) {
        console.log("⚠️ Ticket purchase aborted (component unmounted)");
        throw new Error("Request aborted");
      }
      console.error("Error creating ticket:", ticketError);
      throw ticketError;
    }

    // Update the event's attendees count
    console.log("📈 Incrementing event attendees count...");

    // Get current attendees count and update
    const { data: eventData, error: fetchError } = await supabase
      .from("events")
      .select("attendees")
      .eq("id", eventId)
      .single();

    if (!fetchError && eventData) {
      const newCount = (eventData.attendees || 0) + 1;
      const { error: updateError } = await supabase
        .from("events")
        .update({ attendees: newCount })
        .eq("id", eventId);

      if (updateError) {
        console.error("❌ Error updating attendees:", updateError);
        // Don't throw - ticket was created successfully
      } else {
        console.log("✅ Attendees count updated successfully to", newCount);
      }
    }

    // Try to record the payment (optional - don't fail if table doesn't exist)
    try {
      await supabase.from("stripe_payments").insert({
        user_id: user.id,
        event_id: eventId,
        stripe_payment_intent_id: paymentIntentId,
        amount: amount,
        currency: "usd",
        status: "succeeded",
      });
      console.log("✅ Payment recorded in stripe_payments table");
    } catch (error: unknown) {
      // Check for AbortError
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("AbortError") ||
        errorMessage.includes("aborted")
      ) {
        console.log("⚠️ Payment record aborted (component unmounted)");
      } else {
        console.warn(
          "⚠️ Could not record payment (table may not exist):",
          error,
        );
      }
      // Don't throw - ticket was created successfully
    }

    return ticket;
  } catch (error: unknown) {
    // Handle AbortError
    const errorMessage = error instanceof Error ? error.message : "";
    const errorName = error instanceof Error ? error.name : "";
    if (
      errorMessage.includes("AbortError") ||
      errorMessage.includes("aborted") ||
      errorName === "AbortError"
    ) {
      console.log("⚠️ Purchase aborted (component unmounted)");
      throw new Error("Request aborted");
    }
    throw error;
  }
}

/**
 * Demo function for testing without real Stripe
 * This simulates a successful ticket purchase
 */
export async function purchaseTicketDemo(eventId: string, amount: number) {
  try {
    console.warn("⚠️ DEMO MODE: Purchasing ticket without real payment");
    console.log("💤 Simulating payment delay...");

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("👤 Getting user...");
    console.log("🔐 Checking session first...");
    console.log("🌐 Supabase URL:", supabaseUrl);
    console.log("🔑 Has anon key:", supabaseAnonKey ? "Yes" : "No");

    // Add timeout to prevent infinite hanging
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Session check timed out after 10 seconds")),
        10000,
      ),
    );

    console.log("⏳ Waiting for session (10s timeout)...");
    const result = await Promise.race([sessionPromise, timeoutPromise]);

    const { data: sessionData, error: sessionError } = result;

    console.log("📝 Session data:", sessionData);
    console.log("❓ Session error:", sessionError);

    if (sessionError) {
      console.error("❌ Session error:", sessionError);
      throw new Error("Session error: " + sessionError.message);
    }

    if (!sessionData?.session) {
      console.error("❌ No active session found");
      throw new Error("No active session. Please log in again.");
    }

    console.log("✅ Session found, getting user details...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("✅ User found:", user.id);

    console.log("🔍 Checking for existing tickets...");
    // Check if user already has a ticket for this event
    const { data: existingTickets, error: checkError } = await supabase
      .from("tickets")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", eventId)
      .eq("status", "active");

    if (checkError) {
      console.error("❌ Error checking tickets:", checkError);
      if (
        checkError.message?.includes("AbortError") ||
        checkError.message?.includes("aborted")
      ) {
        console.log("⚠️ Ticket check aborted (component unmounted)");
        throw new Error("Request aborted");
      }
    }

    console.log("📊 Existing tickets:", existingTickets);

    // If ticket already exists, throw error
    if (existingTickets && existingTickets.length > 0) {
      console.log("⚠️ User already has ticket");
      throw new Error("You already have a ticket for this event");
    }

    const demoPaymentIntentId = "pi_demo_" + Date.now();

    console.log("💾 Inserting ticket into database...");
    // Insert the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        user_id: user.id,
        event_id: eventId,
        payment_amount: amount,
        stripe_payment_intent_id: demoPaymentIntentId,
        status: "active",
      })
      .select()
      .single();

    if (ticketError) {
      console.error("❌ Ticket insert error:", ticketError);
      // Check for AbortError
      if (
        ticketError.message?.includes("AbortError") ||
        ticketError.message?.includes("aborted")
      ) {
        console.log("⚠️ Demo ticket purchase aborted (component unmounted)");
        throw new Error("Request aborted");
      }

      // Check for duplicate key error
      if (ticketError.code === "23505") {
        // Postgres unique violation code
        throw new Error("You already have a ticket for this event");
      }

      throw ticketError;
    }

    console.log("✅ Ticket inserted successfully:", ticket);

    // Update the event's attendees count
    console.log("📈 Incrementing event attendees count...");

    // Get current attendees count and update
    const { data: eventData, error: fetchError } = await supabase
      .from("events")
      .select("attendees")
      .eq("id", eventId)
      .single();

    if (!fetchError && eventData) {
      const newCount = (eventData.attendees || 0) + 1;
      const { error: updateError } = await supabase
        .from("events")
        .update({ attendees: newCount })
        .eq("id", eventId);

      if (updateError) {
        console.error("❌ Error updating attendees:", updateError);
        // Don't throw - ticket was created successfully
      } else {
        console.log("✅ Attendees count updated successfully to", newCount);
      }
    }

    // Try to record the payment (optional - don't fail if table doesn't exist)
    try {
      await supabase.from("stripe_payments").insert({
        user_id: user.id,
        event_id: eventId,
        stripe_payment_intent_id: demoPaymentIntentId,
        amount: amount,
        currency: "usd",
        status: "succeeded",
      });
      console.log("✅ Payment recorded in stripe_payments table");
    } catch (error: unknown) {
      // Check for AbortError
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("AbortError") ||
        errorMessage.includes("aborted")
      ) {
        console.log("⚠️ Payment record aborted (component unmounted)");
      } else {
        console.warn(
          "⚠️ Could not record payment (table may not exist):",
          error,
        );
      }
      // Don't throw - ticket was created successfully
    }

    console.log("✅ Demo ticket purchased successfully");
    return ticket;
  } catch (error: unknown) {
    // Handle AbortError
    const errorMessage = error instanceof Error ? error.message : "";
    const errorName = error instanceof Error ? error.name : "";
    if (
      errorMessage.includes("AbortError") ||
      errorMessage.includes("aborted") ||
      errorName === "AbortError"
    ) {
      console.log("⚠️ Demo purchase aborted (component unmounted)");
      throw new Error("Request aborted");
    }
    throw error;
  }
}

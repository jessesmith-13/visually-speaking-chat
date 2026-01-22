import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno";
import { handleCors } from "../_shared/cors.ts";

interface CreateCheckoutRequest {
  eventId: string;
  amount: number;
}

serve(async (req) => {
  // Handle CORS
  const { earlyResponse, headers: corsHeaders } = handleCors(req);
  if (earlyResponse) return earlyResponse;

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { eventId, amount }: CreateCheckoutRequest = await req.json();

    if (!eventId || !amount) {
      throw new Error("Missing required fields: eventId, amount");
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, price")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // Verify amount matches event price
    const expectedAmount = Math.round(event.price * 100);
    if (amount !== expectedAmount) {
      throw new Error(`Amount mismatch`);
    }

    // Check if user already has a ticket
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", eventId)
      .eq("status", "active")
      .maybeSingle();

    if (existingTicket) {
      throw new Error("You already have a ticket for this event");
    }

    // Get the current URL to build success/cancel URLs
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: event.name,
              description: `Ticket for ${event.name}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/events/${eventId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events/${eventId}?payment=cancelled`,
      metadata: {
        eventId,
        userId: user.id,
        eventName: event.name,
      },
    });

    console.log(
      `Created checkout session ${session.id} for user ${user.id}, event ${eventId}`,
    );

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        checkoutUrl: session.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

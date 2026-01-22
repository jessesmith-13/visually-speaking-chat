import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreatePaymentIntentRequest {
  eventId: string;
  amount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the Stripe secret key from environment
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { eventId, amount }: CreatePaymentIntentRequest = await req.json();

    // Validate input
    if (!eventId || !amount) {
      throw new Error("Missing required fields: eventId, amount");
    }

    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Get event details to verify it exists
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, price") // ✅ Changed from 'title' to 'name'
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // Verify amount matches event price (in cents)
    const expectedAmount = Math.round(event.price * 100);
    if (amount !== expectedAmount) {
      throw new Error(
        `Amount mismatch. Expected ${expectedAmount} cents, got ${amount} cents`,
      );
    }

    // Check if user already has a ticket for this event
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

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        eventId,
        userId: user.id,
        eventName: event.name, // ✅ Changed from eventTitle to eventName
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(
      `Created payment intent ${paymentIntent.id} for user ${user.id}, event ${eventId}`,
    );

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);

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

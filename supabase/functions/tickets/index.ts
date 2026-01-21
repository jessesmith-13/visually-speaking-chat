/**
 * Tickets Edge Function
 *
 * Handles ticket purchasing with Stripe integration and demo mode
 *
 * Endpoints:
 *   POST /create-payment-intent - Create Stripe payment intent
 *   POST /purchase - Complete ticket purchase (uses atomic RPC)
 *   DELETE /:id/cancel - Cancel ticket with optional refund (uses atomic RPC)
 *   GET /my-tickets - Get user's tickets
 *
 * Security: Requires user authentication
 */

import Stripe from "stripe";
import { handleCors } from "../_shared/cors.ts";
import { createAuthClient, createAdminClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";
import { json, badRequest, notFound, serverError } from "../_shared/http.ts";
import { validateRequired, validateUuid } from "../_shared/validate.ts";
import { STRIPE_SECRET_KEY } from "../_shared/env.ts";
import { withCors } from "../_shared/response.ts";

// Initialize Stripe (only if key is available)
let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// Request body interfaces
interface CreatePaymentIntentBody extends Record<string, unknown> {
  eventId: string;
  amount: number;
}

interface PurchaseTicketBody extends Record<string, unknown> {
  eventId: string;
  amount: number;
  paymentIntentId?: string;
  isDemoMode?: boolean;
}

// Route handlers
interface RouteHandler {
  pattern: RegExp;
  method: string;
  handler: (
    req: Request,
    userId: string,
    match: RegExpMatchArray,
    corsHeaders: HeadersInit,
  ) => Promise<Response>;
}

Deno.serve(async (req) => {
  // Handle CORS
  const { earlyResponse, headers: corsHeaders } = handleCors(req);
  if (earlyResponse) return earlyResponse;
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authClient = createAuthClient();
    const userResult = await requireUser(req, authClient, corsHeaders);
    if (userResult instanceof Response)
      return withCors(userResult, corsHeaders);

    const userId = userResult.userId;
    const supabaseAdmin = createAdminClient();

    // Parse path - check custom header first (for Supabase SDK calls), then URL
    const url = new URL(req.url);
    const customPath = req.headers.get("x-path");
    const path = customPath || url.pathname.replace(/^\/tickets/, "");
    const method = req.method;

    console.log(`${method} ${path} - User: ${userId}`);

    // Define routes
    const routes: RouteHandler[] = [
      {
        pattern: /^\/create-payment-intent$/,
        method: "POST",
        handler: async (req, _userId, _, corsHeaders) => {
          const body: CreatePaymentIntentBody = await req.json();
          const requiredCheck = validateRequired(body, ["eventId", "amount"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId, amount } = body;

          console.log(
            `💳 Creating payment intent: event=${eventId}, amount=$${amount}`,
          );

          // Validate amount
          if (amount <= 0) {
            return badRequest("Amount must be positive", corsHeaders);
          }

          // Check if Stripe is configured
          if (!stripe) {
            console.error("❌ Stripe not configured");
            return serverError(
              new Error(
                "Payment processing is not configured. Stripe secret key is missing.",
              ),
              corsHeaders,
            );
          }

          // Check event exists and has capacity
          const { data: event, error: eventError } = await supabaseAdmin
            .from("events")
            .select("capacity, attendees, name")
            .eq("id", eventId)
            .single();

          if (eventError || !event) {
            return notFound("Event not found", corsHeaders);
          }

          if (event.attendees >= event.capacity) {
            return badRequest("Event is sold out", corsHeaders);
          }

          // Create Stripe Payment Intent
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: "usd",
            metadata: {
              eventId,
              userId,
              eventName: event.name,
            },
            automatic_payment_methods: {
              enabled: true,
            },
          });

          console.log("✅ Payment intent created:", paymentIntent.id);

          return json(
            {
              clientSecret: paymentIntent.client_secret,
              paymentIntentId: paymentIntent.id,
            },
            200,
            corsHeaders,
          );
        },
      },
      {
        pattern: /^\/purchase$/,
        method: "POST",
        handler: async (req, userId, _, corsHeaders) => {
          const body: PurchaseTicketBody = await req.json();
          const requiredCheck = validateRequired(body, ["eventId", "amount"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId, amount, paymentIntentId, isDemoMode } = body;

          console.log(
            `🎫 Processing purchase: event=${eventId}, demo=${!!isDemoMode}`,
          );

          // If not demo mode, require Stripe
          if (!isDemoMode && !stripe) {
            console.error("❌ Stripe not configured");
            return serverError(
              new Error(
                "Payment processing is not configured. Stripe secret key is missing.",
              ),
              corsHeaders,
            );
          }

          // Verify payment with Stripe (if not demo mode)
          if (!isDemoMode && paymentIntentId && stripe) {
            try {
              const paymentIntent =
                await stripe.paymentIntents.retrieve(paymentIntentId);

              if (paymentIntent.status !== "succeeded") {
                return badRequest("Payment not completed", corsHeaders);
              }

              // Verify amount
              const paidAmount = paymentIntent.amount / 100;
              if (Math.abs(paidAmount - amount) > 0.01) {
                return badRequest("Payment amount mismatch", corsHeaders);
              }

              console.log("✅ Payment verified with Stripe");
            } catch (error: unknown) {
              console.error("❌ Stripe verification error:", error);
              return serverError(error, corsHeaders);
            }
          } else if (isDemoMode) {
            console.log("⚠️ DEMO MODE - Skipping Stripe verification");
          }

          // Use atomic RPC to purchase ticket
          const { data, error } = await supabaseAdmin.rpc("purchase_ticket", {
            p_event_id: eventId,
            p_user_id: userId,
            p_amount: amount,
            p_payment_intent_id: paymentIntentId || `demo_${Date.now()}`,
          });

          if (error) {
            console.error("❌ RPC error:", error);
            return serverError(error, corsHeaders);
          }

          const result = data[0];
          if (!result.success) {
            return badRequest(result.error_message, corsHeaders);
          }

          console.log("✅ Ticket purchased:", result.ticket_id);

          // Record in stripe_payments table (optional)
          try {
            await supabaseAdmin.from("stripe_payments").insert({
              user_id: userId,
              event_id: eventId,
              stripe_payment_intent_id: paymentIntentId || `demo_${Date.now()}`,
              amount,
              currency: "usd",
              status: "succeeded",
            });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.warn("⚠️ Could not record payment:", errorMessage);
          }

          return json(
            {
              success: true,
              ticket: {
                id: result.ticket_id,
                event_id: result.event_id,
                user_id: result.user_id,
                payment_amount: result.payment_amount,
                status: result.status,
                purchased_at: result.purchased_at,
              },
            },
            201,
            corsHeaders,
          );
        },
      },
      {
        pattern: /^\/([a-f0-9-]+)\/cancel$/,
        method: "DELETE",
        handler: async (_req, userId, match, corsHeaders) => {
          const ticketId = match[1];
          const uuidCheck = validateUuid(ticketId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid ticket ID", corsHeaders);
          }

          console.log(`🚫 Cancelling ticket: ${ticketId}`);

          // Get ticket to check payment intent for refund
          const { data: ticket, error: fetchError } = await supabaseAdmin
            .from("tickets")
            .select("stripe_payment_intent_id, event_id, events(date)")
            .eq("id", ticketId)
            .eq("user_id", userId)
            .eq("status", "active")
            .single();

          if (fetchError || !ticket) {
            return notFound(
              "Ticket not found or already cancelled",
              corsHeaders,
            );
          }

          // Check if refund is possible
          let refunded = false;
          // Supabase returns joined data - handle both single object and array types
          const eventData = Array.isArray(ticket.events)
            ? ticket.events[0]
            : ticket.events;

          if (!eventData || !("date" in eventData)) {
            return serverError(new Error("Event data not found"), corsHeaders);
          }

          const eventDate = new Date(eventData.date);
          const isPastEvent = eventDate < new Date();

          if (
            !isPastEvent &&
            ticket.stripe_payment_intent_id &&
            !ticket.stripe_payment_intent_id.startsWith("demo_") &&
            stripe
          ) {
            try {
              const refund = await stripe.refunds.create({
                payment_intent: ticket.stripe_payment_intent_id,
              });

              if (refund.status === "succeeded") {
                refunded = true;
                console.log("✅ Refund processed:", refund.id);
              }
            } catch (error: unknown) {
              console.error("❌ Refund error:", error);
              // Continue with cancellation
            }
          }

          // Use atomic RPC to cancel ticket
          const { data, error } = await supabaseAdmin.rpc("cancel_ticket", {
            p_ticket_id: ticketId,
            p_user_id: userId,
          });

          if (error) {
            console.error("❌ RPC error:", error);
            return serverError(error, corsHeaders);
          }

          const result = data[0];
          if (!result.success) {
            return badRequest(result.error_message, corsHeaders);
          }

          console.log("✅ Ticket cancelled");

          return json({ success: true, refunded }, 200, corsHeaders);
        },
      },
      {
        pattern: /^\/my-tickets$/,
        method: "GET",
        handler: async (_req, userId, _, corsHeaders) => {
          console.log(`📋 Fetching tickets for user: ${userId}`);

          const { data, error } = await supabaseAdmin
            .from("tickets")
            .select(
              "id, event_id, payment_amount, status, purchased_at, events(id, name, date, duration, image_url)",
            )
            .eq("user_id", userId)
            .eq("status", "active")
            .order("purchased_at", { ascending: false });

          if (error) {
            console.error("❌ Error fetching tickets:", error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} tickets`);

          return json({ tickets: data }, 200, corsHeaders);
        },
      },
    ];

    // Match route
    for (const route of routes) {
      const match = path.match(route.pattern);
      if (match && method === route.method) {
        return await route.handler(req, userId, match, corsHeaders);
      }
    }

    // Route not found
    return notFound(`Route not found: ${method} ${path}`, corsHeaders);
  } catch (error) {
    return serverError(error, corsHeaders);
  }
});

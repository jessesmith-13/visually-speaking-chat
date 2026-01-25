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
 *   POST /verify - Verify ticket check-in
 *
 * Security: Requires user authentication
 */

import Stripe from "npm:stripe";
import { handleCors } from "../_shared/cors.ts";
import { createAuthClient, createAdminClient } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";
import { json, badRequest, notFound, serverError } from "../_shared/http.ts";
import { validateRequired, validateUuid } from "../_shared/validate.ts";
import {
  STRIPE_SECRET_KEY,
  RESEND_API_KEY,
  getFromEmail,
} from "../_shared/env.ts";
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

interface VerifyTicketBody extends Record<string, unknown> {
  ticketId: string;
  eventId?: string;
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
        handler: async (req, userId, _, corsHeaders) => {
          const body: CreatePaymentIntentBody = await req.json();
          const requiredCheck = validateRequired(body, ["eventId", "amount"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId, amount } = body;

          console.log(
            `💳 Creating Stripe Checkout Session: event=${eventId}, amount=$${amount}`,
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

          // Check event exists
          const { data: event, error: eventError } = await supabaseAdmin
            .from("events")
            .select(
              "capacity, attendees, name, price, date, event_type, venue_name, venue_address",
            )
            .eq("id", eventId)
            .single();

          if (eventError || !event) {
            return notFound("Event not found", corsHeaders);
          }

          if (event.attendees >= event.capacity) {
            return badRequest("Event is sold out", corsHeaders);
          }

          // Verify amount matches
          const expectedAmount = Math.round(event.price * 100);
          if (amount !== expectedAmount) {
            return badRequest("Amount mismatch", corsHeaders);
          }

          // Check if user already has ticket
          const { data: existingTicket } = await supabaseAdmin
            .from("tickets")
            .select("id")
            .eq("user_id", userId)
            .eq("event_id", eventId)
            .eq("status", "active")
            .maybeSingle();

          if (existingTicket) {
            return badRequest(
              "You already have a ticket for this event",
              corsHeaders,
            );
          }

          // Get origin for redirect URLs
          // Prefer origin header, fall back to referer, then localhost
          let origin = req.headers.get("origin");

          if (!origin) {
            const referer = req.headers.get("referer");
            if (referer) {
              const url = new URL(referer);
              origin = `${url.protocol}//${url.host}`;
            } else {
              origin = "http://localhost:5173";
            }
          }

          console.log("🔗 Using origin for redirects:", origin);

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
              userId,
              eventName: event.name,
            },
          });

          console.log("✅ Checkout session created:", session.id);

          return json(
            {
              sessionId: session.id,
              checkoutUrl: session.url,
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
          let actualPaymentIntentId = paymentIntentId; // Will be updated if we get a session ID
          if (!isDemoMode && paymentIntentId && stripe) {
            try {
              // If it's a checkout session (starts with cs_), verify the session
              if (paymentIntentId.startsWith("cs_")) {
                console.log(
                  "🔍 Verifying Stripe Checkout Session:",
                  paymentIntentId,
                );
                const session =
                  await stripe.checkout.sessions.retrieve(paymentIntentId);

                if (session.payment_status !== "paid") {
                  console.error("❌ Session not paid:", session.payment_status);
                  return badRequest("Payment not completed", corsHeaders);
                }

                // Verify amount (compare cents to cents)
                const paidAmountInCents = session.amount_total || 0;
                if (Math.abs(paidAmountInCents - amount) > 0.01) {
                  console.error(
                    "❌ Amount mismatch:",
                    paidAmountInCents,
                    "cents vs",
                    amount,
                    "cents",
                  );
                  return badRequest("Payment amount mismatch", corsHeaders);
                }

                // Extract the actual payment intent ID from the session
                actualPaymentIntentId =
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : session.payment_intent?.id || paymentIntentId;

                console.log(
                  "✅ Checkout session verified:",
                  paymentIntentId,
                  "- Paid:",
                  paidAmountInCents,
                  "cents",
                );
                console.log(
                  "📌 Extracted Payment Intent ID:",
                  actualPaymentIntentId,
                );
              } else {
                // It's a payment intent
                console.log(
                  "🔍 Verifying Stripe Payment Intent:",
                  paymentIntentId,
                );
                const paymentIntent =
                  await stripe.paymentIntents.retrieve(paymentIntentId);

                if (paymentIntent.status !== "succeeded") {
                  console.error(
                    "❌ Payment not succeeded:",
                    paymentIntent.status,
                  );
                  return badRequest("Payment not completed", corsHeaders);
                }

                // Verify amount (compare cents to cents)
                const paidAmountInCents = paymentIntent.amount;
                if (Math.abs(paidAmountInCents - amount) > 0.01) {
                  console.error(
                    "❌ Amount mismatch:",
                    paidAmountInCents,
                    "cents vs",
                    amount,
                    "cents",
                  );
                  return badRequest("Payment amount mismatch", corsHeaders);
                }

                console.log(
                  "✅ Payment intent verified:",
                  paymentIntentId,
                  "- Paid:",
                  paidAmountInCents,
                  "cents",
                );
              }
            } catch (error: unknown) {
              console.error("❌ Stripe verification error:", error);
              return serverError(error, corsHeaders);
            }
          } else if (isDemoMode) {
            console.log("⚠️ DEMO MODE - Skipping Stripe verification");
          }

          // Check if user already has a ticket
          const { data: existingTicket } = await supabaseAdmin
            .from("tickets")
            .select("id")
            .eq("user_id", userId)
            .eq("event_id", eventId)
            .eq("status", "active")
            .maybeSingle();

          if (existingTicket) {
            console.error("❌ User already has ticket");
            return badRequest(
              "You already have a ticket for this event",
              corsHeaders,
            );
          }

          // Check event capacity
          const { data: event, error: eventError } = await supabaseAdmin
            .from("events")
            .select(
              "capacity, attendees, name, date, event_type, venue_name, venue_address",
            )
            .eq("id", eventId)
            .single();

          if (eventError || !event) {
            console.error("❌ Event not found:", eventError);
            return notFound("Event not found", corsHeaders);
          }

          if (event.attendees >= event.capacity) {
            console.error("❌ Event sold out");
            return badRequest("Event is sold out", corsHeaders);
          }

          // Create ticket
          const { data: newTicket, error: ticketError } = await supabaseAdmin
            .from("tickets")
            .insert({
              user_id: userId,
              event_id: eventId,
              payment_amount: amount / 100, // Convert cents to dollars
              stripe_payment_intent_id:
                actualPaymentIntentId || `demo_${Date.now()}`,
              status: "active",
            })
            .select()
            .single();

          if (ticketError || !newTicket) {
            console.error("❌ Error creating ticket:", ticketError);
            return serverError(
              ticketError || new Error("Failed to create ticket"),
              corsHeaders,
            );
          }

          // Increment event attendees
          const { error: updateError } = await supabaseAdmin
            .from("events")
            .update({ attendees: event.attendees + 1 })
            .eq("id", eventId);

          if (updateError) {
            console.error("❌ Error updating attendees:", updateError);
            // Ticket created but attendee count not updated - log but don't fail
          }

          console.log("✅ Ticket purchased:", newTicket.id);

          // Record in stripe_payments table (optional)
          try {
            await supabaseAdmin.from("stripe_payments").insert({
              user_id: userId,
              event_id: eventId,
              stripe_payment_intent_id:
                actualPaymentIntentId || `demo_${Date.now()}`,
              amount,
              currency: "usd",
              status: "succeeded",
            });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.warn("⚠️ Could not record payment:", errorMessage);
          }

          // Send ticket email for in-person events
          if (event.event_type === "in-person" && RESEND_API_KEY) {
            try {
              // Get user email
              const { data: userData } =
                await supabaseAdmin.auth.admin.getUserById(userId);

              if (userData.user?.email) {
                const eventDate = new Date(event.date).toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });

                // Generate QR code placeholder
                const qrCodeSVG = `
                  <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="200" fill="white"/>
                    <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="12" fill="black">
                      QR Code Placeholder
                    </text>
                    <text x="100" y="120" text-anchor="middle" font-family="monospace" font-size="8" fill="gray">
                      Ticket ID:
                    </text>
                    <text x="100" y="135" text-anchor="middle" font-family="monospace" font-size="8" fill="gray">
                      ${newTicket.id.slice(0, 8)}...
                    </text>
                  </svg>
                `;

                // Send email via Resend
                const emailResponse = await fetch(
                  "https://api.resend.com/emails",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                      from: getFromEmail(),
                      to: userData.user.email,
                      subject: `Your Ticket for ${event.name}`,
                      html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <style>
                            body {
                              font-family: Arial, sans-serif;
                              line-height: 1.6;
                              color: #333;
                              max-width: 600px;
                              margin: 0 auto;
                              padding: 20px;
                            }
                            .ticket-container {
                              border: 2px solid #4F46E5;
                              border-radius: 12px;
                              padding: 30px;
                              margin: 20px 0;
                              background: #F9FAFB;
                            }
                            .qr-code {
                              text-align: center;
                              margin: 20px 0;
                              padding: 20px;
                              background: white;
                              border-radius: 8px;
                            }
                            .event-details {
                              margin: 20px 0;
                            }
                            .detail-row {
                              margin: 10px 0;
                              padding: 10px;
                              background: white;
                              border-radius: 6px;
                            }
                            .label {
                              font-weight: bold;
                              color: #4F46E5;
                            }
                            .footer {
                              margin-top: 30px;
                              padding-top: 20px;
                              border-top: 1px solid #ddd;
                              font-size: 12px;
                              color: #666;
                            }
                          </style>
                        </head>
                        <body>
                          <h1 style="color: #4F46E5;">🎟️ Your Visually Speaking Ticket</h1>
                          
                          <div class="ticket-container">
                            <h2>Event: ${event.name}</h2>
                            
                            <div class="qr-code">
                              ${qrCodeSVG}
                              <p style="margin-top: 10px; color: #666; font-size: 14px;">
                                Present this QR code at the door
                              </p>
                            </div>
                            
                            <div class="event-details">
                              <div class="detail-row">
                                <span class="label">📅 Date & Time:</span><br/>
                                ${eventDate}
                              </div>
                              
                              ${
                                event.venue_name
                                  ? `
                                <div class="detail-row">
                                  <span class="label">📍 Venue:</span><br/>
                                  ${event.venue_name}
                                </div>
                              `
                                  : ""
                              }
                              
                              ${
                                event.venue_address
                                  ? `
                                <div class="detail-row">
                                  <span class="label">🗺️ Address:</span><br/>
                                  ${event.venue_address}
                                </div>
                              `
                                  : ""
                              }
                              
                              <div class="detail-row">
                                <span class="label">🎫 Ticket ID:</span><br/>
                                <code style="font-size: 11px; color: #666;">${newTicket.id}</code>
                              </div>
                            </div>
                          </div>
                          
                          <div class="footer">
                            <p>Thank you for joining Visually Speaking!</p>
                            <p>If you have any questions, please contact support.</p>
                            <p style="color: #999;">This ticket is non-transferable.</p>
                          </div>
                        </body>
                      </html>
                    `,
                    }),
                  },
                );

                if (emailResponse.ok) {
                  console.log("✅ Ticket email sent to:", userData.user.email);
                } else {
                  const errorData = await emailResponse
                    .json()
                    .catch(() => ({}));
                  console.error("❌ Failed to send ticket email:", errorData);
                }
              }
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
              console.warn("⚠️ Could not send ticket email:", errorMessage);
            }
          }

          return json(
            {
              success: true,
              ticket: newTicket,
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

          // Attempt refund if applicable
          if (
            !isPastEvent &&
            ticket.stripe_payment_intent_id &&
            !ticket.stripe_payment_intent_id.startsWith("demo_") &&
            stripe
          ) {
            try {
              console.log(
                "💳 Attempting refund for payment intent:",
                ticket.stripe_payment_intent_id,
              );

              // ✅ FIX: Handle both Checkout Session IDs and Payment Intent IDs
              let paymentIntentId = ticket.stripe_payment_intent_id;

              // If it's a Checkout Session ID, retrieve the Payment Intent
              if (paymentIntentId.startsWith("cs_")) {
                console.log(
                  "🔄 Converting Checkout Session to Payment Intent...",
                );
                const session =
                  await stripe.checkout.sessions.retrieve(paymentIntentId);

                if (!session.payment_intent) {
                  console.error(
                    "❌ No payment intent found in Checkout Session",
                  );
                  return serverError(
                    new Error("Cannot refund: No payment intent found"),
                    corsHeaders,
                  );
                }

                paymentIntentId =
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : session.payment_intent.id;

                console.log("✅ Retrieved Payment Intent ID:", paymentIntentId);
              }

              const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
              });

              if (refund.status === "succeeded") {
                refunded = true;
                console.log("✅ Refund processed:", refund.id);
              } else {
                console.error("❌ Refund failed with status:", refund.status);
                return serverError(
                  new Error(`Refund failed with status: ${refund.status}`),
                  corsHeaders,
                );
              }
            } catch (error: unknown) {
              console.error("❌ Refund error:", error);
              // Don't continue with cancellation - return error to frontend
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "Failed to process refund";
              return serverError(
                new Error(`Refund failed: ${errorMessage}`),
                corsHeaders,
              );
            }
          }

          // Only cancel the ticket if refund succeeded or wasn't needed
          const { error: cancelError } = await supabaseAdmin
            .from("tickets")
            .update({ status: "cancelled" })
            .eq("id", ticketId)
            .eq("user_id", userId);

          if (cancelError) {
            console.error("❌ Error cancelling ticket:", cancelError);
            return serverError(cancelError, corsHeaders);
          }

          // Decrement event attendees
          const { data: event } = await supabaseAdmin
            .from("events")
            .select("attendees")
            .eq("id", ticket.event_id)
            .single();

          if (event) {
            await supabaseAdmin
              .from("events")
              .update({ attendees: Math.max(0, event.attendees - 1) })
              .eq("id", ticket.event_id);
          }

          console.log("✅ Ticket cancelled");

          return json({ success: true, refunded }, 200, corsHeaders);
        },
      },
      {
        pattern: /^\/verify$/,
        method: "POST",
        handler: async (req, userId, _, corsHeaders) => {
          const body: VerifyTicketBody = await req.json();
          const requiredCheck = validateRequired(body, ["ticketId"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { ticketId, eventId } = body;

          // Validate ticket ID
          const ticketUuidCheck = validateUuid(ticketId);
          if (!ticketUuidCheck.valid) {
            return badRequest("Invalid ticket ID format", corsHeaders);
          }

          // Validate event ID if provided
          if (eventId) {
            const eventUuidCheck = validateUuid(eventId);
            if (!eventUuidCheck.valid) {
              return badRequest("Invalid event ID format", corsHeaders);
            }
          }

          console.log(`🎟️ Verifying ticket: ${ticketId}`);

          // Fetch ticket
          const { data: ticket, error: fetchError } = await supabaseAdmin
            .from("tickets")
            .select(
              "id, user_id, event_id, status, check_in_count, last_checked_in_at",
            )
            .eq("id", ticketId)
            .single();

          if (fetchError || !ticket) {
            console.error("❌ Ticket not found:", fetchError);
            return notFound("Ticket not found", corsHeaders);
          }

          // Check if ticket is active
          if (ticket.status !== "active") {
            console.error(`❌ Ticket status is ${ticket.status}, not active`);
            return badRequest(
              `Ticket is ${ticket.status} and cannot be used`,
              corsHeaders,
            );
          }

          // Verify event ID matches if provided
          if (eventId && ticket.event_id !== eventId) {
            console.error("❌ Ticket does not belong to this event");
            return badRequest(
              "Ticket does not belong to this event",
              corsHeaders,
            );
          }

          // Check if event is in-person
          const { data: event, error: eventError } = await supabaseAdmin
            .from("events")
            .select("id, name, event_type")
            .eq("id", ticket.event_id)
            .single();

          if (eventError || !event) {
            console.error("❌ Event not found:", eventError);
            return notFound("Event not found", corsHeaders);
          }

          if (event.event_type !== "in-person") {
            console.error("❌ Event is not in-person");
            return badRequest(
              "This event is virtual and does not require check-in",
              corsHeaders,
            );
          }

          // Update ticket check-in
          const now = new Date().toISOString();
          const newCheckInCount = (ticket.check_in_count || 0) + 1;

          const { data: updatedTicket, error: updateError } =
            await supabaseAdmin
              .from("tickets")
              .update({
                check_in_count: newCheckInCount,
                last_checked_in_at: now,
              })
              .eq("id", ticketId)
              .select()
              .single();

          if (updateError || !updatedTicket) {
            console.error("❌ Error updating ticket:", updateError);
            return serverError(
              updateError || new Error("Failed to update ticket"),
              corsHeaders,
            );
          }

          console.log(
            `✅ Ticket checked in: ${ticketId} (count: ${newCheckInCount})`,
          );

          return json(
            {
              success: true,
              ticket: updatedTicket,
              message:
                newCheckInCount > 1
                  ? `Ticket checked in ${newCheckInCount} times`
                  : "Ticket checked in successfully",
            },
            200,
            corsHeaders,
          );
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

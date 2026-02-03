import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.11.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Structured logging helper
function log(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  context?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(logEntry, null, 2));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(logEntry, null, 2));
  } else {
    console.log(JSON.stringify(logEntry, null, 2));
  }
}

serve(async (req) => {
  const startTime = Date.now();
  let eventId = "unknown";
  let eventType = "unknown";

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log("INFO", "Webhook request received", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Get Stripe configuration from environment
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey) {
      log(
        "ERROR",
        "STRIPE_SECRET_KEY is not configured in environment variables",
      );
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    if (!stripeWebhookSecret) {
      log(
        "ERROR",
        "STRIPE_WEBHOOK_SECRET is not configured in environment variables",
      );
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover",
      httpClient: Stripe.createFetchHttpClient(),
    });

    log("INFO", "Stripe client initialized", {
      apiVersion: "2025-11-17.clover",
    });

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      log("ERROR", "Missing stripe-signature header in request");
      throw new Error("Missing stripe-signature header");
    }

    // Get the raw body
    const body = await req.text();
    const bodyLength = body.length;

    log("INFO", "Request body received", {
      bodyLength,
      signaturePresent: !!signature,
    });

    // Verify webhook signature
    let event: Stripe.Event;
    let usedExtendedTolerance = false;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret,
        300, // 5 minute tolerance (default)
      );
      log("INFO", "Webhook signature verified with default tolerance");
    } catch (err) {
      // If signature fails with default tolerance, try with extended tolerance for retries
      log(
        "WARN",
        "Webhook signature verification failed with default tolerance, trying extended tolerance for retries",
        {
          error: err instanceof Error ? err.message : String(err),
          signatureHeader: signature,
          bodyLength,
        },
      );

      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          stripeWebhookSecret,
          86400, // 24 hour tolerance for retries
        );
        usedExtendedTolerance = true;
        log(
          "WARN",
          "Webhook verified with extended tolerance - this is likely a delayed retry",
          {
            eventAge: event.created
              ? `${Math.floor(Date.now() / 1000 - event.created)} seconds`
              : "unknown",
          },
        );
      } catch (retryErr) {
        log(
          "ERROR",
          "Webhook signature verification failed with both default and extended tolerance",
          {
            defaultError: err instanceof Error ? err.message : String(err),
            extendedError:
              retryErr instanceof Error ? retryErr.message : String(retryErr),
            signatureHeader: signature,
            bodyLength,
            webhookSecretPrefix: stripeWebhookSecret.substring(0, 10),
          },
        );
        throw new Error("Invalid signature");
      }
    }

    eventId = event.id;
    eventType = event.type;

    log("INFO", "Webhook event parsed successfully", {
      eventId,
      eventType,
      eventCreated: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode,
      usedExtendedTolerance,
    });

    // Create Supabase admin client (service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    log("INFO", "Supabase client initialized");

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        log("INFO", "Processing checkout.session.completed", {
          eventId,
          sessionId: session.id,
          metadata: session.metadata,
        });

        const { eventId: metadataEventId, userId } = session.metadata || {};

        if (!metadataEventId || !userId) {
          log("ERROR", "Missing required metadata in checkout session", {
            eventId,
            sessionId: session.id,
            metadata: session.metadata,
          });
          break;
        }

        // Get payment intent ID from session
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        if (!paymentIntentId) {
          log("ERROR", "Missing payment intent in checkout session", {
            eventId,
            sessionId: session.id,
          });
          break;
        }

        log("INFO", "Creating ticket for checkout session", {
          eventId,
          sessionId: session.id,
          paymentIntentId,
          userId,
          metadataEventId,
          amount: (session.amount_total || 0) / 100,
        });

        // Check if ticket already exists (idempotency)
        const { data: existingTicket } = await supabase
          .from("tickets")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (existingTicket) {
          log(
            "WARN",
            "Ticket already exists for payment intent (idempotent retry)",
            {
              eventId,
              paymentIntentId,
              ticketId: existingTicket.id,
            },
          );
          break;
        }

        // Create ticket
        const { data: ticket, error: ticketError } = await supabase
          .from("tickets")
          .insert({
            user_id: userId,
            event_id: metadataEventId,
            payment_amount: (session.amount_total || 0) / 100, // Convert cents to dollars
            stripe_payment_intent_id: paymentIntentId,
            status: "active",
          })
          .select()
          .single();

        if (ticketError) {
          log("ERROR", "Failed to create ticket", {
            eventId,
            error: ticketError,
            paymentIntentId,
            userId,
            metadataEventId,
          });
          throw ticketError;
        }

        log("INFO", "Ticket created successfully", {
          eventId,
          ticketId: ticket.id,
          paymentIntentId,
          userId,
        });

        // Increment event attendees count
        const { data: eventData, error: fetchError } = await supabase
          .from("events")
          .select("attendees")
          .eq("id", metadataEventId)
          .single();

        if (!fetchError && eventData) {
          const newCount = (eventData.attendees || 0) + 1;
          const { error: updateError } = await supabase
            .from("events")
            .update({ attendees: newCount })
            .eq("id", metadataEventId);

          if (updateError) {
            log("ERROR", "Failed to update event attendees count", {
              eventId,
              metadataEventId,
              error: updateError,
            });
          } else {
            log("INFO", "Event attendees count updated", {
              eventId,
              metadataEventId,
              newCount,
            });
          }
        } else if (fetchError) {
          log("WARN", "Could not fetch event data for attendee count update", {
            eventId,
            metadataEventId,
            error: fetchError,
          });
        }

        // Record payment in stripe_payments table (optional)
        try {
          await supabase.from("stripe_payments").insert({
            user_id: userId,
            event_id: metadataEventId,
            stripe_payment_intent_id: paymentIntentId,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || "usd",
            status: "succeeded",
          });
          log("INFO", "Payment recorded in stripe_payments table", {
            eventId,
            paymentIntentId,
          });
        } catch (error) {
          log(
            "WARN",
            "Could not record payment in stripe_payments table (table may not exist)",
            {
              eventId,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }

        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log("INFO", "Processing payment_intent.succeeded", {
          eventId,
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        });

        const { eventId: metadataEventId, userId } = paymentIntent.metadata;

        if (!metadataEventId || !userId) {
          log("ERROR", "Missing required metadata in payment intent", {
            eventId,
            paymentIntentId: paymentIntent.id,
            metadata: paymentIntent.metadata,
          });
          break;
        }

        // Check if ticket already exists (idempotency)
        const { data: existingTicket } = await supabase
          .from("tickets")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle();

        if (existingTicket) {
          log(
            "WARN",
            "Ticket already exists for payment intent (idempotent retry)",
            {
              eventId,
              paymentIntentId: paymentIntent.id,
              ticketId: existingTicket.id,
            },
          );
          break;
        }

        // Create ticket
        const { data: ticket, error: ticketError } = await supabase
          .from("tickets")
          .insert({
            user_id: userId,
            event_id: metadataEventId,
            payment_amount: paymentIntent.amount / 100, // Convert cents to dollars
            stripe_payment_intent_id: paymentIntent.id,
            status: "active",
          })
          .select()
          .single();

        if (ticketError) {
          log("ERROR", "Failed to create ticket", {
            eventId,
            error: ticketError,
            paymentIntentId: paymentIntent.id,
            userId,
            metadataEventId,
          });
          throw ticketError;
        }

        log("INFO", "Ticket created successfully", {
          eventId,
          ticketId: ticket.id,
          paymentIntentId: paymentIntent.id,
          userId,
        });

        // Increment event attendees count
        const { data: eventData, error: fetchError } = await supabase
          .from("events")
          .select("attendees")
          .eq("id", metadataEventId)
          .single();

        if (!fetchError && eventData) {
          const newCount = (eventData.attendees || 0) + 1;
          const { error: updateError } = await supabase
            .from("events")
            .update({ attendees: newCount })
            .eq("id", metadataEventId);

          if (updateError) {
            log("ERROR", "Failed to update event attendees count", {
              eventId,
              metadataEventId,
              error: updateError,
            });
          } else {
            log("INFO", "Event attendees count updated", {
              eventId,
              metadataEventId,
              newCount,
            });
          }
        } else if (fetchError) {
          log("WARN", "Could not fetch event data for attendee count update", {
            eventId,
            metadataEventId,
            error: fetchError,
          });
        }

        // Record payment in stripe_payments table (optional)
        try {
          await supabase.from("stripe_payments").insert({
            user_id: userId,
            event_id: metadataEventId,
            stripe_payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: "succeeded",
          });
          log("INFO", "Payment recorded in stripe_payments table", {
            eventId,
            paymentIntentId: paymentIntent.id,
          });
        } catch (error) {
          log(
            "WARN",
            "Could not record payment in stripe_payments table (table may not exist)",
            {
              eventId,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log("ERROR", "Payment failed", {
          eventId,
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          lastPaymentError: paymentIntent.last_payment_error,
        });

        // Optionally record failed payment
        try {
          const { eventId: metadataEventId, userId } = paymentIntent.metadata;
          if (metadataEventId && userId) {
            await supabase.from("stripe_payments").insert({
              user_id: userId,
              event_id: metadataEventId,
              stripe_payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: "failed",
            });
            log("INFO", "Failed payment recorded in stripe_payments table", {
              eventId,
              paymentIntentId: paymentIntent.id,
            });
          }
        } catch (error) {
          log("WARN", "Could not record failed payment", {
            eventId,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        log("INFO", "Processing charge.refunded", {
          eventId,
          chargeId: charge.id,
          amount: charge.amount / 100,
          amountRefunded: charge.amount_refunded / 100,
          paymentIntent: charge.payment_intent,
        });

        if (charge.payment_intent) {
          const paymentIntentId =
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent.id;

          // Mark ticket as refunded/cancelled
          const { error: updateError } = await supabase
            .from("tickets")
            .update({ status: "refunded" })
            .eq("stripe_payment_intent_id", paymentIntentId);

          if (updateError) {
            log("ERROR", "Failed to mark ticket as refunded", {
              eventId,
              paymentIntentId,
              error: updateError,
            });
          } else {
            log("INFO", "Ticket marked as refunded", {
              eventId,
              paymentIntentId,
            });
          }
        }

        break;
      }

      default:
        log("WARN", "Unhandled event type received", {
          eventId,
          eventType: event.type,
        });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    log("INFO", "Webhook processed successfully", {
      eventId,
      eventType,
      durationMs: duration,
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    log("ERROR", "Webhook processing failed", {
      eventId,
      eventType,
      durationMs: duration,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : String(error),
    });

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

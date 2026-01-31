import { env } from "@/lib/env";

// Use environment variable for Stripe publishable key
// Export this for use in Stripe Elements/payment forms
export const STRIPE_PUBLISHABLE_KEY =
  env.stripe.publishableKey || "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE";

export interface CreatePaymentIntentRequest {
  eventId: string;
  amount: number;
  promoCodeId?: string;
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
 *
 * This is a wrapper around the tickets.createPaymentIntent() from edge/client.ts
 * to maintain the same interface that components expect
 */
export interface CreateCheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
}

export async function createCheckoutSession(
  request: CreatePaymentIntentRequest,
): Promise<CreateCheckoutResponse> {
  const { tickets } = await import("@/lib/edge/client");
  return await tickets.createPaymentIntent(
    request.eventId,
    request.amount,
    request.promoCodeId,
  );
}

// Alias for backwards compatibility
export const createPaymentIntent = createCheckoutSession;

/**
 * Purchase a ticket with Stripe payment
 *
 * @param eventId - The event ID
 * @param amount - The ticket price (in cents)
 * @param sessionId - The Stripe Checkout Session ID (from successful payment)
 */
export async function purchaseTicketWithStripe(
  eventId: string,
  amount: number,
  sessionId: string,
) {
  // Call the Edge Function's /purchase endpoint which will:
  // 1. Verify the Stripe session was actually paid
  // 2. Create the ticket atomically via RPC
  const { tickets } = await import("@/lib/edge/client");

  return await tickets.purchaseTicket(
    eventId,
    amount,
    sessionId, // This is the Stripe Checkout Session ID
    false, // Not demo mode
  );
}

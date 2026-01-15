import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Stripe configuration from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    // Get the raw body
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Invalid signature');
    }

    console.log('Received webhook event:', event.type, event.id);

    // Create Supabase admin client (service role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);

        const { eventId, userId } = paymentIntent.metadata;

        if (!eventId || !userId) {
          console.error('Missing metadata in payment intent:', paymentIntent.id);
          break;
        }

        // Check if ticket already exists (idempotency)
        const { data: existingTicket } = await supabase
          .from('tickets')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (existingTicket) {
          console.log('Ticket already exists for payment intent:', paymentIntent.id);
          break;
        }

        // Create ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert({
            user_id: userId,
            event_id: eventId,
            payment_amount: paymentIntent.amount / 100, // Convert cents to dollars
            stripe_payment_intent_id: paymentIntent.id,
            status: 'active',
          })
          .select()
          .single();

        if (ticketError) {
          console.error('Error creating ticket:', ticketError);
          throw ticketError;
        }

        console.log('Created ticket:', ticket.id);

        // Increment event attendees count
        const { data: eventData, error: fetchError } = await supabase
          .from('events')
          .select('attendees')
          .eq('id', eventId)
          .single();

        if (!fetchError && eventData) {
          const newCount = (eventData.attendees || 0) + 1;
          const { error: updateError } = await supabase
            .from('events')
            .update({ attendees: newCount })
            .eq('id', eventId);

          if (updateError) {
            console.error('Error updating attendees:', updateError);
          } else {
            console.log('Updated attendees count to:', newCount);
          }
        }

        // Record payment in stripe_payments table (optional)
        try {
          await supabase
            .from('stripe_payments')
            .insert({
              user_id: userId,
              event_id: eventId,
              stripe_payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: 'succeeded',
            });
          console.log('Recorded payment in stripe_payments table');
        } catch (error) {
          console.warn('Could not record payment (table may not exist):', error);
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);

        // Optionally record failed payment
        try {
          const { eventId, userId } = paymentIntent.metadata;
          if (eventId && userId) {
            await supabase
              .from('stripe_payments')
              .insert({
                user_id: userId,
                event_id: eventId,
                stripe_payment_intent_id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                status: 'failed',
              });
          }
        } catch (error) {
          console.warn('Could not record failed payment:', error);
        }

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id);

        if (charge.payment_intent) {
          const paymentIntentId = typeof charge.payment_intent === 'string' 
            ? charge.payment_intent 
            : charge.payment_intent.id;

          // Mark ticket as refunded/cancelled
          const { error: updateError } = await supabase
            .from('tickets')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', paymentIntentId);

          if (updateError) {
            console.error('Error marking ticket as refunded:', updateError);
          } else {
            console.log('Marked ticket as refunded for payment intent:', paymentIntentId);
          }
        }

        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

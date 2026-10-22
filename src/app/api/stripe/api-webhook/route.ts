import { NextRequest } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Paid-tier keys are minted here, so the event MUST come from Stripe.
    // Before 2026-10-22 this parsed any JSON body: anyone could POST a fake
    // checkout.session.completed with tier=institutional, or a fake
    // subscription.deleted to deactivate a customer's keys. Fail closed.
    const secret = process.env.STRIPE_API_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers.get('stripe-signature');
    if (!secret || !sig || !process.env.STRIPE_SECRET_KEY) {
      return new Response('Invalid signature', { status: 400 });
    }
    let event: Record<string, unknown>;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(body, sig, secret) as unknown as Record<string, unknown>;
    } catch {
      return new Response('Invalid signature', { status: 400 });
    }

    const type = event.type as string;

    // Handle checkout.session.completed
    if (type === 'checkout.session.completed') {
      const session = event.data as Record<string, unknown>;
      const obj = session.object as Record<string, unknown>;
      const metadata = obj.metadata as Record<string, string> | undefined;

      if (metadata?.type !== 'api_access') {
        // Not an API access purchase — skip (handled by existing webhook)
        return new Response('OK — not API access', { status: 200 });
      }

      const tier = metadata.tier || 'starter';
      const email = metadata.email || (obj.customer_email as string) || '';

      if (!email || !supabase) {
        return new Response('Missing email or Supabase', { status: 200 });
      }

      // Generate API key
      const apiKey = `avt_v1_${randomUUID().replace(/-/g, '')}`;

      // Store in api_keys table
      const { error } = await supabase.from('api_keys').insert({
        key: apiKey,
        email,
        tier,
        requests_count: 0,
        active: true,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to create API key:', error);
      }

      // Log the activation
      try {
        await supabase.from('api_usage_log').insert({
          api_key: apiKey,
          endpoint: '/stripe/api-webhook',
          event: 'key_activated_via_stripe',
          created_at: new Date().toISOString(),
        });
      } catch { /* non-blocking */ }

      console.log(`API key generated for ${email}: ${tier} tier`);
    }

    // Handle subscription cancelled
    if (type === 'customer.subscription.deleted') {
      const sub = event.data as Record<string, unknown>;
      const obj = sub.object as Record<string, unknown>;
      const metadata = obj.metadata as Record<string, string> | undefined;

      if (metadata?.type !== 'api_access') {
        return new Response('OK — not API access', { status: 200 });
      }

      const email = metadata.email;
      if (email && supabase) {
        await supabase
          .from('api_keys')
          .update({ active: false })
          .eq('email', email)
          .neq('tier', 'free');

        console.log(`API key deactivated for ${email}`);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('API webhook error:', err);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

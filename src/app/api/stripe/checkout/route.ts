import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Increase timeout + disable retries to prevent Vercel serverless timeouts
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-03-31.basil',
    maxNetworkRetries: 0,
    timeout: 8000,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Tell Vercel to allow up to 30s for this route
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avena-estate.com';

    // Try to get existing Stripe customer, skip Supabase lookup if it fails
    let customerId: string | undefined;
    try {
      const supabase = getSupabase();
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('email', email)
        .single();
      if (sub?.stripe_customer_id) customerId = sub.stripe_customer_id;
    } catch {
      // Supabase lookup failed — continue without customer ID
    }

    if (!customerId) {
      // Search Stripe for existing customer first
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email });
        customerId = customer.id;
      }
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
        quantity: 1,
      }],
      success_url: `${appUrl}/?subscribed=true`,
      cancel_url: `${appUrl}/?cancelled=true`,
      subscription_data: {
        metadata: { email },
      },
      metadata: { email },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

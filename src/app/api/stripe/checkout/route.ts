import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

async function stripePost(path: string, body: Record<string, string>) {
  const params = new URLSearchParams(body).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  return res.json();
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { email, testMode } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com';
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!;
    const isTest = testMode === true;

    // Search for existing customer
    const search = await stripeGet(`/customers/search?query=email:'${encodeURIComponent(email)}'&limit=1`);
    let customerId: string | undefined = search?.data?.[0]?.id;

    if (!customerId) {
      const customer = await stripePost('/customers', { email });
      customerId = customer.id;
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Create checkout session
    const sessionParams: Record<string, string> = {
      customer: customerId,
      mode: 'subscription',
      'payment_method_types[]': 'card',
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?cancelled=true`,
      'subscription_data[metadata][email]': email,
      'metadata[email]': email,
      allow_promotion_codes: 'true',
    };

    if (isTest) {
      // Test mode: €1 ad-hoc price
      sessionParams['line_items[0][price_data][currency]'] = 'eur';
      sessionParams['line_items[0][price_data][unit_amount]'] = '100';
      sessionParams['line_items[0][price_data][recurring][interval]'] = 'month';
      sessionParams['line_items[0][price_data][product_data][name]'] = 'Avena Terminal PRO (Test)';
      sessionParams['line_items[0][quantity]'] = '1';
    } else {
      sessionParams['line_items[0][price]'] = priceId;
      sessionParams['line_items[0][quantity]'] = '1';
    }

    const session = await stripePost('/checkout/sessions', sessionParams);

    if (session.error) {
      console.error('Stripe session error:', JSON.stringify(session.error));
      return NextResponse.json({ error: session.error.message }, { status: 500 });
    }

    if (!session.url) {
      console.error('Stripe session missing URL:', JSON.stringify(session));
      return NextResponse.json({ error: 'Stripe account not fully activated. Please complete Stripe onboarding at dashboard.stripe.com.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Checkout error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

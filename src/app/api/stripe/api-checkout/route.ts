import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const TIERS: Record<string, { price: number; name: string; requests: number }> = {
  starter: { price: 4900, name: 'API STARTER', requests: 1000 },
  pro: { price: 14900, name: 'API PRO', requests: 10000 },
  institutional: { price: 99900, name: 'API INSTITUTIONAL', requests: 999999 },
};

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

export async function POST(req: NextRequest) {
  try {
    const { email, tier } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    if (!tier || !TIERS[tier]) return NextResponse.json({ error: 'Valid tier required: starter, pro, institutional' }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com';
    const tierConfig = TIERS[tier];

    // Create ad-hoc price for the selected tier
    const price = await stripePost('/prices', {
      'unit_amount': String(tierConfig.price),
      'currency': 'eur',
      'recurring[interval]': 'month',
      'product_data[name]': `Avena Terminal ${tierConfig.name}`,
      'product_data[metadata][tier]': tier,
      'product_data[metadata][requests_daily]': String(tierConfig.requests),
    });

    if (price.error) {
      return NextResponse.json({ error: price.error.message }, { status: 500 });
    }

    // Create checkout session
    const session = await stripePost('/checkout/sessions', {
      'mode': 'subscription',
      'customer_email': email,
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': '1',
      'success_url': `${appUrl}/api-access?subscribed=true&tier=${tier}&email=${encodeURIComponent(email)}`,
      'cancel_url': `${appUrl}/api-access`,
      'metadata[type]': 'api_access',
      'metadata[tier]': tier,
      'metadata[email]': email,
      'subscription_data[metadata][type]': 'api_access',
      'subscription_data[metadata][tier]': tier,
      'subscription_data[metadata][email]': email,
    });

    if (session.error) {
      return NextResponse.json({ error: session.error.message }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('API checkout error:', err);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}

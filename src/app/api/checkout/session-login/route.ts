import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

/**
 * Post-checkout one-click login (2026-08-04).
 * Turns "paid but logged out" into instant access with zero emails.
 *
 * The /checkout/success page calls this with the Stripe session_id. We verify
 * the session actually completed at Stripe, then mint a Supabase magic link for
 * the buyer's email and hand it back. The success page redirects to it — the
 * buyer lands logged in with PRO already active.
 *
 * Fail-safe by design: if anything here errors, the caller simply falls back to
 * the existing email login link. No regression, no security hole (an attacker
 * would need a genuine completed cs_live_ session id, which only a real payer has).
 */
export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Accept completed checkouts (covers both immediate-charge and free-trial).
    const completed = session.status === 'complete' || session.payment_status === 'paid';
    const email = session.customer_details?.email || (session.metadata?.email as string | undefined);
    if (!completed || !email) {
      return NextResponse.json({ error: 'session_not_complete' }, { status: 403 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenaterminal.com';
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/checkout/success?welcome=1` },
    });

    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      return NextResponse.json({ error: error?.message || 'link_generation_failed' }, { status: 500 });
    }

    return NextResponse.json({ url: actionLink });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

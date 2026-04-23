import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const regions: string[] = Array.isArray(body.regions) ? body.regions.slice(0, 10) : ['*'];
    const minScore = Math.max(0, Math.min(100, Number(body.min_score) || 70));
    const maxPrice = body.max_price_eur ? Math.max(50000, Number(body.max_price_eur)) : null;
    const minYield = body.min_yield ? Math.max(0, Number(body.min_yield)) : null;

    if (!supabase) {
      return NextResponse.json({ ok: true, note: 'queued — supabase offline' });
    }

    const confirmToken = randomUUID();
    const unsubscribeToken = randomUUID();

    const { error } = await supabase.from('deal_alerts').insert({
      email,
      regions,
      min_score: minScore,
      max_price_eur: maxPrice,
      min_yield: minYield,
      active: true,
      confirmed: false,
      confirm_token: confirmToken,
      unsubscribe_token: unsubscribeToken,
    });

    if (error) {
      // Email uniqueness: treat as re-signup success
      return NextResponse.json({ ok: true, note: 'already_subscribed' });
    }

    // Optional: send confirmation email via Resend if available.
    // Non-blocking — user gets 200 regardless.
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Avena Terminal <alerts@avenaterminal.com>',
          to: email,
          subject: 'Confirm your Avena deal alerts',
          html: `<p>You asked to get deal alerts when properties matching your filters land on Avena Terminal.</p>
                 <p><a href="https://avenaterminal.com/api/deal-alerts/confirm?t=${confirmToken}">Confirm subscription</a></p>
                 <p style="color:#999;font-size:12px">Min score ${minScore} · Regions ${regions.join(', ')}${maxPrice ? ` · Max €${maxPrice.toLocaleString()}` : ''}${minYield ? ` · Min yield ${minYield}%` : ''}</p>
                 <p style="color:#999;font-size:12px">Not you? <a href="https://avenaterminal.com/api/deal-alerts/unsubscribe?t=${unsubscribeToken}">unsubscribe</a>.</p>`,
        });
      } catch {
        /* silent — signup still succeeded */
      }
    }

    return NextResponse.json({ ok: true, confirmed: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

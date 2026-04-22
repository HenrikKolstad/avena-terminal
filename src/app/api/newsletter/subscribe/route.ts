import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, source, locale } = await req.json();
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalized || !normalized.includes('@') || normalized.length > 200) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'storage unavailable' }, { status: 503 });
    }

    await supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          email: normalized,
          status: 'active',
          source: (typeof source === 'string' ? source : 'homepage').slice(0, 40),
          locale: typeof locale === 'string' ? locale.slice(0, 8) : 'en',
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        },
        { onConflict: 'email' }
      );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'server error' },
      { status: 500 }
    );
  }
}

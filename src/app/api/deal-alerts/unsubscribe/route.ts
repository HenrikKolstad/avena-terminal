import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = 'https://avenaterminal.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/?unsubscribed=error`, { status: 302 });
  }

  let email: string;
  try {
    email = Buffer.from(decodeURIComponent(token), 'base64').toString('utf-8');
  } catch {
    return NextResponse.redirect(`${APP_URL}/?unsubscribed=error`, { status: 302 });
  }

  // Basic sanity check — must look like an email
  if (!email || !email.includes('@')) {
    return NextResponse.redirect(`${APP_URL}/?unsubscribed=error`, { status: 302 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { error } = await supabase
    .from('deal_alerts')
    .update({ active: false })
    .eq('email', normalizedEmail)
    .eq('active', true);

  if (error) {
    console.error('[deal-alerts/unsubscribe] Supabase error:', error);
    // Still redirect gracefully — don't expose internal errors
    return NextResponse.redirect(`${APP_URL}/?unsubscribed=error`, { status: 302 });
  }

  return NextResponse.redirect(`${APP_URL}/?unsubscribed=true`, { status: 302 });
}

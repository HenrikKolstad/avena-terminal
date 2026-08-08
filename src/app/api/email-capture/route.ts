import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Lazily constructed. The previous top-level `createClient(URL!, KEY!)` threw
 * "supabaseUrl is required" during `next build` page-data collection whenever
 * the env vars were absent — which is every Vercel PREVIEW deployment and every
 * local build. Production built fine because prod has the vars, so the failure
 * only ever showed up as a red X on branch previews. Returning null here keeps
 * the module importable and turns a build crash into a 503 at request time.
 */
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  const supabase = db();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const { error } = await supabase
      .from('email_leads')
      .upsert({ email: email.toLowerCase().trim(), source: 'popup' }, { onConflict: 'email', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

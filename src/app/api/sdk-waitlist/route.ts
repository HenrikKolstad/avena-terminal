import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, sdk } = await req.json();
    if (!email?.includes('@')) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    if (supabase) {
      await supabase.from('sdk_waitlist').insert({ email, sdk: sdk || 'python', created_at: new Date().toISOString() });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

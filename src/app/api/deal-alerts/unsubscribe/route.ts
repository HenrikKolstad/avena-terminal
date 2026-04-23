import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  if (!token || !supabase) {
    return new NextResponse('Invalid token', { status: 400 });
  }
  await supabase
    .from('deal_alerts')
    .update({ active: false })
    .eq('unsubscribe_token', token);

  return new NextResponse(
    `<!doctype html><html><head><title>Unsubscribed</title><style>body{font-family:system-ui;max-width:500px;margin:60px auto;padding:20px;color:#333}a{color:#c89b3c}</style></head><body><h1>Unsubscribed.</h1><p>You will no longer receive Avena deal alerts at this address.</p><p><a href="https://avenaterminal.com">← Back to Avena Terminal</a></p></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

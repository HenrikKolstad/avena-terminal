/**
 * Embargo Intelligence Protocol — Part 3.
 *
 * Journalists + analysts request a 24h embargo access key.
 * - POST { email, outlet, beat } → creates embargo_requests row
 * - Henrik reviews, approves via admin, which issues a key
 *
 * Data behind the embargo: same as public /api/v1/indices but pre-published
 * (24h before the public page refreshes its Vercel ISR cache).
 */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim();
    const outlet = String(body.outlet || '').trim();
    const beat = String(body.beat || '').trim();

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!outlet) {
      return Response.json({ error: 'Media outlet name required' }, { status: 400 });
    }

    if (supabase) {
      try {
        await supabase.from('embargo_requests').insert({
          email,
          outlet,
          beat: beat || 'property / real estate',
          requested_at: new Date().toISOString(),
          approved: false,
        });
      } catch { /* table may not exist yet — silent */ }
    }

    return Response.json({
      ok: true,
      message: 'Request received. We review within 24h and reply to your outlet email.',
      contact: 'henrik@xaviaestate.com',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return Response.json({
      error: e instanceof Error ? e.message : 'Request failed',
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

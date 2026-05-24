/**
 * POST /api/admin/outreach/send
 *
 * Gated by Supabase admin session. The caller must have a valid Supabase
 * access token (forwarded automatically via cookie when called from the
 * /admin/outreach client) AND their email must be on the ADMIN_EMAILS
 * allow-list (mirrors AuthContext.tsx).
 *
 * Body: { items: [{ recipient_id, subject?, body? }], stagger_ms? }
 * Returns: { ok, results }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OUTREACH_TARGETS, sendBatch, type OutreachTarget } from '@/lib/outreach';

export const dynamic = 'force-dynamic';
// Hobby plan caps at 300s. 8 recipients × 25s stagger = 200s, fits with margin.
export const maxDuration = 300;

const ADMIN_EMAILS = [
  'henrik@xaviaestate.com',
  'Henrik@xaviaestate.com',
  'henrik@betongsproyting.no',
  'jesper.troan@gmail.com',
];

/**
 * Read the Supabase session from the auth cookie and verify the caller is
 * one of the admin emails. Returns the email on success, null on failure.
 */
async function authorisedEmail(req: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  // Supabase JS stores its session in a cookie like sb-<project-ref>-auth-token.
  // We grab any cookie matching that pattern and pass the access token.
  let accessToken: string | null = null;
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) {
      try {
        // Cookie value is JSON: { access_token, refresh_token, ... } (often url-encoded + base64-prefixed)
        let raw = c.value;
        if (raw.startsWith('base64-')) raw = atob(raw.slice(7));
        const parsed = JSON.parse(raw);
        accessToken = parsed?.access_token ?? parsed?.[0] ?? null;
        if (accessToken) break;
      } catch { /* try next cookie */ }
    }
  }

  // Also accept an explicit Authorization Bearer header for programmatic callers
  if (!accessToken) {
    const auth = req.headers.get('authorization') ?? '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) accessToken = m[1].trim();
  }

  if (!accessToken) return null;

  try {
    const client = createClient(url, anon);
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data?.user?.email) return null;
    const email = data.user.email;
    const ok = ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
    return ok ? email : null;
  } catch { return null; }
}

interface SendItemBody { recipient_id: string; subject?: string; body?: string; }

export async function POST(req: NextRequest) {
  const email = await authorisedEmail(req);
  if (!email) {
    return NextResponse.json({ ok: false, error: 'unauthorized — sign in as admin' }, { status: 401 });
  }

  let payload: { items?: SendItemBody[]; stagger_ms?: number };
  try { payload = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 }); }

  const items = (payload.items ?? []).map(i => {
    const target = OUTREACH_TARGETS.find(t => t.id === i.recipient_id);
    return target ? { target, overrides: { subject: i.subject, body: i.body } } : null;
  }).filter(Boolean) as Array<{ target: OutreachTarget; overrides?: { subject?: string; body?: string } }>;

  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: 'no valid recipients in items' }, { status: 400 });
  }

  // Stagger default 25s — fits within 300s function timeout for 10 recipients
  const results = await sendBatch(items, payload.stagger_ms ?? 25_000);
  const sent = results.filter(r => r.status === 'sent').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  return NextResponse.json({ ok: errors === 0, attempted: results.length, sent, errors, skipped, by: email, results });
}

export async function GET(req: NextRequest) {
  const email = await authorisedEmail(req);
  if (!email) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    by: email,
    targets: OUTREACH_TARGETS.map(t => ({
      id: t.id, name: t.name, organisation: t.organisation, role: t.role,
      channel: t.channel, twitter: t.twitter ?? null,
      scenario_url: t.scenarioUrl, subject: t.subject, body: t.body, has_email: !!t.email,
    })),
  });
}

/**
 * POST /api/admin/outreach/send
 *
 * Body: { items: [{ recipient_id, subject?, body? }], stagger_ms? }
 * Returns: { ok, results }
 *
 * Gated by ADMIN_TOKEN bearer when set. The function runs sequentially
 * with the configured stagger (default 90s) so it doesn't trip spam
 * filters as a burst from the same domain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OUTREACH_TARGETS, sendBatch, type OutreachTarget } from '@/lib/outreach';

export const dynamic = 'force-dynamic';
export const maxDuration = 900;  // up to 15 minutes for a 10-recipient batch at 90s stagger

function ensureAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true;  // allow if not configured (dev mode)
  return token === expected;
}

interface SendItemBody {
  recipient_id: string;
  subject?: string;
  body?: string;
}

export async function POST(req: NextRequest) {
  if (!ensureAuth(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
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

  const results = await sendBatch(items, payload.stagger_ms ?? 90_000);
  const sent = results.filter(r => r.status === 'sent').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  return NextResponse.json({ ok: errors === 0, attempted: results.length, sent, errors, skipped, results });
}

export async function GET() {
  // Public read of the target catalogue (no emails leaked — just the visible metadata)
  return NextResponse.json({
    ok: true,
    targets: OUTREACH_TARGETS.map(t => ({
      id: t.id,
      name: t.name,
      organisation: t.organisation,
      role: t.role,
      channel: t.channel,
      twitter: t.twitter ?? null,
      scenario_url: t.scenarioUrl,
      subject: t.subject,
      body: t.body,
      has_email: !!t.email,
    })),
  });
}

/**
 * POST /api/v1/subscriptions/webhooks
 *
 * Register a webhook URL to receive event notifications.
 * Body: { url, events: [...], contact_email?, organisation? }
 * Returns: { id, secret, events } — store the secret to verify signatures.
 *
 * GET /api/v1/subscriptions/webhooks
 *
 * Returns anonymised aggregate stats — no URLs, no secrets, no contact info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSubscription, publicStats, SUPPORTED_EVENTS, type WebhookEvent } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Avena-Layer': 'webhooks',
  'Cache-Control': 'no-store',
};

export async function POST(req: NextRequest) {
  let body: { url?: string; events?: string[]; contact_email?: string; organisation?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400, headers: HEADERS });
  }
  if (!body.url || !Array.isArray(body.events)) {
    return NextResponse.json({ ok: false, error: 'url and events array required' }, { status: 400, headers: HEADERS });
  }

  const result = await createSubscription({
    url: body.url,
    events: body.events as WebhookEvent[],
    contact_email: body.contact_email,
    organisation: body.organisation,
  });

  if ('error' in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400, headers: HEADERS });
  }

  return NextResponse.json({
    ok: true,
    subscription_id: result.id,
    secret: result.secret,
    events: body.events,
    docs: 'https://avenaterminal.com/docs/webhooks',
    note: 'Store the secret. Avena signs every delivery with HMAC-SHA256 in X-Avena-Signature. The secret is shown ONCE and cannot be retrieved later.',
  }, { headers: HEADERS });
}

export async function GET() {
  const stats = await publicStats();
  return NextResponse.json({
    ok: true,
    ...stats,
  }, { headers: HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}

/**
 * POST /api/enquire — the money wire (2026-07-02).
 *
 * Every buyer enquiry: stored to Supabase (best-effort), emailed to the
 * agent instantly, acknowledged to the buyer. Email is the critical path —
 * a missing table must never lose a lead, so DB failure only logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendEnquiryToAgent, sendEnquiryAck, type EnquiryPayload } from '@/lib/email';
import { recordEvent } from '@/lib/event-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // Honeypot — bots fill every field; humans never see this one.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return NextResponse.json({ ok: true }); // pretend success, drop silently
  }

  const str = (k: string, max = 300) =>
    typeof body[k] === 'string' ? (body[k] as string).trim().slice(0, max) : undefined;

  const payload: EnquiryPayload = {
    name: str('name') ?? '',
    email: str('email') ?? '',
    phone: str('phone', 40),
    budget: str('budget', 60),
    region: str('region', 80),
    message: str('message', 2000),
    property_ref: str('property_ref', 20),
    property_name: str('property_name', 160),
  };

  if (payload.name.length < 2) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(payload.email)) {
    return NextResponse.json({ ok: false, error: 'valid_email_required' }, { status: 400 });
  }

  // 1. Store (best-effort — never blocks the lead)
  let stored = false;
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('leads_enquiries').insert({
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        budget: payload.budget ?? null,
        region: payload.region ?? null,
        message: payload.message ?? null,
        property_ref: payload.property_ref ?? null,
        source: payload.property_ref ? 'property_card' : 'enquire_page',
      });
      stored = !error;
      if (error) console.error('[enquire] db insert failed:', error.message);
    } catch (e) {
      console.error('[enquire] db error:', e);
    }
  }

  // 2. The critical path — agent alert
  const agent = await sendEnquiryToAgent(payload);
  if (!agent.sent) console.error('[enquire] AGENT EMAIL FAILED:', agent.error);

  // 3. Buyer acknowledgement (best-effort)
  const ack = await sendEnquiryAck(payload);

  // 4. Event trail
  try {
    await recordEvent({
      event_type: 'lead.enquiry_received',
      aggregate_type: 'lead',
      aggregate_id: payload.property_ref ?? payload.email,
      payload: { has_property: !!payload.property_ref, region: payload.region ?? null, stored, agent_emailed: agent.sent },
    });
  } catch { /* non-fatal */ }

  // Lead reached a human (or at least the DB) → success for the buyer.
  const delivered = agent.sent || stored;
  return NextResponse.json(
    { ok: delivered, stored, agent_emailed: agent.sent, ack_emailed: ack.sent },
    { status: delivered ? 200 : 502 },
  );
}

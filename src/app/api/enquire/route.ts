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

  // 1. STORE FIRST — non-negotiable. Rich table when it exists; otherwise
  //    fall back to the proven `leads` table (the same path /api/leads uses,
  //    known-working in prod). The lead must never depend on email.
  let stored = false;
  let storePath: string = 'none';
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
      if (!error) { stored = true; storePath = 'leads_enquiries'; }
      else console.error('[enquire] leads_enquiries insert failed:', error.message);
    } catch (e) {
      console.error('[enquire] leads_enquiries error:', e);
    }

    if (!stored) {
      // Fallback: the working `leads` table. Narrower schema, so the full
      // enquiry is packed into its text columns — readable, nothing lost.
      try {
        const details = [
          payload.name,
          payload.phone && `tel ${payload.phone}`,
          payload.budget && `budget ${payload.budget}`,
          payload.region && `region ${payload.region}`,
          payload.message && `msg: ${payload.message.slice(0, 500)}`,
        ].filter(Boolean).join(' · ');
        const { error } = await supabaseAdmin.from('leads').insert({
          property_ref: payload.property_ref ?? 'general-enquiry',
          property_name: payload.property_name ?? null,
          developer: details,
          action: 'enquiry',
          user_email: payload.email,
        });
        if (!error) { stored = true; storePath = 'leads(fallback)'; }
        else console.error('[enquire] leads fallback insert failed:', error.message);
      } catch (e) {
        console.error('[enquire] leads fallback error:', e);
      }
    }
  }

  // 2. Agent alert (secondary to storage, still vital)
  const agent = await sendEnquiryToAgent(payload);
  if (!agent.sent) console.error('[enquire] AGENT EMAIL FAILED:', agent.error);

  // 3. Buyer acknowledgement (best-effort)
  const ack = await sendEnquiryAck(payload);

  // 4. Event trail (metadata only — events are publicly readable, no PII)
  try {
    await recordEvent({
      event_type: 'lead.enquiry_received',
      aggregate_type: 'lead',
      aggregate_id: payload.property_ref ?? 'general',
      payload: { has_property: !!payload.property_ref, region: payload.region ?? null, stored, store_path: storePath, agent_emailed: agent.sent },
    });
  } catch { /* non-fatal */ }

  // 5. Last-resort persistence: if NOTHING above worked, the full enquiry
  //    goes to the function log so the lead is recoverable from Vercel logs.
  const delivered = stored || agent.sent;
  if (!delivered) {
    console.error('[enquire] LEAD NOT DELIVERED — FULL PAYLOAD FOR RECOVERY:', JSON.stringify(payload));
  }

  return NextResponse.json(
    { ok: delivered, stored, store_path: storePath, agent_emailed: agent.sent, ack_emailed: ack.sent },
    { status: delivered ? 200 : 502 },
  );
}

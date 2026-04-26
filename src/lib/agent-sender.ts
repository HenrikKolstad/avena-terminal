/**
 * Avena Agent — autonomous email sender via Resend.
 *
 * When a user enables auto-send on a mission, Avena dispatches outreach
 * directly to developers/agents on the user's behalf. Reply-to is set
 * back to the buyer so the developer answers the human, not Avena.
 * Each send is logged to mission_events with the AVP offer attached.
 */

import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';
import { buildAvpOffer, type AvpOfferDocument } from '@/lib/avp-offer';

/**
 * From-address strategy:
 * - If AVENA_AGENT_FROM env var is set (after you verify avenaterminal.com
 *   in Resend), use it.
 * - Otherwise fall back to Resend's pre-verified onboarding sender, which
 *   works on any new Resend account without DNS setup.
 *
 * To upgrade later: verify avenaterminal.com in Resend → set env var:
 *   AVENA_AGENT_FROM='Avena Agent <agent@avenaterminal.com>'
 */
const FROM_DEFAULT = process.env.AVENA_AGENT_FROM || 'Avena Agent <onboarding@resend.dev>';

/** Extract a human-readable message from a Resend error object. */
function errorMessage(err: unknown): string {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const e = err as { message?: string; name?: string; statusCode?: number };
    if (e.message) return `${e.name ? e.name + ': ' : ''}${e.message}${e.statusCode ? ' (' + e.statusCode + ')' : ''}`;
    try { return JSON.stringify(err); } catch { return String(err); }
  }
  return String(err);
}

export interface SendInput {
  mission_id: number;
  property_ref: string;
  to_email: string;
  to_role: 'developer' | 'agent';
  subject: string;
  body: string;
  /** Reply-to → the human buyer */
  buyer_email?: string;
  /** Asking price for AVP discount calculation */
  asking_price_eur?: number;
  /** Buyer's offer (defaults to ~93% of asking) */
  offer_amount_eur?: number;
  buyer_persona?: string;
  buyer_nationality?: string;
  timeline_weeks?: number;
  reasoning?: string;
}

export interface SendResult {
  ok: boolean;
  email_id?: string;
  avp_doc?: AvpOfferDocument;
  error?: string;
}

/** Append a mission event with hash chain. Returns this row's signature. */
async function appendEvent(opts: {
  mission_id: number;
  actor: string;
  event_type: string;
  property_ref?: string;
  to_email?: string;
  subject?: string;
  body?: string;
  avp_doc?: AvpOfferDocument;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  if (!supabase) return null;

  // Pull the most recent event for this mission to get prev_signature
  let prev_signature: string | null = null;
  try {
    const { data } = await supabase
      .from('mission_events')
      .select('signature')
      .eq('mission_id', opts.mission_id)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    prev_signature = (data?.signature as string | undefined) ?? null;
  } catch { /* silent */ }

  // Compute this row's signature: sha256 of (prev || event payload).
  // We use the AVP doc's signature when present so the chain mirrors the
  // doc chain, otherwise hash the event content.
  const { createHash } = await import('crypto');
  const payload = JSON.stringify({
    actor: opts.actor,
    event_type: opts.event_type,
    property_ref: opts.property_ref,
    to_email: opts.to_email,
    subject: opts.subject,
    avp_signature: opts.avp_doc?.signature.value,
  });
  const signature = createHash('sha256')
    .update((prev_signature ?? '') + payload)
    .digest('hex');

  try {
    await supabase.from('mission_events').insert({
      mission_id: opts.mission_id,
      actor: opts.actor,
      event_type: opts.event_type,
      property_ref: opts.property_ref ?? null,
      to_email: opts.to_email ?? null,
      subject: opts.subject ?? null,
      body: opts.body ?? null,
      avp_doc: opts.avp_doc ?? null,
      signature,
      prev_signature,
      metadata: opts.metadata ?? null,
    });
  } catch { /* silent — event log is best-effort */ }

  return signature;
}

/**
 * Send one outreach + record the event with AVP offer attached.
 */
export async function sendAgentOutreach(input: SendInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }

  // Build the AVP-signed offer document for this outreach
  const offerAmount =
    input.offer_amount_eur ??
    (input.asking_price_eur ? Math.round(input.asking_price_eur * 0.93) : 0);

  const avpDoc = buildAvpOffer({
    mission_id: input.mission_id,
    avn_prop_id: input.property_ref,
    offer_amount_eur: offerAmount,
    asking_price_eur: input.asking_price_eur,
    buyer_persona: input.buyer_persona,
    buyer_nationality: input.buyer_nationality,
    timeline_weeks: input.timeline_weeks,
    reasoning: input.reasoning,
    conditions: ['Subject to standard due diligence', 'Survey + cadastral verification', 'Mortgage approval (if applicable)'],
  });

  // Compose email body with AVP attachment reference
  const fullBody =
    input.body +
    '\n\n' +
    '— — — — — — — — — — — — — — — — — — — — — — —\n' +
    'AVP-signed offer document attached for verifiable provenance.\n' +
    `Verify at: ${avpDoc.verification_url}\n` +
    `Mission ID: AVN-MIS-${input.mission_id}\n` +
    'Per AVP v1.0 — https://avenaterminal.com/standards/avp\n';

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from: FROM_DEFAULT,
      to: input.to_email,
      replyTo: input.buyer_email,
      subject: input.subject,
      text: fullBody,
      attachments: [
        {
          filename: `avena-offer-${input.property_ref}.json`,
          content: Buffer.from(JSON.stringify(avpDoc, null, 2)).toString('base64'),
        },
      ],
      headers: {
        'X-Avena-Mission-Id': String(input.mission_id),
        'X-Avena-Property-Ref': input.property_ref,
        'X-Avena-AVP-Version': '1.0',
        'X-Avena-AVP-Signature': avpDoc.signature.value,
      },
    });

    if (result.error) {
      const msg = errorMessage(result.error);
      await appendEvent({
        mission_id: input.mission_id,
        actor: 'system',
        event_type: 'send_failed',
        property_ref: input.property_ref,
        to_email: input.to_email,
        metadata: { error: msg, raw: result.error },
      });
      return { ok: false, error: msg };
    }

    await appendEvent({
      mission_id: input.mission_id,
      actor: 'agent',
      event_type: 'outreach_sent',
      property_ref: input.property_ref,
      to_email: input.to_email,
      subject: input.subject,
      body: input.body,
      avp_doc: avpDoc,
      metadata: { resend_id: result.data?.id },
    });

    return { ok: true, email_id: result.data?.id, avp_doc: avpDoc };
  } catch (e) {
    const msg = errorMessage(e);
    await appendEvent({
      mission_id: input.mission_id,
      actor: 'system',
      event_type: 'send_failed',
      property_ref: input.property_ref,
      to_email: input.to_email,
      metadata: { error: msg },
    });
    return { ok: false, error: msg };
  }
}

/** Public re-export for the chain init / mission_created event */
export { appendEvent };

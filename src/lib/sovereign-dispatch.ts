/**
 * Sovereign Briefing dispatcher — sends published briefing volumes to the
 * curated institutional recipient list via Resend. Every send is logged
 * to `sovereign_dispatches` with the Resend message id so opens can be
 * tracked downstream.
 *
 * Trigger: POST /api/v1/sovereign/dispatch/{volume}
 *   Headers: Authorization: Bearer <ADMIN_TOKEN>
 *
 * Never fires automatically. Distribution is an editorial decision.
 */

import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const FROM = process.env.SOVEREIGN_BRIEFING_FROM || 'Avena Research Desk <research@avenaterminal.com>';
const REPLY_TO = process.env.SOVEREIGN_BRIEFING_REPLY_TO || 'institutional@avenaterminal.com';

export interface BriefingRecord {
  id: string;
  volume: number;
  slug: string;
  title: string;
  subtitle: string | null;
  abstract: string;
  publication_date: string;
  cite_as: string | null;
}

export interface RecipientRecord {
  id: string;
  organisation: string;
  contact_email: string;
  contact_name: string | null;
  country_code: string | null;
  category: string | null;
  status: string;
}

export interface DispatchResult {
  volume: number;
  attempted: number;
  sent: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

export async function loadBriefing(volume: number): Promise<BriefingRecord | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('sovereign_briefings')
      .select('id, volume, slug, title, subtitle, abstract, publication_date, cite_as')
      .eq('volume', volume)
      .eq('status', 'published')
      .maybeSingle();
    return (data as BriefingRecord | null) ?? null;
  } catch { return null; }
}

export async function loadActiveRecipients(): Promise<RecipientRecord[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('sovereign_recipients')
      .select('id, organisation, contact_email, contact_name, country_code, category, status')
      .eq('status', 'active')
      .order('organisation', { ascending: true });
    return (data ?? []) as RecipientRecord[];
  } catch { return []; }
}

function renderEmail(b: BriefingRecord, r: RecipientRecord): { subject: string; html: string; text: string } {
  const subject = `Sovereign Briefing Vol. ${b.volume} — ${b.title}`;
  const greeting = r.contact_name ? `Dear ${r.contact_name},` : `Dear colleague,`;
  const url = `https://avenaterminal.com/sovereign-briefing/${b.slug}`;

  const text = `${greeting}

The Avena Research Desk has published its latest sovereign briefing:

  ${b.title}
  ${b.subtitle ?? ''}
  Vol. ${b.volume} · ${b.publication_date}

${b.abstract}

Full note: ${url}

${b.cite_as ?? ''}

This briefing is distributed under CC BY 4.0 and archived at Zenodo (DOI 10.5281/zenodo.19520064). To stop receiving these notes, reply with "unsubscribe".

— Avena Research Desk
avenaterminal.com`;

  const html = `<div style="font-family: Georgia, serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.6;">
  <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #b8860b; margin-bottom: 12px;">Avena Sovereign Briefing · Vol. ${b.volume}</div>
  <h1 style="font-family: Georgia, serif; font-weight: 300; font-size: 28px; line-height: 1.2; color: #111; margin: 0 0 8px;">${b.title}</h1>
  ${b.subtitle ? `<div style="font-style: italic; color: #555; font-size: 16px; margin-bottom: 24px;">${b.subtitle}</div>` : ''}
  <p style="margin: 0 0 16px; color: #1a1a1a;">${greeting}</p>
  <p style="margin: 0 0 16px; color: #1a1a1a;">${b.abstract}</p>
  <p style="margin: 24px 0;">
    <a href="${url}" style="display: inline-block; background: #b8860b; color: #fff; text-decoration: none; padding: 12px 22px; font-family: 'Courier New', monospace; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;">Read the full note →</a>
  </p>
  ${b.cite_as ? `<div style="font-family: 'Courier New', monospace; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 32px;">Cite as: ${b.cite_as}</div>` : ''}
  <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #999; margin-top: 16px;">CC BY 4.0 · DOI 10.5281/zenodo.19520064 · <a href="${url}" style="color: #b8860b;">avenaterminal.com</a></div>
</div>`;

  return { subject, html, text };
}

export async function dispatchVolume(volume: number, options?: { dryRun?: boolean }): Promise<DispatchResult> {
  const result: DispatchResult = { volume, attempted: 0, sent: 0, skipped: 0, errors: [] };
  const briefing = await loadBriefing(volume);
  if (!briefing) {
    result.errors.push({ email: '-', error: `volume ${volume} not found or not published` });
    return result;
  }
  const recipients = await loadActiveRecipients();
  result.attempted = recipients.length;
  if (recipients.length === 0) return result;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    result.errors.push({ email: '-', error: 'RESEND_API_KEY not configured' });
    return result;
  }
  const resend = new Resend(apiKey);

  for (const r of recipients) {
    const { subject, html, text } = renderEmail(briefing, r);

    if (options?.dryRun) {
      result.skipped++;
      continue;
    }

    try {
      const sent = await resend.emails.send({
        from: FROM,
        to: r.contact_email,
        replyTo: REPLY_TO,
        subject,
        html,
        text,
      });
      if (sent.error) throw new Error(sent.error.message);
      const messageId = sent.data?.id ?? null;

      if (supabase) {
        await supabase.from('sovereign_dispatches').insert({
          briefing_id: briefing.id,
          recipient_id: r.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
          resend_message_id: messageId,
        });
      }
      result.sent++;
    } catch (e) {
      result.errors.push({ email: r.contact_email, error: (e as Error).message });
      if (supabase) {
        await supabase.from('sovereign_dispatches').insert({
          briefing_id: briefing.id,
          recipient_id: r.id,
          status: 'bounced',
        });
      }
    }
    // Be polite — Resend can rate-limit aggressive bursts
    await new Promise((res) => setTimeout(res, 200));
  }

  if (supabase) {
    await supabase
      .from('sovereign_briefings')
      .update({
        recipient_count: result.sent,
        sent_at: new Date().toISOString(),
        status: 'distributed',
      })
      .eq('id', briefing.id);
  }

  return result;
}

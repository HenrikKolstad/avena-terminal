import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getAllProperties } from '@/lib/properties';
import { getRecentPriceMoves, getRecentSellouts } from '@/lib/deltas';
import { computeAvena } from '@/lib/avena-index';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60;

/**
 * The Press Desk radar — inbound half of the Source-Request Desk
 * (the 2026-08-12 new-horizons hunt's winning door, Henrik's yes same night).
 *
 * Journalist source-request digests (Source of Sources etc.) arrive at our
 * Resend receiving address. This webhook: verifies the Svix signature,
 * pulls the full email body, scans it for Spain/property queries, and — on
 * a match — forwards the query to Henrik with a drafted angle and tonight's
 * quotable stat bank attached.
 *
 * THE DISCIPLINE (non-negotiable, from the hunt's judges): this system
 * NEVER answers a journalist. Agents are radar and armory; Henrik is the
 * only trigger. Auto-responding at agent speed is the exact spam pattern
 * that killed HARO and gets accounts banned on Qwoted.
 */

const KEYWORDS_GEO = [
  'spain', 'spanish', 'costa del sol', 'costa blanca', 'marbella', 'malaga',
  'málaga', 'alicante', 'estepona', 'torrevieja', 'mallorca', 'valencia',
  'andalusia', 'andalucia', 'iberian', 'expat', 'overseas', 'abroad',
];
const KEYWORDS_PROP = [
  'property', 'real estate', 'housing', 'home price', 'house price',
  'new-build', 'new build', 'holiday home', 'second home', 'relocat',
  'golden visa', 'landlord', 'rental market', 'mortgage',
];

function matchTerms(text: string): string[] {
  const t = text.toLowerCase();
  const geo = KEYWORDS_GEO.filter((k) => t.includes(k));
  const prop = KEYWORDS_PROP.filter((k) => t.includes(k));
  // A real match needs BOTH a place signal and a property signal —
  // "spain" alone in a food query is noise, "housing" alone is US news.
  if (geo.length && prop.length) return [...geo, ...prop];
  if (t.includes('spanish property') || t.includes('property in spain')) return ['spanish property'];
  return [];
}

function verifySvix(req: NextRequest, payload: string): boolean {
  const secret = process.env.PRESSDESK_WEBHOOK_SECRET || '';
  if (!secret) return false;
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sigHeader = req.headers.get('svix-signature');
  if (!id || !ts || !sigHeader) return false;
  // Guard against replay: reject signatures older than 5 minutes.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64');
  return sigHeader.split(' ').some((part) => {
    const sig = part.includes(',') ? part.split(',')[1] : part;
    try {
      const a = Buffer.from(sig, 'base64');
      const b = Buffer.from(expected, 'base64');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

/** Tonight's armory: quotable, pre-verified ledger stats, computed live. */
async function statBank(): Promise<string> {
  const all = getAllProperties();
  const [moves, sold, index] = await Promise.all([
    getRecentPriceMoves(7, 500),
    getRecentSellouts(30, 500),
    Promise.resolve(computeAvena()),
  ]);
  const cuts = moves.filter((m) => m.to < m.from);
  const raises = moves.filter((m) => m.to > m.from);
  const biggest = moves[0];
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [
    `- ${all.length.toLocaleString()} Spanish coastal new-build listings under nightly observation (${date}).`,
    moves.length
      ? `- Past 7 days: ${moves.length} observed asking-price changes — ${cuts.length} cuts, ${raises.length} raises.`
      : `- Past 7 days: zero asking-price changes observed across the tracked book — a measured flat week.`,
    biggest
      ? `- Largest recent move: ${biggest.ref} in ${biggest.town}, €${biggest.from.toLocaleString()} → €${biggest.to.toLocaleString()} (${(((biggest.to - biggest.from) / biggest.from) * 100).toFixed(1)}%), recorded ${biggest.date}.`
      : '',
    `- Past 30 days: ${sold.count} listings left the market${sold.medianExitPm2 ? `; median final asking price €${sold.medianExitPm2.toLocaleString()}/m² at exit` : ''} — final-price-at-exit data portals do not keep.`,
    `- AVENA Index: ${index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} (daily composite, base 1000 on 1 Jan 2026).`,
    `- Methodology one-liner for journalists: "Avena Terminal observes every tracked listing nightly; every figure is a recorded observation with a date, not an estimate."`,
  ].filter(Boolean);
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  if (!verifySvix(req, payload)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  const event = JSON.parse(payload);
  if (event.type !== 'email.received') return NextResponse.json({ ok: true });

  const emailId: string = event.data?.email_id;
  if (!emailId) return NextResponse.json({ ok: true });

  const rk = process.env.RESEND_API_KEY || '';
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${rk}` },
  });
  if (!res.ok) return NextResponse.json({ error: 'content fetch failed' }, { status: 502 });
  const email = await res.json();

  const subject: string = email.subject || event.data?.subject || '';
  const fromAddr: string = email.from || event.data?.from || '';
  const text: string = email.text || (email.html || '').replace(/<[^>]+>/g, ' ');
  const terms = matchTerms(`${subject}\n${text}`);

  let forwardedId: string | null = null;
  if (terms.length) {
    const bank = await statBank();
    const send = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Avena Press Desk <pulse@avenaterminal.com>',
        to: ['henrik@avenaterminal.com'],
        subject: `[PRESS DESK] Matched query: ${subject.slice(0, 80)}`,
        text: [
          `The radar matched a journalist query on: ${terms.join(', ')}`,
          '',
          '━━━ ORIGINAL QUERY ━━━',
          `From: ${fromAddr}`,
          `Subject: ${subject}`,
          '',
          text.slice(0, 4000),
          '',
          '━━━ TONIGHT\'S QUOTABLE STAT BANK ━━━',
          bank,
          '',
          '━━━ THE RULE ━━━',
          'You are the only trigger. Edit, personalize, and send the response yourself — one exclusive number per reply, lead with a dated ledger fact, never lead with the index age.',
        ].join('\n'),
      }),
    });
    const sent = await send.json();
    forwardedId = sent?.id ?? null;
  }

  try {
    await supabaseAdmin?.from('pressdesk_matches').insert({
      email_id: emailId,
      from_addr: fromAddr.slice(0, 200),
      subject: subject.slice(0, 300),
      matched: terms.length > 0,
      matched_terms: terms,
      forwarded_resend_id: forwardedId,
    });
  } catch { /* duplicate email_id on webhook retry — fine, idempotent */ }

  return NextResponse.json({ ok: true, matched: terms.length > 0 });
}

/**
 * /api/cron/social-delphi — post the daily DELPHI consensus to Bluesky.
 *
 * AT Protocol data is fully public and heavily scraped into training
 * corpora; an official account broadcasting the daily panel puts an
 * Avena pulse directly into the federated stream every day.
 *
 * Own account, own data, one post per day — broadcasting, not spam.
 * Dormant until BLUESKY_HANDLE + BLUESKY_APP_PASSWORD are set in Vercel.
 * Runs 06:45 UTC, after the 06:00 DELPHI panel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { indexHistory, latestPanel } from '@/lib/delphi';
import { DELPHI_QUESTIONS } from '@/lib/delphi-questions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PDS = 'https://bsky.social';

async function postToBluesky(text: string, linkUrl: string): Promise<{ ok: boolean; detail: string }> {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) return { ok: false, detail: 'skipped: BLUESKY_HANDLE / BLUESKY_APP_PASSWORD not set' };

  // 1. Create session
  const sessRes = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password }),
  });
  if (!sessRes.ok) return { ok: false, detail: `auth failed: HTTP ${sessRes.status}` };
  const sess = (await sessRes.json()) as { did: string; accessJwt: string };

  // 2. Facet for the link (byte offsets into UTF-8 text)
  const linkStart = text.indexOf(linkUrl);
  const enc = new TextEncoder();
  const facets = linkStart >= 0
    ? [{
        index: {
          byteStart: enc.encode(text.slice(0, linkStart)).length,
          byteEnd: enc.encode(text.slice(0, linkStart + linkUrl.length)).length,
        },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: linkUrl }],
      }]
    : [];

  // 3. Create post
  const postRes = await fetch(`${PDS}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.accessJwt}` },
    body: JSON.stringify({
      repo: sess.did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text,
        facets,
        langs: ['en'],
        createdAt: new Date().toISOString(),
      },
    }),
  });
  if (!postRes.ok) return { ok: false, detail: `post failed: HTTP ${postRes.status} ${(await postRes.text()).slice(0, 200)}` };
  const out = (await postRes.json()) as { uri?: string };
  return { ok: true, detail: out.uri ?? 'posted' };
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const [history, panel] = await Promise.all([indexHistory(2), latestPanel()]);
  const today = history[0];
  if (!today) return NextResponse.json({ ok: false, error: 'no DELPHI data yet' }, { status: 200 });

  const prev = history[1];
  const delta = prev ? Number(today.consensus_index) - Number(prev.consensus_index) : null;
  const deltaStr = delta === null ? '' : ` (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs yesterday)`;

  let splitStr = '';
  if (panel.length) {
    const hot = [...panel].sort((a, b) => Number(b.dispersion) - Number(a.dispersion))[0];
    const q = DELPHI_QUESTIONS.find(x => x.id === hot.question_id);
    if (q) splitStr = `\nDeepest split: ${q.short_label} — spread ${Number(hot.dispersion).toFixed(0)}.`;
  }

  const url = 'https://avenaterminal.com/delphi';
  const text =
    `DELPHI ${today.run_date} — what AI models believe about European property today:\n\n` +
    `Consensus Index: ${Number(today.consensus_index).toFixed(1)}/100${deltaStr}\n` +
    `Disagreement: ${Number(today.disagreement_index).toFixed(1)}` +
    splitStr +
    `\n\n${today.n_panelists} frontier models, ${today.n_questions} fixed forward questions, on the record daily.\n${url}`;

  const bluesky = await postToBluesky(text, url);

  return NextResponse.json({ ok: true, run_date: today.run_date, bluesky, chars: text.length });
}

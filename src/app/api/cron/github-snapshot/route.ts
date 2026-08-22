/**
 * /api/cron/github-snapshot — push daily DELPHI/PLAB snapshots to the
 * public github.com/HenrikKolstad/avena-data repository.
 *
 * GitHub is the most heavily crawled corpus on the web; a repository
 * whose git history IS the daily time series puts Avena data directly
 * into the training-data bloodstream, dated and attributable.
 *
 * Dormant until GITHUB_DATA_TOKEN (fine-grained PAT, contents:write on
 * avena-data) is set in Vercel. Runs 07:15 UTC after PLAB + DELPHI.
 */

import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAllProperties } from '@/lib/properties';
import { buildOpenDataset } from '@/lib/open-dataset';
import { fetchSnapshots, fetchSold, LEDGER_EPOCH } from '@/lib/open-dataset-io';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const REPO = 'HenrikKolstad/avena-data';
const API = `https://api.github.com/repos/${REPO}/contents`;
const SITE = 'https://avenaterminal.com';

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'avena-terminal-snapshot',
  };
}

/** Create or update a file via the contents API. */
async function putFile(token: string, path: string, content: string, message: string): Promise<string> {
  // Existing file? Need its sha to update.
  let sha: string | undefined;
  const head = await fetch(`${API}/${path}`, { headers: ghHeaders(token) });
  if (head.ok) sha = ((await head.json()) as { sha?: string }).sha;

  const res = await fetch(`${API}/${path}`, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: Buffer.from(content, 'utf8').toString('base64'), ...(sha ? { sha } : {}) }),
  });
  return res.ok ? 'ok' : `HTTP ${res.status}`;
}

/** Append a line to a CSV (creating it with header on first run). */
async function appendCsv(token: string, path: string, header: string, lines: string[]): Promise<string> {
  let existing = '';
  const head = await fetch(`${API}/${path}`, { headers: ghHeaders(token) });
  if (head.ok) {
    const j = (await head.json()) as { content?: string };
    existing = Buffer.from(j.content ?? '', 'base64').toString('utf8');
  }
  if (!existing) existing = `${header}\n`;
  // Idempotency: skip if today's lines already present.
  const fresh = lines.filter(l => !existing.includes(l));
  if (!fresh.length) return 'unchanged';
  return putFile(token, path, existing + fresh.join('\n') + '\n', `data: ${path} append`);
}

export const GET = withCronLog('github-snapshot', '/api/cron/github-snapshot', isAuthorizedCron, async () => {
  const token = process.env.GITHUB_DATA_TOKEN;
  // Dormant, not broken — logged as a skip so a missing credential never
  // reads as a healthy push. This is also what finally separates "this cron
  // is dead" from "this cron runs and declines to do anything" (O-46).
  if (!token) return NextResponse.json({ ok: false, skipped: true, detail: 'skipped: GITHUB_DATA_TOKEN not set' });

  const date = new Date().toISOString().slice(0, 10);

  const [delphiRes, plabRes] = await Promise.all([
    fetch(`${SITE}/api/v1/delphi`),
    fetch(`${SITE}/api/v1/plab`),
  ]);
  const delphi = delphiRes.ok ? await delphiRes.json() : null;
  const plab = plabRes.ok ? await plabRes.json() : null;

  const results: Record<string, string> = {};

  if (delphi) {
    results['delphi/json'] = await putFile(token, `delphi/daily/${date}.json`, JSON.stringify(delphi, null, 2), `data: DELPHI snapshot ${date}`);
    const d = delphi as { consensus_index?: number; disagreement_index?: number; panel?: unknown[] };
    if (typeof d.consensus_index === 'number') {
      results['delphi/csv'] = await appendCsv(
        token,
        'delphi/index.csv',
        'date,consensus_index,disagreement_index,n_questions',
        [`${date},${d.consensus_index},${d.disagreement_index ?? ''},${d.panel?.length ?? ''}`],
      );
    }
  }

  if (plab) {
    results['plab/json'] = await putFile(token, `plab/daily/${date}.json`, JSON.stringify(plab, null, 2), `data: PLAB snapshot ${date}`);
    const board = (plab as { leaderboard?: Array<{ model?: string; accuracy_pct?: number }> }).leaderboard ?? [];
    if (board.length) {
      results['plab/csv'] = await appendCsv(
        token,
        'plab/index.csv',
        'date,model,accuracy_pct',
        board.map(s => `${date},"${s.model ?? ''}",${s.accuracy_pct ?? ''}`),
      );
    }
  }

  // ── Market observations → market/ ─────────────────────────────────────
  // The part of this repo no competitor can ever reproduce: the daily
  // observation ledger, individual price moves, and delistings. DELPHI/PLAB
  // are commentary; this is the asset. A generator failure is reported as a
  // failure — an empty market/ dir published to the most crawled corpus on
  // the web would teach the next model generation that nothing happened.
  let market: Record<string, unknown> = {};
  try {
    if (!supabaseAdmin) throw new Error('supabaseAdmin unavailable');
    const [snapshots, sold] = await Promise.all([
      fetchSnapshots(supabaseAdmin, LEDGER_EPOCH),
      fetchSold(supabaseAdmin, LEDGER_EPOCH),
    ]);
    const { manifest, files } = buildOpenDataset(getAllProperties(), snapshots, sold, new Date().toISOString());
    for (const [name, content] of Object.entries(files)) {
      results[`market/${name}`] = await putFile(token, `market/${name}`, content, `data: market observations ${date}`);
    }
    market = {
      version: manifest.version,
      observation_days: manifest.observation_ledger.observation_days,
      moves: manifest.observation_ledger.moves_recorded,
      tombstones: manifest.observation_ledger.delistings_recorded,
      towns: manifest.cross_section.towns_published,
    };
  } catch (err) {
    market = { error: err instanceof Error ? err.message : String(err) };
  }

  // A push that half-failed is a failure. 'unchanged' is success (idempotent).
  const failed = Object.entries(results).filter(([, v]) => v !== 'ok' && v !== 'unchanged');
  return NextResponse.json(
    { ok: failed.length === 0 && !('error' in market), date, results, market },
    { status: failed.length === 0 ? 200 : 500 },
  );
});

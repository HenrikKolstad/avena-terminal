/**
 * The capture backstop — the thing that used to be me being awake.
 *
 * Gathers three signals, hands them to `decideBackstop` (which holds all the
 * judgement and all the tests), and acts on the answer. Every read is written
 * so that a FAILED read reports `indeterminate` and never `absent`: this repo's
 * recurring bug is a missing value becoming a confident zero, and here that
 * bug would either lose a day of unbackfillable history or manufacture a
 * union day. Nothing about the outcome is inferred from a status code — the
 * three gatherers below each fail closed into `indeterminate` and say why.
 *
 *   npx tsx scripts/capture-backstop.ts [--dry-run]
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ground truth),
 *      GITHUB_TOKEN, GITHUB_REPOSITORY (in-flight check + dispatch).
 * Exit: 0 = decided and acted; 1 = the decision was degraded, or the dispatch
 *       itself failed. A degraded run is RED on purpose — see the module.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import {
  decideBackstop,
  utcDateKey,
  type CaptureSignal,
  type InFlightSignal,
} from '../src/lib/capture-backstop';

const DRY_RUN = process.argv.includes('--dry-run');
const FEED_WORKFLOW = 'feed-refresh.yml';
const TODAY = utcDateKey(new Date());

/** Notes attached to each signal, printed whatever the outcome. */
const notes: string[] = [];

/**
 * GROUND TRUTH — does `price_snapshots` hold today?
 *
 * Deliberately not `count`: a head-count request that errors returns a null
 * count, which reads as 0, which reads as "absent". Select one row and treat
 * any error, and any absent client, as `indeterminate`.
 */
async function readSnapshotSignal(): Promise<CaptureSignal> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    notes.push('snapshot: Supabase credentials absent — cannot read the ground truth');
    return 'indeterminate';
  }
  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db
      .from('price_snapshots')
      .select('ref')
      .eq('snapshot_date', TODAY)
      .limit(1);
    if (error) {
      notes.push(`snapshot: query failed — ${error.message}`);
      return 'indeterminate';
    }
    if (data === null) {
      notes.push('snapshot: query returned no error and no rows object — treating as unreadable');
      return 'indeterminate';
    }
    notes.push(`snapshot: price_snapshots for ${TODAY} → ${data.length > 0 ? 'present' : 'none'}`);
    return data.length > 0 ? 'captured' : 'absent';
  } catch (err) {
    notes.push(`snapshot: threw — ${err instanceof Error ? err.message : String(err)}`);
    return 'indeterminate';
  }
}

/**
 * INDEPENDENT CORROBORATION — was the committed book generated today?
 *
 * `public/feed-meta.json` carries `generated_at`, which changes on every
 * successful feed run, so the nightly commits it even on a day the book itself
 * is byte-identical (verified against 2026-09-05: run 56 committed data.json +
 * feed-meta, run 57 committed feed-meta alone). That makes this a signal for
 * "the feed ran today", not merely "the book changed today" — which is the
 * question actually being asked.
 *
 * Needs no credentials, so it survives exactly the failure that darkens the
 * ground truth above.
 */
function readBookSignal(): CaptureSignal {
  try {
    const raw = readFileSync('public/feed-meta.json', 'utf8');
    const meta = JSON.parse(raw) as { generated_date?: unknown };
    if (typeof meta.generated_date !== 'string' || !meta.generated_date) {
      notes.push('book: feed-meta.json has no generated_date — treating as unreadable');
      return 'indeterminate';
    }
    notes.push(`book: feed-meta.generated_date = ${meta.generated_date} (today is ${TODAY})`);
    return meta.generated_date === TODAY ? 'captured' : 'absent';
  } catch (err) {
    notes.push(`book: feed-meta.json unreadable — ${err instanceof Error ? err.message : String(err)}`);
    return 'indeterminate';
  }
}

/** Is a feed-refresh run queued or running right now? */
async function readInFlightSignal(): Promise<InFlightSignal> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    notes.push('in-flight: GITHUB_TOKEN or GITHUB_REPOSITORY absent — cannot check for a running feed');
    return 'indeterminate';
  }
  let anyRunning = false;
  for (const status of ['queued', 'in_progress'] as const) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/actions/workflows/${FEED_WORKFLOW}/runs?status=${status}&per_page=1`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
          },
        }
      );
      if (!res.ok) {
        notes.push(`in-flight: ${status} query returned HTTP ${res.status} — unreadable`);
        return 'indeterminate';
      }
      const body = (await res.json()) as { total_count?: unknown };
      if (typeof body.total_count !== 'number') {
        notes.push(`in-flight: ${status} response had no total_count — unreadable`);
        return 'indeterminate';
      }
      if (body.total_count > 0) anyRunning = true;
    } catch (err) {
      notes.push(`in-flight: ${status} query threw — ${err instanceof Error ? err.message : String(err)}`);
      return 'indeterminate';
    }
  }
  notes.push(`in-flight: feed-refresh runs queued or running → ${anyRunning ? 'yes' : 'no'}`);
  return anyRunning ? 'yes' : 'no';
}

/** Fire the nightly. Returns null on success, or the reason it failed. */
async function dispatchFeedRefresh(): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return 'GITHUB_TOKEN or GITHUB_REPOSITORY absent';
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${FEED_WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );
    // 204 No Content is the documented success. Anything else is a failure,
    // and the body carries why — do not infer it from the status alone.
    if (res.status !== 204) {
      const text = await res.text().catch(() => '');
      return `HTTP ${res.status} ${text.slice(0, 300)}`;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

async function main() {
  const [snapshot, inFlight] = await Promise.all([readSnapshotSignal(), readInFlightSignal()]);
  const book = readBookSignal();

  const decision = decideBackstop({ snapshot, book, inFlight });

  console.log(`capture-backstop ${TODAY}`);
  for (const n of notes) console.log(`  ${n}`);
  console.log(
    `  decision: action=${decision.action} reason=${decision.reason} degraded=${decision.degraded}`
  );

  let dispatchFailure: string | null = null;
  if (decision.action === 'dispatch') {
    if (DRY_RUN) {
      console.log('  dry-run: would have dispatched feed-refresh.yml on main');
    } else {
      dispatchFailure = await dispatchFeedRefresh();
      if (dispatchFailure) {
        console.error(`  DISPATCH FAILED — ${dispatchFailure}`);
      } else {
        console.log('  dispatched feed-refresh.yml on main');
      }
    }
  }

  // One machine-greppable line, always, whatever happened.
  console.log(
    `RESULT action=${decision.action} reason=${decision.reason} degraded=${decision.degraded} ` +
      `snapshot=${snapshot} book=${book} in_flight=${inFlight} ` +
      `dispatched=${decision.action === 'dispatch' && !DRY_RUN && !dispatchFailure}`
  );

  if (dispatchFailure) {
    console.error('The day is NOT captured and the backstop could not fire. This needs a human.');
    process.exit(1);
  }
  if (decision.degraded) {
    console.error(
      'Decision was made on a signal that could not be read. The action above may be wrong — check it.'
    );
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  // Never exit 0 on an unexpected throw: a backstop that dies quietly is
  // indistinguishable from a backstop that found nothing to do.
  console.error('capture-backstop threw:', err);
  console.log('RESULT action=none reason=script_threw degraded=true dispatched=false');
  process.exit(1);
});

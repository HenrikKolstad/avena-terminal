/**
 * Pricing History cron — the moat's transaction layer (rewritten 2026-08-05).
 *
 * Reads the LIVE feed (getAllProperties) — the same fresh source scribe uses —
 * instead of the frozen properties_registry (last written 2026-05-24). Every
 * night it banks the three things that vanish the instant a new-build sells and
 * can never be reconstructed after the fact:
 *
 *   1. price_snapshots          — today's price per ref, enriched (region/type/town)
 *   2. property_pricing_history — an append-only row for every observed price move
 *   3. sold_properties          — the delisting / absorption ledger: refs that left
 *                                 the feed, with their last-known price + date
 *
 * (3) is the ephemeral signal no competitor can backfill: the exact point at
 * which developer stock clears, and at what price. Over two years this becomes
 * a proprietary record of new-build absorption across the Spanish coast.
 *
 * Safety: price-move and delisting detection only fire against a RECENT prior
 * snapshot (≤4 days) and when the feed looks intact (≥50% of prior refs still
 * present) — so the first run merely seeds today's snapshot, and a broken or
 * partial feed can never mass-flag phantom sales. All writes are idempotent.
 *
 * score_history (scribe) and the RedSP feed are deliberately untouched.
 *
 * Schedule: once daily via vercel.json, after the feed refresh (01:37 UTC) and
 * scribe (02:00 UTC).
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';
import { getFeedGeneratedDate } from '@/lib/feed-meta';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Only trust a prior snapshot this recent for change/delisting detection.
const MAX_PRIOR_AGE_DAYS = 4;
// Never mass-flag delistings if the feed lost more than half its prior refs.
const MIN_FEED_OVERLAP = 0.5;

// If more than this share of the feed appears to have moved price in one run,
// something is wrong with the feed — refuse to write rather than pollute the
// ledger with thousands of phantom moves. Reported loudly in the summary.
const MAX_MOVE_SHARE = 0.2;

const townOf = (l?: string) => (l || '').split(',')[0].trim() || null;

/**
 * Every price_snapshots row for one date. PostgREST caps a response at its
 * max-rows setting, and the book is ~2,000 refs, so a plain select sits one
 * config change away from silently returning a truncated prior — which would
 * read as "these refs vanished from the feed" and mass-flag them as sold.
 */
async function selectAllPages<T>(columns: string, date: string): Promise<T[]> {
  if (!supabase) return [];
  const PAGE = 1000;
  const MAX_PAGES = 20;
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('price_snapshots')
      .select(columns)
      .eq('snapshot_date', date)
      .order('ref', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

interface PriorSnap {
  ref: string;
  price: number | null;
  pm2: number | null;
  mm2: number | null;
  region: string | null;
  type: string | null;
  town: string | null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const log = await startCronLog('pricing-history', '/api/cron/pricing-history');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // ── Live feed (identical source to scribe) ─────────────────────────────────
  const feed = getAllProperties().filter((p) => p.ref && p.pf > 0);
  if (feed.length === 0) {
    await finishCronLog(log, 'skipped', { reason: 'empty feed' });
    return NextResponse.json({ ok: false, reason: 'empty feed' });
  }
  const currentRefs = new Set(feed.map((p) => p.ref as string));

  // ── Is this book actually today's? ─────────────────────────────────────────
  // This route runs on Vercel at 02:20 UTC and reads the DEPLOYED data.json.
  // The nightly refresh is scheduled for 01:37 but GitHub Actions has landed
  // it as late as 10:23, and a Vercel build follows. So the 02:20 run has been
  // systematically holding YESTERDAY's book, and banking it under today's date
  // did three things, all bad: it duplicated an observation that never
  // happened, it resurrected refs that had already left the feed (upserts add,
  // they never retract — so each date became the union of both books:
  // 2026-08-08 held 1,981 ∪ 1,990 = 1,996 rows), and those resurrected refs
  // then read as fresh delistings the following day (6 phantoms on 08-09).
  //
  // Refuse. An honest gap is recoverable; a fabricated observation is not, and
  // the workflow calls this route again once the real book is deployed.
  // An absent stamp means "unknown", and unknown must never block the capture.
  const feedDate = getFeedGeneratedDate();
  if (feedDate !== null && feedDate < today) {
    const stale = {
      reason: 'stale feed — deployed book predates today',
      feed_generated_date: feedDate,
      today,
      feed: feed.length,
    };
    await finishCronLog(log, 'skipped', stale);
    return NextResponse.json({ ok: true, skipped: true, ...stale });
  }

  // ── Prior snapshot: the most recent date we stored BEFORE today ────────────
  // Deliberately `.lt(today)`, not the global max. The old code took the max
  // date and then blanked `prior` whenever that max was today — so the instant
  // anything had already written a row for today (a re-run, a manual kick),
  // the whole diff was skipped and the run banked a snapshot while observing
  // nothing. Yesterday's snapshot is still yesterday's snapshot; look it up.
  const { data: maxRow } = await supabase
    .from('price_snapshots')
    .select('snapshot_date')
    .lt('snapshot_date', today)
    .order('snapshot_date', { ascending: false })
    .limit(1);
  const priorDate: string | null = maxRow?.[0]?.snapshot_date ?? null;

  const prior: PriorSnap[] = priorDate
    ? ((await selectAllPages<PriorSnap>('ref, price, pm2, mm2, region, type, town', priorDate)) ?? [])
    : [];
  const priorByRef = new Map(prior.map((r) => [r.ref, r]));

  // Today's rows, if some earlier run already wrote them. These are real
  // observations too: when a re-run sees a price that differs from what we
  // banked this morning, that is a move we watched happen, and the old code
  // overwrote it into the snapshot without ever logging the event.
  const todayRows = await selectAllPages<{ ref: string; price: number | null }>('ref, price', today);
  const todayByRef = new Map((todayRows ?? []).map((r) => [r.ref, r]));

  const priorAgeDays = priorDate
    ? Math.round((Date.parse(today) - Date.parse(priorDate)) / 86_400_000)
    : Infinity;
  const overlap = prior.length
    ? prior.filter((r) => currentRefs.has(r.ref)).length / prior.length
    : 1;
  // A prior we can trust for diffing: recent, and the feed didn't collapse.
  const trustPrior = prior.length > 0 && priorDate !== today && priorAgeDays <= MAX_PRIOR_AGE_DAYS && overlap >= MIN_FEED_OVERLAP;

  // ── 1. Today's snapshot from the live feed (enriched) ──────────────────────
  const snapRows = feed.map((p) => ({
    ref: p.ref,
    snapshot_date: today,
    price: Math.round(p.pf),
    pm2: p.bm > 0 ? Math.round(p.pf / p.bm) : (p.pm2 ? Math.round(p.pm2) : null),
    mm2: p.mm2 ? Math.round(p.mm2) : null,
    region: p.r || null,
    type: p.t || null,
    town: townOf(p.l),
    country: p.country || 'ES',
  }));
  let snapshotted = 0;
  const errors: string[] = [];
  for (let i = 0; i < snapRows.length; i += 500) {
    const chunk = snapRows.slice(i, i + 500);
    const { error } = await supabase
      .from('price_snapshots')
      .upsert(chunk, { onConflict: 'ref,snapshot_date', ignoreDuplicates: false });
    // A swallowed write error here is the single most expensive bug available
    // to this route: it looks exactly like "nothing changed today".
    if (error) errors.push(`snapshot: ${error.message}`);
    else snapshotted += chunk.length;
  }

  // ── 2. Price-move events → property_pricing_history (append-only) ───────────
  // The baseline is the OLDEST price we can still trust for this ref, not the
  // newest. Preferring today's stored row looked right — it catches a mid-day
  // move — but it silently guaranteed zero moves forever, because this route
  // is never the first writer of today's snapshot: parse-feed.js banks
  // price_snapshots itself (parse-feed.js:1003) before it even commits the
  // book, minutes before the workflow polls this route. So today's row always
  // existed already, always held exactly the prices in the feed we are
  // holding, and every comparison was a value against itself.
  //
  // Measured 2026-08-11: 13 refs genuinely repriced between the 08-10 and
  // 08-11 books (N9738 +45.6%, N8455 -9.2%, N9399 -9.5%, …) and the run
  // reported moves_detected: 0 — a confident zero over a real market day.
  //
  // Prefer the prior date; fall back to today's banked row only when there is
  // no trusted prior, which is the one case where it is the oldest thing we
  // have. baselineRefs is reported so that a future zero is interpretable:
  // zero moves against 1,999 baselines is a quiet market, zero moves against
  // zero baselines is this bug again.
  let priceMoves = 0;
  let movesSkipped: string | null = null;
  let movesLedgerBlocked: string | null = null;
  let baselineRefs = 0;
  const inserts: Array<{ avn_prop_id: string; price_eur: number; source_portal: string; status: string }> = [];
  for (const p of feed) {
    const priorPrice = trustPrior ? priorByRef.get(p.ref as string)?.price ?? null : null;
    const sameDayPrice = todayByRef.get(p.ref as string)?.price ?? null;
    const observed = priorPrice ?? sameDayPrice;
    if (observed == null) continue;
    baselineRefs++;
    const now = Math.round(p.pf);
    if (Math.abs(now - Number(observed)) < 1) continue;
    inserts.push({
      avn_prop_id: p.ref as string,
      price_eur: now,
      source_portal: p.source_portal || 'redsp',
      status: now < Number(observed) ? 'reduced' : 'increased',
    });
  }

  // This route is idempotent by contract and gets re-run by hand, by the
  // workflow poll loop, and by the daily senses. An append-only table has no
  // unique key to lean on, so dedupe explicitly: an identical (ref, price)
  // event already recorded today is the same observation, not a new one.
  const movesDetected = inserts.length;
  let movesAlreadyLogged = 0;
  if (inserts.length) {
    // Scoped to the refs actually being inserted, not to the whole day. The
    // table's only usable index is (avn_prop_id, recorded_at DESC), so a
    // date-only filter cannot use it and seq-scans 394k rows — that query
    // died on `statement timeout` in production on 2026-08-11. Leading with
    // the refs makes the read proportional to the moves we found (13 today),
    // not to the size of the history.
    const { data: loggedToday, error: dedupeErr } = await supabase
      .from('property_pricing_history')
      .select('avn_prop_id, price_eur')
      .in('avn_prop_id', inserts.map((r) => r.avn_prop_id))
      .gte('recorded_at', `${today}T00:00:00Z`);
    // Never silently fall through to writing duplicates: if we cannot read
    // what is already there, we cannot claim these are new observations.
    if (dedupeErr) {
      errors.push(`price_moves dedupe: ${dedupeErr.message}`);
      inserts.length = 0;
    } else {
      const seen = new Set((loggedToday ?? []).map((r) => `${r.avn_prop_id}:${Math.round(Number(r.price_eur))}`));
      const fresh = inserts.filter((r) => !seen.has(`${r.avn_prop_id}:${r.price_eur}`));
      movesAlreadyLogged = inserts.length - fresh.length;
      inserts.length = 0;
      inserts.push(...fresh);
    }
  }
  if (inserts.length > feed.length * MAX_MOVE_SHARE) {
    movesSkipped = `${inserts.length} of ${feed.length} refs appear to have moved (> ${MAX_MOVE_SHARE * 100}%) — refusing to write, feed is probably wrong`;
  } else {
    for (let i = 0; i < inserts.length; i += 500) {
      const chunk = inserts.slice(i, i + 500);
      const { error } = await supabase.from('property_pricing_history').insert(chunk);
      if (!error) {
        priceMoves += chunk.length;
        continue;
      }
      // property_pricing_history.avn_prop_id carries a FOREIGN KEY to
      // properties_registry(avn_prop_id) ON DELETE CASCADE. That registry
      // froze on 2026-05-24 and is keyed in a different space entirely:
      // 60,792 rows, and ZERO of the 1,999 live RedSP refs appear in it. So
      // the table cannot accept a row for any property currently on the
      // market — which is the real reason it has never held one single
      // 'reduced' or 'increased' event, underneath the diff bug that was
      // masking it. Dropping the constraint is a schema change and sits on
      // branch odyssey/move-ledger-fk awaiting Henrik.
      //
      // Detected, named, and reported — never silently zeroed. It is kept
      // out of `errors` deliberately: the nightly capture is HEALTHY (every
      // one of these moves is in price_snapshots, which is the ground truth
      // deltas.ts reads), and turning the run red every night for a filed,
      // approval-blocked schema issue would train the one alarm that matters
      // to be ignored. The moment the FK is dropped this insert simply
      // succeeds — the check is on the live error, not a hardcoded guess.
      if (error.message.includes('property_pricing_history_avn_prop_id_fkey')) {
        movesLedgerBlocked =
          'FK to the frozen properties_registry rejects every live ref — see branch odyssey/move-ledger-fk';
        break;
      }
      errors.push(`price_moves: ${error.message}`);
    }
  }

  // ── 3. Delistings → sold_properties (absorption ledger) ────────────────────
  // A ref present in the recent prior snapshot but gone from today's feed =
  // sold or withdrawn. Recorded with its last-known price + the date last seen.
  let delisted = 0;
  if (trustPrior) {
    const gone = prior.filter((r) => !currentRefs.has(r.ref));
    const soldRows = gone.map((r) => ({
      ref: r.ref,
      town: r.town,
      region: r.region,
      type: r.type,
      last_price: r.price,
      last_pm2: r.pm2,
      last_seen_date: priorDate,
    }));
    for (let i = 0; i < soldRows.length; i += 500) {
      const chunk = soldRows.slice(i, i + 500);
      // Count what was actually inserted, not what was offered. With
      // ignoreDuplicates (ON CONFLICT DO NOTHING) a chunk of refs that are
      // already tombstoned inserts nothing and returns no error, so
      // `delisted += chunk.length` reported writes that never happened —
      // on 2026-08-09 it claimed 6 delistings while writing zero rows, and
      // the number agreed with a real count often enough to look trustworthy.
      // RETURNING yields only genuinely inserted rows.
      const { data: inserted, error } = await supabase
        .from('sold_properties')
        .upsert(chunk, { onConflict: 'ref', ignoreDuplicates: true })
        .select('ref');
      if (error) errors.push(`delisted: ${error.message}`);
      else delisted += inserted?.length ?? 0;
    }
  }

  const summary = {
    feed: feed.length,
    // The day the book this run observed was generated. The workflow polls
    // this to confirm the capture ran against the book it just published,
    // rather than trusting a wall-clock guess about when the deploy landed.
    feed_generated_date: feedDate,
    snapshotted,
    price_moves: priceMoves,
    moves_detected: movesDetected,
    // Already recorded by an earlier run today — a re-run finding only these
    // is correct and idempotent, not a missed capture.
    moves_already_logged: movesAlreadyLogged,
    // How many refs we had any usable baseline for. price_moves: 0 means
    // "the market was quiet" only if this is large; if it is 0 while
    // trusted_prior is true, the diff is blind and the zero is a lie.
    moves_baseline_refs: baselineRefs,
    moves_skipped: movesSkipped,
    // A known structural block on the legacy event table, not a capture
    // failure: the moves themselves are in price_snapshots either way.
    moves_ledger_blocked: movesLedgerBlocked,
    delisted,
    prior_date: priorDate,
    prior_age_days: priorAgeDays === Infinity ? null : priorAgeDays,
    trusted_prior: trustPrior,
    overlap: Number(overlap.toFixed(3)),
    errors: errors.length ? errors : null,
  };
  // Report a failed write as a failure. Anything that turns a broken night
  // into a clean-looking zero is how this pipeline goes quiet unnoticed.
  await finishCronLog(log, errors.length ? 'error' : 'success', summary);
  return NextResponse.json({ ok: errors.length === 0, ...summary });
}

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
  // Compare against the LAST PRICE WE OBSERVED for this ref: today's stored
  // row if an earlier run already banked one, otherwise the prior date's.
  // Diffing only against the prior date meant every mid-day change was written
  // straight into the snapshot with no event row behind it — which is why the
  // table holds 394k 'listed' rows and not one 'reduced' or 'increased'.
  let priceMoves = 0;
  let movesSkipped: string | null = null;
  const inserts: Array<{ avn_prop_id: string; price_eur: number; source_portal: string; status: string }> = [];
  for (const p of feed) {
    const sameDay = todayByRef.get(p.ref as string);
    // Today's own row needs no date gate — it is this calendar day's
    // observation. Falling back to the prior date does, hence trustPrior.
    const observed = sameDay?.price != null
      ? Number(sameDay.price)
      : (trustPrior ? priorByRef.get(p.ref as string)?.price ?? null : null);
    if (observed == null) continue;
    const now = Math.round(p.pf);
    if (Math.abs(now - observed) < 1) continue;
    inserts.push({
      avn_prop_id: p.ref as string,
      price_eur: now,
      source_portal: p.source_portal || 'redsp',
      status: now < observed ? 'reduced' : 'increased',
    });
  }
  if (inserts.length > feed.length * MAX_MOVE_SHARE) {
    movesSkipped = `${inserts.length} of ${feed.length} refs appear to have moved (> ${MAX_MOVE_SHARE * 100}%) — refusing to write, feed is probably wrong`;
  } else {
    for (let i = 0; i < inserts.length; i += 500) {
      const chunk = inserts.slice(i, i + 500);
      const { error } = await supabase.from('property_pricing_history').insert(chunk);
      if (error) errors.push(`price_moves: ${error.message}`);
      else priceMoves += chunk.length;
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
      const { error } = await supabase
        .from('sold_properties')
        .upsert(chunk, { onConflict: 'ref', ignoreDuplicates: true });
      if (error) errors.push(`delisted: ${error.message}`);
      else delisted += chunk.length;
    }
  }

  const summary = {
    feed: feed.length,
    snapshotted,
    price_moves: priceMoves,
    moves_detected: inserts.length,
    moves_skipped: movesSkipped,
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

import { withCronLog } from '@/lib/cron-log';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export const maxDuration = 60;

/**
 * MARKET EVENT DETECTION — rebuilt 2026-08-23 after four months dead.
 *
 * WHAT WAS WRONG, IN THE ORDER IT MATTERED
 *
 * 1. THE BASELINE READ HAS ALWAYS FAILED, AND THE FAILURE BECAME "EVERYTHING
 *    IS NEW". The route did:
 *
 *      const { data: snapshots } = await supabase
 *        .from('price_snapshots').select('ref, price, score');
 *
 *    `price_snapshots` has no `score` column — never has. PostgREST rejects
 *    the whole select with 42703, and the `error` half of that destructure is
 *    discarded, so `snapshots` is null, the baseline Map is EMPTY, and every
 *    live unit falls into the `if (!existing)` branch. A revived run would
 *    have emitted a NEW_LISTING for all 2,035 units in the book, every night,
 *    and written the first 50 of them to a public API. Measured against the
 *    real ledger the honest answer for 2026-08-23 is THREE events: 1 new
 *    listing, 0 price moves, 2 score changes.
 *
 *    This is the project's recurring bug at full size: a failed read
 *    destructured to null, silently becoming "no data", becoming a confident
 *    wrong answer. Fixing the auth without fixing this would have published
 *    fabricated market events — which is why the auth was left broken on
 *    2026-08-22 until the cause was proven.
 *
 * 2. IT 401'd TO ITS OWN SCHEDULER. The route required `x-cron-key`, which
 *    Vercel's scheduler does not send; it was the only route in the codebase
 *    still using that predicate. Every 07:30 run since 2026-04-11 was
 *    rejected. It now uses isAuthorizedCron, the same check the other cron
 *    routes use, which accepts the Bearer the scheduler actually sends.
 *
 * 3. IT COUNTED EVENTS IT HAD NOT WRITTEN. `if (error) console.error(...)`
 *    followed by `eventsCreated = batch.length` reported 50 events written
 *    whether or not the insert succeeded, and silently discarded everything
 *    past the 50th.
 *
 * 4. IT UPSERTED INTO price_snapshots WITH onConflict:'ref'. That table is
 *    keyed (ref, snapshot_date) and is owned by the pricing-history cron,
 *    which writes the enriched row. Every chunk was rejected. The block is
 *    deleted rather than repaired: a second writer to the moat's own table
 *    is not something to fix, it is something to remove.
 *
 * THE GUARD
 * Same discipline as pricing-history: diff only against a prior day that is
 * recent and overlaps the live feed, and refuse to write at all when the
 * result is implausible. A baseline that is wrong does not produce a small
 * error here — it produces a whole book of phantom listings.
 */

const MAX_PRIOR_AGE_DAYS = 4;
const MIN_FEED_OVERLAP = 0.5;

/**
 * A new-listing count above this share of the book means the baseline is
 * wrong, not that the market moved. 2,035 units appearing overnight is not a
 * market event; it is a broken read. The run reports the refusal rather than
 * writing, because a loud stop is the whole point.
 */
const MAX_NEW_LISTING_SHARE = 0.1;

const PAGE = 1000;
const MAX_PAGES = 20;

/**
 * Every row for one date. A plain select is capped by PostgREST at its
 * max-rows setting and the book is ~2,000 refs, so an unpaginated read is one
 * config change away from reporting half the book as newly listed.
 */
async function selectAllPages<T>(
  table: string,
  columns: string,
  dateColumn: string,
  date: string,
  orderBy: string,
): Promise<T[]> {
  if (!supabase) return [];
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq(dateColumn, date)
      .order(orderBy, { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

interface MarketEventRow {
  event_type: string;
  property_ref: string;
  town: string;
  region: string;
  property_type: string;
  beds: number;
  old_value: number;
  new_value: number;
  change_pct: number;
  message: string;
  severity: string;
}

export const GET = withCronLog('detect-events', '/api/detect-events', isAuthorizedCron, async () => {
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'No database' }, { status: 500 });
  }

  const props = getAllProperties().filter((p) => p.ref);
  const today = new Date().toISOString().split('T')[0];
  const currentRefs = new Set(props.map((p) => p.ref as string));

  // ── Prior observation day: the most recent date stored BEFORE today ────────
  // `.lt(today)`, not the global max — taking the max and blanking it when it
  // equals today is the bug that made pricing-history diff against nothing on
  // every re-run (fixed 2026-08-08). Same trap, same answer.
  const { data: maxRow, error: maxErr } = await supabase
    .from('price_snapshots')
    .select('snapshot_date')
    .lt('snapshot_date', today)
    .order('snapshot_date', { ascending: false })
    .limit(1);
  if (maxErr) throw maxErr;

  const priorDate: string | null = maxRow?.[0]?.snapshot_date ?? null;

  const priorPrices = priorDate
    ? await selectAllPages<{ ref: string; price: number | null }>(
        'price_snapshots', 'ref, price', 'snapshot_date', priorDate, 'ref')
    : [];

  // Score lives in score_history, keyed property_ref/avena_score — NOT in
  // price_snapshots. Reading it from the wrong table is defect 1 above.
  const priorScores = priorDate
    ? await selectAllPages<{ property_ref: string; avena_score: number | null }>(
        'score_history', 'property_ref, avena_score', 'snapshot_date', priorDate, 'property_ref')
    : [];

  const priceByRef = new Map(priorPrices.map((r) => [r.ref, r.price]));
  const scoreByRef = new Map(priorScores.map((r) => [r.property_ref, r.avena_score]));

  const priorAgeDays = priorDate
    ? Math.round((Date.parse(today) - Date.parse(priorDate)) / 86_400_000)
    : Infinity;
  const overlap = priorPrices.length
    ? priorPrices.filter((r) => currentRefs.has(r.ref)).length / priorPrices.length
    : 0;
  const trustedPrior =
    priorPrices.length > 0 && priorAgeDays <= MAX_PRIOR_AGE_DAYS && overlap >= MIN_FEED_OVERLAP;

  if (!trustedPrior) {
    // No trustworthy baseline means every ref looks new. Say so; do not write.
    const blocked = {
      ok: false,
      skipped: true,
      reason: 'no trusted prior observation day — refusing to diff',
      prior_date: priorDate,
      prior_age_days: Number.isFinite(priorAgeDays) ? priorAgeDays : null,
      prior_refs: priorPrices.length,
      overlap: Number(overlap.toFixed(3)),
      feed: props.length,
    };
    return NextResponse.json(blocked);
  }

  const events: MarketEventRow[] = [];
  let newListings = 0;

  for (const p of props) {
    const ref = p.ref as string;
    const town = p.l?.split(',')[0] || 'Spain';
    const priorPrice = priceByRef.get(ref);
    const priorScore = scoreByRef.get(ref);
    const currentScore = Math.round(p._sc ?? 0);

    if (priorPrice === undefined) {
      newListings++;
      events.push({
        event_type: 'NEW_LISTING',
        property_ref: ref,
        town,
        region: p.r,
        property_type: p.t,
        beds: p.bd,
        old_value: 0,
        new_value: p.pf,
        change_pct: 0,
        message: `New ${p.bd}-bed ${p.t.toLowerCase()} listed in ${town} — Score ${currentScore}/100`,
        severity: currentScore > 70 ? 'HIGH' : 'LOW',
      });
      continue;
    }

    if (priorPrice !== null && priorPrice > 0 && p.pf !== priorPrice) {
      const diff = p.pf - priorPrice;
      const pct = (diff / priorPrice) * 100;
      if (Math.abs(pct) >= 1) {
        events.push({
          event_type: diff < 0 ? 'PRICE_DROP' : 'PRICE_INCREASE',
          property_ref: ref,
          town,
          region: p.r,
          property_type: p.t,
          beds: p.bd,
          old_value: priorPrice,
          new_value: p.pf,
          change_pct: Number(pct.toFixed(1)),
          message:
            diff < 0
              ? `${p.t} in ${town} dropped €${Math.abs(diff).toLocaleString()} — now €${p.pf.toLocaleString()}`
              : `${p.t} in ${town} increased €${diff.toLocaleString()} — now €${p.pf.toLocaleString()}`,
          severity: Math.abs(pct) > 5 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    if (priorScore != null && Math.abs(currentScore - priorScore) >= 3) {
      events.push({
        event_type: 'SCORE_CHANGE',
        property_ref: ref,
        town,
        region: p.r,
        property_type: p.t,
        beds: p.bd,
        old_value: priorScore,
        new_value: currentScore,
        change_pct: currentScore - priorScore,
        message: `Score ${currentScore > priorScore ? 'increased' : 'decreased'} to ${currentScore}/100 in ${town} (was ${priorScore})`,
        severity: Math.abs(currentScore - priorScore) > 5 ? 'HIGH' : 'LOW',
      });
    }
  }

  // ── Plausibility ceiling ──────────────────────────────────────────────────
  const newListingShare = props.length ? newListings / props.length : 0;
  if (newListingShare > MAX_NEW_LISTING_SHARE) {
    return NextResponse.json(
      {
        ok: false,
        error: `refusing to write: ${newListings} of ${props.length} units (${(newListingShare * 100).toFixed(1)}%) look newly listed against ${priorDate} — that is a broken baseline, not a market move`,
        prior_date: priorDate,
        prior_refs: priorPrices.length,
        overlap: Number(overlap.toFixed(3)),
        events_detected: events.length,
        events_written: 0,
      },
      { status: 500 },
    );
  }

  // ── Write, counting only what the database accepted ────────────────────────
  let eventsWritten = 0;
  const errors: string[] = [];
  for (let i = 0; i < events.length; i += 500) {
    const chunk = events.slice(i, i + 500);
    const { error } = await supabase.from('market_events').insert(chunk);
    if (error) {
      errors.push(`market_events chunk ${i / 500}: ${error.message}`);
      continue;
    }
    eventsWritten += chunk.length;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    date: today,
    prior_date: priorDate,
    prior_age_days: priorAgeDays,
    prior_refs: priorPrices.length,
    prior_scores: priorScores.length,
    overlap: Number(overlap.toFixed(3)),
    trusted_prior: trustedPrior,
    feed: props.length,
    events_detected: events.length,
    events_written: eventsWritten,
    new_listings: newListings,
    price_moves: events.filter((e) => e.event_type === 'PRICE_DROP' || e.event_type === 'PRICE_INCREASE').length,
    score_changes: events.filter((e) => e.event_type === 'SCORE_CHANGE').length,
    errors: errors.length > 0 ? errors : null,
  });
});

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

const townOf = (l?: string) => (l || '').split(',')[0].trim() || null;

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

  // ── Prior snapshot: the most recent date we've already stored ──────────────
  const { data: maxRow } = await supabase
    .from('price_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1);
  const priorDate: string | null = maxRow?.[0]?.snapshot_date ?? null;

  let prior: PriorSnap[] = [];
  if (priorDate && priorDate !== today) {
    const { data } = await supabase
      .from('price_snapshots')
      .select('ref, price, pm2, mm2, region, type, town')
      .eq('snapshot_date', priorDate);
    prior = (data ?? []) as PriorSnap[];
  }
  const priorByRef = new Map(prior.map((r) => [r.ref, r]));

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
  for (let i = 0; i < snapRows.length; i += 500) {
    const { error } = await supabase
      .from('price_snapshots')
      .upsert(snapRows.slice(i, i + 500), { onConflict: 'ref,snapshot_date', ignoreDuplicates: false });
    if (!error) snapshotted += Math.min(500, snapRows.length - i);
  }

  // ── 2. Price-move events → property_pricing_history (append-only) ───────────
  let priceMoves = 0;
  if (trustPrior) {
    const inserts: Array<{ avn_prop_id: string; price_eur: number; source_portal: string; status: string }> = [];
    for (const p of feed) {
      const prev = priorByRef.get(p.ref as string);
      if (!prev || prev.price == null) continue;
      const now = Math.round(p.pf);
      if (Math.abs(now - prev.price) < 1) continue;
      inserts.push({
        avn_prop_id: p.ref as string,
        price_eur: now,
        source_portal: p.source_portal || 'redsp',
        status: now < prev.price ? 'reduced' : 'increased',
      });
    }
    for (let i = 0; i < inserts.length; i += 500) {
      const { error } = await supabase
        .from('property_pricing_history')
        .insert(inserts.slice(i, i + 500));
      if (!error) priceMoves += Math.min(500, inserts.length - i);
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
      const { error } = await supabase
        .from('sold_properties')
        .upsert(soldRows.slice(i, i + 500), { onConflict: 'ref', ignoreDuplicates: true });
      if (!error) delisted += Math.min(500, soldRows.length - i);
    }
  }

  const summary = {
    feed: feed.length,
    snapshotted,
    price_moves: priceMoves,
    delisted,
    prior_date: priorDate,
    prior_age_days: priorAgeDays === Infinity ? null : priorAgeDays,
    trusted_prior: trustPrior,
    overlap: Number(overlap.toFixed(3)),
  };
  await finishCronLog(log, 'success', summary);
  return NextResponse.json({ ok: true, ...summary });
}

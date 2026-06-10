/**
 * Counterpart Discovery cron — daily 03:30 UTC.
 *
 * Mines distinct developer names from properties_registry to populate the
 * counterpart_developers universe. This is what scales Counterpart from
 * the 10 seeded developers to every Spanish promoter visible in our
 * property corpus (Xavia 1,881 → ~300-600 distinct developers expected).
 *
 * Strategy:
 *   1. Pull all distinct (country, developer) pairs from properties_registry
 *      where developer is non-null and country='ES'.
 *   2. Normalise name (uppercase, strip legal suffixes, collapse whitespace)
 *      and derive a deterministic developer_id.
 *   3. Aggregate baseline metrics: total_projects = count of properties,
 *      delayed_projects estimated from listing age + status, etc.
 *   4. Upsert into counterpart_developers. New rows get a heuristic starting
 *      score; existing rows keep their score (counterpart-scan owns drift).
 *
 * Runs BEFORE counterpart-scan (03:30 vs 04:00) so newly-discovered
 * developers get scored the same night.
 *
 * Future: extend to FR, IT, DE, PT once we have corpus coverage.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface PropertyRow {
  developer: string | null;
  country: string;
  market: string | null;
  status: string | null;
  list_date: string | null;
  property_type: string | null;
}

interface AggregatedDeveloper {
  developer_id: string;
  name: string;
  country: string;
  total_projects: number;
  active_listings: number;
  stale_listings: number;          // listings on market > 365 days = soft delay signal
  markets: Set<string>;
}

/** Drop common Spanish legal entity suffixes for stable matching. */
const LEGAL_SUFFIXES = /\b(S\.?L\.?(\s*U\.?)?|S\.?A\.?|S\.?C\.?P\.?|C\.?B\.?|S\.?L\.?L\.?|SOCIEDAD\s+LIMITADA|SOCIEDAD\s+ANONIMA|UNIPERSONAL|GRUPO|GROUP|HOLDING)\.?\s*$/i;

function normaliseName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(LEGAL_SUFFIXES, '')
    .trim();
}

function deriveDeveloperId(country: string, normalised: string): string {
  // Deterministic: same name → same id across reruns
  const hash = createHash('sha256').update(`${country}::${normalised}`).digest('hex').slice(0, 10);
  return `DEV-${country}-${hash.toUpperCase()}`;
}

/**
 * Heuristic starting score for newly-discovered developers.
 * Volume = trust signal (active, visible). Stale listings = mild stress.
 * Capped to 60-80 to leave room for the scanner to drift either direction.
 */
function computeStartingScore(agg: AggregatedDeveloper): number {
  let score = 70;
  // Volume bonus (size = signal of ongoing operations)
  if (agg.total_projects >= 20) score += 5;
  if (agg.total_projects >= 50) score += 3;
  // Stale-listing penalty (>20% stale = weak demand or pricing issues)
  const staleRate = agg.total_projects > 0 ? agg.stale_listings / agg.total_projects : 0;
  if (staleRate > 0.4) score -= 8;
  else if (staleRate > 0.2) score -= 4;
  // Geographic concentration (single market = concentration risk)
  if (agg.markets.size === 1 && agg.total_projects > 10) score -= 2;
  return Math.max(55, Math.min(82, score));
}

function scoreToGrade(score: number): string {
  if (score >= 85) return 'AAV';
  if (score >= 75) return 'AV';
  if (score >= 67) return 'ABV';
  if (score >= 55) return 'BBV';
  if (score >= 42) return 'CV';
  return 'DV';
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const log = await startCronLog('counterpart-discover', '/api/cron/counterpart-discover');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  // Pull every Spanish property with a non-null developer field. Paginated
  // because Supabase caps at 1000/query.
  const pageSize = 1000;
  let from = 0;
  const all: PropertyRow[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('properties_registry')
      .select('developer, country, market, status, list_date, property_type')
      .eq('country', 'ES')
      .not('developer', 'is', null)
      .range(from, from + pageSize - 1);
    if (error) {
      await finishCronLog(log, 'error', null, error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    all.push(...(data as PropertyRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 50_000) break; // safety cap
  }

  // Aggregate by normalised developer name
  const byKey = new Map<string, AggregatedDeveloper>();
  const now = Date.now();
  const STALE_DAYS = 365;

  for (const row of all) {
    if (!row.developer) continue;
    const trimmed = row.developer.trim();
    if (trimmed.length < 3) continue;            // skip junk values like "-"
    const normalised = normaliseName(trimmed);
    if (normalised.length < 3) continue;

    const developer_id = deriveDeveloperId(row.country, normalised);
    let agg = byKey.get(developer_id);
    if (!agg) {
      agg = {
        developer_id,
        name: normalised,
        country: row.country,
        total_projects: 0,
        active_listings: 0,
        stale_listings: 0,
        markets: new Set(),
      };
      byKey.set(developer_id, agg);
    }
    agg.total_projects++;
    if ((row.status ?? 'active') === 'active') agg.active_listings++;
    if (row.market) agg.markets.add(row.market);
    if (row.list_date) {
      const ageDays = (now - new Date(row.list_date).getTime()) / 86_400_000;
      if (ageDays > STALE_DAYS) agg.stale_listings++;
    }
  }

  // Pull existing developer_ids so we only set score/grade on first-insert
  // (preserves drift accumulated by counterpart-scan).
  const { data: existing } = await supabase
    .from('counterpart_developers')
    .select('developer_id');
  const existingIds = new Set((existing ?? []).map((r) => r.developer_id as string));

  // Upsert in batches of 100 (Supabase soft-cap)
  const aggregated = [...byKey.values()];
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  const BATCH = 100;
  for (let i = 0; i < aggregated.length; i += BATCH) {
    const slice = aggregated.slice(i, i + BATCH);
    const rows = slice.map((agg) => {
      const isNew = !existingIds.has(agg.developer_id);
      const startingScore = computeStartingScore(agg);
      // For existing rows, omit score fields entirely so the scanner's
      // accumulated drift is preserved. Only refresh volume metrics.
      const base = {
        developer_id: agg.developer_id,
        name: agg.name,
        country: agg.country,
        total_projects: agg.total_projects,
        last_full_scan: new Date().toISOString(),
      };
      if (isNew) {
        return {
          ...base,
          counterpart_score: startingScore,
          score_grade: scoreToGrade(startingScore),
          score_trend: 'stable',
          score_last_updated: new Date().toISOString(),
          payment_delay_signals: 0,
          legal_disputes_active: 0,
          court_judgements_against: 0,
          delayed_projects: 0,
          cancelled_projects: 0,
          data_sources: ['properties_registry-discovery'],
        };
      }
      return base;
    });

    const { error } = await supabase
      .from('counterpart_developers')
      .upsert(rows, { onConflict: 'developer_id', ignoreDuplicates: false });
    if (error) {
      failed += slice.length;
      continue;
    }
    for (const agg of slice) {
      if (existingIds.has(agg.developer_id)) updated++;
      else inserted++;
    }
  }

  const summary = {
    properties_scanned: all.length,
    distinct_developers: aggregated.length,
    inserted,
    updated,
    failed,
  };
  await finishCronLog(log, 'success', summary);
  return NextResponse.json({ ok: true, ...summary });
}

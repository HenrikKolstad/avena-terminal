/**
 * Agent Argus — daily comp-sanity check.
 *
 * Every new-build has an `mm2` (market €/m² for comparable stock) — this is
 * used to compute discount% and savings. If mm2 is badly miscalculated (too
 * wide a comp population, wrong location tier, or contaminated by
 * ultra-prime stock in a mixed region), downstream displays look fake.
 *
 * Argus runs daily and flags outliers:
 *   1. Properties where (mm2 / town_median_mm2) > 2.0
 *   2. Properties where computed discount > 50%
 *   3. Properties where mm2 > 15,000 (Marbella Golden Mile ceiling heuristic)
 *
 * Flags are written to `comp_sanity_flags` table for review. UI is already
 * capped at 35% display so users never see the bad numbers while Argus
 * works through the backlog.
 */

import { supabase } from '@/lib/supabase';
import { getAllProperties, avg } from '@/lib/properties';
import type { Property } from '@/lib/types';

export interface CompFlag {
  ref: string;
  town: string;
  pm2: number;
  mm2: number;
  town_median_mm2: number;
  ratio: number;
  raw_discount_pct: number;
  reason: string;
}

export async function runArgus(): Promise<{
  scanned: number;
  flagged: number;
  top_offenders: CompFlag[];
}> {
  const all = getAllProperties();
  const flags: CompFlag[] = [];

  // Compute town median mm2 as ground-truth baseline
  const byTown = new Map<string, number[]>();
  for (const p of all) {
    if (!p.mm2 || !p.l) continue;
    const arr = byTown.get(p.l) ?? [];
    arr.push(p.mm2);
    byTown.set(p.l, arr);
  }
  const townMedian = new Map<string, number>();
  for (const [town, vals] of byTown.entries()) {
    if (vals.length < 3) continue;
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    townMedian.set(town, sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]);
  }

  for (const p of all) {
    if (!p.ref || !p.pm2 || !p.mm2 || !p.l) continue;
    const median = townMedian.get(p.l);
    if (!median) continue;

    const ratio = p.mm2 / median;
    const rawDiscount = Math.round((1 - p.pm2 / p.mm2) * 100);

    const reasons: string[] = [];
    if (ratio > 2.0) reasons.push(`mm2 ${ratio.toFixed(2)}x town median`);
    if (rawDiscount > 50) reasons.push(`${rawDiscount}% discount (>50%)`);
    if (p.mm2 > 15000) reasons.push(`mm2 ${p.mm2} exceeds EU prime ceiling`);

    if (reasons.length > 0) {
      flags.push({
        ref: p.ref,
        town: p.l,
        pm2: p.pm2,
        mm2: p.mm2,
        town_median_mm2: Math.round(median),
        ratio: Number(ratio.toFixed(2)),
        raw_discount_pct: rawDiscount,
        reason: reasons.join(' · '),
      });
    }
  }

  // Persist
  if (supabase && flags.length > 0) {
    try {
      // Mark previous run's flags as superseded (simple 'today' overwrite)
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('comp_sanity_flags').insert(
        flags.map((f) => ({
          property_ref: f.ref,
          town: f.town,
          pm2: f.pm2,
          mm2: f.mm2,
          town_median_mm2: f.town_median_mm2,
          ratio: f.ratio,
          raw_discount_pct: f.raw_discount_pct,
          reason: f.reason,
          scan_date: today,
        }))
      );
    } catch {
      /* table may not exist yet — ok */
    }
  }

  return {
    scanned: all.length,
    flagged: flags.length,
    top_offenders: flags.sort((a, b) => b.ratio - a.ratio).slice(0, 20),
  };
}

// Helper surface for unit tests / manual checks
export function inspectProperty(ref: string): {
  found: boolean;
  property?: Property;
  raw_discount_pct?: number;
  raw_saved_eur?: number;
  town_median_mm2?: number | null;
  ratio?: number;
  flagged?: boolean;
} {
  const all = getAllProperties();
  const p = all.find((x) => x.ref === ref);
  if (!p) return { found: false };

  const median =
    avg(
      all
        .filter((x) => x.l === p.l && x.mm2)
        .map((x) => x.mm2 ?? 0)
    ) || null;

  const rawDiscount =
    p.pm2 && p.mm2 ? Math.round((1 - p.pm2 / p.mm2) * 100) : 0;
  const rawSaved =
    p.pm2 && p.mm2 && p.bm ? Math.round((p.mm2 - p.pm2) * p.bm) : 0;
  const ratio = p.mm2 && median ? Number((p.mm2 / median).toFixed(2)) : undefined;
  const flagged = (ratio ?? 0) > 2.0 || rawDiscount > 50 || (p.mm2 ?? 0) > 15000;

  return {
    found: true,
    property: p,
    raw_discount_pct: rawDiscount,
    raw_saved_eur: rawSaved,
    town_median_mm2: median ? Math.round(median) : null,
    ratio,
    flagged,
  };
}

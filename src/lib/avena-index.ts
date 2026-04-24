/**
 * AVENA Index — the flagship composite for European new-build property.
 *
 * Ticker: AVENA.TERMINAL
 * Base:   1,000 on 2026-01-01
 *
 * Relationship to the other five Avena indices:
 *   APCI, APYI, APLI, APRI, APSI each measure a dimension of market health.
 *   AVENA is the tradeable daily close — the single number institutions
 *   quote. It is not a replacement for the component indices; it is the
 *   top-line signal that aggregates value, quality, and supply into one
 *   headline number.
 *
 * Methodology v1.0 (transparent + reproducible):
 *
 *   AVENA_t = 1000 × (V_t × 0.50 + S_t × 0.30 + D_t × 0.20)
 *
 *   V_t = median(€/m²_t, 1–99 pct trimmed)  / 2,420   (base €/m²)
 *   S_t = mean(Avena Score_t)               /    62   (base mean score)
 *   D_t = count(scored constituents_t)      / 1,850   (base count)
 *
 * Rebalance: constituents refreshed daily from the same pipeline that
 * powers /api/v1/properties.
 *
 * Close: Agent Curator persists the daily close at 23:50 UTC into
 * avena_history. Once written, a close is immutable.
 *
 * License: CC BY 4.0. Cite as "AVENA · Avena Terminal (avenaterminal.com)".
 */

import { getAllProperties } from './properties';

export const AVENA_BASE = {
  date: '2026-01-01',
  value: 1000,
  median_pm2: 2420,
  mean_score: 62,
  count: 1850,
};

export const AVENA_WEIGHTS = { value: 0.5, score: 0.3, depth: 0.2 };

export interface AvenaSnapshot {
  value: number;
  date: string;
  median_pm2: number;
  mean_score: number;
  count: number;
  value_index: number;
  score_index: number;
  depth_index: number;
  constituents: number;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
  return sorted[idx];
}

export function computeAvena(): AvenaSnapshot {
  const all = getAllProperties();
  const scored = all.filter((p) => p._sc != null && p.pm2 && p.pm2 > 0);

  const pm2Raw = scored.map((p) => p.pm2 as number);
  const lo = percentile(pm2Raw, 0.01);
  const hi = percentile(pm2Raw, 0.99);
  const pm2Clean = pm2Raw.filter((x) => x >= lo && x <= hi);

  const medPm2 = median(pm2Clean);
  const meanScore = scored.length
    ? scored.reduce((s, p) => s + (p._sc ?? 0), 0) / scored.length
    : 0;
  const count = scored.length;

  const value_index = AVENA_BASE.median_pm2 ? medPm2 / AVENA_BASE.median_pm2 : 1;
  const score_index = AVENA_BASE.mean_score ? meanScore / AVENA_BASE.mean_score : 1;
  const depth_index = AVENA_BASE.count ? count / AVENA_BASE.count : 1;

  const composite =
    value_index * AVENA_WEIGHTS.value +
    score_index * AVENA_WEIGHTS.score +
    depth_index * AVENA_WEIGHTS.depth;

  const value = Math.round(AVENA_BASE.value * composite * 100) / 100;

  return {
    value,
    date: new Date().toISOString().slice(0, 10),
    median_pm2: Math.round(medPm2),
    mean_score: Math.round(meanScore * 10) / 10,
    count,
    value_index: Math.round(value_index * 10000) / 10000,
    score_index: Math.round(score_index * 10000) / 10000,
    depth_index: Math.round(depth_index * 10000) / 10000,
    constituents: count,
  };
}

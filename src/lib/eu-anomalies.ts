/**
 * EU Macro Anomaly Detection — scans eu_official_stats daily and flags
 * any (country, indicator) series whose latest observation deviates more
 * than 2σ from the trailing 8-period mean.
 *
 * Why this matters: institutional risk monitoring wants a watchlist of
 * indicators that are moving in ways the recent regime can't explain.
 * The Avena alert feed surfaces those daily.
 */

import { supabase } from '@/lib/supabase';

export interface AnomalyRow {
  country_code: string;
  source: string;
  indicator_code: string;
  indicator_name: string;
  period: string;
  value: number;
  trailing_mean: number;
  trailing_std: number;
  z_score: number;
  severity: 'watch' | 'alert' | 'critical';
  trend: 'up' | 'down';
  note: string;
  source_url: string | null;
}

interface SeriesObservation {
  country_code: string;
  source: string;
  indicator_code: string;
  indicator_name: string;
  period: string;
  value: number;
  source_url: string | null;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((acc, v) => acc + v, 0) / arr.length;
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const sq = arr.map((v) => (v - m) ** 2);
  return Math.sqrt(sq.reduce((a, b) => a + b, 0) / (arr.length - 1));
}

function severityFor(z: number): 'watch' | 'alert' | 'critical' {
  const a = Math.abs(z);
  if (a >= 3) return 'critical';
  if (a >= 2.5) return 'alert';
  return 'watch';
}

export async function detectAnomalies(): Promise<AnomalyRow[]> {
  if (!supabase) return [];

  // Pull recent observations across all sources/indicators. We bound to
  // last 5 years to keep the working set manageable.
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);
  const cutoffPeriod = String(cutoff.getUTCFullYear());

  const { data, error } = await supabase
    .from('eu_official_stats')
    .select('country_code, source, indicator_code, indicator_name, period, value, source_url')
    .gte('period', cutoffPeriod)
    .order('period', { ascending: true })
    .limit(20000);
  if (error || !data) return [];

  // Group by (country, source, indicator)
  const buckets = new Map<string, SeriesObservation[]>();
  for (const row of data as SeriesObservation[]) {
    if (row.value == null) continue;
    const key = `${row.country_code}::${row.source}::${row.indicator_code}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }

  const anomalies: AnomalyRow[] = [];
  for (const series of buckets.values()) {
    if (series.length < 8) continue; // need history to compute trailing baseline
    series.sort((a, b) => a.period.localeCompare(b.period));
    const latest = series[series.length - 1];
    const trailing = series.slice(-9, -1).map((o) => o.value);
    if (trailing.length < 8) continue;

    const m = mean(trailing);
    const s = stdev(trailing);
    if (s === 0) continue;

    const z = (latest.value - m) / s;
    if (Math.abs(z) < 2) continue;

    anomalies.push({
      country_code: latest.country_code,
      source: latest.source,
      indicator_code: latest.indicator_code,
      indicator_name: latest.indicator_name,
      period: latest.period,
      value: latest.value,
      trailing_mean: Number(m.toFixed(4)),
      trailing_std: Number(s.toFixed(4)),
      z_score: Number(z.toFixed(2)),
      severity: severityFor(z),
      trend: z > 0 ? 'up' : 'down',
      note: `Latest ${latest.value.toFixed(2)} vs trailing 8-period mean ${m.toFixed(2)} (σ=${s.toFixed(2)}) → z-score ${z.toFixed(2)}.`,
      source_url: latest.source_url ?? null,
    });
  }

  return anomalies;
}

export async function persistAnomalies(rows: AnomalyRow[]): Promise<number> {
  if (!supabase || rows.length === 0) return 0;
  let written = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase
      .from('eu_anomalies')
      .upsert(chunk, { onConflict: 'country_code,source,indicator_code,period' });
    if (!error) written += chunk.length;
  }
  return written;
}

export async function recentAnomalies(limit = 50, minSeverity?: 'watch' | 'alert' | 'critical'): Promise<AnomalyRow[]> {
  if (!supabase) return [];
  try {
    let q = supabase
      .from('eu_anomalies')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);
    if (minSeverity === 'critical') q = q.eq('severity', 'critical');
    else if (minSeverity === 'alert') q = q.in('severity', ['alert', 'critical']);
    const { data } = await q;
    return (data ?? []) as AnomalyRow[];
  } catch { return []; }
}

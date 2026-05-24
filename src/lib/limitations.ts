/**
 * Self-Aware Limitations Engine — Architectural Commitment 10.
 *
 * Runs daily. Inspects real system telemetry to surface honest weakness:
 *   - country/region coverage gaps
 *   - model confidence zones
 *   - failed ingestions in the last 24h
 *   - data staleness
 *
 * Writes findings to `system_limitations`. Findings already present and
 * still active are refreshed; resolved findings are marked with
 * `resolved_at`. The /limitations page reads the active set.
 *
 * Why this matters: institutional buyers (IMF, ECB, asset managers) read
 * limitations pages obsessively. Most vendors hide weakness; Avena
 * publishes it. The credibility differential is permanent.
 */

import { supabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/event-store';

export interface LimitationFinding {
  limitation_category: 'coverage' | 'confidence' | 'ingestion' | 'methodology' | 'staleness';
  description: string;
  severity: 'minor' | 'moderate' | 'significant';
  affected_areas: string[];
  remediation_status: string;
  remediation_note?: string;
  detected_metric: string;
  detected_value: number;
  threshold_value: number;
}

export interface LimitationRow extends Omit<LimitationFinding, 'remediation_note'> {
  id: string;
  remediation_note: string | null;
  reported_at: string;
  resolved_at: string | null;
}

/* -------------------------------------------------------------------------- */
/* Detection passes                                                            */
/* -------------------------------------------------------------------------- */

const EU_COUNTRIES = ['ES', 'PT', 'FR', 'IT', 'DE', 'NL', 'BE', 'AT', 'IE', 'GR', 'PL', 'CZ', 'HU', 'RO', 'SE', 'DK', 'FI', 'NO', 'CY', 'MT', 'LU', 'EE', 'LV', 'LT', 'SK', 'SI', 'HR', 'BG'];

/**
 * Coverage gaps: any country with fewer than `threshold` indexed properties
 * is flagged. Severity scales by how thin the coverage is.
 */
export async function detectCoverageGaps(threshold = 50): Promise<LimitationFinding[]> {
  if (!supabase) return [];
  const findings: LimitationFinding[] = [];
  try {
    const { data } = await supabase.from('eu_properties').select('country_iso2');
    const counts = new Map<string, number>();
    for (const row of (data as Array<{ country_iso2: string }> | null) ?? []) {
      counts.set(row.country_iso2, (counts.get(row.country_iso2) ?? 0) + 1);
    }
    for (const cc of EU_COUNTRIES) {
      const n = counts.get(cc) ?? 0;
      if (n >= threshold) continue;
      let severity: LimitationFinding['severity'] = 'minor';
      if (n === 0) severity = 'significant';
      else if (n < 10) severity = 'moderate';
      findings.push({
        limitation_category: 'coverage',
        description: n === 0
          ? `No indexed properties for ${cc}. The Avena Index does not yet cover this market.`
          : `Sparse coverage for ${cc}: ${n} indexed properties, below the ${threshold}-property threshold for confident market statistics.`,
        severity,
        affected_areas: [cc],
        remediation_status: n === 0 ? 'planned' : 'in_progress',
        remediation_note: 'EU ingestion swarm prioritises low-coverage markets each rescore cycle (every 4h).',
        detected_metric: 'country_property_count',
        detected_value: n,
        threshold_value: threshold,
      });
    }
  } catch { /* tolerate missing tables */ }
  return findings;
}

/**
 * Ingestion failures: rows in cron_log marked as errored in the last 24h.
 */
export async function detectIngestionFailures(): Promise<LimitationFinding[]> {
  if (!supabase) return [];
  const findings: LimitationFinding[] = [];
  try {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data } = await supabase
      .from('cron_log')
      .select('cron_name, status, error_message, started_at')
      .gte('started_at', since)
      .eq('status', 'error');
    const rows = (data as Array<{ cron_name: string; error_message: string | null; started_at: string }> | null) ?? [];
    const grouped = new Map<string, number>();
    for (const r of rows) grouped.set(r.cron_name, (grouped.get(r.cron_name) ?? 0) + 1);
    for (const [cron_name, failures] of grouped.entries()) {
      const severity: LimitationFinding['severity'] = failures >= 5 ? 'significant' : failures >= 2 ? 'moderate' : 'minor';
      findings.push({
        limitation_category: 'ingestion',
        description: `${cron_name} failed ${failures} time${failures === 1 ? '' : 's'} in the last 24 hours. The downstream data may be staler than the schedule implies until the failure is resolved.`,
        severity,
        affected_areas: [cron_name],
        remediation_status: 'investigating',
        detected_metric: 'failed_runs_24h',
        detected_value: failures,
        threshold_value: 1,
      });
    }
  } catch { /* tolerate */ }
  return findings;
}

/**
 * Confidence zones: regions where the AVM confidence consistently runs low.
 * Heuristic v1 — uses avm_queries log if present.
 */
export async function detectLowConfidenceZones(): Promise<LimitationFinding[]> {
  if (!supabase) return [];
  const findings: LimitationFinding[] = [];
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const { data } = await supabase
      .from('avm_queries')
      .select('inputs, confidence_pct')
      .gte('created_at', since)
      .limit(2000);
    const rows = (data as Array<{ inputs: { town?: string } | null; confidence_pct: number }> | null) ?? [];
    const byTown = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      const town = r.inputs?.town ?? null;
      if (!town || r.confidence_pct == null) continue;
      const cur = byTown.get(town) ?? { sum: 0, n: 0 };
      cur.sum += r.confidence_pct;
      cur.n += 1;
      byTown.set(town, cur);
    }
    for (const [town, { sum, n }] of byTown.entries()) {
      if (n < 5) continue;
      const avg = sum / n;
      if (avg >= 70) continue;
      findings.push({
        limitation_category: 'confidence',
        description: `AVM confidence in ${town} averages ${avg.toFixed(1)}% across the last 30 days of queries (${n} samples). Comp sparsity or atypical inventory; treat valuations with appropriate scepticism.`,
        severity: avg < 50 ? 'significant' : avg < 60 ? 'moderate' : 'minor',
        affected_areas: [town],
        remediation_status: 'in_progress',
        remediation_note: 'Augmentation cron expanding comparable inventory in this market.',
        detected_metric: 'avg_avm_confidence_30d',
        detected_value: Math.round(avg * 10) / 10,
        threshold_value: 70,
      });
    }
  } catch { /* tolerate */ }
  return findings;
}

/**
 * Staleness: macro feeds that have not refreshed in N days.
 */
export async function detectStaleFeeds(daysThreshold = 3): Promise<LimitationFinding[]> {
  if (!supabase) return [];
  const findings: LimitationFinding[] = [];
  try {
    const threshold = new Date(Date.now() - daysThreshold * 24 * 3600_000).toISOString();
    const { data } = await supabase
      .from('eu_official_stats')
      .select('source, dataset, fetched_at')
      .lt('fetched_at', threshold);
    const rows = (data as Array<{ source: string; dataset: string; fetched_at: string }> | null) ?? [];
    const grouped = new Map<string, string>();
    for (const r of rows) {
      const k = `${r.source}/${r.dataset}`;
      if (!grouped.has(k)) grouped.set(k, r.fetched_at);
    }
    for (const [feed, last] of grouped.entries()) {
      const ageDays = Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
      findings.push({
        limitation_category: 'staleness',
        description: `${feed} last refreshed ${ageDays} day${ageDays === 1 ? '' : 's'} ago (threshold: ${daysThreshold} days). The published value may lag the source.`,
        severity: ageDays > 14 ? 'significant' : ageDays > 7 ? 'moderate' : 'minor',
        affected_areas: [feed],
        remediation_status: 'investigating',
        detected_metric: 'feed_age_days',
        detected_value: ageDays,
        threshold_value: daysThreshold,
      });
    }
  } catch { /* tolerate */ }
  return findings;
}

/* -------------------------------------------------------------------------- */
/* Compile + persist                                                           */
/* -------------------------------------------------------------------------- */

export async function compileLimitations(): Promise<{
  found: number;
  inserted: number;
  resolved: number;
  errors: string[];
}> {
  const errors: string[] = [];
  if (!supabase) return { found: 0, inserted: 0, resolved: 0, errors: ['supabase_unavailable'] };

  const buckets = await Promise.all([
    detectCoverageGaps().catch(e => { errors.push(`coverage: ${(e as Error).message}`); return []; }),
    detectIngestionFailures().catch(e => { errors.push(`ingestion: ${(e as Error).message}`); return []; }),
    detectLowConfidenceZones().catch(e => { errors.push(`confidence: ${(e as Error).message}`); return []; }),
    detectStaleFeeds().catch(e => { errors.push(`staleness: ${(e as Error).message}`); return []; }),
  ]);
  const findings = buckets.flat();

  // Idempotency: a finding is "the same" if (category + affected_areas[0] +
  // detected_metric) match an existing unresolved row. Refresh those; insert
  // new ones; resolve rows whose situation no longer triggers.
  const { data: existing } = await supabase
    .from('system_limitations')
    .select('id, limitation_category, affected_areas, detected_metric')
    .is('resolved_at', null);
  const exMap = new Map<string, string>();
  for (const r of (existing as Array<{ id: string; limitation_category: string; affected_areas: string[]; detected_metric: string }> | null) ?? []) {
    exMap.set(`${r.limitation_category}|${r.affected_areas?.[0] ?? ''}|${r.detected_metric}`, r.id);
  }

  let inserted = 0;
  const stillActive = new Set<string>();
  for (const f of findings) {
    const key = `${f.limitation_category}|${f.affected_areas[0] ?? ''}|${f.detected_metric}`;
    stillActive.add(key);
    const existingId = exMap.get(key);
    if (existingId) {
      try {
        await supabase.from('system_limitations').update({
          description: f.description,
          severity: f.severity,
          detected_value: f.detected_value,
          remediation_status: f.remediation_status,
          remediation_note: f.remediation_note ?? null,
          reported_at: new Date().toISOString(),
        }).eq('id', existingId);
      } catch (e) { errors.push(`update: ${(e as Error).message}`); }
    } else {
      try {
        await supabase.from('system_limitations').insert({
          limitation_category: f.limitation_category,
          description: f.description,
          severity: f.severity,
          affected_areas: f.affected_areas,
          remediation_status: f.remediation_status,
          remediation_note: f.remediation_note ?? null,
          detected_metric: f.detected_metric,
          detected_value: f.detected_value,
          threshold_value: f.threshold_value,
        });
        inserted++;
      } catch (e) { errors.push(`insert: ${(e as Error).message}`); }
    }
  }

  // Resolve anything that didn't appear this pass
  let resolved = 0;
  for (const [key, id] of exMap.entries()) {
    if (stillActive.has(key)) continue;
    try {
      await supabase.from('system_limitations').update({ resolved_at: new Date().toISOString() }).eq('id', id);
      resolved++;
    } catch { /* tolerate */ }
  }

  // Event sourcing
  await recordEvent({
    event_type: 'limitations.compiled',
    aggregate_id: 'system',
    aggregate_type: 'limitation',
    payload: { found: findings.length, inserted, resolved },
    metadata: { source: 'cron/compile-limitations' },
  });

  return { found: findings.length, inserted, resolved, errors };
}

export async function activeLimitations(): Promise<LimitationRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('system_limitations')
    .select('*')
    .is('resolved_at', null)
    .order('severity', { ascending: false })
    .order('reported_at', { ascending: false })
    .limit(200);
  return (data as LimitationRow[]) || [];
}

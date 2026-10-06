/**
 * Self-Aware Limitations Engine — Architectural Commitment 10.
 *
 * Runs daily. Inspects real system telemetry to surface honest weakness:
 *   - country/region coverage gaps
 *   - failed ingestions in the last 24h
 *   - model confidence zones
 *   - data staleness (DORMANT — see STALENESS_DORMANT_REASON)
 *
 * Writes findings to `system_limitations`. Findings already present and
 * still active are refreshed; resolved findings are marked with
 * `resolved_at`. The /limitations page reads the active set.
 *
 * Why this matters: institutional buyers (IMF, ECB, asset managers) read
 * limitations pages obsessively. Most vendors hide weakness; Avena
 * publishes it. The credibility differential is permanent.
 *
 * ---------------------------------------------------------------------------
 * 2026-10-06 — THIS FILE WAS THE LEAST HONEST PAGE ON THE SITE, AND IT
 * REPORTED `found: 28  errors: []  success` EVERY DAY WHILE SAYING SO.
 *
 * Three of the four passes read a table or column that DOES NOT EXIST:
 *   - coverage  -> `eu_properties`             : no such table
 *   - ingestion -> `cron_log`                  : no such table (it is `cron_logs`),
 *                  cols `cron_name`/`error_message` (they are `cron_path`/`error`)
 *   - staleness -> `eu_official_stats.dataset`  : no such column
 *
 * supabase-js does NOT throw on any of those — it returns
 * `{ data: null, error }`. Every pass destructured `data` only and dropped
 * `error` on the floor, so the surrounding try/catch never fired and
 * `compileLimitations`' `errors[]` stayed empty. Two passes therefore
 * reported "nothing to flag" when the truth was "I could not look".
 *
 * The coverage pass was worse than dead — it was dead AND LOUD. A null read
 * left `counts` empty, so all 28 EU countries scored n = 0 and every one of
 * them was published as a `significant` finding. Including Spain:
 *
 *     "No indexed properties for ES. The Avena Index does not yet cover
 *      this market."
 *
 * That was live on avenaterminal.com/limitations, regenerated nightly,
 * against a book of 2,030 Spanish listings with 62 days of daily price
 * history behind it. A fabricated, self-damaging claim on the one page an
 * institutional reader is most likely to quote.
 *
 * The rule this file now enforces: A FAILED READ IS AN ERROR, NEVER A
 * FINDING AND NEVER A ZERO. Each pass throws on `error`, and throws on an
 * empty read where empty is impossible. `compileLimitations` catches those
 * into `errors[]`; a pass that is deliberately off is named in `dormant[]`
 * rather than pretending to have found nothing.
 * ---------------------------------------------------------------------------
 */

import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
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

/**
 * Why the staleness pass is off rather than repaired.
 *
 * Its only available timestamp is `eu_official_stats.fetched_at`, and that
 * column means "first inserted", not "last fetched" (audited 2026-09-10):
 * `eurostat` holds 3,808 rows whose newest `fetched_at` is 2026-07-03 while
 * the nightly cron upserts all 3,808 of them every night. Repairing the
 * column name would have published 242 findings of the form "this feed last
 * refreshed 95 days ago" about feeds that refreshed hours earlier — trading a
 * silent dead pass for a loud false one. It stays dormant, and named as
 * dormant, until the ingest writes a real last-fetched timestamp.
 */
export const STALENESS_DORMANT_REASON =
  'staleness: pass dormant — eu_official_stats.fetched_at records first insert, not last fetch, so a feed-age finding derived from it would be false. Needs a true last_fetched_at on the ingest before this pass can publish.';

/** A read that came back `{ data: null, error }` is a failure to look, not a
 *  finding of nothing. Convert it into something `errors[]` will carry. */
function assertRead(
  pass: string,
  source: string,
  error: { message?: string; code?: string } | null,
): void {
  if (!error) return;
  const code = error.code ? ` [${error.code}]` : '';
  throw new Error(`${pass}: read of ${source} failed${code}: ${error.message ?? 'unknown error'}`);
}

/* -------------------------------------------------------------------------- */
/* Detection passes                                                            */
/* -------------------------------------------------------------------------- */

const EU_COUNTRIES = ['ES', 'PT', 'FR', 'IT', 'DE', 'NL', 'BE', 'AT', 'IE', 'GR', 'PL', 'CZ', 'HU', 'RO', 'SE', 'DK', 'FI', 'NO', 'CY', 'MT', 'LU', 'EE', 'LV', 'LT', 'SK', 'SI', 'HR', 'BG'];

/**
 * Coverage gaps: any country with fewer than `threshold` indexed properties
 * is flagged. Severity scales by how thin the coverage is.
 *
 * Source is `price_snapshots` on its most recent snapshot_date — the live
 * daily capture, which is what "indexed properties" means on this site. NOT
 * `properties_registry`: that froze 2026-05-24 and its 57,306 FR rows are
 * DVF transaction records, not indexed listings, so counting them would
 * claim coverage of a market Avena does not index.
 */
export async function detectCoverageGaps(threshold = 50): Promise<LimitationFinding[]> {
  if (!supabase) return [];
  const findings: LimitationFinding[] = [];

  const { data: latest, error: latestErr } = await supabase
    .from('price_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1);
  assertRead('coverage', 'price_snapshots (latest date)', latestErr);

  const day = (latest as Array<{ snapshot_date: string }> | null)?.[0]?.snapshot_date;
  if (!day) {
    // An empty observation ledger is a capture emergency, not zero coverage.
    throw new Error('coverage: price_snapshots holds no rows — cannot derive country coverage');
  }

  const { data, error } = await supabase
    .from('price_snapshots')
    .select('country')
    .eq('snapshot_date', day)
    .range(0, 99_999);
  assertRead('coverage', `price_snapshots (${day})`, error);

  const rows = (data as Array<{ country: string | null }> | null) ?? [];
  if (rows.length === 0) {
    // Same guard, one level down: the latest day exists but came back empty.
    throw new Error(`coverage: price_snapshots has no rows for ${day} — cannot derive country coverage`);
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.country) continue;
    counts.set(row.country, (counts.get(row.country) ?? 0) + 1);
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
  return findings;
}

/**
 * Ingestion failures: rows in `cron_logs` marked as errored in the last 24h.
 * Grouped by `cron_path`, which is the column that exists.
 */
export async function detectIngestionFailures(): Promise<LimitationFinding[]> {
  if (!supabase) return [];
  const findings: LimitationFinding[] = [];
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data, error } = await supabase
    .from('cron_logs')
    .select('cron_path, status, error, started_at')
    .gte('started_at', since)
    .eq('status', 'error')
    .range(0, 9_999);
  assertRead('ingestion', 'cron_logs', error);

  const rows = (data as Array<{ cron_path: string | null; error: string | null; started_at: string }> | null) ?? [];
  const grouped = new Map<string, number>();
  for (const r of rows) {
    const name = r.cron_path ?? '(unnamed cron)';
    grouped.set(name, (grouped.get(name) ?? 0) + 1);
  }

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
  return findings;
}

/**
 * Confidence zones: regions where the AVM confidence consistently runs low.
 * Heuristic v1 — uses the avm_queries log.
 */
export async function detectLowConfidenceZones(): Promise<LimitationFinding[]> {
  if (!supabase) return [];
  const findings: LimitationFinding[] = [];
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

  const { data, error } = await supabase
    .from('avm_queries')
    .select('inputs, confidence_pct')
    .gte('created_at', since)
    .limit(2000);
  assertRead('confidence', 'avm_queries', error);

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
  return findings;
}

/**
 * Staleness: DORMANT. See STALENESS_DORMANT_REASON for why it is off rather
 * than repaired. It returns no findings and `compileLimitations` names it in
 * `dormant[]` so "no staleness findings" can never be read as "no stale
 * feeds".
 */
export async function detectStaleFeeds(): Promise<LimitationFinding[]> {
  return [];
}

/* -------------------------------------------------------------------------- */
/* Compile + persist                                                           */
/* -------------------------------------------------------------------------- */

export async function compileLimitations(): Promise<{
  found: number;
  inserted: number;
  resolved: number;
  passes_ok: number;
  passes_failed: number;
  dormant: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const dormant: string[] = [STALENESS_DORMANT_REASON];
  if (!supabase) {
    return { found: 0, inserted: 0, resolved: 0, passes_ok: 0, passes_failed: 0, dormant, errors: ['supabase_unavailable'] };
  }

  // Each pass either yields findings or lands in `errors` — never silently
  // contributes zero. `passes_failed > 0` is the tell that a pass could not
  // look, which is a different thing from having nothing to report.
  const ACTIVE_PASSES: Array<[string, () => Promise<LimitationFinding[]>]> = [
    ['coverage', () => detectCoverageGaps()],
    ['ingestion', () => detectIngestionFailures()],
    ['confidence', () => detectLowConfidenceZones()],
  ];

  let passesOk = 0;
  let passesFailed = 0;
  const findings: LimitationFinding[] = [];
  for (const [name, run] of ACTIVE_PASSES) {
    try {
      findings.push(...(await run()));
      passesOk++;
    } catch (e) {
      passesFailed++;
      errors.push(e instanceof Error ? e.message : `${name}: unknown failure`);
    }
  }

  // A pass that could not look must not cause its existing findings to be
  // resolved: absence from this run would otherwise be read as "fixed".
  const failedCategories = new Set(
    errors.map(m => m.split(':')[0]).filter(c => ['coverage', 'ingestion', 'confidence'].includes(c)),
  );

  // Idempotency: a finding is "the same" if (category + affected_areas[0] +
  // detected_metric) match an existing unresolved row. Refresh those; insert
  // new ones; resolve rows whose situation no longer triggers.
  const { data: existing, error: existingErr } = await supabase
    .from('system_limitations')
    .select('id, limitation_category, affected_areas, detected_metric')
    .is('resolved_at', null);
  if (existingErr) {
    errors.push(`system_limitations read failed: ${existingErr.message}`);
    return { found: findings.length, inserted: 0, resolved: 0, passes_ok: passesOk, passes_failed: passesFailed, dormant, errors };
  }
  const exMap = new Map<string, { id: string; category: string }>();
  for (const r of (existing as Array<{ id: string; limitation_category: string; affected_areas: string[]; detected_metric: string }> | null) ?? []) {
    exMap.set(`${r.limitation_category}|${r.affected_areas?.[0] ?? ''}|${r.detected_metric}`, {
      id: r.id,
      category: r.limitation_category,
    });
  }

  let inserted = 0;
  const stillActive = new Set<string>();
  for (const f of findings) {
    const key = `${f.limitation_category}|${f.affected_areas[0] ?? ''}|${f.detected_metric}`;
    stillActive.add(key);
    const hit = exMap.get(key);
    if (hit) {
      const { error } = await supabase.from('system_limitations').update({
        description: f.description,
        severity: f.severity,
        detected_value: f.detected_value,
        remediation_status: f.remediation_status,
        remediation_note: f.remediation_note ?? null,
        reported_at: new Date().toISOString(),
      }).eq('id', hit.id);
      if (error) errors.push(`update ${key}: ${error.message}`);
    } else {
      const { error } = await supabase.from('system_limitations').insert({
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
      if (error) errors.push(`insert ${key}: ${error.message}`);
      else inserted++;
    }
  }

  // Resolve anything that didn't appear this pass — EXCEPT findings owned by
  // a pass that failed, and except the dormant staleness category, which
  // cannot re-detect itself.
  let resolved = 0;
  for (const [key, hit] of exMap.entries()) {
    if (stillActive.has(key)) continue;
    if (failedCategories.has(hit.category)) continue;
    if (hit.category === 'staleness') continue;
    const { error } = await supabase
      .from('system_limitations')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', hit.id);
    if (error) errors.push(`resolve ${key}: ${error.message}`);
    else resolved++;
  }

  // Event sourcing
  await recordEvent({
    event_type: 'limitations.compiled',
    aggregate_id: 'system',
    aggregate_type: 'limitation',
    payload: { found: findings.length, inserted, resolved, passes_ok: passesOk, passes_failed: passesFailed },
    metadata: { source: 'cron/compile-limitations' },
  });

  return {
    found: findings.length,
    inserted,
    resolved,
    passes_ok: passesOk,
    passes_failed: passesFailed,
    dormant,
    errors,
  };
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

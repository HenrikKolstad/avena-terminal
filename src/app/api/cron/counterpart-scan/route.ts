/**
 * Counterpart Scan cron — daily 04:00 UTC.
 *
 * Walks the developer universe and applies score drift when a developer's
 * risk signals have CHANGED since the last scan. Emits stress alerts when a
 * score crosses a threshold.
 *
 * 2026-10-10 — this route used to apply the drift on every run regardless of
 * whether anything had changed. Because nothing in the codebase updates the
 * stress signals (no Registro Mercantil / BORME ingest exists — see the v2
 * note below), the drift was a constant and the scan was a nightly countdown:
 * 122 `grade_revised` events per developer with min(drift) == max(drift),
 * Neinor Homes 59 -> 0, Realia Patrimonio 49 -> 0, Metrovacesa 13 -> 0, all
 * pinned at the clamp floor and published at grade DV, plus ~725 "active"
 * financial-distress alerts accumulating at ~5/day. The decision layer now
 * lives in `src/lib/counterpart-drift.ts` behind tests
 * (`scripts/test-counterpart-drift.ts`), and the rule is: a scan may move a
 * score only when it has learned something.
 *
 * Future v2: Spain Registro Mercantil + BORME integration to detect
 * real-time stress signals (filings, judgements, suspensions). Until that
 * exists the signals are static and every scan will correctly HOLD.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog, finishCronLogDerived } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/event-store';
import { decideScan, type DeveloperScanRow } from '@/lib/counterpart-drift';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SELECT_COLS =
  'developer_id, name, counterpart_score, score_trend, payment_delay_signals, ' +
  'legal_disputes_active, court_judgements_against, delayed_projects, ' +
  'cancelled_projects, financial_stress_score, signals_fingerprint';

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const log = await startCronLog('counterpart-scan', '/api/cron/counterpart-scan');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  // Paginate — counterpart_developers may hold thousands of rows once the
  // discovery cron has mined the full Spanish corpus. Supabase caps at 1000
  // per query so we loop until exhaustion.
  const pageSize = 1000;
  let from = 0;
  const developers: DeveloperScanRow[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('counterpart_developers')
      .select(SELECT_COLS)
      .order('counterpart_score', { ascending: true })   // process distressed first
      .range(from, from + pageSize - 1);
    if (error) {
      await finishCronLog(log, 'error', null, error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    developers.push(...(data as unknown as DeveloperScanRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 50_000) break;
  }

  // Which developers already carry an open alert of a given type. Used to stop
  // the scan re-minting an identical "active" alert every night — the old code
  // inserted unconditionally, which is how Metrovacesa accumulated 137 of them.
  const openAlerts = new Set<string>();
  {
    const { data, error } = await supabase
      .from('counterpart_stress_alerts')
      .select('developer_id, alert_type')
      .eq('status', 'active');
    if (error) {
      // An unreadable alert table means we cannot tell a new alert from a
      // duplicate. Refuse the run rather than guess — guessing here is what
      // minted 725 phantom alerts.
      await finishCronLog(log, 'error', null, error);
      return NextResponse.json({ ok: false, error: `alert read failed: ${error.message}` }, { status: 500 });
    }
    for (const a of data ?? []) openAlerts.add(`${a.developer_id}::${a.alert_type}`);
  }

  let baselined = 0;
  let held = 0;
  let scoreUpdated = 0;
  let flooredCount = 0;
  let alertsCreated = 0;
  let alertsSuppressed = 0;
  const writeFailures: string[] = [];

  for (const d of developers) {
    const decision = decideScan(d);

    // ── nothing learned: bank the fingerprint, move nothing ────────────────
    if (decision.action === 'baseline' || decision.action === 'hold') {
      if (d.signals_fingerprint !== decision.fingerprint) {
        const { error } = await supabase
          .from('counterpart_developers')
          .update({ signals_fingerprint: decision.fingerprint, last_full_scan: new Date().toISOString() })
          .eq('developer_id', d.developer_id);
        if (error) writeFailures.push(`${d.developer_id} fingerprint: ${error.message}`);
      }
      if (decision.action === 'baseline') baselined++; else held++;
      continue;
    }

    // ── a real change: apply the drift once ───────────────────────────────
    const { error: updErr } = await supabase
      .from('counterpart_developers')
      .update({
        counterpart_score: decision.newScore,
        score_grade: decision.newGrade,
        score_trend: decision.newTrend,
        score_last_updated: new Date().toISOString(),
        last_full_scan: new Date().toISOString(),
        signals_fingerprint: decision.fingerprint,
      })
      .eq('developer_id', d.developer_id);

    // The old code wrapped this in try/catch and incremented `updated` inside
    // the try. The Supabase client RESOLVES on a failed write, so the catch
    // never fired and a rejected update counted as a success. Check the
    // returned error, and do not record history for a write that did not land.
    if (updErr) {
      writeFailures.push(`${d.developer_id} score: ${updErr.message}`);
      continue;
    }
    scoreUpdated++;
    if (decision.floored) flooredCount++;

    // Event sourcing (Architectural Commitment 1): a grade REVISION is an
    // immutable event. The old condition was
    // `Math.abs(delta) >= 1 || newGrade !== undefined` — the right-hand side
    // is always true, so an event was written on every scan whether or not
    // anything changed, including 0 -> 0. Only record an actual revision.
    if (decision.newScore !== decision.previousScore) {
      await recordEvent({
        event_type: 'counterpart.grade_revised',
        aggregate_id: d.developer_id,
        aggregate_type: 'counterpart',
        payload: {
          developer_id: d.developer_id,
          name: d.name,
          previous_score: decision.previousScore,
          new_score: decision.newScore,
          new_grade: decision.newGrade,
          trend: decision.newTrend,
          drift: decision.drift,
          floored: decision.floored,
          reason: 'signals_changed',
        },
        metadata: { source: 'cron/counterpart-scan' },
      });
    }

    // ── alerts, de-duplicated against what is already open ────────────────
    let alertSeverity: string | null = null;
    let alertType: string | null = null;
    let alertDesc: string | null = null;

    if (decision.previousScore >= 50 && decision.newScore < 50) {
      alertSeverity = 'critical';
      alertType = 'score_drop';
      alertDesc = `Counterpart Score dropped below 50 (now ${decision.newScore}). Distress threshold crossed. Recommend immediate review of any active commitments.`;
    } else if (decision.drift <= -2) {
      alertSeverity = decision.newScore < 60 ? 'high' : 'medium';
      alertType = 'financial_distress';
      alertDesc = `Score dropped from ${decision.previousScore} to ${decision.newScore} (-${Math.abs(Math.round(decision.drift))} points). Driver: ${(d.payment_delay_signals ?? 0) > 3 ? 'payment delay signals' : (d.legal_disputes_active ?? 0) > 2 ? 'active legal disputes' : (d.court_judgements_against ?? 0) > 0 ? 'court judgements' : 'multiple stress factors'}.`;
    }

    if (alertSeverity && alertType && alertDesc) {
      const key = `${d.developer_id}::${alertType}`;
      if (openAlerts.has(key)) {
        alertsSuppressed++;
      } else {
        const { error: alertErr } = await supabase.from('counterpart_stress_alerts').insert({
          developer_id: d.developer_id,
          alert_type: alertType,
          severity: alertSeverity,
          description: alertDesc,
          status: 'active',
        });
        if (alertErr) writeFailures.push(`${d.developer_id} alert: ${alertErr.message}`);
        else { alertsCreated++; openAlerts.add(key); }
      }
    }
  }

  const summary = {
    scanned: developers.length,
    baselined,
    held_signals_unchanged: held,
    score_updated: scoreUpdated,
    scores_decided_by_clamp: flooredCount,
    alerts_created: alertsCreated,
    alerts_suppressed_as_duplicate: alertsSuppressed,
    write_failures: writeFailures.length,
    write_failure_detail: writeFailures.slice(0, 10),
    note: 'v1 — drift applies only when risk signals change. v2 will integrate Registro Mercantil + BORME; until then static signals correctly HOLD.',
  };

  // A failed write must not read as a clean run.
  if (writeFailures.length > 0) {
    await finishCronLog(log, 'error', summary, new Error(`${writeFailures.length} write(s) failed; first: ${writeFailures[0]}`));
    return NextResponse.json({ ok: false, ...summary }, { status: 500 });
  }

  await finishCronLogDerived(log, summary);
  return NextResponse.json({ ok: true, ...summary });
}

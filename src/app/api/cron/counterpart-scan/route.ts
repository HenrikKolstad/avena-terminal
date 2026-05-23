/**
 * Counterpart Scan cron — daily 04:00 UTC.
 *
 * Lightweight v1: walks active developers, applies deterministic score
 * drift driven by their existing risk signals (active disputes, payment
 * delays, court judgements, delayed projects). Emits stress alerts when
 * a developer crosses score thresholds.
 *
 * Future v2: Spain Registro Mercantil + BORME integration to detect
 * real-time stress signals (filings, judgements, suspensions).
 */

import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface Developer {
  developer_id: string;
  name: string;
  counterpart_score: number;
  score_trend: string | null;
  payment_delay_signals: number;
  legal_disputes_active: number;
  court_judgements_against: number;
  delayed_projects: number;
  cancelled_projects: number;
  financial_stress_score: number | null;
  total_projects: number;
}

/**
 * Compute score drift based on current signals. Negative drift = score
 * degrades when stress accumulates. Bounded to ±3 points per scan to
 * avoid wild swings.
 */
function computeDrift(d: Developer): number {
  let drift = 0;
  // Negative pressure from stress signals
  if (d.payment_delay_signals > 3) drift -= 1.5;
  if (d.legal_disputes_active > 2) drift -= 1.0;
  if (d.court_judgements_against > 0) drift -= 1.5;
  if (d.delayed_projects > 5) drift -= 1.0;
  if (d.cancelled_projects > 1) drift -= 1.5;
  if (d.financial_stress_score != null && d.financial_stress_score > 60) drift -= 1.0;

  // Positive recovery if no recent stress signals
  if (
    d.payment_delay_signals === 0 &&
    d.legal_disputes_active === 0 &&
    d.court_judgements_against === 0 &&
    d.delayed_projects <= 3
  ) {
    drift += 0.5;
  }

  // Clamp
  return Math.max(-3, Math.min(3, drift));
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
  const auth = req.headers.get('authorization');
  if (auth && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
  const developersAll: Developer[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('counterpart_developers')
      .select('developer_id, name, counterpart_score, score_trend, payment_delay_signals, legal_disputes_active, court_judgements_against, delayed_projects, cancelled_projects, financial_stress_score, total_projects')
      .order('counterpart_score', { ascending: true })   // process distressed first
      .range(from, from + pageSize - 1);
    if (error) {
      await finishCronLog(log, 'error', null, error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    developersAll.push(...(data as Developer[]));
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 50_000) break;
  }
  const developers = developersAll;
  let updated = 0;
  let alertsCreated = 0;

  for (const d of developers) {
    const drift = computeDrift(d);
    if (drift === 0) continue;

    const newScore = Math.max(0, Math.min(100, Math.round(d.counterpart_score + drift)));
    const newGrade = scoreToGrade(newScore);
    const newTrend = drift < -0.5 ? 'deteriorating' : drift > 0.5 ? 'improving' : 'stable';

    try {
      await supabase
        .from('counterpart_developers')
        .update({
          counterpart_score: newScore,
          score_grade: newGrade,
          score_trend: newTrend,
          score_last_updated: new Date().toISOString(),
          last_full_scan: new Date().toISOString(),
        })
        .eq('developer_id', d.developer_id);
      updated++;
    } catch { continue; }

    // Emit alert when score crosses thresholds
    let alertSeverity: string | null = null;
    let alertType: string | null = null;
    let alertDesc: string | null = null;

    // Crossed below 50 (distressed threshold)
    if (d.counterpart_score >= 50 && newScore < 50) {
      alertSeverity = 'critical';
      alertType = 'score_drop';
      alertDesc = `Counterpart Score dropped below 50 (now ${newScore}). Distress threshold crossed. Recommend immediate review of any active commitments.`;
    }
    // Significant drop ≥5 points
    else if (drift <= -2) {
      alertSeverity = newScore < 60 ? 'high' : 'medium';
      alertType = 'financial_distress';
      alertDesc = `Score dropped from ${d.counterpart_score} to ${newScore} (-${Math.abs(Math.round(drift))} points). Driver: ${d.payment_delay_signals > 3 ? 'payment delay signals' : d.legal_disputes_active > 2 ? 'active legal disputes' : d.court_judgements_against > 0 ? 'court judgements' : 'multiple stress factors'}.`;
    }

    if (alertSeverity && alertType && alertDesc) {
      try {
        await supabase.from('counterpart_stress_alerts').insert({
          developer_id: d.developer_id,
          alert_type: alertType,
          severity: alertSeverity,
          description: alertDesc,
          status: 'active',
        });
        alertsCreated++;
      } catch { /* silent */ }
    }
  }

  const summary = {
    scanned: developers.length,
    score_updated: updated,
    alerts_created: alertsCreated,
    note: 'v1 — drift-based scoring. v2 will integrate Registro Mercantil + BORME.',
  };

  await finishCronLog(log, 'success', summary);
  return NextResponse.json({ ok: true, ...summary });
}

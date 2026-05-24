/**
 * Daily macro anomaly scan over eu_official_stats.
 * Schedule: 06:00 UTC (after eu-validation at 05:30).
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { detectAnomalies, persistAnomalies } from '@/lib/eu-anomalies';
import { deliverEvent } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function GET() {
  const log = await startCronLog('eu-anomalies', '/api/cron/eu-anomalies');
  try {
    const rows = await detectAnomalies();
    const written = await persistAnomalies(rows);
    const bySev: Record<string, number> = {};
    for (const r of rows) bySev[r.severity] = (bySev[r.severity] ?? 0) + 1;

    // Webhook fanout — every detected anomaly fires anomaly.detected;
    // critical-severity rows also fire anomaly.critical.
    let webhooks_sent = 0;
    let webhooks_failed = 0;
    for (const r of rows) {
      const payload = {
        country_code: r.country_code,
        source: r.source,
        indicator_code: r.indicator_code,
        indicator_name: r.indicator_name,
        period: r.period,
        value: r.value,
        z_score: r.z_score,
        severity: r.severity,
        trend: r.trend,
        note: r.note,
        source_url: r.source_url,
      };
      const d1 = await deliverEvent('anomaly.detected', payload);
      webhooks_sent += d1.ok; webhooks_failed += d1.failed;
      if (r.severity === 'critical') {
        const d2 = await deliverEvent('anomaly.critical', payload);
        webhooks_sent += d2.ok; webhooks_failed += d2.failed;
      }
    }

    await finishCronLog(log, 'success', { detected: rows.length, written, by_severity: bySev, webhooks_sent, webhooks_failed });
    return NextResponse.json({ ok: true, detected: rows.length, written, by_severity: bySev, webhooks_sent, webhooks_failed, sample: rows.slice(0, 10) });
  } catch (e) {
    await finishCronLog(log, 'error', null, e as Error);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

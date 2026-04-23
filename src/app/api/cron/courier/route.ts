/**
 * Agent Courier — deal alerts dispatcher.
 *
 * Daily at 09:00 UTC, scans the top-scored recent properties and emails
 * confirmed subscribers whose filters match. Rate-limited so each subscriber
 * gets at most one email per 24h.
 */

import { NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Alert {
  id: number;
  email: string;
  regions: string[];
  min_score: number;
  max_price_eur: number | null;
  min_yield: number | null;
  unsubscribe_token: string | null;
  last_sent_at: string | null;
}

function slugRegion(costa: string | null | undefined): string {
  if (!costa) return '';
  return costa.toLowerCase().replace(/^costa\s+/, 'costa-').replace(/\s+/g, '-');
}

export async function GET() {
  const log = await startCronLog('courier', '/api/cron/courier');

  if (!supabase) {
    await finishCronLog(log, 'skipped', { reason: 'no supabase' });
    return NextResponse.json({ ok: false, reason: 'no supabase' });
  }

  // Load active confirmed alerts not sent in last 24h
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: alertsRaw } = await supabase
    .from('deal_alerts')
    .select('id, email, regions, min_score, max_price_eur, min_yield, unsubscribe_token, last_sent_at')
    .eq('active', true)
    .eq('confirmed', true)
    .or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`);

  const alerts = (alertsRaw ?? []) as Alert[];
  if (alerts.length === 0) {
    await finishCronLog(log, 'success', { sent: 0, alerts: 0 });
    return NextResponse.json({ ok: true, sent: 0, alerts: 0 });
  }

  // Load properties, filter to top performers
  const all = getAllProperties()
    .filter((p) => p.ref && p._sc != null && p.pf > 0)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 100);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    await finishCronLog(log, 'skipped', { reason: 'no resend key', alerts: alerts.length });
    return NextResponse.json({ ok: false, reason: 'no RESEND_API_KEY', alerts: alerts.length });
  }

  const { Resend } = await import('resend');
  const resend = new Resend(resendKey);

  let sent = 0;
  for (const alert of alerts) {
    // Match properties against filters
    const matches = all.filter((p) => {
      if ((p._sc ?? 0) < alert.min_score) return false;
      if (alert.max_price_eur && p.pf > alert.max_price_eur) return false;
      if (alert.min_yield && (p._yield?.gross ?? 0) < alert.min_yield) return false;
      if (alert.regions.length && !alert.regions.includes('*')) {
        const propRegion = slugRegion(p.costa);
        if (!alert.regions.includes(propRegion)) return false;
      }
      return true;
    }).slice(0, 5);

    if (matches.length === 0) continue;

    const rows = matches.map((p) => {
      const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
      const url = `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`;
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee">
          <a href="${url}" style="color:#c89b3c;text-decoration:none;font-weight:600">${p.p || `${p.t} in ${p.l}`}</a>
          <div style="color:#666;font-size:12px;margin-top:2px">${p.l} · ${p.t} · ${p.bd}bed${pm2 ? ` · €${pm2}/m²` : ''}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top">
          <div style="font-size:18px;color:#c89b3c;font-weight:700">${Math.round(p._sc ?? 0)}</div>
          <div style="color:#666;font-size:12px">€${p.pf.toLocaleString()}</div>
        </td>
      </tr>`;
    }).join('');

    try {
      await resend.emails.send({
        from: 'Avena Alerts <alerts@avenaterminal.com>',
        to: alert.email,
        subject: `${matches.length} new Avena ${matches.length === 1 ? 'deal' : 'deals'} matching your filters`,
        html: `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1a1a1a">
          <h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;margin:0 0 8px 0">Avena deal alerts</h1>
          <p style="color:#666;font-size:13px;margin:0 0 24px 0">${matches.length} new matches · min score ${alert.min_score}${alert.max_price_eur ? ` · under €${alert.max_price_eur.toLocaleString()}` : ''}</p>
          <table style="width:100%;border-collapse:collapse">${rows}</table>
          <p style="margin-top:32px"><a href="https://avenaterminal.com" style="color:#c89b3c">Open Avena Terminal →</a></p>
          <p style="color:#999;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">You're getting this because you subscribed at avenaterminal.com. <a href="https://avenaterminal.com/api/deal-alerts/unsubscribe?t=${alert.unsubscribe_token}" style="color:#999">Unsubscribe</a>.</p>
        </body></html>`,
      });

      await supabase
        .from('deal_alerts')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', alert.id);
      sent++;
    } catch {
      /* continue — one failure shouldn't stop the batch */
    }
  }

  await finishCronLog(log, 'success', { sent, alerts: alerts.length });
  return NextResponse.json({ ok: true, sent, alerts: alerts.length });
}

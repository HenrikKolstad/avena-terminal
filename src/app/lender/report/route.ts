/**
 * GET /lender/report: the Sell-Through Monitor as a printable HTML report.
 * Same key gate and query params as /api/v1/lender/monitor. noindex.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkLenderKey } from '@/lib/lender-access';
import { computeMonitor } from '@/lib/sellthrough';
import { loadMonitorInputs } from '@/lib/sellthrough-data';
import { renderReportHtml } from '@/lib/sellthrough-report';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200) : undefined);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const access = checkLenderKey(req.headers.get('x-avena-key') ?? q.get('key'));
  const headers = { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'private, no-store' };
  if (!access.ok) {
    return new NextResponse('Lender access key required. Contact Avena for a pilot key.', { status: 401, headers });
  }
  try {
    const { series, meta, asOf } = await loadMonitorInputs();
    const towns = list(q.get('towns'));
    const projects = list(q.get('projects'));
    const result = computeMonitor(series, meta, {
      asOf,
      windowDays: Number(q.get('window')) || 30,
      region: q.get('region') ?? undefined,
      towns,
      projects,
    });
    const scope = [q.get('region'), towns?.join(', '), projects?.length ? `${projects.length} watched projects` : null].filter(Boolean).join(' · ');
    const html = renderReportHtml(result, { licensee: access.label, subtitle: scope ? `Watchlist: ${scope}.` : undefined });
    return new NextResponse(html, { headers: { ...headers, 'content-type': 'text/html; charset=utf-8' } });
  } catch (e) {
    return new NextResponse(`Monitor unavailable: ${e instanceof Error ? e.message : String(e)}`, { status: 503, headers });
  }
}

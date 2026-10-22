import { NextResponse } from 'next/server';
import { collectHealth } from '@/lib/health';

/**
 * GET /api/health — public, machine-readable engine health.
 *
 * Same grading as the /engine status badge and the 6-hourly /api/cron/health
 * job (src/lib/health.ts). Returns 200 while the engine is operational or
 * degraded and 503 when it is down, so any external uptime monitor can watch
 * this URL without parsing the body.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const report = await collectHealth();
  return NextResponse.json(report, {
    status: report.status === 'down' ? 503 : 200,
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  });
}

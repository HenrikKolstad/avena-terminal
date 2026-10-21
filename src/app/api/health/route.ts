import { NextResponse } from 'next/server';
import { getHealth } from '@/lib/health-collect';

/**
 * GET /api/health — machine-readable engine health.
 *
 * 200 for operational/degraded, 503 for down, so any uptime monitor (and
 * .github/workflows/health-check.yml) can alarm on the status code alone.
 * Reports facts only: no secrets, no row data.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const report = await getHealth();
  return NextResponse.json(report, {
    status: report.status === 'down' ? 503 : 200,
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  });
}

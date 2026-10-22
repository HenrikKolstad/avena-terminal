/**
 * GET /api/v1/lender/monitor: the Sell-Through Monitor as JSON or CSV.
 *
 * Auth: header `x-avena-key: <key>` (or ?key=), checked against
 * LENDER_ACCESS_KEYS. Paid product; there is no anonymous tier.
 *
 * Query:
 *   window=30          trailing window in days for flow metrics (7-90)
 *   region=cb-south    cb-north | cb-south | costa-calida | costa-del-sol
 *   towns=Estepona,Mijas
 *   projects=P01007,P02071   watchlist of RedSP development refs
 *   format=json|csv    csv = one row per project
 *   section=all|market|towns|projects|weekly|cuts|exits
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkLenderKey } from '@/lib/lender-access';
import { computeMonitor, type MonitorResult } from '@/lib/sellthrough';
import { loadMonitorInputs } from '@/lib/sellthrough-data';
import { projectsToCsv } from '@/lib/sellthrough-format';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Snapshots land once a night, so the decoded book is cached per instance for
// an hour; the monitor itself is recomputed per request (it is cheap).
let cache: { at: number; inputs: Awaited<ReturnType<typeof loadMonitorInputs>> } | null = null;
const TTL_MS = 60 * 60 * 1000;

const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200) : undefined);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const access = checkLenderKey(req.headers.get('x-avena-key') ?? q.get('key'));
  if (!access.ok) {
    return NextResponse.json(
      { error: 'Lender access key required (header x-avena-key). Contact Avena for a pilot key.' },
      { status: 401 },
    );
  }

  try {
    if (!cache || Date.now() - cache.at > TTL_MS) cache = { at: Date.now(), inputs: await loadMonitorInputs() };
    const { series, meta, asOf } = cache.inputs;
    const result = computeMonitor(series, meta, {
      asOf,
      windowDays: Number(q.get('window')) || 30,
      region: q.get('region') ?? undefined,
      towns: list(q.get('towns')),
      projects: list(q.get('projects')),
    });

    if (q.get('format') === 'csv') {
      return new NextResponse(projectsToCsv(result.projects), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="avena-sellthrough-projects-${asOf}.csv"`,
          'cache-control': 'private, no-store',
        },
      });
    }

    const section = q.get('section') ?? 'all';
    const pick: Record<string, (r: MonitorResult) => unknown> = {
      market: (r) => ({ market: r.market, regions: r.regions }),
      towns: (r) => ({ towns: r.towns }),
      projects: (r) => ({ projects: r.projects }),
      weekly: (r) => ({ weekly: r.weekly }),
      cuts: (r) => ({ recentCuts: r.recentCuts }),
      exits: (r) => ({ recentExits: r.recentExits }),
    };
    const { methodology, coverage, knownGaps, seriesStart, windowStart, windowDays } = result;
    const body = section in pick
      ? { asOf, windowDays, windowStart, seriesStart, knownGaps, coverage, ...(pick[section](result) as object), methodology }
      : result;
    return NextResponse.json(body, { headers: { 'cache-control': 'private, no-store', 'x-avena-licensee': access.label ?? '' } });
  } catch (e) {
    // Never degrade to an empty book: a failure must look like a failure.
    return NextResponse.json({ error: 'Monitor unavailable', detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}

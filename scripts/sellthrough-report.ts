/**
 * scripts/sellthrough-report.ts: build the Sell-Through Monitor deliverable
 * (HTML report, per-project CSV, full JSON) from real data.
 *
 *   npx tsx scripts/sellthrough-report.ts --out ./out-report            # live DB (needs Supabase env)
 *   npx tsx scripts/sellthrough-report.ts --series export.json --out dir # from a read-only SQL export
 *
 * The export format is the output of this read-only query, one row per ref:
 *   with s as (select ref, snapshot_date d, price::bigint p, town, region, type,
 *     lag(price) over (partition by ref order by snapshot_date) pp,
 *     min(snapshot_date) over (partition by ref) f, max(snapshot_date) over (partition by ref) l
 *     from price_snapshots where snapshot_date >= '2026-08-05' and price is not null)
 *   select ref, max(town) town, max(region) region, max(type) type, min(f)::text first_seen,
 *     max(l)::text last_seen, json_agg(json_build_array(d::text, p) order by d)
 *     filter (where pp is null or pp <> p or d = l) pts from s group by ref
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { computeMonitor, type RefSeries } from '../src/lib/sellthrough';
import { loadMonitorInputs, loadRefMeta } from '../src/lib/sellthrough-data';
import { projectsToCsv } from '../src/lib/sellthrough-format';
import { renderReportHtml } from '../src/lib/sellthrough-report';

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const out = arg('--out') ?? 'out-report';
  const window = Number(arg('--window') ?? 30);
  let series: RefSeries[];
  let asOf: string;
  const meta = loadRefMeta();
  const file = arg('--series');
  if (file) {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Array<{ ref: string; town: string; region: string; type: string; first_seen: string; last_seen: string; pts: Array<[string, number]> }>;
    series = raw.map((r) => ({ ref: r.ref, town: r.town, region: r.region, type: r.type, firstSeen: r.first_seen, lastSeen: r.last_seen, points: r.pts.map(([d, p]) => [d, Number(p)] as [string, number]) }));
    asOf = series.reduce((m, s) => (s.lastSeen > m ? s.lastSeen : m), '');
  } else {
    ({ series, asOf } = await loadMonitorInputs());
  }
  if (series.length < 500) throw new Error(`only ${series.length} refs: refusing to publish a report on a broken book`);
  const result = computeMonitor(series, meta, { asOf, windowDays: window });
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, `sellthrough-report-${asOf}.html`), renderReportHtml(result));
  writeFileSync(path.join(out, `sellthrough-projects-${asOf}.csv`), projectsToCsv(result.projects));
  writeFileSync(path.join(out, `sellthrough-monitor-${asOf}.json`), JSON.stringify(result, null, 1));
  console.log(`asOf ${asOf}: ${result.coverage.live} live, ${result.coverage.projects} projects, ${result.coverage.exitsSinceStart} exits, ${result.coverage.priceMovesSinceStart} moves -> ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

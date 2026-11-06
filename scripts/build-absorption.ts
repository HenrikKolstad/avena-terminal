/**
 * Build data/absorption.json from the daily price_snapshots series.
 *
 *   npx tsx scripts/build-absorption.ts
 *   npx tsx scripts/build-absorption.ts --series export.json
 *   npx tsx scripts/build-absorption.ts --out data/absorption.json --window 30
 *
 * The live path calls loadMonitorInputs() (price_snapshots since 2026-08-05).
 * The --series path reads the same export as scripts/sellthrough-report.ts:
 * one object per ref, with ref, town, region, type, first_seen, last_seen, pts.
 *
 * Coast, region and town GroupStats come from computeMonitor. Project rows,
 * listing references and the lender watchlist are not written.
 * Fewer than 500 refs is refused: a thin book must not be published as the coast.
 *
 * Refresh: .github/workflows/absorption-refresh.yml, daily 06:40 UTC, after
 * the 02:20 pricing-history cron. It needs NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY. vintages-freeze.yml is the wrong job: it has no
 * database secret and rebuilds the price index from git history of
 * public/data.json, which is a weekly cross-section, not this daily series.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  MIN_PUBLISHED_LISTINGS,
  absorptionPath,
  canonicalAbsorptionJson,
  publicFromMonitor,
  readAbsorption,
} from '../src/lib/absorption';
import { computeMonitor, type RefSeries } from '../src/lib/sellthrough';
import { loadMonitorInputs, loadRefMeta } from '../src/lib/sellthrough-data';

const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : undefined;
};

interface ExportRow {
  ref: string;
  town: string | null;
  region: string | null;
  type: string | null;
  first_seen: string;
  last_seen: string;
  pts: Array<[string, number]>;
}

function seriesFromExport(raw: ExportRow[]): RefSeries[] {
  return raw.map((row) => ({
    ref: row.ref,
    town: row.town,
    region: row.region,
    type: row.type,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    points: row.pts.map(([date, price]) => [date, Number(price)] as [string, number]),
  }));
}

async function loadSeries(): Promise<{ series: RefSeries[]; asOf: string }> {
  const file = arg('--series');
  if (!file) return loadMonitorInputs();
  const raw = JSON.parse(readFileSync(file, 'utf8')) as ExportRow[];
  const series = seriesFromExport(raw);
  const asOf = series.reduce((max, row) => (row.lastSeen > max ? row.lastSeen : max), '');
  return { series, asOf };
}

async function main() {
  const windowDays = Number(arg('--window') ?? 30);
  const out = arg('--out') ?? absorptionPath();
  const { series, asOf } = await loadSeries();
  if (series.length < MIN_PUBLISHED_LISTINGS) {
    throw new Error(`only ${series.length} refs: refusing to publish absorption on a broken book`);
  }
  const result = computeMonitor(series, loadRefMeta(), { asOf, windowDays });
  const file = publicFromMonitor(result);
  writeFileSync(out, canonicalAbsorptionJson(file));
  if (out === absorptionPath() || out.endsWith(`${join('data', 'absorption.json')}`)) {
    const reread = readAbsorption(out);
    if (reread.asOf !== file.asOf || reread.towns.length !== file.towns.length) {
      throw new Error('wrote absorption.json but could not read it back');
    }
  }
  console.log(
    `asOf ${file.asOf}: ${file.coverage.live} live, ${file.coverage.towns} towns, ${file.coverage.developments} developments counted, ${file.coverage.exitsSinceStart} exits, ${file.towns.length} town rows -> ${out}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

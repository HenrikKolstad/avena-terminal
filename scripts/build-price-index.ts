/**
 * Build data/price-index.json from the git history of public/data.json.
 *
 *   npx tsx scripts/build-price-index.ts
 *   npx tsx scripts/build-price-index.ts --as-of 2026-11-04
 *
 * Same closed-week calendar as scripts/freeze-vintages.ts. No secrets.
 * The weekly job is .github/workflows/vintages-freeze.yml. A short git
 * history is refused, because a shallow clone would publish a truncated
 * chain as the whole series.
 */
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  SERIES_START,
  assertFullHistory,
  planClosedWeeks,
  utcDay,
  type DatedCommit,
} from '../src/lib/vintages';
import {
  buildPriceIndex,
  canonicalPriceIndexJson,
  indexListingsFromBook,
  priceIndexPath,
} from '../src/lib/price-index';

const ROOT = join(__dirname, '..');

function git(args: string[], maxBuffer = 16 * 1024 * 1024): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer });
}

function asOfFromArgv(): string {
  const index = process.argv.indexOf('--as-of');
  if (index < 0) return new Date().toISOString().slice(0, 10);
  const value = process.argv[index + 1];
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('--as-of must be YYYY-MM-DD');
  return value;
}

function commitsFromGit(): { earliest: string; commits: DatedCommit[] } {
  const log = git(['log', '--format=%H %cI', '--', 'public/data.json']);
  const lines = log.trim().split('\n').filter(Boolean);
  if (lines.length < 2) {
    throw new Error(`git history of public/data.json has ${lines.length} commit(s). Refusing to build the index from a short history.`);
  }
  const byDate = new Map<string, { commit: string; iso: string }>();
  let earliest = '9999-99-99';
  for (const line of lines) {
    const space = line.indexOf(' ');
    const commit = line.slice(0, space);
    const iso = line.slice(space + 1).trim();
    const date = utcDay(iso);
    if (date < earliest) earliest = date;
    const prev = byDate.get(date);
    if (!prev || iso > prev.iso) byDate.set(date, { commit, iso });
  }
  const commits = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, row]) => ({ date, commit: row.commit }));
  return { earliest, commits };
}

function main(): void {
  const asOf = asOfFromArgv();
  const { earliest, commits } = commitsFromGit();
  assertFullHistory(earliest, SERIES_START);
  const plans = planClosedWeeks({ commits, asOf });
  if (!plans.length) throw new Error(`no closed week on or after ${SERIES_START} as of ${asOf}`);

  const needed = new Map<string, string>();
  for (const plan of plans) {
    if (plan.status === 'frozen' && plan.vintage_date && plan.capture_commit) {
      needed.set(plan.vintage_date, plan.capture_commit);
    }
  }
  const books = new Map<string, ReturnType<typeof indexListingsFromBook>>();
  for (const [date, commit] of [...needed.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  reading ${date} ${commit.slice(0, 12)}`);
    const raw = git(['show', `${commit}:public/data.json`], 64 * 1024 * 1024);
    books.set(date, indexListingsFromBook(JSON.parse(raw)));
  }

  const file = buildPriceIndex({ plans, books });
  const body = canonicalPriceIndexJson(file);
  writeFileSync(priceIndexPath(), body);
  const latest = file.latest;
  console.log(`wrote ${priceIndexPath()}`);
  console.log(`data as of ${file.data_as_of ?? 'none'}`);
  console.log(`towns published ${file.towns_published}, omitted ${file.towns_omitted}, rows ${file.rows.length}`);
  if (!latest || latest.index == null || latest.matched_pairs == null) {
    throw new Error('coast index has no latest value — refusing to publish a file with a blank headline');
  }
  console.log(`coast ${latest.iso_week} ${latest.capture_date} index ${latest.index.toFixed(2)} change ${latest.change_pct ?? 'base'} matched ${latest.matched_pairs} spans_gap ${latest.spans_declared_capture_gap}`);
}

main();

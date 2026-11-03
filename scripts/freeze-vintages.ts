/**
 * Freeze weekly town/province vintages from git history of public/data.json.
 *
 *   npx tsx scripts/freeze-vintages.ts
 *   npx tsx scripts/freeze-vintages.ts --as-of 2026-11-03
 *
 * No secrets. The weekly job is .github/workflows/vintages-freeze.yml.
 * Existing vintage files are never rewritten. A short git history is refused,
 * because a shallow clone would publish the missing weeks as gaps.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  SERIES_START,
  assertFullHistory,
  buildVintageFile,
  decideFreeze,
  listingsFromBook,
  listVintageFiles,
  planClosedWeeks,
  utcDay,
  writeFreeze,
  type DatedCommit,
  type VintageFile,
  type VintageListing,
} from '../src/lib/vintages';

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
    throw new Error(`git history of public/data.json has ${lines.length} commit(s). Refusing to freeze from a short history.`);
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
  const books = new Map<string, VintageListing[]>();
  for (const [date, commit] of [...needed.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  reading ${date} ${commit.slice(0, 12)}`);
    const raw = git(['show', `${commit}:public/data.json`], 64 * 1024 * 1024);
    books.set(date, listingsFromBook(JSON.parse(raw)));
  }

  const files = new Map<string, VintageFile>();
  for (const plan of plans) {
    if (plan.status !== 'frozen' || !plan.vintage_date) continue;
    const current = books.get(plan.vintage_date);
    if (!current) throw new Error(`missing book for ${plan.vintage_date}`);
    const previous = plan.compared_to ? books.get(plan.compared_to) ?? null : null;
    if (plan.compared_to && !previous) throw new Error(`missing comparison book for ${plan.compared_to}`);
    files.set(plan.vintage_date, buildVintageFile(plan, current, previous));
  }

  const dir = join(ROOT, 'data', 'vintages');
  const existingFiles = new Map<string, string>();
  for (const date of listVintageFiles(dir)) {
    existingFiles.set(date, readFileSync(join(dir, `${date}.json`), 'utf8'));
  }
  const manifestPath = join(dir, 'manifest.json');
  const existingManifestBody = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : null;
  const existingManifest = existingManifestBody ? JSON.parse(existingManifestBody) as unknown : null;

  const decision = decideFreeze({
    plans,
    files,
    existingFiles,
    existingManifest,
    existingManifestBody,
    strayDates: [...existingFiles.keys()],
  });
  if (decision.errors.length) {
    for (const error of decision.errors) console.error(error);
    process.exit(1);
  }
  writeFreeze(ROOT, decision);
  if (!decision.writes.length) console.log('No vintage changes.');
  else for (const write of decision.writes) console.log(`wrote ${write.path}`);

  const frozen = decision.manifest.vintages.filter((row) => row.status === 'frozen');
  const gaps = decision.manifest.vintages.filter((row) => row.status === 'gap');
  console.log(`vintages: ${frozen.length} frozen, ${gaps.length} gap week(s), ${decision.manifest.missing_capture_dates.length} missing capture date(s)`);
  console.log(`missing capture dates: ${decision.manifest.missing_capture_dates.join(', ') || '(none)'}`);
  for (const row of frozen) console.log(`  ${row.vintage_date}  ${row.iso_week}  rows ${row.row_count}  ${row.sha256}`);
}

main();

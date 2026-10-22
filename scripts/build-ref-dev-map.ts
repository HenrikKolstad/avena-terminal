/**
 * scripts/build-ref-dev-map.ts: rebuild data/ref-dev-map.json from the git
 * history of public/data.json.
 *
 * WHY. price_snapshots and sold_properties carry ref, town, region and type,
 * but not the RedSP development_ref that ties a listing to its project. The
 * live data.json has dev_ref only for listings that are still in the feed, so
 * a unit that sold out last month would lose its project the moment it left.
 * Every nightly feed commit is a full copy of the book, so the git history is
 * a complete record of which project each ref belonged to, when we first saw
 * it, and its last known build status and delivery quarter.
 *
 * Output is one row per ref, keyed by ref, holding only structural fields
 * (project id, status, delivery quarter, beds, area, first/last commit date).
 * No descriptions, photos or URLs.
 *
 * Run: npx tsx scripts/build-ref-dev-map.ts
 */
import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';

interface FeedRow {
  ref?: string;
  dev_ref?: string | null;
  s?: string;
  c?: string;
  bd?: number;
  bm?: number;
  t?: string;
  l?: string;
  r?: string;
}

export interface RefDevEntry {
  dev: string | null;
  status: string | null;
  delivery: string | null;
  beds: number | null;
  m2: number | null;
  type: string | null;
  town: string | null;
  region: string | null;
  first: string; // first feed-commit date this ref appeared (UTC date)
  last: string; // last feed-commit date this ref appeared
}

const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 30 });

function main() {
  const log = git(['log', '--reverse', '--format=%H %cI', '--', 'public/data.json'])
    .split('\n')
    .filter(Boolean);
  const out: Record<string, RefDevEntry> = {};
  let commits = 0;
  for (const line of log) {
    const [hash, iso] = line.split(' ');
    const day = new Date(iso).toISOString().slice(0, 10);
    let rows: FeedRow[];
    try {
      rows = JSON.parse(git(['show', `${hash}:public/data.json`]));
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    commits++;
    for (const p of rows) {
      if (!p.ref) continue;
      const prev = out[p.ref];
      out[p.ref] = {
        dev: p.dev_ref ?? prev?.dev ?? null,
        status: p.s ?? prev?.status ?? null,
        delivery: p.c && p.c !== 'TBA' ? p.c : prev?.delivery ?? null,
        beds: typeof p.bd === 'number' && p.bd > 0 ? p.bd : prev?.beds ?? null,
        m2: typeof p.bm === 'number' && p.bm > 0 ? p.bm : prev?.m2 ?? null,
        type: p.t ?? prev?.type ?? null,
        town: p.l ? p.l.split(',')[0].trim() : prev?.town ?? null,
        region: p.r ?? prev?.region ?? null,
        first: prev?.first ?? day,
        last: day,
      };
    }
  }
  const file = path.join(process.cwd(), 'data', 'ref-dev-map.json');
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(file, JSON.stringify({ built_from_commits: commits, refs: sorted }) + '\n');
  const withDev = Object.values(out).filter((e) => e.dev).length;
  console.log(`ref-dev-map: ${Object.keys(out).length} refs (${withDev} with a project id) from ${commits} feed commits -> ${file}`);
  if (commits < 10 || withDev < 1000) {
    console.error('refusing: implausibly small history, is this a shallow clone?');
    process.exit(1);
  }
}

main();

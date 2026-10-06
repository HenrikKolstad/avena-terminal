/**
 * test-db-tables — every `.from('<table>')` in the code must name a table
 * that exists, or be listed as a known absence with a reason.
 *
 * THE BUG THIS CATCHES
 *
 * supabase-js does not throw when a table is missing. It returns
 * `{ data: null, error: { code: '42P01', ... } }`. Code that destructures
 * only `data` therefore sees `null` and carries on as if the table were
 * empty — which is the project's recurring failure shape: a missing value
 * silently becoming a zero, so a broken thing looks like a working thing
 * with nothing to report.
 *
 * On 2026-10-06 a sweep found 148 distinct table names referenced across
 * src/ and scripts/, of which 14 did not exist. The most expensive was
 * src/lib/limitations.ts: its coverage pass read a non-existent
 * `eu_properties`, got null, scored all 28 EU countries at zero and
 * published "No indexed properties for ES. The Avena Index does not yet
 * cover this market." on a live institutional-facing page, nightly, while
 * the cron logged `found: 28, errors: [], success`.
 *
 * WHAT THIS DOES NOT CHECK
 *
 * Column names. The same class of bug exists one level down — the
 * push-training-data route wrote `pair_count`/`status`/`jsonl_preview` into
 * a table whose columns are `pairs_count`/`success`/(nothing), so it never
 * logged a single row. Catching that reliably needs an AST walk rather than
 * a regex: a brace-matching scan of object literals produces false keys on
 * spreads, ternaries and chained calls, and a test that cries wolf is worse
 * than no test. Tracked as OPEN in ODYSSEY-STATE.md.
 *
 * Run: npx tsx scripts/test-db-tables.ts
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SCAN_DIRS = ['src', 'scripts'];
const CODE_RE = /\.(ts|tsx|mjs|js)$/;

interface Manifest {
  snapshot_date: string;
  tables: string[];
  known_absent: Record<string, string>;
}

const manifest: Manifest = JSON.parse(
  readFileSync(join(ROOT, 'scripts/db-tables.json'), 'utf8'),
);

let pass = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (CODE_RE.test(entry)) out.push(p);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* 1. Manifest sanity — a broken manifest must not read as a clean sweep      */
/* -------------------------------------------------------------------------- */

console.log('A. manifest');
check('manifest lists tables', Array.isArray(manifest.tables) && manifest.tables.length > 50,
  `got ${manifest.tables?.length ?? 0}`);
check('manifest has a snapshot date', /^\d{4}-\d{2}-\d{2}$/.test(manifest.snapshot_date ?? ''),
  String(manifest.snapshot_date));
check('every known_absent entry carries a reason',
  Object.values(manifest.known_absent ?? {}).every(r => typeof r === 'string' && r.length > 20),
  'a bare absence with no reason is an undocumented bug, not a known one');

const known = new Set(manifest.tables);
const absent = new Set(Object.keys(manifest.known_absent ?? {}));
check('no table is both present and known_absent',
  [...absent].every(t => !known.has(t)),
  [...absent].filter(t => known.has(t)).join(', '));

/* -------------------------------------------------------------------------- */
/* 2. The sweep                                                               */
/* -------------------------------------------------------------------------- */

console.log('B. .from() sweep');

// This file's own prose contains `.from('x')` examples; scanning itself would
// report them as unaccounted tables.
const SELF = relative(ROOT, join(import.meta.dirname, 'test-db-tables.ts'));
const files = SCAN_DIRS.flatMap(d => walk(join(ROOT, d))).filter(
  f => relative(ROOT, f) !== SELF,
);
check('found code to scan', files.length > 100, `${files.length} files`);

// Literal `.from('x')` only. A `.from(variable)` cannot be resolved
// statically; those are counted and reported rather than guessed at.
const LITERAL_RE = /\.from\(\s*(['"`])([A-Za-z0-9_]+)\1\s*\)/g;
const DYNAMIC_RE = /\.from\(\s*(?!['"`])[A-Za-z_$]/g;

const seen = new Map<string, string[]>(); // table -> ["file:line", ...]
let dynamicSites = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);

  for (const m of src.matchAll(LITERAL_RE)) {
    const table = m[2];
    const line = src.slice(0, m.index).split('\n').length;
    const list = seen.get(table) ?? [];
    list.push(`${rel}:${line}`);
    seen.set(table, list);
  }
  dynamicSites += [...src.matchAll(DYNAMIC_RE)].length;
}

check('sweep found table references', seen.size > 50, `${seen.size} distinct tables`);

const unknown: string[] = [];
for (const [table, sites] of [...seen].sort()) {
  if (known.has(table) || absent.has(table)) continue;
  unknown.push(`${table} (${sites[0]}${sites.length > 1 ? ` +${sites.length - 1}` : ''})`);
}

check(
  'every referenced table is either present in the schema snapshot or a documented absence',
  unknown.length === 0,
  unknown.length
    ? `${unknown.length} unaccounted: ${unknown.join('; ')}. Either the table exists and scripts/db-tables.json needs regenerating, or the call site writes nowhere — in which case say so in known_absent with a reason.`
    : '',
);

/* -------------------------------------------------------------------------- */
/* 3. Regressions fixed on 2026-10-06 — do not let them come back            */
/* -------------------------------------------------------------------------- */

console.log('C. 2026-10-06 regressions');

const limitationsSrc = readFileSync(join(ROOT, 'src/lib/limitations.ts'), 'utf8');

check('limitations no longer reads the non-existent eu_properties',
  !/\.from\(\s*['"`]eu_properties['"`]/.test(limitationsSrc));
check('limitations no longer reads the non-existent cron_log (singular)',
  !/\.from\(\s*['"`]cron_log['"`]/.test(limitationsSrc));
check('limitations derives coverage from the live observation ledger',
  /\.from\(\s*['"`]price_snapshots['"`]/.test(limitationsSrc));
check('limitations no longer selects the non-existent eu_official_stats.dataset column',
  !/select\(\s*['"`][^'"`]*\bdataset\b/.test(limitationsSrc));
check('every limitations read checks its error rather than trusting data',
  (limitationsSrc.match(/assertRead\(/g) ?? []).length >= 4,
  `${(limitationsSrc.match(/assertRead\(/g) ?? []).length} assertRead calls`);
check('a failed coverage read throws instead of scoring every country zero',
  /price_snapshots holds no rows/.test(limitationsSrc) &&
  /has no rows for \$\{day\}/.test(limitationsSrc));
check('compileLimitations reports how many passes could not look',
  /passes_failed/.test(limitationsSrc));
check('a pass that failed does not resolve its own existing findings',
  /failedCategories/.test(limitationsSrc));
check('the dormant staleness pass is named, not silently empty',
  /STALENESS_DORMANT_REASON/.test(limitationsSrc) && /dormant/.test(limitationsSrc));
check('limitations write results are read, never discarded',
  !/await supabase\.from\('system_limitations'\)\.(update|insert)\([\s\S]{0,400}?\}\)\s*;/.test(
    limitationsSrc.replace(/const \{ error \} = /g, 'CHECKED '),
  ));

const hfSrc = readFileSync(join(ROOT, 'src/app/api/cron/push-training-data/route.ts'), 'utf8');

check('hf_pushes insert uses pairs_count, the column that exists',
  /pairs_count:/.test(hfSrc) && !/\bpair_count:/.test(hfSrc));
check('hf_pushes insert no longer writes the non-existent jsonl_preview column',
  !/jsonl_preview:/.test(hfSrc));
check('hf_pushes insert writes the boolean `success`, not a text `status`',
  /success: pushResult === 'live'/.test(hfSrc));
check('the three-way push result survives in details, where the boolean cannot carry it',
  /push_result: pushResult/.test(hfSrc));

/* -------------------------------------------------------------------------- */

console.log('');
console.log(`dynamic .from(<expr>) sites not statically checkable: ${dynamicSites}`);
console.log(`distinct tables referenced: ${seen.size} (${[...seen].filter(([t]) => absent.has(t)).length} documented as absent)`);
console.log('');

if (failures.length) {
  console.log(`${failures.length} FAILED, ${pass} passed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS (${pass})`);

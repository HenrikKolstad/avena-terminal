/**
 * scripts/test-engine-truth.ts
 *
 * Pins the honesty of the figures /engine publishes.
 *
 * WHY THIS EXISTS
 * On 2026-10-09 /engine rendered "652 848+ Verified transactions". The table
 * behind it, `property_transactions`, held 652,848 physical rows for 57,306
 * distinct (avn_prop_id, transacted_at, price_eur) identities — DVF open data
 * ingested under two different id-minting rules (O-76), so the same registered
 * sale lands many times over. The published figure overstated the transaction
 * record by 11.4x, and the overstatement GREW nightly: in the four days to
 * 2026-10-09 the row count rose 624,419 → 652,848 while the distinct count did
 * not move at all. Growth in that table is duplication, not coverage, so there
 * is no value of the raw count that is ever right.
 *
 * The same shape sat next to it: "394 548+ Historical price records" counted
 * `property_pricing_history`, ~394,000 of whose rows are the dead
 * capped-write-loop backlog (the same frozen price re-inserted ~229x per
 * property, last written 2026-08-05). CLAUDE.md names `price_snapshots` as the
 * ground truth; it holds 133,665 genuine per-ref-per-day observations.
 *
 * And underneath both, the recurring bug: every Supabase-backed figure fell
 * back to an April constant when the live read failed, while the card kept
 * saying "Verified from production · updated Ns ago". A failed read was
 * indistinguishable from a working page.
 *
 * WHAT IT CHECKS (static — the live values need credentials this gate has not)
 *  1. No read path counts raw rows of either duplicate-ridden table for publication.
 *  2. The transaction figure goes through engine_transaction_truth(), and the
 *     migration that defines it is committed.
 *  3. transactionCount() returns null — never a number — on failure.
 *  4. No Supabase-backed figure on /engine substitutes a hardcoded constant.
 *  5. The dead fallback constants are gone from EngineClient, so none can be
 *     silently re-wired.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const deltas = readFileSync(join(ROOT, 'src', 'lib', 'deltas.ts'), 'utf8');
const client = readFileSync(join(ROOT, 'src', 'app', 'engine', 'EngineClient.tsx'), 'utf8');

console.log('\n/engine — published figures must be the honest ones\n');

// ── 1. no raw-row count of a duplicate-ridden table ────────────────────────

ok(
  "getEngineTruth() does not count raw rows of property_transactions",
  !/countOf\(\s*['"]property_transactions['"]\s*\)/.test(deltas),
  '652,848 rows vs 57,306 distinct transactions — the row count overstates by 11.4x and grows nightly',
);
ok(
  "getEngineTruth() does not count raw rows of property_pricing_history",
  !/countOf\(\s*['"]property_pricing_history['"]\s*\)/.test(deltas),
  '~394,000 of its 394,548 rows are the dead capped-write-loop backlog',
);
ok(
  'the price-record figure reads price_snapshots, the ground truth CLAUDE.md names',
  /countOf\(\s*['"]price_snapshots['"]\s*\)/.test(deltas),
);

// ── 2. the transaction figure is deduplicated server-side ──────────────────

ok(
  'the transaction figure goes through engine_transaction_truth()',
  /\.rpc\(\s*['"]engine_transaction_truth['"]\s*\)/.test(deltas),
);
ok(
  'the migration defining engine_transaction_truth() is committed',
  existsSync(join(ROOT, 'supabase', 'migrations', '20261009_engine_transaction_truth.sql')),
);
ok(
  'only distinct_properties is read from it — raw_rows must never be published',
  /distinct_properties/.test(deltas) && !/row\?\.raw_rows/.test(deltas),
);

// ── 3. a failed read is an absence, never a number ─────────────────────────

const fn = deltas.slice(deltas.indexOf('async function transactionCount'));
const body = fn.slice(0, fn.indexOf('\n}\n') + 3);
ok(
  'transactionCount() is declared to return number | null',
  /async function transactionCount\(\): Promise<number \| null>/.test(deltas),
);
ok(
  'transactionCount() returns null on rpc error — not 0, not an estimate',
  /if \(error\) \{[\s\S]{0,400}?return null;/.test(body),
  'a catch that yields a plausible number is the recurring bug in this project',
);
ok(
  'transactionCount() returns null on a null/absent distinct count',
  /distinct == null[\s\S]{0,300}?return null;/.test(body),
);
ok(
  'transactionCount() rejects a non-finite or zero result rather than publishing it',
  /Number\.isFinite\(n\) && n > 0 \? n : null/.test(body),
);

// ── 4/5. no hardcoded substitution for a live-read figure ──────────────────

// `?? null` is the honest form: the figure is absent and renders as such.
// Anything else on the right-hand side is a substitution.
const substituted = [...client.matchAll(/truth\?\.(\w+)\s*\?\?\s*([A-Za-z][\w.]*)/g)]
  .filter((m) => m[2] !== 'null')
  .map((m) => `${m[1]} ?? ${m[2]}`);
ok(
  'no /engine figure read from Supabase falls back to a hardcoded constant',
  substituted.length === 0,
  substituted.length ? `still substituting: ${substituted.join(', ')}` : '',
);

for (const dead of ['priceRecords', 'transactions', 'scoreRevisions', 'findings', 'indexed']) {
  ok(
    `the dead April fallback F.${dead} is gone from EngineClient`,
    !new RegExp(`F\\.${dead}\\b`).test(client) && !new RegExp(`^\\s*${dead}:`, 'm').test(
      client.slice(client.indexOf('const F = {'), client.indexOf('const F = {') + 600),
    ),
  );
}

ok(
  'an unavailable figure renders an explicit absence marker',
  /const ABSENT = /.test(client) && /value == null \? ABSENT/.test(client),
);
ok(
  'the Coverage card renders the absence marker too, not a constant',
  /truth\?\.transactions == null \? ABSENT/.test(client),
);

// ── 6. the server HTML must carry the figure, not a zero ───────────────────
// Measured on prod 2026-10-09: with useState(0) the markup served to a non-JS
// client read `0<!-- -->+` next to "Historical price records", eight times
// over, plus "€0 Identified savings". Googlebot renders JS; the AI training
// and retrieval crawlers largely do not, so the page whose job is to prove the
// data exists was telling them it does not.
ok(
  'useCountUp starts at the target, so the server HTML carries the real number',
  /const \[v, setV\] = useState\(target\);/.test(client),
  'useState(0) serves a literal 0 to every crawler that does not execute JS',
);
ok(
  'no count-up initialises at zero anywhere in EngineClient',
  !/useState\(0\)[^;]*;\s*\n\s*useEffect\(\(\) => \{\s*\n\s*if \(!run\)/.test(client),
);

// ── result ─────────────────────────────────────────────────────────────────

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);

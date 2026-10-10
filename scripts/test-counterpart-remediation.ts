/**
 * scripts/test-counterpart-remediation.ts
 *
 * Shape assertions on the remediation script. It touches historical rows, so
 * what matters is what it REFUSES to do: invent a score, delete a row, or
 * report a clean run over a failed write.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const SCRIPT = readFileSync(join(ROOT, 'scripts', 'remediate-counterpart-decay.ts'), 'utf8');
const MIGRATION = readFileSync(
  join(ROOT, 'supabase', 'migrations', '20261010_counterpart_decay_provenance.sql'), 'utf8',
);
const CODE = SCRIPT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

console.log('\n── it must not invent a score ──');
ok('no write sets counterpart_score', !/counterpart_score\s*:/.test(CODE));
ok('no write sets score_grade', !/score_grade\s*:/.test(CODE));
ok('the only developer field written is score_provenance',
   /update\(\{ score_provenance/.test(CODE));
ok('the script says in its output that no score is written',
   /NO SCORE IS WRITTEN/.test(SCRIPT));

console.log('\n── it must not delete ──');
ok('nothing is deleted', !/\.delete\(/.test(CODE));
ok('alerts are retracted, not removed', /status: 'retracted'/.test(CODE));
ok('a retracted alert records why', /retracted_reason/.test(CODE));

console.log('\n── dry run by default ──');
ok('writing requires an explicit --apply', /includes\('--apply'\)/.test(CODE));
ok('the dry-run path returns before any write',
   /if \(!APPLY\) \{[\s\S]{0,200}?return;/.test(CODE));

console.log('\n── it must not repeat the recurring bug ──');
ok('missing credentials exit non-zero rather than touching nothing quietly',
   /if \(!url \|\| !key\)[\s\S]{0,300}?process\.exit\(1\)/.test(CODE));
ok('every read error aborts instead of yielding an empty set',
   (CODE.match(/process\.exit\(1\)/g) ?? []).length >= 4);
ok('each update reads its returned error', !/await db[\s\S]{0,200}?\.update\([^)]*\);\s*\n\s*(retracted|labelled)\+\+/.test(CODE));
ok('a run with failed writes exits non-zero',
   /failures\.length\)[\s\S]{0,300}?process\.exit\(1\)/.test(CODE));
ok('counts increment only when the write returned no error',
   /if \(error\) failures\.push[\s\S]{0,60}?else retracted\+\+/.test(CODE));

console.log('\n── the migration is additive ──');
ok('no DROP', !/\bdrop\b/i.test(MIGRATION));
ok('no ALTER ... TYPE or rename', !/alter column|rename/i.test(MIGRATION));
ok('columns are added with if not exists',
   (MIGRATION.match(/add column if not exists/gi) ?? []).length === 2);
ok('both new columns are documented',
   (MIGRATION.match(/comment on column/gi) ?? []).length === 2);
ok('the migration states that the pre-ratchet value is unrecoverable',
   /NOT recoverable/i.test(MIGRATION));

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);

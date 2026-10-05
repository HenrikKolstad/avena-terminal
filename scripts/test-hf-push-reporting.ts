/**
 * Tests for Hugging Face push reporting.
 *
 * BACKGROUND — the defect these tests were written from, 2026-10-05.
 * `/api/cron/push-training-data` had reported `status: 'success'` on every
 * single run since 2026-08-09 while transmitting NOTHING. HUGGINGFACE_TOKEN
 * is unset in the deployment, so the route took its `simulated` branch and
 * returned a bare 200 — no `ok`, no `skipped` — which `deriveStatusFromSummary`
 * correctly reads as a healthy run. 57 consecutive green rows on a no-op.
 *
 * The cost was not cosmetic. The Hugging Face dataset is the third corpus
 * surface, and corpus consumers resolve conflicts by cross-source agreement,
 * so a frozen mirror actively weakens the claim the other two make. On
 * 2026-10-05 it published 5 observation days, 53 moves and 1,996 live
 * listings while the site and the GitHub mirror both published 62 days, 598
 * moves and 2,029 — and the only thing that would have surfaced the drift was
 * a status this route refused to report.
 *
 * `failed` was the worse half: a genuine HTTP rejection from the Hugging Face
 * API also returned 200 with no `ok: false`, so an upload the API refused
 * would have been filed as a successful run.
 *
 * THE HEADLINE CASES HERE ARE THEREFORE THE NON-SUCCESS CASES, plus one that
 * asserts the OLD body still derives to `success` — because a test that only
 * demonstrates the fixed shape passing never proves it would have caught the
 * bug (lesson 2026-09-02).
 *
 * Run: npx tsx scripts/test-hf-push-reporting.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveStatusFromSummary } from '../src/lib/cron-log';

let passed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const ROOT = join(__dirname, '..');
const routeSrc = readFileSync(
  join(ROOT, 'src/app/api/cron/push-training-data/route.ts'),
  'utf8',
);

// ── Part 1: status derivation on the three real branches ───────────────────

console.log('\nHF push — the run status matches what was transmitted\n');

const base = { message: '', count: 144, jsonl_bytes: 165794 };

const simulated = {
  ...base,
  message: 'Training data push simulated',
  pushed: false,
  details: { reason: 'HUGGINGFACE_TOKEN env var not set — payload formatted but not transmitted' },
  ok: false,
  skipped: true,
};
ok(
  'no credential derives to `skipped`, not `success`',
  deriveStatusFromSummary(simulated).status === 'skipped',
  `got ${deriveStatusFromSummary(simulated).status}`,
);

const failedPush = {
  ...base,
  message: 'Training data push failed',
  pushed: false,
  details: { repo: 'x/y', branch: 'main', status: 403, error: 'Forbidden' },
  ok: false,
  status: 'hf_upload_failed',
  error: 'Forbidden',
};
const failedDerived = deriveStatusFromSummary(failedPush);
ok(
  'a rejected upload derives to `error`',
  failedDerived.status === 'error',
  `got ${failedDerived.status}`,
);
ok(
  'the rejection reason survives into the logged error',
  JSON.stringify(failedDerived.error ?? '').includes('Forbidden'),
  `got ${JSON.stringify(failedDerived.error)}`,
);

const live = {
  ...base,
  message: 'Training data push live',
  pushed: true,
  details: { repo: 'x/y', branch: 'main', file: 'data/p.jsonl', commit_url: 'https://…' },
};
ok(
  'a real transmitted push still derives to `success`',
  deriveStatusFromSummary(live).status === 'success',
  `got ${deriveStatusFromSummary(live).status}`,
);

// ── Part 2: prove the test would have caught the original bug ──────────────

console.log('\nHF push — the pre-fix body is still recognised as the bug\n');

const preFixBody = {
  message: 'Training data push simulated',
  count: 144,
  pushed: false,
  jsonl_bytes: 165794,
  details: { reason: 'HUGGINGFACE_TOKEN env var not set — payload formatted but not transmitted' },
};
ok(
  'the exact 57-day body derives to `success` without the markers — this is the bug',
  deriveStatusFromSummary(preFixBody).status === 'success',
  'if this ever fails, deriveStatusFromSummary changed and this test needs rereading',
);
ok(
  '`details.reason` alone is not enough: the derivation does not read it',
  deriveStatusFromSummary(preFixBody).error === null,
);

// ── Part 3: the route cannot regress to a bare body ────────────────────────

console.log('\nHF push — the route still sets the markers\n');

ok(
  "the simulated branch sets `skipped`",
  /pushResult === 'simulated'[\s\S]{0,200}?skipped\s*=\s*true/.test(routeSrc),
);
ok(
  "the failed branch sets `ok: false`",
  /pushResult === 'failed'[\s\S]{0,260}?body\.ok\s*=\s*false/.test(routeSrc),
);
ok(
  'a failed hf_pushes ledger write is reported in the body, not only to console',
  /hf_pushes_log_error/.test(routeSrc),
);
ok(
  'pairs are still only marked pushed on a live upload',
  /if \(pushResult === 'live'\)[\s\S]{0,200}?pushed_to_hf: true/.test(routeSrc),
);

// ── Report ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);

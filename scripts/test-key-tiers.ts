/**
 * scripts/test-key-tiers.ts — self-serve API keys are FREE tier only.
 *
 * WHY: until 2026-10-22 POST /api/v1/keys accepted { tier: 'institutional' }
 * from anyone, and the Stripe API webhook minted paid keys from unsigned JSON.
 * Hermetic: pure functions plus source checks, no network.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decideTier } from '../src/lib/key-tiers';
import { isAdminRequest, presentedSecret, safeEqual } from '../src/lib/admin-auth';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} — expected ${String(expected)}, got ${String(actual)}`); }
}

console.log('Tier decisions');
check('no tier → free', decideTier(undefined, false).ok && (decideTier(undefined, false) as { tier: string }).tier, 'free');
check('free → ok', decideTier('free', false).ok, true);
for (const t of ['starter', 'pro', 'institutional']) {
  const d = decideTier(t, false);
  check(`${t} self-serve → refused`, d.ok, false);
  check(`${t} self-serve → 403`, d.ok ? null : d.status, 403);
  check(`${t} with admin → ok`, decideTier(t, true).ok, true);
}
check('unknown tier → 400', (() => { const d = decideTier('godmode', true); return d.ok ? null : d.status; })(), 400);
check('non-string tier → 400', (() => { const d = decideTier({ $ne: 1 }, false); return d.ok ? null : d.status; })(), 400);

console.log('\nAdmin auth');
const T = 'x'.repeat(40);
check('unset token → never admin', isAdminRequest(`Bearer ${T}`, undefined), false);
check('short token refused', isAdminRequest('Bearer short', 'short'), false);
check('bearer match', isAdminRequest(`Bearer ${T}`, T), true);
check('bearer mismatch', isAdminRequest(`Bearer ${'y'.repeat(40)}`, T), false);
check('basic match', isAdminRequest(`Basic ${btoa(`admin:${T}`)}`, T), true);
check('basic wrong password', isAdminRequest(`Basic ${btoa('admin:nope')}`, T), false);
check('no header', isAdminRequest(null, T), false);
check('garbage header', presentedSecret('Digest abc'), null);
check('safeEqual length mismatch', safeEqual('a', 'ab'), false);

console.log('\nSource guards');
const root = join(__dirname, '..');
for (const f of ['src/app/api/v1/keys/route.ts', 'src/app/api/v1/keys/generate/route.ts']) {
  const src = readFileSync(join(root, f), 'utf8');
  check(`${f} uses decideTier`, src.includes('decideTier('), true);
  check(`${f} has no tier default from body`, /tier\s*=\s*'free'\s*\}\s*=\s*body/.test(src), false);
}
const hook = readFileSync(join(root, 'src/app/api/stripe/api-webhook/route.ts'), 'utf8');
check('api-webhook verifies Stripe signature', hook.includes('constructEvent('), true);
check('api-webhook no longer JSON.parses the raw body', hook.includes('JSON.parse(body)'), false);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

/**
 * scripts/test-admin-gate.ts — /admin and /api/admin are gated server-side.
 *
 * WHY: until 2026-10-22 /admin/outreach was "protected" by a client-side
 * email check while the server sent every outreach email in the RSC payload.
 * Hermetic: source checks only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} — expected ${String(expected)}, got ${String(actual)}`); }
}

const mw = readFileSync(join(__dirname, '..', 'src', 'middleware.ts'), 'utf8');
const body = mw.slice(mw.indexOf('export function middleware'));
check('middleware imports isAdminRequest', mw.includes("from '@/lib/admin-auth'"), true);
check('admin gate runs first in middleware()', /^export function middleware[^{]*\{\s*const adminPath[^\n]*\n\s*if \(ADMIN_PAGE\.test\(adminPath\) \|\| ADMIN_API\.test\(adminPath\)\) return adminGate/m.test(body), true);
check('gate sends a Basic challenge', mw.includes('www-authenticate'), true);
check('matcher still covers every non-static path', mw.includes("matcher: ['/((?!_next/static|favicon.ico).*)']"), true);

const ADMIN_PAGE = /^\/admin(?:\/|$)/;
const ADMIN_API = /^\/api\/admin(?:\/|$)/;
check('/admin matched', ADMIN_PAGE.test('/admin'), true);
check('/admin/outreach matched', ADMIN_PAGE.test('/admin/outreach'), true);
check('/administer not matched', ADMIN_PAGE.test('/administer'), false);
check('/api/admin/partners matched', ADMIN_API.test('/api/admin/partners'), true);
check('regexes in source match these', mw.includes('const ADMIN_PAGE = /^\\/admin(?:\\/|$)/;') && mw.includes('const ADMIN_API = /^\\/api\\/admin(?:\\/|$)/;'), true);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

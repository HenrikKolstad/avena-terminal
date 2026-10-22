/**
 * scripts/test-admin-dashboard.ts — the /admin dashboard never queries
 * Supabase from the browser; it loads /admin/data, which is admin-gated.
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
const root = join(__dirname, '..', 'src', 'app', 'admin');
const page = readFileSync(join(root, 'page.tsx'), 'utf8');
const route = readFileSync(join(root, 'data', 'route.ts'), 'utf8');
check('page does not create a Supabase client', /createClient|@supabase\/supabase-js/.test(page), false);
check('page does not read NEXT_PUBLIC_SUPABASE keys', page.includes('NEXT_PUBLIC_SUPABASE'), false);
check('page loads /admin/data', page.includes("fetch('/admin/data'"), true);
check('route checks the admin token', route.includes('isAdminRequest('), true);
check('route uses the service-role client', route.includes("from '@/lib/supabase-admin'"), true);
check('route is no-store', route.includes("'private, no-store'"), true);
console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

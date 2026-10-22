/**
 * scripts/test-access-gates.ts — academic email matching is a real domain
 * suffix match, and partner keys are admin-only. Hermetic.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isAcademicEmail } from '../src/lib/academic-email';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} — expected ${String(expected)}, got ${String(actual)}`); }
}

const yes = [
  'a@mit.edu', 'a@cs.stanford.edu', 'a@ox.ac.uk', 'a@student.ucl.ac.uk', 'a@unibo.it',
  'a@studio.unibo.it', 'a@uni-heidelberg.de', 'a@tu-berlin.de', 'a@rwth-aachen.de',
  'a@tuwien.ac.at', 'a@uu.se', 'a@ethz.ch', 'A@MIT.EDU', 'a@foo.university', 'a@sydney.edu.au',
];
const no = [
  'a@edu.com', 'a@gmail.com', 'a@fake.edu.evil.com', 'a@mit.edu.evil.com', 'a@x.ac.uk.attacker.io',
  'a@notunibo.it', 'a@uni-fake.com', 'a@tu-dresden.io', 'a.edu@gmail.com', 'mit.edu@gmail.com',
  'a@ac.uk', 'nope', '@mit.edu', 'a@', 'a@mit edu',
];
for (const e of yes) check(`accepts ${e}`, isAcademicEmail(e), true);
for (const e of no) check(`rejects ${e}`, isAcademicEmail(e), false);

const partner = readFileSync(join(__dirname, '..', 'src', 'app', 'api', 'v1', 'partner-access', 'route.ts'), 'utf8');
const gate = partner.indexOf('isAdminRequest(');
check('partner-access checks the admin token', gate > 0, true);
check('the check comes before any key is minted', gate < partner.indexOf('randomUUID()'), true);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

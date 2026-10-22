/**
 * scripts/test-outreach-honesty.ts
 *
 * Pins the 2026-10-22 rewrite of src/lib/outreach.ts. These templates go out
 * under Henrik's name to central banks, regulators, banks and journalists, so
 * every claim in them has to be true today. The previous copy claimed
 * "Zenodo-anchored Merkle roots" (no root has ever been deposited), an "Avena
 * Foundation" and an "APON network" (neither exists), a "Sovereign Briefing
 * Vol. 2" (/sovereign-briefing has published nothing), coverage of "27 EU
 * markets" (the data is the Spanish costas), a "4.7x" finding from that
 * unpublished volume, and linked pages that are removed or redirected.
 *
 * This suite renders every target and fails if any of those claims come back,
 * or if any avenaterminal.com link points at a page that does not exist as a
 * route in src/app (or a file in public/).
 */

import { existsSync } from 'fs';
import path from 'path';
import { OUTREACH_TARGETS } from '../src/lib/outreach';

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

const ROOT = path.resolve(__dirname, '..');

const BANNED: Array<[string, RegExp]> = [
  ['Zenodo anchoring of Merkle roots', /zenodo[- ]anchored|anchored (to|on|at) zenodo|merkle roots? (deposited|anchored)/i],
  ['Avena Foundation', /avena foundation/i],
  ['APON network', /\bAPON\b|property open network/i],
  ['Sovereign Briefing volumes', /sovereign briefings?|\bvol\.\s?\d/i],
  ['27 EU markets', /27 (eu|european)? ?(markets|member states)/i],
  ['unpublished 4.7x multiplier', /4\.7\s?[x×]/i],
  ['RICS stronger than the partner badge', /rics[- ](credentialed|certified|accredited|regulated|approved)/i],
  ['"first" / "only" superlatives', /\b(the first|world-first)\b|\bthe only (?!country)/i],
  ['AVN-ID as "ISIN of property"', /isin of/i],
  ['SLA claims', /\bSLA\b|99\.9/i],
  ['"Avena is two months old"', /two months old|six weeks ago/i],
];

const REMOVED = ['/swarm', '/apon-network', '/citation-moat', '/awards', '/eu-presidency', '/sovereign-briefing', '/products', '/install', '/contribute', '/data-partners'];

function routeExists(p: string): boolean {
  const clean = p.replace(/[?#].*$/, '').replace(/\/$/, '');
  if (clean === '') return true;
  if (existsSync(path.join(ROOT, 'public', clean))) return true;
  const dir = path.join(ROOT, 'src/app', clean);
  return ['page.tsx', 'page.ts', 'route.ts'].some((f) => existsSync(path.join(dir, f)));
}

ok('renders the full target list', OUTREACH_TARGETS.length >= 100, `got ${OUTREACH_TARGETS.length}`);

for (const t of OUTREACH_TARGETS) {
  const text = `${t.subject}\n${t.body}\n${t.scenarioUrl}`;
  for (const [label, re] of BANNED) {
    const m = text.match(re);
    if (m) ok(`${t.id}: no ${label}`, false, `found "${m[0]}"`);
  }
  const links = [...text.matchAll(/https:\/\/avenaterminal\.com(\/[^\s)'"`,]*)?/g)].map((m) => (m[1] ?? '/').replace(/[.,;:!?]+$/, ''));
  for (const l of links) {
    const bare = l.replace(/[?#].*$/, '').replace(/\/$/, '');
    if (REMOVED.some((r) => bare === r || bare.startsWith(r + '/'))) ok(`${t.id}: no link to removed page`, false, l);
    else if (!routeExists(l)) ok(`${t.id}: link resolves to a real route`, false, l);
  }
  ok(`${t.id}: clean`, true);
}

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);

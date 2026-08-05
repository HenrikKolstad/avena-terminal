/**
 * Concierge filter correctness harness (2026-08-05).
 * Run: npx tsx scripts/test-concierge.ts
 *
 * Part A asserts extractPreferences on every chip + common free-text forms.
 * Part B asserts the HARD-FILTER INVARIANTS of searchProperties against the
 * real dataset: every returned card must satisfy budget floor/cap, region,
 * bedrooms and timeline — cross-checked against the underlying property.
 * Exits 1 on any failure. Extend this file whenever a filter bug is found.
 */

import { extractPreferences, searchProperties, turnFromPrefs, mergePrefs, type ConciergePrefs } from '../src/lib/concierge';
import { getAllProperties } from '../src/lib/properties';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) { failures++; console.error(`  ✗ ${name} ${detail}`); }
  else console.log(`  ✓ ${name}`);
}

// ── Part A: extraction ──────────────────────────────────────────────────────
console.log('A. extractPreferences');
const ex = (t: string) => extractPreferences([t]);

// Regions — every chip
check('chip Costa del Sol', JSON.stringify(ex('Costa del Sol').regions) === '["Costa del Sol"]');
check('chip Costa Blanca', JSON.stringify(ex('Costa Blanca').regions) === '["Costa Blanca"]');
check('chip Costa Cálida', JSON.stringify(ex('Costa Cálida').regions) === '["Costa Cálida"]');
check('calida unaccented', JSON.stringify(ex('costa calida').regions) === '["Costa Cálida"]');
check('Anywhere coastal → no region constraint', JSON.stringify(ex('Anywhere coastal').regions) === '[]');
check('town Estepona', (ex('somewhere in Estepona').regions ?? []).some((r) => r.startsWith('Estepona')));
check('town Marbella', (ex('Marbella please').regions ?? []).some((r) => r.startsWith('Marbella')));

// Budget — every chip + free-text forms
check('Up to €400,000 → max', ex('Up to €400,000').maxPrice === 400_000 && !ex('Up to €400,000').minPrice);
check('€400,000–€650,000 → range', ex('€400,000–€650,000').minPrice === 400_000 && ex('€400,000–€650,000').maxPrice === 650_000);
check('€650,000–€1,000,000 → range', ex('€650,000–€1,000,000').minPrice === 650_000 && ex('€650,000–€1,000,000').maxPrice === 1_000_000);
check('Above €1,000,000 → FLOOR only', ex('Above €1,000,000').minPrice === 1_000_000 && ex('Above €1,000,000').maxPrice === undefined);
check('over 2m → floor', ex('over 2m').minPrice === 2_000_000);
check('at least 750k → floor', ex('at least 750k').minPrice === 750_000);
check('from 500k → floor', ex('from 500k').minPrice === 500_000);
check('under 300k → cap', ex('budget under 300k').maxPrice === 300_000);
check('bare €850,000 → cap', ex('I have €850,000').maxPrice === 850_000);
check('showcase U1 parses fully', (() => { const p = ex('Costa del Sol, near the sea. Up to €650,000.'); return p.regions?.[0] === 'Costa del Sol' && p.maxPrice === 650_000 && (p.features ?? []).includes('sea'); })());

// Beds / purpose / timeline / features
check('3 bed → bedrooms 3', ex('3 bedroom villa').bedrooms === 3);
check('2br → bedrooms 2', ex('2br apartment').bedrooms === 2);
check('Lifestyle chip', JSON.stringify(ex('Lifestyle').purposes) === '["lifestyle"]');
check('Investment chip', JSON.stringify(ex('Investment').purposes) === '["investment"]');
check('Both chip', JSON.stringify(ex('Both').purposes) === '["lifestyle","investment"]');
check('showcase U2 → both + within12', (() => { const p = ex('Both — ready within 12 months.'); return p.purposes?.length === 2 && p.timeline === 'within12'; })());
check('Ready now → ready', ex('Ready now').timeline === 'ready');
check('Open to off-plan → offplan_ok', ex('Open to off-plan').timeline === 'offplan_ok');
check('golf feature', (ex('near a golf course').features ?? []).includes('golf'));
check('pool+beach typed msg → features only', (() => { const p = ex('i want pool and beach close'); return (p.features ?? []).includes('pool') && (p.features ?? []).includes('sea') && !p.regions && !p.maxPrice; })());

// ── Part B: search hard-filter invariants on real inventory ────────────────
console.log('B. searchProperties invariants (real dataset)');
const byRef = new Map(getAllProperties().filter((p) => p.ref).map((p) => [p.ref as string, p]));
const nowYear = new Date().getFullYear();
const isReady = (p: { s?: string; c?: string }) => /ready|key/i.test(p.s || '') || /ready/i.test(p.c || '');
const complYear = (p: { c?: string }) => { const m = (p.c || '').match(/20\d{2}/); return m ? parseInt(m[0], 10) : null; };

const costaScenarios: Array<[string, ConciergePrefs]> = [
  ['del Sol ≤650k', { regions: ['Costa del Sol'], maxPrice: 650_000, purposes: ['lifestyle', 'investment'], timeline: 'within12', features: ['sea'] }],
  ['Blanca ≤400k, 3 bed', { regions: ['Costa Blanca'], maxPrice: 400_000, bedrooms: 3, purposes: ['investment'], timeline: 'offplan_ok' }],
  ['Cálida 400–650k ready', { regions: ['Costa Cálida'], minPrice: 400_000, maxPrice: 650_000, purposes: ['lifestyle'], timeline: 'ready' }],
  ['ABOVE €1M any coast', { regions: [], minPrice: 1_000_000, purposes: ['lifestyle'], timeline: 'offplan_ok' }],
  ['del Sol ABOVE €1M', { regions: ['Costa del Sol'], minPrice: 1_000_000, purposes: ['lifestyle'], timeline: 'within12' }],
  ['any coast ≤300k 2 bed golf', { regions: [], maxPrice: 300_000, bedrooms: 2, purposes: ['investment'], timeline: 'offplan_ok', features: ['golf'] }],
];

for (const [label, prefs] of costaScenarios) {
  const cards = searchProperties(prefs);
  const probs: string[] = [];
  for (const c of cards) {
    const p = byRef.get(c.propertyId);
    if (!p) { probs.push(`${c.propertyId} not in feed`); continue; }
    if (prefs.maxPrice && p.pf > prefs.maxPrice) probs.push(`${c.propertyId} €${p.pf} OVER cap ${prefs.maxPrice}`);
    if (prefs.minPrice && p.pf < prefs.minPrice) probs.push(`${c.propertyId} €${p.pf} UNDER floor ${prefs.minPrice}`);
    if (prefs.bedrooms && p.bd < prefs.bedrooms) probs.push(`${c.propertyId} ${p.bd} beds < ${prefs.bedrooms}`);
    if (prefs.regions?.length === 1) {
      const key = prefs.regions[0].replace('Costa ', '').toLowerCase();
      if (!(p.costa ?? '').toLowerCase().includes(key.replace('cálida', 'lida').replace('á', ''))) probs.push(`${c.propertyId} region ${p.costa} ∉ ${prefs.regions[0]}`);
    }
    if (prefs.timeline === 'ready' && !isReady(p)) probs.push(`${c.propertyId} not key-ready (s=${p.s}, c=${p.c})`);
    if (prefs.timeline === 'within12' && !isReady(p)) {
      const y = complYear(p);
      if (y === null || y > nowYear + 1) probs.push(`${c.propertyId} completion ${p.c} beyond 12mo window`);
    }
  }
  check(`${label} → ${cards.length} cards, all valid`, probs.length === 0, probs.join(' | '));
  if (label.startsWith('ABOVE') ) check(`${label} returns results`, cards.length > 0, '(dataset should have €1M+ stock)');
}

// ── Part C: question flow ───────────────────────────────────────────────────
console.log('C. turnFromPrefs flow');
check('floor-only budget: no budget re-ask', !(turnFromPrefs({ regions: ['Costa del Sol'], minPrice: 1_000_000 }).ask?.question.includes('budget')));
check('opening greets', turnFromPrefs({}, true).ask?.question.startsWith('Welcome') === true);
check('mid-convo never greets', turnFromPrefs({}, false).ask?.question.startsWith('Welcome') === false);
check('complete prefs → recommendations', (turnFromPrefs({ regions: ['Costa Blanca'], maxPrice: 650_000, purposes: ['lifestyle'], timeline: 'offplan_ok' }).recommendations?.length ?? 0) > 0);

// ── Part D: merge-layer contradiction guard ─────────────────────────────────
console.log('D. mergePrefs');
check('budget raise: old 650k cap dropped under new 1M floor',
  (() => { const m = mergePrefs({ minPrice: 1_000_000 }, { maxPrice: 650_000 }); return m.maxPrice === undefined && m.minPrice === 1_000_000; })());
check('budget lower: old 1M floor dropped over new 500k cap',
  (() => { const m = mergePrefs({ maxPrice: 500_000 }, { minPrice: 1_000_000 }); return m.minPrice === undefined && m.maxPrice === 500_000; })());
check('compatible fill: 650k cap + 400k floor coexist',
  (() => { const m = mergePrefs({ maxPrice: 650_000 }, { minPrice: 400_000 }); return m.minPrice === 400_000 && m.maxPrice === 650_000; })());
check('primary always wins', mergePrefs({ maxPrice: 300_000 }, { maxPrice: 900_000 }).maxPrice === 300_000);
check('features union', JSON.stringify(mergePrefs({ features: ['sea'] }, { features: ['golf', 'sea'] }).features) === '["sea","golf"]');
check('parsed sequence: up-to-650k then above-1M → floor only',
  (() => { const p = extractPreferences(['up to €650,000', 'actually above €1,000,000']); return p.minPrice === 1_000_000 && p.maxPrice === undefined; })());

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

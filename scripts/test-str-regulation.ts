/**
 * Short-let regulatory risk.
 * Run: npx tsx scripts/test-str-regulation.ts
 *
 * The file is a manual reading. A missing file must not throw. A town with
 * no municipal instrument is unknown. The yield function is not imported.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getAllProperties } from '../src/lib/properties';
import {
  STR_RISK_LEVELS, buildStrView, getStrRegulation, matchStrTown, parseStrFile,
  readStrFile, sourceHostOk, type StrFile,
} from '../src/lib/str-regulation';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`); }
}
function checkTrue(name: string, got: boolean) {
  check(name, got, true);
}

const root = join(__dirname, '..');
const read = (file: string) => readFileSync(join(root, file), 'utf8');

console.log('fail soft');
check('missing file is null', readStrFile(join(root, 'data', 'no-such-str-regulation.json')), null);
check('garbage is null', parseStrFile({ towns: [{ town: 'X' }] }), null);
const empty = buildStrView(null, [{ location: 'Torrevieja, Alicante', costa: 'Costa Blanca South' }]);
check('missing file view stays up', empty.status, 'unavailable');
check('missing file shows no towns', empty.towns.length, 0);
check('missing file does not invent a level', empty.counts.unknown, 0);

console.log('committed file');
const file = readStrFile() as StrFile;
checkTrue('file parses', file != null);
check('reviewed 5 Nov 2026', file.reviewed_at, '2026-11-05');
check('next review May 2027', file.next_review, '2027-05-05');
checkTrue('cadence is manual', /manual/i.test(file.review_cadence) && !/\d+ \d+ \* \* \*/.test(file.review_cadence));
checkTrue('says not legal advice', /not legal advice/i.test(file.not_legal_advice));
checkTrue('yield maths stay put', /does not change/i.test(file.yield_maths));
checkTrue('low is defined and unused as a claim of permission', /no town in this file met that test/i.test(file.method.risk_levels.low));
checkTrue('unknown means unread, not permissive', /silence is not treated as permission/i.test(file.method.risk_levels.unknown));

const bookTowns = [...new Set(getAllProperties().map((p) => p.l).filter(Boolean))].sort();
const fileTowns = file.towns.map((t) => t.town).sort();
check('one row per book town', fileTowns, bookTowns);
check('slugs are unique', new Set(file.towns.map((t) => t.slug)).size, file.towns.length);

const tally = { low: 0, elevated: 0, high: 0, unknown: 0 };
const rowProblems: string[] = [];
for (const town of file.towns) {
  tally[town.risk] += 1;
  if (!(STR_RISK_LEVELS as readonly string[]).includes(town.risk)) rowProblems.push(`${town.town} level`);
  if (town.reason.length <= 40) rowProblems.push(`${town.town} reason`);
  if (town.as_of !== '2026-11-05') rowProblems.push(`${town.town} date`);
  if (town.sources.length === 0) rowProblems.push(`${town.town} sources`);
  for (const source of town.sources) {
    if (!source.url.startsWith('https://') || !sourceHostOk(source.url)) rowProblems.push(`${town.town} ${source.url}`);
  }
}
check('every row is sourced and dated', rowProblems, []);
check('no town is low', tally.low, 0);
check('Málaga city is a verified freeze', file.towns.find((t) => t.town === 'Málaga, Málaga')?.risk, 'high');
check('Fuengirola is a verified limit, not a freeze', file.towns.find((t) => t.town === 'Fuengirola, Málaga')?.risk, 'elevated');
check('Alicante city suspension currency was not re-verified', file.towns.find((t) => t.town === 'Alicante, Alicante')?.risk, 'elevated');
check('Manilva edict was not read', file.towns.find((t) => t.town === 'Manilva, Málaga')?.risk, 'unknown');
check('La Manga town hall was not identified', file.towns.find((t) => t.town === 'La Manga del Mar Menor, Murcia')?.municipality_resolution, 'unresolved');
checkTrue('every Alicante place is elevated', file.towns.filter((t) => t.province_key === 'alicante').every((t) => t.risk === 'elevated'));
checkTrue('Murcia places stay unknown', file.towns.filter((t) => t.province_key === 'murcia').every((t) => t.risk === 'unknown'));
check('high count', tally.high, 1);
check('elevated count', tally.elevated, 51);
check('unknown count', tally.unknown, 45);

for (const group of [...file.national, ...file.regions]) {
  checkTrue(`${group.id} has a summary`, group.summary.length > 80);
  for (const source of group.sources) checkTrue(`${group.id} host`, sourceHostOk(source.url));
}
checkTrue('national judgment is cited', file.national.some((rule) => rule.sources.some((s) => s.url.includes('BOE-A-2026-12300'))));
checkTrue('horizontal property act is cited', file.national.some((rule) => rule.sources.some((s) => s.url.includes('BOE-A-1960-10906'))));

console.log('join');
const view = getStrRegulation();
check('view ready', view.status, 'ready');
check('view counts the book', view.counts.towns, bookTowns.length);
check('no synthetic row', view.counts.not_reviewed, 0);
check('Torrevieja matches the short name', matchStrTown(view, 'Torrevieja')?.town, 'Torrevieja, Alicante');
check('slug matches', matchStrTown(view, 'torrevieja-alicante')?.risk, 'elevated');
check('San Pedro is ambiguous', matchStrTown(view, 'San Pedro'), null);
check('an unknown place is not invented', matchStrTown(view, 'Atlantis'), null);
const dropped = { ...file, towns: file.towns.filter((t) => t.town !== 'Estepona, Málaga') };
const joined = buildStrView(dropped, [{ location: 'Estepona, Málaga', costa: 'Costa del Sol' }]);
check('a book town with no row is unknown', joined.towns.find((t) => t.town === 'Estepona, Málaga')?.risk, 'unknown');
check('that row is marked not reviewed', joined.towns.find((t) => t.town === 'Estepona, Málaga')?.synthetic, true);

console.log('wiring');
checkTrue('no fetch workflow', !existsSync(join(root, '.github/workflows/str-regulation-refresh.yml')));
checkTrue('page says not legal advice', /not legal advice/i.test(read('src/app/spain/short-let-rules/page.tsx')));
checkTrue('page links the JSON route', read('src/app/spain/short-let-rules/page.tsx').includes('/api/v1/str-regulation'));
checkTrue('route accepts ?town=', read('src/app/api/v1/str-regulation/route.ts').includes("searchParams.get('town')"));
checkTrue('route does not 500 on purpose', !read('src/app/api/v1/str-regulation/route.ts').includes('throw '));
checkTrue('official hub links the page', read('src/app/official/page.tsx').includes('href="/spain/short-let-rules"'));
checkTrue('methodology links the page', read('src/app/methodology/page.tsx').includes('href="/spain/short-let-rules"'));
checkTrue('due diligence links the page', read('src/app/due-diligence/page.tsx').includes('href="/spain/short-let-rules"'));
checkTrue('sitemap lists the page', read('src/app/sitemap.ts').includes("'/spain/short-let-rules'"));
checkTrue('property yield carries the flag', read('src/app/property/[ref]/page.tsx').includes('StrRiskBadge') && read('src/app/property/[ref]/page.tsx').includes('strBadgeFor(p.l)'));
checkTrue('yield function is untouched by this layer', !read('src/lib/scoring.ts').includes('str-regulation') && !read('src/lib/scoring.ts').includes('strBadgeFor'));
checkTrue('page does not use the gold gradient', !read('src/app/spain/short-let-rules/page.tsx').includes('--av-gradient-gold'));
checkTrue('page has no subscription price', !/€\s?79|\/\s?month|per month/.test(read('src/app/spain/short-let-rules/page.tsx')));
checkTrue('page does not add a RICS claim', !/RICS/i.test(read('src/app/spain/short-let-rules/page.tsx')));

console.log(fail ? `\n${fail} FAILED` : `\nALL PASS`);
process.exit(fail ? 1 : 0);

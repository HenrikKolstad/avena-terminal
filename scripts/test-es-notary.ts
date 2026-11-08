/**
 * Tests for the CIEN notary layer behind /spain/notary.
 *
 * The parser is tested on a small workbook: a blank stays a blank, a
 * fractional provisional count stays fractional, and an annual price that
 * is not the average of its months is refused. The committed
 * data/es-notary.json is checked against the annex that was actually read.
 *
 *   npx tsx scripts/test-es-notary.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  GEO_CODES,
  askingVsAppraisalPct,
  buildEsNotaryView,
  excelSerialToParts,
  monthFromAnnexLabel,
  parseCienIndex,
  parseHousingWorkbook,
  ratioToPct,
  selectCienAnnexes,
  type Cell,
  type Grid,
} from '../src/lib/data-sources/es-notary';
import { getEsNotary } from '../src/lib/es-notary-view';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`); }
}
function checkTrue(name: string, ok: boolean) {
  check(name, ok, true);
}
function throws(name: string, fn: () => unknown, pattern: RegExp) {
  try {
    fn();
    fail++;
    console.log(`  FAIL  ${name}\n        got  no throw`);
  } catch (e) {
    const message = (e as Error).message;
    if (pattern.test(message)) { pass++; console.log(`  PASS  ${name}`); }
    else { fail++; console.log(`  FAIL  ${name}\n        got  ${message}`); }
  }
}

check('August 2026 serial is that month', excelSerialToParts(46237), { year: 2026, month: 8, day: 3 });
check('annex label ago-26 is August 2026', monthFromAnnexLabel('ago-26'), '2026-08');
check('press-note ratio is 12.8 percent', ratioToPct(0.12802730113868832), 12.8);
check('a negative ratio keeps its sign', ratioToPct(-0.09801054758402416), -9.8);

const GEO = [...GEO_CODES];
function serial(year: number, month: number): number {
  return Math.round((Date.UTC(year, month - 1, 1) - Date.UTC(1899, 11, 30)) / 86400000);
}
function put(row: Cell[], col: number, value: Cell) { row[col] = value; }

function housingGrid(kind: 'month' | 'year', price: (key: string) => number, count: (key: string, code: string, group: number) => number): Grid {
  const rows: Grid = [];
  const titles: Cell[] = [];
  put(titles, 1, 'TABLA 2: COMPRAVENTA DE VIVIENDA - DATOS MENSUALES*');
  put(titles, 21, 'TABLA 2a: COMPRAVENTA DE VIVIENDA PISO - DATOS MENSUALES*');
  put(titles, 41, 'TABLA 2b: COMPRAVENTA DE VIVIENDA UNIFAMILIAR - DATOS MENSUALES*');
  rows.push(titles);
  const header: Cell[] = [];
  for (const start of [2, 22, 42]) GEO.forEach((code, i) => put(header, start + i, code));
  rows.push(header);
  const keys = kind === 'month'
    ? [...Array.from({ length: 12 }, (_, i) => `2024-${String(i + 1).padStart(2, '0')}`), '2025-01', '2025-02']
    : ['2024', '2025'];
  const blocks = [
    'NÚMERO DE OPERACIONES (nivel)',
    'NÚMERO DE OPERACIONES (variación interanual, en %)',
    'PRECIO PROMEDIO POR M2 (nivel)',
    'PRECIO PROMEDIO POR M2 (variación interanual, en %)',
    'SUPERFICIE MEDIA M2 (nivel)',
    'SUPERFICIE MEDIA M2 (variación interanual, en %)',
  ];
  for (const label of blocks) {
    const head: Cell[] = [];
    put(head, 1, label);
    rows.push(head);
    for (const key of keys) {
      const row: Cell[] = [];
      const [y, m] = key.split('-').map(Number);
      put(row, 1, kind === 'month' ? serial(y, m) : y);
      for (const [group, start] of [2, 22, 42].entries()) {
        GEO.forEach((code, i) => {
          let value = 0.1;
          if (label.startsWith('NÚMERO') && !label.includes('variación')) value = count(key, code, group);
          else if (label.startsWith('PRECIO') && !label.includes('variación')) value = price(key);
          else if (label.startsWith('SUPERFICIE') && !label.includes('variación')) value = 100;
          put(row, start + i, value);
        });
      }
      rows.push(row);
    }
  }
  const source: Cell[] = [];
  put(source, 1, 'Fuente: Centro de Información Estadística del Notariado y Portal Estadístico del Notariado. Los datos de Ceuta y Melilla se agregan en Andalucía.');
  rows.push(source);
  return rows;
}

const indexText = [
  'Los datos correspondientes a los tres últimos meses son provisionales.',
  'Los datos de Ceuta y Melilla se agregan en Andalucía.',
  'se circunscriben exclusivamente a las compraventas y excluyen vivienda de protección oficial.',
].join('\n');

function countFor(key: string, _code: string, group: number): number {
  if (key === '2025-02' && group === 0) return 100.5;
  return group === 0 ? 100 : group === 1 ? 40 : 10;
}
const parsed = parseHousingWorkbook({
  monthly: housingGrid('month', (key) => (key.startsWith('2024') ? 2000 : 2100), countFor),
  annual: housingGrid('year', () => 2000, () => 1200),
  indexText,
  expectedPeriod: '2025-02',
});
const spain = parsed.latest.find((r) => r.code === 'TOTAL');
check('latest month follows the annex title', spain?.period, '2025-02');
check('latest month is provisional', spain?.provisional, true);
check('a fractional count is not coerced to an integer', spain?.all.transactions, 100.5);
check('the nearest whole transaction is labelled separately', spain?.all.transactions_nearest, 101);
check('an already whole count stays whole', spain?.flat.transactions_whole, true);
check('price is rounded to the cent', spain?.all.eur_m2, 2100);
check('year-on-year ratio becomes percent', spain?.all.eur_m2_yoy_pct, 10);
check('annual price is the checked 2024 average', parsed.annual?.year, 2024);
check('annual Spain price', parsed.annual?.regions.find((r) => r.code === 'TOTAL')?.all.eur_m2, 2000);
check('annual transactions that match the sum are published', parsed.annual?.regions.find((r) => r.code === 'TOTAL')?.all.transactions, 1200);
check('Andalucía carries Ceuta and Melilla', parsed.latest.find((r) => r.code === 'AND')?.ceuta_melilla_included, true);
check('Murcia does not', parsed.latest.find((r) => r.code === 'MUR')?.ceuta_melilla_included, false);

throws('a blank price is not published as zero', () => {
  const monthly = housingGrid('month', (key) => (key.startsWith('2024') ? 2000 : 2100), countFor);
  const priceRows = monthly.filter((row) => typeof row[1] === 'number' && excelSerialToParts(row[1] as number).year === 2025 && excelSerialToParts(row[1] as number).month === 2);
  // The February price row is the one whose neighbours are prices near 2100, not counts.
  const febPrice = monthly.find((row) => row[2] === 2100 && row[1] != null && typeof row[1] === 'number' && excelSerialToParts(row[1]).month === 2);
  if (!febPrice) throw new Error('fixture lost its price row');
  febPrice[2] = null;
  void priceRows;
  parseHousingWorkbook({ monthly, annual: housingGrid('year', () => 2000, () => 1200), indexText, expectedPeriod: '2025-02' });
}, /blank/);

throws('a renamed geography is refused', () => {
  const monthly = housingGrid('month', () => 2000, () => 100);
  const header = monthly.find((row) => row[2] === 'AND');
  if (!header) throw new Error('no header');
  header[2] = 'MALAGA';
  parseHousingWorkbook({ monthly, annual: housingGrid('year', () => 2000, () => 1200), indexText, expectedPeriod: '2025-02' });
}, /geography blocks/);

throws('an annual price that is not the monthly average is refused', () => {
  parseHousingWorkbook({
    monthly: housingGrid('month', () => 2000, () => 100),
    annual: housingGrid('year', () => 9999, () => 1200),
    indexText,
    expectedPeriod: '2025-02',
  });
}, /not the average/);

const indexHtml = `
<li> <span class="date">30/10/2026 <span> - CIEN</span> </span> <span class="titleEnlaces"> Anexo tablas: series estadísticas correspondientes al informe (hasta ago-26) </span> <a href="/liferay/c/document_library/get_file?uuid=aaa&amp;groupId=1">x</a> </li>
<li> <span class="date">09/04/2026 <span> - CIEN</span> </span> <span class="titleEnlaces"> Anexo tablas: series estadísticas correspondientes al informe de extranjeros (hasta 2S25) </span> <a href="/liferay/c/document_library/get_file?uuid=bbb&amp;groupId=1">x</a> </li>
<li> <span class="date">30/09/2026 <span> - CIEN</span> </span> <span class="titleEnlaces"> Anexo tablas: series estadísticas correspondientes al informe (hasta jul-26) </span> <a href="/liferay/c/document_library/get_file?uuid=ccc&amp;groupId=1">x</a> </li>
`;
const selected = selectCienAnnexes(parseCienIndex(indexHtml));
check('the newest housing annex wins', selected.housing.period, '2026-08');
check('the foreign annex is not used as the housing file', selected.foreign.period, '2025-H2');
check('an encoded ampersand in the file url is decoded', selected.housing.url.includes('uuid=aaa&groupId=1'), true);

console.log('committed layer');
const root = join(__dirname, '..');
const committed = JSON.parse(readFileSync(join(root, 'data', 'es-notary.json'), 'utf8'));
const committedSpain = committed.regions.find((r: { code: string }) => r.code === 'TOTAL');
check('committed period is August 2026', committed.period, '2026-08');
check('committed Spain price is the annex cell to the cent', committedSpain.all.eur_m2, 1958.86);
check('committed Spain price change is the press figure', committedSpain.all.eur_m2_yoy_pct, 12.8);
check('committed Spain count rounds to the press figure', committedSpain.all.transactions_nearest, 34599);
check('the provisional count is not stored as a whole number', committedSpain.all.transactions_whole, false);
check('Andalucía includes Ceuta and Melilla', committed.regions.find((r: { code: string }) => r.code === 'AND').ceuta_melilla_included, true);
check('annual year is the last complete year', committed.annual.year, 2025);
check('foreign annex is 2025-H2', committed.foreign.period, '2025-H2');
check('foreign share of all sales is the workbook weight', committed.foreign.buyers.find((b: { key: string }) => b.key === 'foreign').peso_pct, 18.4);
const nationalityTotal = committed.foreign.nationalities.find((r: { name: string }) => r.name === 'Total');
const nationalityParts = committed.foreign.nationalities.filter((r: { name: string }) => r.name !== 'Total');
check('nationality counts add up to the table total', nationalityParts.reduce((s: number, r: { transactions: number }) => s + r.transactions, 0), nationalityTotal.transactions);
check('new versus second-hand is an omission', committed.omissions.some((o: { source: string; ingested: boolean }) => /new versus second-hand/.test(o.source) && o.ingested === false), true);
check('the portal was not read', committed.omissions.some((o: { source: string; reason: string }) => o.source === 'Portal Estadístico del Notariado' && /commercial/.test(o.reason)), true);
check('licence names the annex and refuses the portal', /Creative Commons/.test(committed.sources.housing.licence_note) && /municipal/.test(committed.sources.housing.licence_note), true);

console.log('live view');
const live = getEsNotary();
check('live view is ready', live.status, 'ready');
check('every listing maps', live.unmapped_listings, 0);
check('no town is given a notary price', live.summary.towns_with_notary_price, 0);
checkTrue('a compared gap uses the notary formula', live.provinces.filter((p) => p.asking_vs_closing_pct != null).length > 0 && live.provinces.every((p) => p.asking_vs_closing_pct === askingVsAppraisalPct(p.avena_median_asking_eur_m2, p.notary?.eur_m2 ?? null)));
const malaga = live.provinces.find((p) => p.slug === 'malaga');
const murcia = live.provinces.find((p) => p.slug === 'murcia');
check('Málaga uses Andalucía and says so', malaga && { equals: malaga.territory_equals_province, ceuta: malaga.ceuta_melilla_included, geo: malaga.geo_code }, { equals: false, ceuta: true, geo: 'AND' });
check('Murcia is the province', murcia?.territory_equals_province, true);
checkTrue('towns below the floor have no asking median and no gap', live.towns.filter((t) => t.status === 'insufficient').every((t) => t.avena_median_asking_eur_m2 == null && t.asking_vs_closing_pct == null));
checkTrue('towns above the floor still have a blank closing price', live.towns.filter((t) => t.status === 'not_published').every((t) => t.notary_eur_m2 == null && t.asking_vs_closing_pct == null && t.avena_median_asking_eur_m2 != null));

const fixtureView = buildEsNotaryView({
  ...committed,
  regions: parsed.latest,
  period: '2025-02',
  provinces_in_corpus: ['malaga', 'murcia'],
}, [
  ...Array.from({ length: 8 }, () => ({ location: 'Estepona, Málaga', askingEurM2: 4000 })),
  ...Array.from({ length: 3 }, () => ({ location: 'Nerja, Málaga', askingEurM2: 3000 })),
  ...Array.from({ length: 4 }, () => ({ location: 'Mazarrón, Murcia', askingEurM2: 1500 })),
]);
const estepona = fixtureView.towns.find((t) => t.town === 'Estepona');
const nerja = fixtureView.towns.find((t) => t.town === 'Nerja');
check('eight priced listings publish an asking median and no closing price', estepona && { asking: estepona.avena_median_asking_eur_m2, notary: estepona.notary_eur_m2, gap: estepona.asking_vs_closing_pct }, { asking: 4000, notary: null, gap: null });
check('three priced listings stay below the floor', nerja?.status, 'insufficient');
check('the Málaga gap uses the Andalucía price from the fixture', fixtureView.provinces.find((p) => p.slug === 'malaga')?.asking_vs_closing_pct, askingVsAppraisalPct(4000, 2100));

console.log('wiring');
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const page = read('src/app/spain/notary/page.tsx');
checkTrue('page links the JSON route', page.includes('/api/v1/es-notary'));
checkTrue('page states asking prices are not transaction prices', /not a price on a deed|Asking prices are not transaction prices/i.test(page));
checkTrue('page has no subscription price', !/€\s?79|\/\s?month|per month/.test(page));
checkTrue('page does not add a RICS claim', !/RICS/i.test(page));
checkTrue('page does not use the gold gradient', !page.includes('--av-gradient-gold'));
checkTrue('hub links the page', read('src/app/official/page.tsx').includes('href="/spain/notary"'));
checkTrue('sitemap lists the page', read('src/app/sitemap.ts').includes("'/spain/notary'"));
checkTrue('footer links the page', read('src/components/v2/Footer.tsx').includes("href: '/spain/notary'"));
checkTrue('workflow cron is Saturday 04:20', read('.github/workflows/es-notary-refresh.yml').includes("cron: '20 4 * * 6'"));
checkTrue('route is public JSON', read('src/app/api/v1/es-notary/route.ts').includes('Access-Control-Allow-Origin') && read('src/app/api/v1/es-notary/route.ts').includes('getEsNotary'));

console.log(fail ? `\n${fail} FAILED` : `\nALL PASS`);
process.exit(fail ? 1 : 0);

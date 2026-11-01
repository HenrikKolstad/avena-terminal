/**
 * Tests for the Portugal official benchmark behind /portugal/official.
 *
 * The parser and the layer builder are exercised on fixtures, including the
 * failures that must throw rather than publish a blank or a zero. The
 * committed data/pt-ine-benchmark.json is checked against the indicator
 * codes and the figures fetched from INE. The page, the JSON route and the
 * Sunday workflow are checked from source.
 *
 *   npx tsx scripts/test-pt-official-benchmark.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { askingVsAppraisalPct } from '../src/lib/data-sources/ine-es';
import {
  APPRAISAL_INDICATOR, APPRAISAL_YOY_INDICATOR, SALES_INDICATOR,
  HPI_INDEX_INDICATOR, HPI_YOY_INDICATOR, APPRAISAL_CATEGORIES, HOUSING_CATEGORIES,
  parseIneBenchmark, ineMetaGeoCodes, ineMetaUnit, ineDataUrl, buildPtBenchmarkLayer,
  layerFingerprint, isPortugueseLocation, assemblePtOfficialView,
  type BenchmarkInputs, type IneBenchmarkParsed, type PtBenchmarkLayer,
} from '../src/lib/data-sources/ine-pt-benchmark';
import { getPtOfficial } from '../src/lib/pt-official-view';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`); }
}
function throws(name: string, fn: () => unknown, mustMention?: string) {
  try {
    fn();
    fail++;
    console.log(`  FAIL  ${name}\n        returned normally; wanted a throw`);
  } catch (e) {
    const msg = (e as Error).message;
    if (mustMention && !msg.includes(mustMention)) {
      fail++;
      console.log(`  FAIL  ${name}\n        threw "${msg}", wanted mention of "${mustMention}"`);
    } else {
      pass++;
      console.log(`  PASS  ${name}`);
    }
  }
}

const GEOS: [string, string][] = [
  ['PT', 'Portugal'],
  ['15', 'Algarve'], ['150', 'Algarve'],
  ['1A', 'Grande Lisboa'], ['1A0', 'Grande Lisboa'],
  ['1B', 'Península de Setúbal'], ['1B0', 'Península de Setúbal'],
  ['11', 'Norte'], ['11A', 'Área Metropolitana do Porto'],
  ['19', 'Centro'],
  ['30', 'Região Autónoma da Madeira'], ['300', 'Região Autónoma da Madeira'],
];
const NUTS2 = ['PT', '15', '1A', '1B', '11', '19', '30'];

function envelope(code: string, ultimo: string, dados: Record<string, unknown[]>) {
  return [{
    IndicadorCod: code,
    IndicadorDsg: code === HPI_INDEX_INDICATOR
      ? 'Housing price index (Base - 2025) by Category of housing unit'
      : code === HPI_YOY_INDICATOR
        ? 'Housing price index (Annual rate of change - Base 2025 - %) by Category of housing unit'
        : `Indicator ${code}`,
    MetaInfUrl: `https://www.ine.pt/bddXplorer/htdocs/minfo.jsp?var_cd=${code}&lingua=EN`,
    DataExtracao: '2026-11-01T00:00:00.000Z',
    DataUltimoAtualizacao: '2026-10-27',
    UltimoPref: ultimo,
    Dados: dados,
    Sucesso: { Verdadeiro: [{ Msg: 'OK' }] },
  }];
}

function obs(geo: string, name: string, category: string, value: number | null) {
  return {
    geocod: geo,
    geodsg: name,
    dim_3: 'X',
    dim_3_t: category,
    ...(value == null ? { sinal_conv: '-' } : { valor: String(value) }),
  };
}

function appraisalPayload(latest = 'September 2026', tweak?: (geo: string, category: string, period: string, value: number) => number | null) {
  const months = [
    ['August 2026', 1000],
    ['September 2026', 1100],
  ] as const;
  const dados: Record<string, unknown[]> = {};
  for (const [label, base] of months) {
    const rows = [];
    for (const [geo, name] of GEOS) {
      const primary = geo === '150' ? '15' : geo === '1A0' ? '1A' : geo === '1B0' ? '1B' : geo === '300' ? '30' : geo;
      for (const category of ['Total', 'Flats', 'Villas'] as const) {
        const raw = base + GEOS.findIndex((g) => g[0] === primary) + (category === 'Flats' ? 10 : category === 'Villas' ? 20 : 0);
        const value = tweak ? tweak(geo, category, label, raw) : raw;
        rows.push(obs(geo, name, category, value));
      }
    }
    dados[label] = rows;
  }
  return envelope(APPRAISAL_INDICATOR, latest, dados);
}

function yoyPayload() {
  const dados: Record<string, unknown[]> = {
    'September 2026': NUTS2.map((geo) => obs(geo, GEOS.find((g) => g[0] === geo)![1], 'Total', 5)),
  };
  return envelope(APPRAISAL_YOY_INDICATOR, 'September 2026', dados);
}

function salesPayload() {
  const dados: Record<string, unknown[]> = {};
  for (const [label, base] of [['1st Quarter 2026', 2000], ['2nd Quarter 2026', 2100]] as const) {
    const rows = [];
    for (const [geo, name] of GEOS) {
      const primary = geo === '150' ? '15' : geo === '1A0' ? '1A' : geo === '1B0' ? '1B' : geo === '300' ? '30' : geo;
      const shift = GEOS.findIndex((g) => g[0] === primary);
      rows.push(obs(geo, name, 'New', base + shift), obs(geo, name, 'Existing', base - 100 + shift), obs(geo, name, 'Total', base - 50 + shift));
    }
    dados[label] = rows;
  }
  return envelope(SALES_INDICATOR, '2nd Quarter 2026', dados);
}

function hpiPayload(code: string, ultimo: string) {
  const dados: Record<string, unknown[]> = {
    '1st Quarter 2026': ['Total', 'New', 'Existing'].map((category, i) => obs('PT', 'Portugal', category, 100 + i)),
    [ultimo]: ['Total', 'New', 'Existing'].map((category, i) => obs('PT', 'Portugal', category, 110 + i)),
  };
  return envelope(code, ultimo, dados);
}

function inputs(over: Partial<BenchmarkInputs> = {}): BenchmarkInputs {
  const fetched = '2026-11-01T00:14:10.787Z';
  const appraisal = parseIneBenchmark(appraisalPayload(), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES);
  const appraisalYoy = parseIneBenchmark(yoyPayload(), APPRAISAL_YOY_INDICATOR, { Total: 'total' });
  const sales = parseIneBenchmark(salesPayload(), SALES_INDICATOR, HOUSING_CATEGORIES);
  const hpiIndex = parseIneBenchmark(hpiPayload(HPI_INDEX_INDICATOR, '2nd Quarter 2026'), HPI_INDEX_INDICATOR, HOUSING_CATEGORIES);
  const hpiYoy = parseIneBenchmark(hpiPayload(HPI_YOY_INDICATOR, '2nd Quarter 2026'), HPI_YOY_INDICATOR, HOUSING_CATEGORIES);
  return {
    generatedAt: '2026-11-01T00:30:00.000Z',
    appraisal,
    appraisalApiUrl: 'https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012248',
    appraisalUnit: 'Euro/ Square metre (€/ m²)',
    appraisalFetchedAt: fetched,
    appraisalYoy,
    appraisalYoyApiUrl: 'https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012250',
    appraisalYoyUnit: 'Percentage (%)',
    appraisalYoyFetchedAt: fetched,
    appraisalYoyGeos: NUTS2,
    sales,
    salesApiUrl: 'https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012234',
    salesUnit: 'Euro/ Square metre (€/ m²)',
    salesFetchedAt: fetched,
    hpiIndex,
    hpiIndexApiUrl: 'https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0014765',
    hpiIndexUnit: 'No applicable (-)',
    hpiIndexFetchedAt: fetched,
    hpiYoy,
    hpiYoyApiUrl: 'https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0014767',
    hpiYoyUnit: 'Percentage (%)',
    hpiYoyFetchedAt: fetched,
    ...over,
  };
}

console.log('\nparser');
const parsed = parseIneBenchmark(appraisalPayload(), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES);
check('latest period normalised', parsed.latestPeriod, '2026-09');
check('blank valor stays null', parseIneBenchmark(appraisalPayload('September 2026', (geo, category, period, value) => (
  geo === 'PT' && category === 'Total' && period === 'August 2026' ? null : value
)), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES).rows.find((r) => r.geo === 'PT' && r.category === 'total' && r.period === '2026-08')?.value, null);
check('comma url is not percent-encoded', ineDataUrl('0012248', { dim2: 'PT,15', dim3: 'T,1,2' }).includes('Dim2=PT,15') && ineDataUrl('0012248', { dim2: 'PT,15', dim3: 'T,1,2' }).includes('Dim3=T,1,2'), true);

throws('wrong indicator', () => parseIneBenchmark(appraisalPayload(), '0012098', APPRAISAL_CATEGORIES), 'mismatch');
throws('failure payload', () => parseIneBenchmark([{ IndicadorCod: APPRAISAL_INDICATOR, Sucesso: { Falso: [{ Msg: 'Dim2 not valid' }] } }], APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES), 'not valid');
throws('empty dados', () => parseIneBenchmark(envelope(APPRAISAL_INDICATOR, 'September 2026', {}), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES), 'no Dados');
throws('unknown category', () => parseIneBenchmark(envelope(APPRAISAL_INDICATOR, 'September 2026', {
  'September 2026': [obs('PT', 'Portugal', 'Houses', 1)],
}), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES), 'Houses');
throws('non-numeric', () => parseIneBenchmark(envelope(APPRAISAL_INDICATOR, 'September 2026', {
  'September 2026': [{ geocod: 'PT', geodsg: 'Portugal', dim_3_t: 'Total', valor: 'x' }],
}), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES), 'non-numeric');
throws('latest period mismatch', () => parseIneBenchmark(appraisalPayload('August 2026'), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES), 'latest period');
throws('duplicate cell', () => parseIneBenchmark(envelope(APPRAISAL_INDICATOR, 'September 2026', {
  'September 2026': [obs('PT', 'Portugal', 'Total', 1), obs('PT', 'Portugal', 'Total', 2)],
}), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES), 'duplicate');

const meta = [{
  IndicadorCod: APPRAISAL_YOY_INDICATOR,
  UnidadeMedida: 'Percentage (%)',
  Sucesso: { Verdadeiro: [{ Msg: 'OK' }] },
  Dimensoes: { Categoria_Dim: [{ Dim_Num2_PT: [{ dim_num: '2', categ_cod: 'PT' }], Dim_Num2_11A: [{ dim_num: '2', categ_cod: '11A' }], Dim_Num3_T: [{ dim_num: '3', categ_cod: 'T' }] }] },
}];
check('metadata geos ignore the construction-type dimension', [...ineMetaGeoCodes(meta, APPRAISAL_YOY_INDICATOR)].sort(), ['11A', 'PT']);
check('metadata unit', ineMetaUnit(meta, APPRAISAL_YOY_INDICATOR), 'Percentage (%)');

console.log('\nbuilder');
const layer = buildPtBenchmarkLayer(inputs());
const pt = layer.regions.find((r) => r.slug === 'portugal')!;
const porto = layer.regions.find((r) => r.slug === 'porto')!;
const algarve = layer.regions.find((r) => r.slug === 'algarve')!;
check('eight regions when NUTS III matches', layer.regions.map((r) => r.slug), ['portugal', 'algarve', 'grande-lisboa', 'setubal', 'norte', 'porto', 'centro', 'madeira']);
check('Algarve keeps the NUTS III code as the same territory', algarve.also_published_as?.geo, '150');
check('Porto rate is absent, not zero', porto.appraisal_yoy_pct, null);
check('Porto series is not derived', porto.appraisal_yoy_series, null);
check('Portugal rate is the published one', pt.appraisal_yoy_pct?.series_id, 'INE:0012250:PT:total');
check('retrieval day is the fetch day', pt.appraisal_eur_m2.total.retrieved_at, '2026-11-01');
check('AML is an omission and was not summed', layer.omissions.some((o) => o.source === 'Área Metropolitana de Lisboa' && o.ingested === false), true);
check('index base is read from the title', layer.hpi.base_year, '2025');
check('new and existing index are distinct', layer.hpi.latest.index.new.value === layer.hpi.latest.index.existing.value, false);
check('fingerprint ignores the fetch clock', layerFingerprint({ ...layer, generated_at: 'other' }) === layerFingerprint(layer), true);

const divergedAppraisal = parseIneBenchmark(appraisalPayload('September 2026', (geo, category, period, value) => (
  geo === '150' && category === 'Total' && period === 'September 2026' ? value + 50 : value
)), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES);
const diverged = buildPtBenchmarkLayer(inputs({ appraisal: divergedAppraisal }));
check('a NUTS III disagreement is its own row', diverged.regions.some((r) => r.slug === 'algarve-nuts3' && r.geo === '150'), true);
check('the matching NUTS II row drops the alias', diverged.regions.find((r) => r.slug === 'algarve')?.also_published_as, null);

throws('blank latest appraisal refuses to publish', () => buildPtBenchmarkLayer(inputs({
  appraisal: parseIneBenchmark(appraisalPayload('September 2026', (geo, category, period, value) => (
    geo === 'PT' && category === 'Total' && period === 'September 2026' ? null : value
  )), APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES),
})), 'blank');
throws('Porto appearing on the NUTS II rate must be revised', () => buildPtBenchmarkLayer(inputs({
  appraisalYoyGeos: [...NUTS2, '11A'],
})), '11A');

console.log('\ncoverage');
check('Spanish coast is not Portugal', isPortugueseLocation('Manilva, Málaga'), false);
check('Faro is Portugal', isPortugueseLocation('Lagos, Faro'), true);
check('the word Portugal counts', isPortugueseLocation('Somewhere, Portugal'), true);
check('a shopping centre in Málaga does not', isPortugueseLocation('Centro Comercial, Málaga'), false);
const empty = assemblePtOfficialView(layer, ['Manilva, Málaga', 'Torrevieja, Alicante'], [], 'gap');
check('no Portugal place names', empty.portuguese_listings, 0);
check('the note says there is no Portugal coverage', /does not publish Portuguese listings/.test(empty.coverage_note) && /not Avena coverage of Portugal/.test(empty.coverage_note), true);
const one = assemblePtOfficialView(layer, ['Lagos, Faro'], [{
  name: 'Málaga', slug: 'malaga', ccaa: 'Andalucía', listings: 0,
  avena_median_asking_eur_m2: 4000, appraisal_eur_m2: 3000, appraisal_period: '2026-Q2',
  appraisal_series_id: 'VDP', appraisal_source_name: 'MIVAU', appraisal_source_url: 'https://example.test',
  appraisal_retrieved_at: '2026-11-01', asking_vs_appraisal_pct: 33.3,
}], 'gap');
check('a Portugal place is counted and not turned into an asking median', one.portuguese_listings === 1 && !('avena_median_asking_eur_m2' in one.regions[0]), true);
check('a province with no listings is left out of the Spain table', one.spain_coast.length, 0);

console.log('\ncommitted file');
const committed = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'pt-ine-benchmark.json'), 'utf8')) as PtBenchmarkLayer;
check('committed file is ready', committed.status, 'ready');
check('appraisal indicator', committed.sources.appraisal.indicator, APPRAISAL_INDICATOR);
check('appraisal yoy indicator', committed.sources.appraisal_yoy.indicator, APPRAISAL_YOY_INDICATOR);
check('sales indicator', committed.sources.sales.indicator, SALES_INDICATOR);
check('hpi indicators', [committed.sources.hpi_index.indicator, committed.sources.hpi_yoy.indicator], [HPI_INDEX_INDICATOR, HPI_YOY_INDICATOR]);
check('each source names its info url and a fetch time', Object.values(committed.sources).every((s) => s.info_url.includes(s.indicator) && s.fetched_at.length > 10 && s.api_url.includes('ine.pt')), true);
const committedPt = committed.regions.find((r) => r.slug === 'portugal')!;
check('Portugal appraisal is the September 2026 INE figure', [committedPt.appraisal_eur_m2.total.period, committedPt.appraisal_eur_m2.total.value, committedPt.appraisal_eur_m2.total.series_id], ['2026-09', 2278, 'INE:0012248:PT:total']);
check('Portugal appraisal yoy is the published rate', [committedPt.appraisal_yoy_pct?.period, committedPt.appraisal_yoy_pct?.value], ['2026-09', 14.2]);
check('Portugal sales are the 2026-Q2 INE figures', [committedPt.sales_eur_m2.new.period, committedPt.sales_eur_m2.new.value, committedPt.sales_eur_m2.existing.value], ['2026-Q2', 2476, 2208]);
check('house price index new and existing annual rates', [committed.hpi.latest.period, committed.hpi.base_year, committed.hpi.latest.yoy_pct.new.value, committed.hpi.latest.yoy_pct.existing.value, committed.hpi.latest.index.new.value], ['2026-Q2', '2025', 12.3, 18, 110.92]);
const expectValue: Record<string, number> = { algarve: 2953, 'grande-lisboa': 3452, setubal: 2845, norte: 1956, porto: 2325, centro: 1438, madeira: 2642 };
for (const [slug, value] of Object.entries(expectValue)) {
  const region = committed.regions.find((r) => r.slug === slug)!;
  check(`${slug} appraisal`, region.appraisal_eur_m2.total.value, value);
  check(`${slug} appraisal is euros with a period`, region.appraisal_eur_m2.total.unit === 'eur_per_m2' && region.appraisal_eur_m2.total.period === committed.sources.appraisal.latest_period, true);
  check(`${slug} sales new is positive`, region.sales_eur_m2.new.value > 0 && region.sales_eur_m2.existing.value > 0, true);
}
check('Porto has no derived yoy', committed.regions.find((r) => r.slug === 'porto')!.appraisal_yoy_pct, null);
check('Algarve NUTS III matches and is named', committed.regions.find((r) => r.slug === 'algarve')!.also_published_as?.geo, '150');
check('no zero was written over a blank', committed.regions.every((r) => r.appraisal_series.every((p) => p.total === null || p.total > 0)), true);
check('early house price index has no invented annual rate', committed.hpi.quarters[0].yoy_pct, { total: null, new: null, existing: null });

const page = readFileSync(join(__dirname, '..', 'src', 'app', 'portugal', 'official', 'page.tsx'), 'utf8');
const route = readFileSync(join(__dirname, '..', 'src', 'app', 'api', 'v1', 'pt-official', 'route.ts'), 'utf8');
const workflow = readFileSync(join(__dirname, '..', '.github', 'workflows', 'pt-ine-benchmark-refresh.yml'), 'utf8');
check('page states the coverage gap', page.includes('does not publish Portuguese listings') || page.includes('{view.coverage_note}'), true);
check('page links the JSON route', page.includes('/api/v1/pt-official'), true);
check('page does not use the gold gradient', page.includes('--av-gradient-gold'), false);
check('page has no plan price and no RICS page', /€\s?79|RICS/.test(page), false);
check('route returns the view', route.includes('getPtOfficial'), true);
check('Sunday job is 04:30 UTC', workflow.includes("cron: '30 4 * * 0'"), true);
check('job fails closed and does not swallow an INE outage', workflow.includes('npx tsx scripts/ingest-pt-ine-benchmark.ts') && !workflow.includes('ingest-pt-ine-benchmark.ts || true') && !/Build the Portugal INE benchmark[\s\S]*continue-on-error/.test(workflow), true);
for (const cron of ['35 4 * * 2', '40 4 * * 3', '20 4 * * 2', '50 4 * * 1']) {
  check(`does not reuse ${cron}`, workflow.includes(cron), false);
}

const live = getPtOfficial();
check('live book has no Portugal listing', live.portuguese_listings, 0);
check('live Spain coast is the provinces with listings', live.spain_coast.length > 0 && live.spain_coast.every((r) => r.listings > 0), true);
for (const row of live.spain_coast) {
  check(`${row.name} asking median is positive`, row.avena_median_asking_eur_m2 != null && row.avena_median_asking_eur_m2 > 0, true);
  check(`${row.name} gap is the Spain formula`, row.asking_vs_appraisal_pct, askingVsAppraisalPct(row.avena_median_asking_eur_m2, row.appraisal_eur_m2));
}
check('live Portugal figure matches the file', live.regions.find((r) => r.slug === 'portugal')?.appraisal_eur_m2.total.value, 2278);

if (fail) {
  console.log(`\nFAILED — ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`\nALL PASS — ${pass} passed, ${fail} failed`);

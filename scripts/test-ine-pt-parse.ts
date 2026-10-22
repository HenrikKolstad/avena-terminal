/**
 * Tests for the INE Portugal / BPstat adapters behind /portugal.
 *
 * Happy path, the trailing-12-month licensing arithmetic, and — the point of
 * the file — that every way the parsers can stop understanding their input
 * THROWS instead of returning an empty table that would render as "no data".
 *
 *   npx tsx scripts/test-ine-pt-parse.ts
 */

import {
  normalisePeriod, parseIneIndicator, parseBpstatSingleSeries, trailing12, monthMinus,
  yearEarlier, premiumPct, buildPortugalLayer, PT_REGIONS,
} from '../src/lib/data-sources/ine-pt';
import layer from '../data/pt-official.json';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`); }
}
function throws(name: string, fn: () => unknown, mustMention?: string) {
  try { fn(); fail++; console.log(`  FAIL  ${name}\n        returned normally; wanted a throw`); } catch (e) {
    const msg = (e as Error).message;
    if (mustMention && !msg.includes(mustMention)) { fail++; console.log(`  FAIL  ${name}\n        threw "${msg}", wanted mention of "${mustMention}"`); } else { pass++; console.log(`  PASS  ${name}`); }
  }
}

// ── periods ──────────────────────────────────────────────────────────────────
check('quarter label', normalisePeriod('1st Quarter 2026'), '2026-Q1');
check('4th quarter', normalisePeriod('4th Quarter 2019'), '2019-Q4');
check('month label', normalisePeriod('August 2026'), '2026-08');
throws('Portuguese label throws', () => normalisePeriod('1º Trimestre de 2026'), 'not understood');
check('monthMinus across year', monthMinus('2026-02', 3), '2025-11');
check('yearEarlier quarter', yearEarlier('2026-Q1'), '2025-Q1');
check('yearEarlier month', yearEarlier('2026-08'), '2025-08');

// ── INE fixture ──────────────────────────────────────────────────────────────
const row = (geocod: string, geodsg: string, cat: string | null, valor: string | null) => ({
  geocod, geodsg, ...(cat ? { dim_3_t: cat } : {}), ...(valor == null ? { sinal_conv: '-', ind_string: '-' } : { valor, ind_string: valor }),
});
function priceFixture() {
  const q = (label: string, mult: number) => {
    const rows = [];
    for (const [g, name] of [['PT', 'Portugal'], ['150', 'Algarve'], ['1A0', 'Grande Lisboa'], ['1B0', 'Península de Setúbal'], ['11A', 'Área Metropolitana do Porto'], ['300', 'Região Autónoma da Madeira'], ['1D1', 'Oeste']]) {
      rows.push(row(g, name, 'New', String(Math.round(2400 * mult))), row(g, name, 'Existing', String(Math.round(2100 * mult))), row(g, name, 'Total', String(Math.round(2200 * mult))));
    }
    for (const pre of ['150', '1A0', '1B0', '11A', '300', '1D1']) {
      for (let i = 1; i <= 3; i++) rows.push(row(`${pre}010${i}`, `${pre}-M${i}`, 'New', String(Math.round(3000 * mult + i))), row(`${pre}010${i}`, `${pre}-M${i}`, 'Existing', String(Math.round(2500 * mult))));
    }
    rows.push(row('15001010', 'too short', 'New', '1'));
    rows.push(row('150010101', 'Parish A', 'New', String(Math.round(4000 * mult))));
    rows.push(row('150010102', 'Parish B', 'New', null));
    return [label, rows] as const;
  };
  return [{
    IndicadorCod: '0012234', IndicadorDsg: 'Median value…', DataUltimoAtualizacao: '2026-07-17', UltimoPref: '1st Quarter 2026',
    Dados: Object.fromEntries([q('1st Quarter 2025', 1), q('1st Quarter 2026', 1.1)]),
    Sucesso: { Verdadeiro: [{ Msg: 'OK' }] },
  }];
}
function licFixture() {
  const months: [string, unknown[]][] = [];
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  for (let y = 2024; y <= 2026; y++) for (let m = 0; m < 12; m++) {
    if (y === 2026 && m > 7) break;
    const rows = [row('PT', 'Portugal', null, '100')];
    for (const pre of ['150', '1A0', '1B0', '11A', '300', '1D1']) rows.push(row(pre, pre, null, '10'), row(`${pre}0101`, `${pre}-M1`, null, '5'));
    months.push([`${names[m]} ${y}`, rows]);
  }
  return [{ IndicadorCod: '0012098', IndicadorDsg: 'Licensed…', DataUltimoAtualizacao: '2026-10-09', UltimoPref: 'August 2026', Dados: Object.fromEntries(months), Sucesso: { Verdadeiro: [{ Msg: 'OK' }] } }];
}

const prices = parseIneIndicator(priceFixture(), '0012234', true);
check('price latest period', prices.latestPeriod, '2026-Q1');
check('null value kept as null', prices.rows.find((r) => r.geo === '150010102')?.value, null);
const lic = parseIneIndicator(licFixture(), '0012098', false);
check('licensing latest', lic.latestPeriod, '2026-08');

throws('wrong indicator code', () => parseIneIndicator(priceFixture(), '0099999', true), 'mismatch');
throws('no success flag', () => parseIneIndicator([{ ...priceFixture()[0], Sucesso: { Falso: [{ Msg: 'x' }] } }], '0012234', true), 'success');
throws('empty Dados', () => parseIneIndicator([{ ...priceFixture()[0], Dados: {} }], '0012234', true), 'no Dados');
throws('unknown housing category', () => parseIneIndicator([{ ...priceFixture()[0], Dados: { '1st Quarter 2026': [row('PT', 'Portugal', 'Novo', '1')] } }], '0012234', true), 'category');
throws('non-numeric value', () => parseIneIndicator([{ ...priceFixture()[0], Dados: { '1st Quarter 2026': [row('PT', 'Portugal', 'New', 'abc')] } }], '0012234', true), 'non-numeric');
throws('UltimoPref not last period', () => parseIneIndicator([{ ...priceFixture()[0], UltimoPref: '4th Quarter 2025' }], '0012234', true), 'latest period');
throws('all values null', () => parseIneIndicator([{ ...priceFixture()[0], Dados: { '1st Quarter 2026': [row('PT', 'Portugal', 'New', null)] } }], '0012234', true), 'no numeric');
throws('not an array', () => parseIneIndicator({ error: 'x' }, '0012234', true), 'array');

// ── trailing 12 ──────────────────────────────────────────────────────────────
const m = new Map<string, number | null>([['2026-08', 4], ['2026-05', 3], ['2026-02', 2], ['2025-11', 1], ['2026-07', 99]]);
check('trailing12 sums 4 non-overlapping windows', trailing12(m, '2026-08'), 10);
check('trailing12 null when a window is missing', trailing12(m, '2026-07'), null);
check('premium', premiumPct({ new: 2402, existing: 2108, total: 2168 }), 13.9);
check('premium null on missing', premiumPct({ new: 2402, existing: null, total: null }), null);

// ── BPstat ───────────────────────────────────────────────────────────────────
const bp = (ids: number[], size: number[], values: unknown[]) => ({
  id: ['18', '23', 'reference_date'], size, value: values,
  dimension: { reference_date: { category: { index: ['2026-03-31', '2026-06-30'] } } },
  extension: { series: ids.map((id) => ({ id, label: `S${id}` })) },
});
check('bpstat single series', parseBpstatSingleSeries(bp([1], [1, 1, 2], [19.7, 18.0]), 1).points, [{ date: '2026-03-31', value: 19.7 }, { date: '2026-06-30', value: 18 }]);
throws('bpstat two series in one response', () => parseBpstatSingleSeries(bp([1, 2], [1, 2, 2], [1, 2, 3, 4]), 1), 'exactly');
throws('bpstat non-date dimension > 1', () => parseBpstatSingleSeries(bp([1], [1, 2, 2], [1, 2, 3, 4]), 1), 'size');
throws('bpstat dates/values length mismatch', () => parseBpstatSingleSeries(bp([1], [1, 1, 2], [1]), 1), 'dates');
throws('bpstat all null', () => parseBpstatSingleSeries(bp([1], [1, 1, 2], [null, null]), 1), 'no numeric');

// ── layer builder ────────────────────────────────────────────────────────────
const s = { label: 'x', points: [{ date: '2026-06-30', value: 18 }] };
const built = buildPortugalLayer(prices, lic, { hpiNew: s, hpiExisting: s, rateVariable: s, rateFixed: s }, { hpiNew: 1, hpiExisting: 2, rateVariable: 3, rateFixed: 4 }, new Date('2026-10-22T00:00:00Z'));
check('five regions in order', built.regions.map((r) => r.slug), PT_REGIONS.map((r) => r.slug));
check('national new €/m²', built.national.latest.new, 2640);
check('national y/y new', built.national.new_yoy_pct, 10);
check('national licensed 12m', built.national.licensed_12m, 400);
check('lisbon licensing sums both NUTS III', built.regions.find((r) => r.slug === 'lisbon')?.licensed_12m, 80);
check('municipalities only 7-char codes', built.regions[0].municipalities.map((x) => x.geo), ['1500103', '1500102', '1500101']);
check('parishes drop nulls', built.regions[0].parishes.map((p) => p.geo), ['150010101']);
check('silver coast has no parishes', built.regions.find((r) => r.slug === 'silver-coast')?.parishes.length, 0);
throws('missing NUTS III region throws', () => buildPortugalLayer(
  { ...prices, rows: prices.rows.filter((r) => r.geo !== '300') }, lic, { hpiNew: s, hpiExisting: s, rateVariable: s, rateFixed: s }, { hpiNew: 1, hpiExisting: 2, rateVariable: 3, rateFixed: 4 }), 'NUTS III 300');

// ── the committed file the page renders ──────────────────────────────────────
const L = layer as unknown as ReturnType<typeof buildPortugalLayer>;
check('committed layer has five regions', L.regions.length, 5);
check('committed layer national new €/m² is numeric', typeof L.national.latest.new, 'number');
check('committed layer price series starts Q4 2019', L.sources.ine_prices.first_period, '2019-Q4');
check('every region has ≥3 priced municipalities', L.regions.every((r) => r.municipalities.filter((x) => x.latest.new != null).length >= 3), true);
check('licensing trend non-empty', L.national.licensing_series.length > 12, true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

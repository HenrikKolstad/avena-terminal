/**
 * scripts/test-cbs-parse.ts
 *
 * Guards the CBS Netherlands adapter, which returned zero rows and NO error
 * for months (O-82) — the purest instance of this project's recurring bug in
 * the ingest layer: a failed thing that is indistinguishable from a dormant
 * one, because both report success with nothing to say.
 *
 * Diagnosed 2026-09-10 against the live endpoint. Four defects, stacked:
 *
 *   1. Table 83913NED is DISCONTINUED (`Frequency: Stopgezet`, ends 2023 Q4).
 *      The code comment named 83906NED, which is also discontinued.
 *   2. `valueField` was `PrijsindexBestaandeKoopwoningen_1`, which does not
 *      exist. The real field is `PrijsindexVerkoopprijzen_1`. Every row hit
 *      `v == null` and was skipped — the silent zero.
 *   3. `$orderby` is SILENTLY IGNORED by this endpoint. `$orderby=Perioden
 *      desc` returns 1995KW01 first, so `$top=80` meant "the oldest 80".
 *   4. The table carries 21 RegioS values and no region was pinned, so
 *      regional indices would have been stamped `country_code: 'NL'`.
 *
 * Defect 3 is why the filter is verified rather than trusted: an endpoint
 * that accepts and ignores query options cannot be taken at its word, so the
 * parser checks the rows it got back rather than the request it sent.
 *
 * WHAT IT CHECKS
 *  A. Every zero-row path THROWS. Returning [] is the bug.
 *  B. The happy path decodes periods and values correctly.
 *  C. The config cannot silently regress to a dead table or the wrong field.
 *  D. The URL never uses the two options that do not work here.
 *
 * (A) IS THE LOAD-BEARING ONE. Fixing the table id and the field name fixes
 * today; refusing to return a silent zero is what makes the NEXT layout
 * change cost one night instead of a quarter.
 */

import {
  parseCbsTypedDataSet,
  cbsUrl,
  CBS_TABLES,
  type CBSTable,
} from '../src/lib/eu-stats-feeds';

let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function throws(label: string, fn: () => unknown, mustMention?: RegExp) {
  try {
    fn();
    ok(label, false, 'returned instead of throwing — a silent zero is the bug');
  } catch (e) {
    const msg = (e as Error).message;
    ok(label, mustMention ? mustMention.test(msg) : true, mustMention ? msg : '');
  }
}

const T: CBSTable = {
  table: '85792NED',
  name: 'Netherlands — Existing dwellings price index (2020=100)',
  unit: 'index_2020=100',
  freq: 'Q',
  valueField: 'PrijsindexVerkoopprijzen_1',
  regionField: 'RegioS',
  regionKey: 'NL01  ',
};
const URL = 'https://opendata.cbs.nl/test';

/** A row shaped exactly like the live 85792NED payload. */
function row(period: string, value: number | null, region = 'NL01  ') {
  return {
    ID: 0,
    RegioS: region,
    Perioden: period,
    PrijsindexVerkoopprijzen_1: value,
    OntwikkelingTOVVoorgaandePeriode_2: null,
    VerkochteWoningen_4: 30734,
    GemiddeldeVerkoopprijs_7: 89792,
  };
}

// ── B. Happy path ───────────────────────────────────────────────────────────
console.log('\nHappy path');

const good = parseCbsTypedDataSet(
  { value: [row('2026KW02', 154.9), row('2026KW01', 152.1), row('2025JJ00', 148.0)] },
  T,
  URL,
);

ok('decodes every usable row', good.length === 3, String(good.length));
ok('quarterly period KW -> -Q', good[0].period === '2026-Q2', good[0].period);
ok('quarterly freq is Q', good[0].period_freq === 'Q', good[0].period_freq);
ok('annual period JJ00 -> year', good[2].period === '2025', good[2].period);
ok('annual freq is A', good[2].period_freq === 'A', good[2].period_freq);
ok('reads the value from the real field', good[0].value === 154.9, String(good[0].value));
ok('stamps country NL', good.every((r) => r.country_code === 'NL'));
ok('stamps source cbs', good.every((r) => r.source === 'cbs'));
ok('unit is the 2020 base the table actually publishes', good[0].unit === 'index_2020=100', good[0].unit);
ok('indicator_code carries table + field', good[0].indicator_code === 'cbs_85792NED_PrijsindexVerkoopprijzen_1', good[0].indicator_code);
ok('carries the source url for provenance', good[0].source_url === URL);

// Monthly form, for the other CBS tables this parser may serve later.
const monthly = parseCbsTypedDataSet({ value: [row('2026MM07', 160.2)] }, T, URL);
ok('monthly period MM -> YYYY-MM', monthly[0].period === '2026-07', monthly[0].period);
ok('monthly freq is M', monthly[0].period_freq === 'M', monthly[0].period_freq);

// ── A. Every zero-row path throws ───────────────────────────────────────────
console.log('\nNo silent zeros');

throws('missing value array throws', () => parseCbsTypedDataSet({}, T, URL), /no 'value' array/);
throws('null body throws', () => parseCbsTypedDataSet(null, T, URL), /no 'value' array/);
throws('value is not an array throws', () => parseCbsTypedDataSet({ value: {} }, T, URL), /no 'value' array/);
throws('empty value array throws', () => parseCbsTypedDataSet({ value: [] }, T, URL), /empty/);

// THE ACTUAL BUG: the configured field is absent from the payload. Before
// this check the function returned [] and the run reported success.
throws(
  'wrong value field throws and names the fields that ARE present',
  () =>
    parseCbsTypedDataSet(
      { value: [{ RegioS: 'NL01  ', Perioden: '2026KW02', SomeOtherField_1: 154.9 }] },
      T,
      URL,
    ),
  /missing field 'PrijsindexVerkoopprijzen_1'.*SomeOtherField_1/,
);

throws(
  'rows present but every period undecodable throws',
  () => parseCbsTypedDataSet({ value: [row('nonsense', 1), row('alsobad', 2)] }, T, URL),
  /none usable/,
);
throws(
  'rows present but every value null throws',
  () => parseCbsTypedDataSet({ value: [row('2026KW02', null), row('2026KW01', null)] }, T, URL),
  /none usable/,
);

// ── A2. The filter is verified, not trusted ─────────────────────────────────
console.log('\nRegion filter is verified against the rows, not assumed');

throws(
  'an ignored filter (mixed regions) throws rather than mislabelling as NL',
  () =>
    parseCbsTypedDataSet(
      { value: [row('2026KW02', 154.9), row('2026KW02', 161.3, 'PV20  ')] },
      T,
      URL,
    ),
  /region filter not applied/,
);
throws(
  'a wholly different region throws',
  () => parseCbsTypedDataSet({ value: [row('2026KW02', 161.3, 'PV20  ')] }, T, URL),
  /region filter not applied/,
);

// ── C. The config cannot regress ────────────────────────────────────────────
console.log('\nConfig cannot silently regress');

const DISCONTINUED = ['83913NED', '83906NED'];
const cbs = CBS_TABLES[0];

ok('exactly one CBS table is configured', CBS_TABLES.length === 1, String(CBS_TABLES.length));
ok(
  'does not point at a table known to be discontinued',
  !DISCONTINUED.includes(cbs.table),
  `${cbs.table} — 83913NED and 83906NED both report Frequency: Stopgezet`,
);
ok('points at the live successor 85792NED', cbs.table === '85792NED', cbs.table);
ok(
  'uses the field name the payload actually carries',
  cbs.valueField === 'PrijsindexVerkoopprijzen_1',
  cbs.valueField,
);
ok('pins the national region', cbs.regionField === 'RegioS' && cbs.regionKey === 'NL01  ', `${cbs.regionField}=${JSON.stringify(cbs.regionKey)}`);
ok(
  'the region key keeps its fixed-width trailing spaces',
  cbs.regionKey.length === 6,
  `length ${cbs.regionKey.length} — CBS keys are six chars and the filter fails without them`,
);
ok(
  'the declared unit matches the base year in the table title (2020=100)',
  cbs.unit === 'index_2020=100',
  cbs.unit,
);

// ── D. The URL avoids the options this endpoint ignores ─────────────────────
console.log('\nURL avoids silently-ignored OData options');

// Assert the URL the adapter actually REQUESTS, not the source text that
// builds it — an earlier version of this test matched the words "$top" and
// "$orderby" inside the comment explaining why they are not used, and failed
// a correct implementation. Test the output, not the prose about the output.
const built = cbsUrl(T);

ok(
  'does not use $orderby — this endpoint ignores it',
  !built.includes('$orderby') && !built.includes('%24orderby'),
  `verified live: $orderby=Perioden desc returns 1995KW01 first — ${built}`,
);
ok(
  'does not use $top — without a working $orderby it means "the oldest N"',
  !built.includes('$top') && !built.includes('%24top'),
  built,
);
ok('requests the configured table', built.includes(`/${T.table}/TypedDataSet`), built);
ok('filters on the region dimension', built.includes('$filter='), built);
ok(
  'the filter is URL-encoded, spaces included',
  built.includes(`$filter=${encodeURIComponent(`RegioS eq 'NL01  '`)}`) && !/ /.test(built),
  built,
);
ok('asks for json', built.includes('$format=json'), built);

// ── Report ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);

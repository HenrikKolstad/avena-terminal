/**
 * Tests for `parseBisSppCsv` — the BIS adapter repair of 2026-09-09.
 *
 * The adapter had TWO defects, and only one of them was visible:
 *
 * 1. The VISIBLE one: `www.bis.org/statistics/pp_selected.csv` has 404'd for
 *    weeks. BIS moved its statistics onto the SDMX portal. That failure was
 *    at least loud — it surfaced as `bis: BIS HTTP 404` every night.
 *
 * 2. The INVISIBLE one, which is the reason this file exists: the old parser
 *    located columns POSITIONALLY and inferred country codes from
 *    `header.length === 2`, over a layout whose own comment conceded BIS
 *    "uses country names or codes". Had the URL kept working while the layout
 *    moved, `countryCols` would have come back empty, `rows` would have been
 *    `[]`, `upsertRows([])` writes nothing, and the adapter would have
 *    reported `rows_upserted: 0` with `errors: []` — a dead source
 *    indistinguishable from a dormant one. That is the `cbs` shape (O-82) and
 *    the shape of every serious failure this project has had.
 *
 * So the tests below assert the happy path AND, more importantly, that every
 * way this parser can stop understanding its input THROWS instead of
 * returning empty.
 *
 *   npx tsx scripts/test-bis-parse.ts
 */

import { parseBisSppCsv } from '../src/lib/eu-stats-feeds';

let pass = 0;
let fail = 0;

function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}\n        got  ${g}\n        want ${w}`);
  }
}

function throws(name: string, fn: () => unknown, mustMention?: string) {
  try {
    fn();
    fail++;
    console.log(`  FAIL  ${name}\n        got  returned normally; wanted a throw`);
  } catch (e) {
    const msg = (e as Error).message;
    if (mustMention && !msg.includes(mustMention)) {
      fail++;
      console.log(`  FAIL  ${name}\n        threw but message lacked ${JSON.stringify(mustMention)}\n        message: ${msg}`);
    } else {
      pass++;
      console.log(`  PASS  ${name}`);
    }
  }
}

const HEADER =
  'FREQ,REF_AREA,VALUE,UNIT_MEASURE,UNIT_MULT,BREAKS,COVERAGE,TITLE_TS,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK';

/** One observation line in BIS's real SDMX CSV shape. */
const row = (
  area: string,
  valueType: string,
  unit: string,
  period: string,
  obs: string,
  freq = 'Q',
) => `${freq},${area},${valueType},${unit},0,,,,${period},${obs},A,F,`;

const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');

// ─── The happy path, on real values ───────────────────────────────────────
// These four numbers are verbatim from the live feed on 2026-09-09 and are
// the cross-validation the adapter comment describes: the index level (628)
// and the year-on-year rate (771) are published as separate series, and
// 144.2233 / 127.8346 - 1 = 12.82%, which reproduces the 771 cell. If a
// future edit picks the wrong UNIT_MEASURE, this pair stops reconciling.
const ES_2025Q1 = 127.8346;
const ES_2026Q1 = 144.2233;

const good = parseBisSppCsv(
  csv(
    row('ES', 'N', '628', '2025-Q1', String(ES_2025Q1)),
    row('ES', 'N', '628', '2026-Q1', String(ES_2026Q1)),
    row('DE', 'N', '628', '2026-Q1', '179.9463'),
  ),
  'https://example.test/bis',
);

check('keeps every nominal index observation', good.rows.length, 3);
check('no undecodable rows in a clean file', good.undecodable, 0);
check('country code is carried through', good.rows[0].country_code, 'ES');
check('period is carried through verbatim', good.rows[1].period, '2026-Q1');
check('value is parsed as a number', good.rows[1].value, ES_2026Q1);
check('period_freq is quarterly', good.rows[0].period_freq, 'Q');
check('unit is the index level', good.rows[0].unit, 'index');
check('source is bis', good.rows[0].source, 'bis');
check('indicator_code names the series', good.rows[0].indicator_code, 'bis_rppi_nominal');
check('source_url is the URL we actually fetched', good.rows[0].source_url, 'https://example.test/bis');
check(
  'the 628 slice reconciles with BIS\'s own YoY series (12.82%)',
  Math.round((ES_2026Q1 / ES_2025Q1 - 1) * 10000) / 100,
  12.82,
);

// ─── The slice: everything we deliberately do NOT store ───────────────────

const sliced = parseBisSppCsv(
  csv(
    row('ES', 'N', '628', '2026-Q1', '144.2233'),  // keep
    row('ES', 'R', '628', '2026-Q1', '111.1'),     // real, not nominal
    row('ES', 'N', '771', '2026-Q1', '12.8202'),   // YoY %, not the index
    row('ES', 'N', '628', '2026', '140.0', 'A'),   // annual frequency
  ),
);
check('drops the real (CPI-deflated) series', sliced.rows.length, 1);
check('the survivor is the nominal index', sliced.rows[0].value, 144.2233);

// A YoY row alone must NOT be silently kept as if it were an index — if the
// dimension mapping is ever inverted, this is the test that catches it.
throws(
  'a file of ONLY YoY rows throws rather than storing percentages as an index',
  () => parseBisSppCsv(csv(
    row('ES', 'N', '771', '2026-Q1', '12.8202'),
    row('DE', 'N', '771', '2026-Q1', '3.1'),
    row('FR', 'N', '771', '2026-Q1', '1.4'),
  )),
  'parsed 0 usable rows',
);

// ─── Aggregates are not countries ─────────────────────────────────────────
// `country_code` feeds a published DISTINCT-COUNTRY count. Storing the euro
// area or the world under it would inflate that count with things that are
// not countries — a false claim by construction, not a rounding error.

const agg = parseBisSppCsv(
  csv(
    row('ES', 'N', '628', '2026-Q1', '144.2'),
    row('XM', 'N', '628', '2026-Q1', '130.0'),   // euro area
    row('XW', 'N', '628', '2026-Q1', '125.0'),   // world
    row('4T', 'N', '628', '2026-Q1', '120.0'),   // BIS aggregate
    row('5R', 'N', '628', '2026-Q1', '118.0'),   // BIS aggregate
  ),
);
check('excludes every non-country reference area', agg.rows.length, 1);
check('and keeps the real country', agg.rows[0].country_code, 'ES');
check(
  'no aggregate code survives into country_code',
  agg.rows.some((r) => ['XM', 'XW', '4T', '5R'].includes(r.country_code)),
  false,
);

// ─── THE POINT OF THIS FILE: no silent zeros ──────────────────────────────

throws(
  'a renamed column throws and NAMES the column',
  () => parseBisSppCsv(csv(row('ES', 'N', '628', '2026-Q1', '144.2')).replace('REF_AREA', 'REFERENCE_AREA')),
  "missing column 'REF_AREA'",
);

throws(
  'a renamed OBS_VALUE throws rather than reading a neighbouring column',
  () => parseBisSppCsv(csv(row('ES', 'N', '628', '2026-Q1', '144.2')).replace('OBS_VALUE', 'VALUE_OBS')),
  "missing column 'OBS_VALUE'",
);

throws(
  'a wholly unrecognised layout throws instead of returning zero rows',
  () => parseBisSppCsv('a,b,c\n1,2,3\n4,5,6\n7,8,9'),
  'missing column',
);

throws(
  'an empty body throws',
  () => parseBisSppCsv(''),
  'too short',
);

throws(
  'a header with no rows at all throws',
  () => parseBisSppCsv(HEADER),
  'too short',
);

// The old parser required 4 lines because it skipped ~3 preamble rows. The
// SDMX CSV has exactly one header row, so carrying that constant forward
// would have rejected a short-but-valid response as malformed.
check(
  'a header plus ONE observation is valid, not "too short"',
  parseBisSppCsv(csv(row('ES', 'N', '628', '2026-Q1', '144.2'))).rows.length,
  1,
);

throws(
  'a header with no observations throws — an empty source is a broken one',
  () => parseBisSppCsv([HEADER, HEADER, HEADER, HEADER].join('\n')),
  'parsed 0 usable rows',
);

throws(
  'a well-formed file whose slice has moved throws, and says so',
  () => parseBisSppCsv(csv(
    row('ES', 'N', '999', '2026-Q1', '144.2'),
    row('DE', 'N', '999', '2026-Q1', '179.9'),
    row('FR', 'N', '999', '2026-Q1', '128.4'),
  )),
  'Q/N/628 slice has moved',
);

check(
  'the zero-row error carries the data-line count, so a partial move is diagnosable',
  (() => {
    try {
      parseBisSppCsv(csv(
        row('ES', 'N', '999', '2026-Q1', '144.2'),
        row('DE', 'N', '999', '2026-Q1', '179.9'),
        row('FR', 'N', '999', '2026-Q1', '128.4'),
      ));
      return 'did not throw';
    } catch (e) {
      return (e as Error).message.includes('from 3 data lines');
    }
  })(),
  true,
);

// ─── Undecodable rows are counted, never guessed at ───────────────────────

const messy = parseBisSppCsv(
  csv(
    row('ES', 'N', '628', '2026-Q1', '144.2'),
    row('DE', 'N', '628', 'not-a-period', '179.9'),
    row('FR', 'N', '628', '2026-Q1', 'not-a-number'),
    'Q,IT,N,628',                                      // truncated line
    row('PT', 'N', '628', '2026-Q1', '..'),            // BIS's own missing marker
  ),
);
check('keeps only the decodable observation', messy.rows.length, 1);
check(
  'counts the three that could not be decoded rather than dropping them silently',
  messy.undecodable,
  3,
);
check(
  'BIS\'s own ".." missing marker is a skip, not an undecodable',
  messy.rows.some((r) => r.country_code === 'PT'),
  false,
);

// ─── Shape invariants ─────────────────────────────────────────────────────

check(
  'every returned row is fully populated (no undefined reaching the upsert key)',
  good.rows.every(
    (r) =>
      !!r.source && !!r.indicator_code && !!r.indicator_name &&
      !!r.country_code && !!r.period && !!r.period_freq &&
      Number.isFinite(r.value) && !!r.unit && !!r.source_url,
  ),
  true,
);

check(
  'no two rows share the upsert key (source, indicator_code, country_code, period)',
  (() => {
    const seen = new Set(
      good.rows.map((r) => `${r.source}|${r.indicator_code}|${r.country_code}|${r.period}`),
    );
    return seen.size === good.rows.length;
  })(),
  true,
);

check(
  'values are plausible index levels, not percentages',
  good.rows.every((r) => r.value > 20 && r.value < 1000),
  true,
);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

/**
 * scripts/test-crawler-shape.ts
 *
 * Pins the burst/steady judgement against the REAL series that fooled me.
 *
 * Both of my wrong meta-externalagent claims came from the same query shape —
 * a window total read as a rate. The fixtures below are the actual measured
 * daily series from crawler_hits on 2026-10-09, so this test fails if the
 * judgement ever again calls that burst a rate, or calls a genuinely steady
 * crawler a burst (the mistake in the opposite direction, which is how the
 * capture-integrity tool had to be fixed twice).
 */

import {
  burstThreshold, classifyCrawler, describeShape, sustainedRanking,
  type DailyHits,
} from '../src/lib/crawler-shape';

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

// ── Real series, measured 2026-10-09 over 14 days ──────────────────────────

// ONE burst: 2026-10-02 22:39 -> 2026-10-03 18:49. This is the series behind
// both "largest consumer of the origin by 4x" and "has STOPPED".
const META: DailyHits[] = [
  { day: '2026-10-09', hits: 1 },
  { day: '2026-10-03', hits: 108449 },
  { day: '2026-10-02', hits: 8260 },
  { day: '2026-09-29', hits: 3 },
  { day: '2026-09-28', hits: 1 },
];

// Genuinely steady and genuinely large — 1,923..6,817/day, every day.
const AWARIO: DailyHits[] = [
  { day: '2026-10-08', hits: 2300 }, { day: '2026-10-07', hits: 6152 },
  { day: '2026-10-06', hits: 3185 }, { day: '2026-10-05', hits: 4854 },
  { day: '2026-10-04', hits: 5220 }, { day: '2026-10-03', hits: 4600 },
  { day: '2026-10-02', hits: 2300 }, { day: '2026-10-01', hits: 4320 },
  { day: '2026-09-30', hits: 6817 }, { day: '2026-09-29', hits: 1923 },
  { day: '2026-09-28', hits: 4336 }, { day: '2026-09-26', hits: 2300 },
  { day: '2026-09-25', hits: 2300 },
];

const GOOGLEBOT: DailyHits[] = [
  { day: '2026-10-09', hits: 129 }, { day: '2026-10-08', hits: 849 },
  { day: '2026-10-07', hits: 1369 }, { day: '2026-10-06', hits: 1601 },
  { day: '2026-10-05', hits: 965 }, { day: '2026-10-04', hits: 1062 },
  { day: '2026-10-03', hits: 1200 }, { day: '2026-10-02', hits: 1525 },
  { day: '2026-10-01', hits: 785 }, { day: '2026-09-30', hits: 689 },
  { day: '2026-09-29', hits: 708 }, { day: '2026-09-28', hits: 1997 },
  { day: '2026-09-27', hits: 821 }, { day: '2026-09-26', hits: 792 },
  { day: '2026-09-25', hits: 316 },
];

// A spike riding on top of a real baseline: ~70-330/day, then 2,410 today.
// This must read as a burst for REPORTING purposes even though the crawler is
// also steadily present — because its TOTAL is not its rate.
const CLAUDEBOT: DailyHits[] = [
  { day: '2026-10-09', hits: 2410 }, { day: '2026-10-08', hits: 108 },
  { day: '2026-10-07', hits: 134 }, { day: '2026-10-06', hits: 326 },
  { day: '2026-10-05', hits: 79 }, { day: '2026-10-04', hits: 114 },
  { day: '2026-10-03', hits: 70 }, { day: '2026-10-02', hits: 84 },
  { day: '2026-10-01', hits: 71 }, { day: '2026-09-30', hits: 98 },
  { day: '2026-09-29', hits: 68 }, { day: '2026-09-28', hits: 93 },
  { day: '2026-09-27', hits: 69 }, { day: '2026-09-26', hits: 123 },
  { day: '2026-09-25', hits: 74 },
];

console.log('\nCrawler shape — a window total is not a rate\n');

const meta = classifyCrawler('meta-externalagent', META, 14);
ok('meta-externalagent is a BURST, not a rate', meta.shape === 'burst', `got ${meta.shape}`);
ok('its top day holds 92.9% of the window', meta.top_day_share === 0.929, `got ${meta.top_day_share}`);
ok('the burst day is identified as 2026-10-03', meta.max_day_date === '2026-10-03');
ok('a burst is given NO per-day rate', meta.per_day_rate === null, `got ${meta.per_day_rate}`);
ok(
  'its description refuses to state a crawl rate',
  !/\/day/.test(describeShape(meta)) && /burst/i.test(describeShape(meta)),
  describeShape(meta),
);
ok(
  'and it is NOT called stopped — a burst ending is not a stop',
  !/stop/i.test(describeShape(meta)),
);

const awario = classifyCrawler('AwarioBot', AWARIO, 14);
ok('AwarioBot is STEADY — the opposite error must not happen either', awario.shape === 'steady', `got ${awario.shape}`);
ok('AwarioBot gets a per-day rate', awario.per_day_rate === 3893, `got ${awario.per_day_rate}`);

const google = classifyCrawler('Googlebot', GOOGLEBOT, 14);
ok('Googlebot is STEADY', google.shape === 'steady');
ok('Googlebot rate is ~987/day', google.per_day_rate === 987, `got ${google.per_day_rate}`);

const claude = classifyCrawler('ClaudeBot', CLAUDEBOT, 14);
ok('a spike on a live baseline still reads as a burst for reporting', claude.shape === 'burst', `got ${claude.shape}`);

// ── the ranking a reader can act on ────────────────────────────────────────

const ranking = sustainedRanking([meta, awario, google, claude]);
ok('bursts are excluded from the sustained ranking', !ranking.some((r) => r.shape === 'burst'));
ok(
  'AwarioBot, not meta-externalagent, is the largest sustained consumer',
  ranking[0]?.crawler === 'AwarioBot',
  `got ${ranking[0]?.crawler}`,
);
ok('Googlebot is second', ranking[1]?.crawler === 'Googlebot');

// ── guards ─────────────────────────────────────────────────────────────────

ok(
  'at 14 days the threshold is the 0.35 floor, not 4/14 = 0.286',
  burstThreshold(14) === 0.35,
  `got ${burstThreshold(14)}`,
);
ok(
  'a LONG window is floored, so ordinary variation is not branded a burst',
  burstThreshold(40) === 0.35,
  `got ${burstThreshold(40)} — 4/40 = 0.10 would call almost every crawler bursty`,
);
ok(
  'a SHORT window is capped, so a burst is still detectable there',
  burstThreshold(2) === 0.9,
  `got ${burstThreshold(2)} — the first version returned 2.0, making a burst impossible`,
);
ok(
  'at a 2-day window a genuine 95% burst is still caught',
  classifyCrawler('x', [{ day: '2026-10-03', hits: 9500 }, { day: '2026-10-02', hits: 500 }], 2).shape === 'burst',
);
let threw = false;
try { burstThreshold(0); } catch { threw = true; }
ok('a zero-length window throws rather than silently dividing', threw);
threw = false;
try { classifyCrawler('nobody', [{ day: '2026-10-09', hits: 0 }], 14); } catch { threw = true; }
ok('an absence throws rather than being reported as a shape', threw);

console.log('');
if (failures.length) {
  console.log(`FAILED — ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — ${passed} passed, 0 failed`);

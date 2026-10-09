/**
 * scripts/crawler-reality.ts
 *
 * What the bots ACTUALLY fetch, and what they actually get back.
 *
 * WHY THIS EXISTS — I got this wrong twice in two days, from the same
 * mistake, and the mistake is in the shape of the query rather than in the
 * data.
 *
 * I had been reporting crawler activity as a 7-DAY WINDOW TOTAL. On 2026-10-07
 * that produced "meta-externalagent is the largest consumer of the origin by
 * 4x — 116,777 hits across 6,683 paths". On 2026-10-08 the same query produced
 * "meta-externalagent has STOPPED — five days of total silence". Both claims
 * were artifacts of the window, and both were wrong:
 *
 *   2026-09-28   1 hit
 *   2026-09-29   3
 *   2026-10-02   8,260     (22:39 -> 23:59)
 *   2026-10-03   108,449   (00:00 -> 18:49)
 *   2026-10-09   1
 *
 * It was ONE ~20-hour burst. 92.9% of its 14-day traffic landed in a single
 * day. It never had a rate, so it was never "the largest consumer" in the
 * sense a reader takes that phrase, and a burst ending is not a stop. Had I
 * run the window query again tomorrow I would have reported a "collapse" that
 * is purely the burst rolling out of the window — a third wrong claim from the
 * same source.
 *
 * So this script never reports a total without the daily series behind it, and
 * labels any crawler whose top day holds a disproportionate share of the
 * window as a BURST, whose total must not be read as a rate.
 *
 * THE SECOND HALF answers the question O-106 says is uninstrumented: whether a
 * bot is being served an error or a redirect chain. `crawler_hits` has no
 * status column and cannot have one — the middleware that writes it runs
 * BEFORE the response exists, so the status a crawler received is not
 * available at that layer at all (it lives in Vercel's logs, which needs
 * access we do not have). But the ledger records the exact URL set the bots
 * fetched, so we can simply fetch those URLs ourselves and see what they
 * return. That is the honest, obtainable version of the question.
 *
 * Refuses to emit zeros: no credentials, or an empty ledger, exits non-zero.
 * An empty number here reads as "no bots crawl us", which would be false.
 *
 * NEEDS SUPABASE_SERVICE_ROLE_KEY. The anon key returns ZERO rows from
 * crawler_hits (RLS — the middleware writes with the service key), and zero
 * rows is exactly the shape this project keeps being bitten by, so the script
 * exits non-zero rather than reporting an empty ledger as a quiet crawl. The
 * key is already a GitHub Actions secret for the capture workflows.
 *
 * WHAT THIS ALREADY CAUGHT, on the day it was written: /login is the single
 * most-crawled path on the site, 7,307 hits over 14 days. Read as a total that
 * is a crawl-budget leak on a login page and an obvious robots.txt Disallow.
 * Split by crawler it is 7,201 hits from meta-externalagent — the burst — and
 * 81 from OAI-SearchBot. Googlebot does not crawl /login at all. There is no
 * Googlebot budget leak, and the robots.txt change the total argued for would
 * have been a change made for no reason.
 *
 * Run: npx tsx scripts/crawler-reality.ts [--days 14] [--probe 40]
 * Out: data/crawler-reality.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  burstThreshold, classifyCrawler, describeShape, sustainedRanking,
  type CrawlerShape,
} from '../src/lib/crawler-shape';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Supabase credentials missing. Refusing to emit a crawler report with zero hits —');
  console.error('an empty number here reads as "no bots crawl us" and would be false.');
  process.exit(1);
}
const db = createClient(url, key);

const argv = process.argv.slice(2);
function flag(name: string, dflt: number): number {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const n = Number(argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}
const DAYS = flag('days', 14);
const PROBE = flag('probe', 40);
const ORIGIN = process.env.AVENA_ORIGIN ?? 'https://avenaterminal.com';

// The burst/steady judgement lives in src/lib/crawler-shape.ts, pure and
// pinned by scripts/test-crawler-shape.ts against the real series that fooled
// me. The script does plumbing; the judgement that produces the published
// claim is tested.
const THRESHOLD = burstThreshold(DAYS);

interface Hit { crawler: string; path: string; at: string }

async function loadHits(): Promise<Hit[]> {
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const rows: Hit[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('crawler_hits')
      .select('crawler,path,at')
      .gte('at', since)
      .order('at', { ascending: true })
      .range(from, from + PAGE - 1);
    // A failed read must NOT look like an exhausted page. This is the
    // recurring bug in its read-path form: `if (!error)` then stop, and a
    // broken query is indistinguishable from the end of the data.
    if (error) {
      console.error(`crawler_hits read failed at offset ${from}: ${error.message}`);
      console.error('Refusing to report on a partial ledger.');
      process.exit(1);
    }
    if (!data?.length) break;
    rows.push(...(data as Hit[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

type Row = CrawlerShape & { distinct_paths: number; daily: Array<{ day: string; hits: number }> };

async function main() {
  const hits = await loadHits();
  if (!hits.length) {
    console.error(`crawler_hits returned 0 rows over ${DAYS} days. That is either a dead ledger or a`);
    console.error('broken middleware write — either way it is a finding, not a report. Exiting non-zero.');
    process.exit(1);
  }

  const byCrawler = new Map<string, { days: Map<string, number>; paths: Set<string>; total: number }>();
  for (const h of hits) {
    const day = String(h.at).slice(0, 10);
    let e = byCrawler.get(h.crawler);
    if (!e) { e = { days: new Map(), paths: new Set(), total: 0 }; byCrawler.set(h.crawler, e); }
    e.days.set(day, (e.days.get(day) ?? 0) + 1);
    e.paths.add(h.path);
    e.total++;
  }

  const rows: Row[] = [...byCrawler.entries()].map(([crawler, e]) => {
    const daily = [...e.days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, h]) => ({ day, hits: h }));
    return { ...classifyCrawler(crawler, daily, DAYS), distinct_paths: e.paths.size, daily };
  }).sort((a, b) => b.total - a.total);

  console.log(`\nCRAWLER REALITY — ${DAYS} days to ${new Date().toISOString().slice(0, 10)}`);
  console.log(`burst threshold: top day >= ${(THRESHOLD * 100).toFixed(1)}% of the window\n`);
  console.log('  crawler                  total  paths  days  top-day  share  shape');
  for (const r of rows.slice(0, 20)) {
    console.log(
      `  ${r.crawler.padEnd(22)} ${String(r.total).padStart(7)} ${String(r.distinct_paths).padStart(6)} ` +
      `${String(r.active_days).padStart(5)} ${String(r.max_day).padStart(8)} ${(r.top_day_share * 100).toFixed(1).padStart(6)}% ` +
      `${r.shape === 'burst' ? 'BURST — total is NOT a rate' : `steady ~${r.per_day_rate}/day`}`,
    );
  }

  const bursts = rows.filter((r) => r.shape === 'burst' && r.total > 500);
  if (bursts.length) {
    console.log('\n  Do not quote these totals as crawl rates:');
    for (const b of bursts) console.log(`    ${describeShape(b)}`);
  }

  // Steady crawlers only — the ranking a reader can actually use.
  console.log('\n  Largest SUSTAINED consumers (bursts excluded):');
  for (const r of sustainedRanking(rows).slice(0, 6)) console.log(`    ${describeShape(r)}`);

  // ── what the bots are actually served ───────────────────────────────────
  // Most-fetched paths first: a non-200 on a heavily crawled URL costs more
  // than one on a URL nothing fetches.
  const pathHits = new Map<string, number>();
  for (const h of hits) pathHits.set(h.path, (pathHits.get(h.path) ?? 0) + 1);
  const top = [...pathHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, PROBE);

  console.log(`\n  Probing the ${top.length} most-crawled paths for what they actually return`);
  console.log('  (crawler_hits cannot hold this: middleware runs before the response exists)\n');

  const probed: Array<{ path: string; hits: number; status: number | null; redirect_to?: string; error?: string }> = [];
  for (const [p, n] of top) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20_000);
    try {
      const r = await fetch(`${ORIGIN}${p}`, { redirect: 'manual', signal: ctl.signal });
      const loc = r.headers.get('location');
      probed.push({ path: p, hits: n, status: r.status, ...(loc ? { redirect_to: loc } : {}) });
    } catch (e) {
      // Null, never 200. A probe that failed is not a page that worked.
      probed.push({ path: p, hits: n, status: null, error: e instanceof Error ? e.message : String(e) });
    } finally {
      clearTimeout(timer);
    }
  }

  const bad = probed.filter((p) => p.status === null || p.status >= 300);
  if (bad.length) {
    console.log('  NOT 200 — every one of these is crawl budget spent on nothing:');
    for (const b of bad) {
      console.log(`    ${String(b.status ?? 'ERR').padStart(3)}  ${String(b.hits).padStart(6)} hits  ${b.path}` +
        (b.redirect_to ? ` -> ${b.redirect_to}` : '') + (b.error ? `  (${b.error})` : ''));
    }
  } else {
    console.log(`  All ${probed.length} most-crawled paths return 200.`);
  }

  const out = {
    generated_at: new Date().toISOString(),
    window_days: DAYS,
    burst_threshold: Number(THRESHOLD.toFixed(3)),
    ledger_rows: hits.length,
    crawlers: rows,
    probed_paths: probed,
    probe_summary: {
      probed: probed.length,
      ok: probed.filter((p) => p.status === 200).length,
      redirects: probed.filter((p) => p.status != null && p.status >= 300 && p.status < 400).length,
      errors: probed.filter((p) => p.status == null || p.status >= 400).length,
    },
    note:
      'A crawler marked `burst` must never have its total quoted as a crawl rate. ' +
      'Status comes from probing the crawled URLs ourselves, not from the ledger: ' +
      'the middleware that writes crawler_hits runs before the response exists.',
  };
  const dir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'crawler-reality.json'), JSON.stringify(out, null, 2));
  console.log(`\n  wrote data/crawler-reality.json (${hits.length} ledger rows, ${rows.length} crawlers)\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });

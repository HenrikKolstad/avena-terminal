/**
 * Guard: the upstream listing vendor is never named in anything a customer
 * or the public can see. Avena's product is described as Avena's own daily
 * capture of agency-marketed new-build listings.
 *
 * Scope: every file served from public/, all code under src/app,
 * src/components and src/lib (code only — comments are stripped), the
 * sell-through methodology and the rendered lender report. Server-only internals (cron jobs, feed
 * plumbing) are out of scope.
 *
 * Run: npx tsx scripts/test-neutral-source.ts
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { METHODOLOGY } from '../src/lib/sellthrough';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) { pass++; console.log(`  ok  ${label}`); } else { fail++; console.error(`  FAIL ${label}`); }
};

const VENDOR = /\bred\s?sp\b/i;
const TEXT = /\.(md|txt|json|jsonl|xml|html|csv|ts|tsx|js|mjs|yml|yaml)$/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (TEXT.test(name)) out.push(p);
  }
  return out;
}

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// Server-only cron that tags its own DB rows; never returned by any API.
const SERVER_ONLY = new Set([path.join('src', 'app', 'api', 'cron', 'pricing-history', 'route.ts')]);

const publicHits = walk('public').filter((f) => VENDOR.test(readFileSync(f, 'utf8')));
ok(publicHits.length === 0, `no public/ file names the vendor${publicHits.length ? ` (${publicHits.join(', ')})` : ''}`);

const appHits = ['app', 'components', 'lib'].flatMap((d) => walk(path.join('src', d)))
  .filter((f) => !SERVER_ONLY.has(f))
  .filter((f) => VENDOR.test(stripComments(readFileSync(f, 'utf8'))));
ok(appHits.length === 0, `no page, component, lib or API code under src names the vendor${appHits.length ? ` (${appHits.join(', ')})` : ''}`);

ok(!METHODOLOGY.some((l) => VENDOR.test(l)), 'sell-through methodology does not name the vendor');
ok(METHODOLOGY[0].includes("Avena's daily capture of agency-marketed new-build listings"), 'methodology names Avena as the source');

const reportSrc = stripComments(readFileSync(path.join('src', 'lib', 'sellthrough-report.ts'), 'utf8'));
ok(!VENDOR.test(reportSrc), 'lender report template does not name the vendor');

const meta = JSON.parse(readFileSync(path.join('public', 'feed-meta.json'), 'utf8'));
ok(!VENDOR.test(String(meta.source)), 'feed-meta.json source field is neutral');
const parser = readFileSync('parse-feed.js', 'utf8');
ok(/source: 'avena-capture'/.test(parser), 'parse-feed.js stamps the neutral source');

console.log(fail ? `\n${fail} FAILED, ${pass} passed` : `\nALL PASS — ${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);

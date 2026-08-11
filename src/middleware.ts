import { NextRequest, NextResponse } from 'next/server';

/**
 * Crawler ledger (O-18) — observation only, nothing more.
 *
 * Vercel keeps runtime logs for roughly a day, so every question about
 * crawler behaviour ("did GPTBot come back?", "did the robots change move the
 * budget?") has depended on someone hand-exporting a CSV inside that window.
 * This middleware writes one row per KNOWN-CRAWLER request to
 * `crawler_hits`, making the question answerable on any day, retroactively.
 * It is also the memory that the per-crawler differential sitemap will read.
 *
 * Design constraints, in order of importance:
 *
 *  1. NEVER in the way. The write is awaited with a hard 1.5s abort — see
 *     the note at the call site for why fire-and-forget was abandoned. Every
 *     path is wrapped so a Supabase outage, a bad env, or a bug here degrades
 *     to "no row written", never to a failed page — and a slow Supabase costs
 *     a bot at most 1.5s, never a hang. The crawlers finally arriving is the
 *     one thing this project must not jeopardise.
 *  2. Humans are not logged. The UA regex gate is the first statement; a
 *     normal visitor costs one failed regex test and nothing else. No
 *     cookies, no fingerprinting, no personal data — bots only.
 *  3. Kill switch: set CRAWLER_LEDGER_DISABLED=1 in Vercel and this becomes
 *     a pure pass-through without a redeploy of anything else.
 */

// Known crawlers, longest-match-first at test time. Mirrors the taxonomy in
// scripts/crawler-log-report.py — MODEL names before generic ones so
// 'ChatGPT-User' never records as 'GPTBot'.
const CRAWLERS: Array<[string, RegExp]> = [
  ['ChatGPT-User', /ChatGPT-User/i],
  ['OAI-SearchBot', /OAI-SearchBot/i],
  ['GPTBot', /GPTBot/i],
  ['ClaudeBot', /ClaudeBot/i],
  ['Claude-Web', /Claude-Web/i],
  ['anthropic-ai', /anthropic-ai/i],
  ['PerplexityBot', /PerplexityBot/i],
  ['Perplexity-User', /Perplexity-User/i],
  ['CCBot', /CCBot/i],
  ['Bytespider', /Bytespider/i],
  ['TikTokSpider', /TikTokSpider/i],
  ['Amazonbot', /Amazonbot/i],
  ['meta-externalagent', /meta-externalagent|Meta-ExternalAgent/i],
  ['FacebookBot', /FacebookBot/i],
  ['Google-Extended', /Google-Extended/i],
  ['GoogleOther', /GoogleOther/i],
  ['Googlebot', /Googlebot/i],
  ['bingbot', /bingbot/i],
  ['Applebot-Extended', /Applebot-Extended/i],
  ['Applebot', /Applebot/i],
  ['DuckDuckBot', /DuckDuckBot/i],
  ['YandexBot', /YandexBot/i],
  ['PetalBot', /PetalBot/i],
  ['xAI-Grok', /xAI|Grok/i],
  ['cohere-ai', /cohere-ai/i],
  ['Diffbot', /Diffbot/i],
  ['AhrefsBot', /AhrefsBot/i],
  ['SemrushBot', /SemrushBot/i],
  ['MJ12bot', /MJ12bot/i],
  ['DotBot', /DotBot/i],
  ['SERanking', /SERanking/i],
  ['AwarioBot', /AwarioBot/i],
  ['Lightpanda', /Lightpanda/i],
];

// One cheap pre-filter so 99% of human requests exit on a single test.
const ANY_BOT = /bot|crawler|spider|ChatGPT|Perplexity|Claude|Lightpanda|GPT/i;

function classify(ua: string): string | null {
  if (!ANY_BOT.test(ua)) return null;
  for (const [name, re] of CRAWLERS) {
    if (re.test(ua)) return name;
  }
  return null; // unnamed bots are not ledger-worthy; the log export covers them
}

// Asset requests carry no crawl-behaviour signal we act on — except
// /_next/image, which IS the budget-waste metric, and is not caught here
// because its path has no file extension.
const ASSET = /\.(?:png|jpe?g|webp|avif|ico|css|js|map|woff2?|ttf|svg|txt)$/i;

export function middleware(req: NextRequest) {
  try {
    if (process.env.CRAWLER_LEDGER_DISABLED === '1') return NextResponse.next();

    const path = req.nextUrl.pathname;
    if (ASSET.test(path)) return NextResponse.next();

    const ua = req.headers.get('user-agent') ?? '';
    const crawler = classify(ua);
    if (!crawler) return NextResponse.next();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.next();

    // Awaited, not fire-and-forget — a deliberate reversal. The first
    // version used event.waitUntil and the promise was silently dropped
    // under the deprecated middleware convention: header set, no row ever
    // written, nothing failed loudly. This path only runs for BOTS, so the
    // ~50-150ms is added to crawler requests exclusively; humans exited at
    // the classify() gate above. The 1,500ms AbortController is rule 1 in
    // mechanism form: a slow Supabase costs a bot at most 1.5s, never hangs
    // a crawl. Failures are still not retried.
    return fetchAndTrace(url, key, crawler, path, ua);
  } catch {
    /* rule 1: never in the way */
  }
  return NextResponse.next();
}

async function fetchAndTrace(url: string, key: string, crawler: string, path: string, ua: string) {
  let status = 'err';
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch(`${url}/rest/v1/crawler_hits`, {
      method: 'POST',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ crawler, path: path.slice(0, 500), ua: ua.slice(0, 300) }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    status = String(r.status);
  } catch {
    /* rule 1 */
  }
  // Trace header on BOT responses only, now carrying the REST status so a
  // silent write failure is observable from a single curl.
  const res = NextResponse.next();
  res.headers.set('x-crawler-ledger', `${crawler};${status}`);
  return res;
}

export const config = {
  // Deliberately simple: the first version used an extension-filtering regex
  // (`.*\.(?:png|...)$` inside the lookahead) that Next's path-to-regexp
  // matcher compiled without error and then matched NOTHING — the middleware
  // never ran and the failure was silent. Asset filtering lives in code now,
  // where it is plain RegExp. /_next/image stays included — it is the
  // budget-waste signal the robots change of 2026-08-11 is measured by.
  matcher: ['/((?!_next/static|favicon.ico).*)'],
};

import { NextRequest, NextResponse, NextFetchEvent } from 'next/server';

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
 *  1. NEVER in the way. The write is fire-and-forget via `event.waitUntil`;
 *     the response does not wait for it. Every path is wrapped so a Supabase
 *     outage, a bad env, or a bug here degrades to "no row written", never to
 *     a slow or failed page. The crawlers finally arriving is the one thing
 *     this project must not jeopardise.
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

export function middleware(req: NextRequest, event: NextFetchEvent) {
  try {
    if (process.env.CRAWLER_LEDGER_DISABLED === '1') return NextResponse.next();

    const ua = req.headers.get('user-agent') ?? '';
    const crawler = classify(ua);
    if (!crawler) return NextResponse.next();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.next();

    // Fire-and-forget: the page never waits for the ledger. A failed insert
    // is a missing row, not a failed request — and deliberately NOT retried,
    // because a retry storm during a Supabase incident would be this file
    // violating its own first rule.
    event.waitUntil(
      fetch(`${url}/rest/v1/crawler_hits`, {
        method: 'POST',
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          'content-type': 'application/json',
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          crawler,
          path: req.nextUrl.pathname.slice(0, 500),
          ua: ua.slice(0, 300),
        }),
      }).catch(() => { /* rule 1: never in the way */ }),
    );
  } catch {
    /* rule 1: never in the way */
  }
  return NextResponse.next();
}

export const config = {
  // Static assets excluded: hits there are CDN-served and tell us nothing
  // about crawl behaviour we act on. /_next/image IS included — it is the
  // budget-waste signal the robots change of 2026-08-11 is measured by.
  matcher: ['/((?!_next/static|favicon\\.ico|.*\\.(?:png|jpg|jpeg|webp|avif|ico|css|js|woff2?)$).*)'],
};

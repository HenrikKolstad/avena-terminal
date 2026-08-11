import { NextRequest, NextResponse } from 'next/server';
import { crawlerName } from '@/lib/crawlers';
import { getChangedRefs } from '@/lib/observations';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * The per-crawler differential sitemap — a crawl frontier that knows who is
 * asking.
 *
 * PURE ADDITION (2026-08-11, per Henrik's standing rule: nothing that already
 * works toward crawlers is ever modified — new capability arrives as new
 * files). sitemap-ai.xml, robots.ts and the middleware ledger are untouched.
 *
 * What it does: every sitemap on the internet is stateless — Googlebot and
 * GPTBot receive identical lists and re-spend their finite crawl budget
 * re-reading pages they already hold. This one reads the requesting
 * user-agent, consults our own crawler ledger (crawler_hits, written by the
 * middleware since 2026-08-11), and serves each known crawler ONLY the
 * property pages whose price changed since THAT crawler's last fetch of that
 * page — true change dates as lastmod. A crawl of this file is 100% new
 * information by construction.
 *
 * Fail-open at every step: unknown UA, ledger outage, RPC failure — all
 * degrade to the full 30-day changed list, which is exactly what
 * sitemap-ai.xml already serves. Nobody can get LESS than the status quo.
 *
 * Caching: force-dynamic + no-store. A CDN cache keyed loosely would hand
 * GPTBot the frontier computed for Meta; correctness beats cache here, and
 * sitemap fetches are rare enough that rendering per-request costs nothing.
 */

export const dynamic = 'force-dynamic';

const SITE = 'https://avenaterminal.com';

function url(loc: string, lastmod: string): string {
  return `  <url>
    <loc>${SITE}${loc}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
}

/** The crawler's last fetch per property path, from our own ledger. */
async function lastFetches(crawler: string): Promise<Map<string, number> | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.rpc('crawler_last_paths', { p_crawler: crawler });
    if (error || !data) return null;
    const map = new Map<string, number>();
    for (const row of data as Array<{ path: string; last_at: string }>) {
      map.set(row.path, Date.parse(row.last_at));
    }
    return map;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  const crawler = crawlerName(ua);

  // The 30-day observed-change list — same source of truth the AI sitemap
  // uses, fail-open to [] on ledger trouble.
  const changed = await getChangedRefs(30);

  let entries = changed;
  let personalised = false;
  let alreadySeen = 0;

  if (crawler) {
    const seen = await lastFetches(crawler);
    if (seen) {
      personalised = true;
      entries = changed.filter((c) => {
        const fetchedAt = seen.get(`/property/${c.ref}`) ?? seen.get(`/property/${encodeURIComponent(c.ref)}`);
        if (fetchedAt === undefined) return true; // never fetched → frontier
        // The nightly capture that records a change lands by ~04:00 UTC on
        // the change date; a fetch after 06:00 UTC that day has seen the new
        // price. Before that, the change is still news to this crawler.
        const seenCutoff = Date.parse(`${c.date}T06:00:00Z`);
        const isNew = fetchedAt < seenCutoff;
        if (!isNew) alreadySeen += 1;
        return isNew;
      });
    }
  }

  const body = entries.map((c) => url(`/property/${encodeURIComponent(c.ref)}`, c.date)).join('\n');

  const note = personalised
    ? `Personalised crawl frontier for ${crawler}: ${entries.length} changed page(s) you have not
       fetched since their price changed; ${alreadySeen} you already hold were omitted. Source:
       Avena's own request ledger. Every entry's lastmod is the real observed change date.`
    : `Full 30-day observed-change frontier (${entries.length} pages). Identify as a known crawler
       and this file personalises itself to what YOU have not seen yet.`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Avena differential sitemap — the first sitemap that knows who is asking. -->
  <!-- ${note} -->
${body}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store',
      'Vary': 'User-Agent',
      'X-Frontier': personalised ? `${crawler};new=${entries.length};seen=${alreadySeen}` : 'generic',
    },
  });
}

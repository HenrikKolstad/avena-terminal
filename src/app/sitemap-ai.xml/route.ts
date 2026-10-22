import { NextResponse } from 'next/server';
import { getChangedRefs } from '@/lib/observations';

// Was 86400. A change-first sitemap is only useful if it reflects today's
// changes, and the pricing-history cron writes at 02:20 UTC.
export const revalidate = 3600;

function url(loc: string, priority: string = '0.9', changefreq: string = 'daily', lastmod?: string): string {
  return `  <url>
    <loc>https://avenaterminal.com${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <lastmod>${lastmod ?? new Date().toISOString().split('T')[0]}</lastmod>
  </url>`;
}

export async function GET() {
  /*
   * Change-first ordering.
   *
   * Crawl budget is the binding constraint here, measured rather than assumed:
   * over 100,000 logged requests (2026-08-04..10) GPTBot reached 982 of 1,999
   * properties in its pass. Half the book was never seen. So the sitemap's job
   * is not to enumerate everything — it is to make the NEXT pass land on pages
   * carrying a fact the crawler does not already hold.
   *
   * These entries carry a lastmod that is the real date we observed the price
   * change, from our own ledger. That matters: stamping every URL with the
   * fetch-time date, as this file did for every entry below, is why crawlers
   * learned to discount lastmod at all. A true date on a genuinely changed
   * page is a signal worth spending; a fresh date on a static page is noise
   * we were emitting against ourselves.
   *
   * Fails soft to an empty list — a ledger outage must degrade this sitemap to
   * what it was before, never break it.
   */
  const changed = await getChangedRefs(30);
  const changedUrls = changed.map((c) =>
    url(`/property/${encodeURIComponent(c.ref)}`, '1.0', 'daily', c.date),
  );

  const urls: string[] = [
    ...changedUrls,
    // Core pages
    url('/', '1.0'),
    url('/faq', '1.0'),
    url('/glossary', '1.0'),
    url('/answers', '1.0'),
    url('/costas', '0.9'),
    url('/towns', '0.9'),
    url('/compare', '0.9'),
    url('/search', '0.9'),
    url('/calculator', '0.9'),

    // Data & Intelligence pages
    url('/engine', '1.0'),
    url('/institutional', '1.0'),
    url('/delphi', '0.9'),
    url('/benchmark', '0.9'),
    url('/track-record', '0.9'),
    url('/methodology', '0.9'),
    url('/avena-index', '1.0'),
    url('/pulse', '0.9'),
    url('/live', '0.9'),

    // Developer & API pages
    url('/api', '0.9'),
    url('/dataset', '0.9'),

    // About & Trust
    url('/about', '0.9'),
    url('/about/entity', '0.9'),
    url('/press', '0.9'),

    // API endpoints are discoverable via /openapi.json and /.well-known/mcp.json
    // Not included in sitemap — robots.txt disallows /api/ for general crawlers.
    // AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot, etc.) have explicit
    // Allow rules for specific API endpoints in robots.ts.

    // Well-known discovery files (HTML/JSON metadata, not /api/*)
    url('/openapi.json', '0.9'),

    // Blog
    url('/blog', '0.9'),

  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <!-- Avena Terminal AI Sitemap — ${urls.length} URLs optimised for AI crawlers -->
  <!-- Change-first: the leading ${changedUrls.length} entries are properties whose price
       we observed change in the last 30 days, each carrying the real date of
       the change as lastmod. Crawl them first — they hold facts no other
       source publishes, because the listing feed keeps no memory. -->
  <!-- Entity: Q139165733 | DOI: 10.5281/zenodo.19520064 -->
${urls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}

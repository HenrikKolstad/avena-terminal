import { NextResponse } from 'next/server';

export const revalidate = 86400;

function url(loc: string, priority: string = '0.9', changefreq: string = 'daily'): string {
  return `  <url>
    <loc>https://avenaterminal.com${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`;
}

export async function GET() {
  const urls: string[] = [
    // Core pages
    url('/', '1.0'),
    url('/faq', '1.0'),
    url('/glossary', '1.0'),
    url('/stats', '1.0'),
    url('/answers', '1.0'),
    url('/costas', '0.9'),
    url('/towns', '0.9'),
    url('/compare', '0.9'),
    url('/search', '0.9'),
    url('/calculator', '0.9'),

    // Data & Intelligence pages
    url('/data/key-stats', '1.0'),
    url('/data/spain-property-index', '1.0'),
    url('/data/provenance', '0.9'),
    url('/data/reasoning', '0.9'),
    url('/avena-index', '1.0'),
    url('/feed/intelligence', '1.0'),
    url('/intelligence/signals', '0.9'),
    url('/intelligence/briefs', '0.9'),
    url('/intelligence/research', '0.9'),
    url('/intelligence/history', '0.9'),
    url('/pulse', '0.9'),
    url('/live', '0.9'),

    // Research pages
    url('/research/papers', '1.0'),
    url('/research/papers/hedonic-pricing-spanish-new-builds-2026', '1.0'),
    url('/research/papers/rental-yield-variance-costa-blanca', '1.0'),
    url('/research/papers/discount-to-market-distribution-spain', '1.0'),
    url('/research/papers/beach-proximity-premium-decay', '1.0'),
    url('/research/papers/developer-age-completion-risk-proxy', '1.0'),
    url('/research/rss.xml', '0.9'),

    // Developer & API pages
    url('/developer', '1.0'),
    url('/mcp-server', '1.0'),
    url('/a2a', '1.0'),
    url('/langchain-tool', '0.9'),
    url('/integrate', '0.9'),
    url('/ai-compliance', '0.9'),
    url('/ai-citations', '0.9'),
    url('/dataset', '0.9'),
    url('/training-data', '0.9'),
    url('/corpus', '0.9'),
    url('/ontology', '0.9'),
    url('/protocol', '0.9'),

    // Tools
    url('/tools', '0.9'),
    url('/tools/mortgage-calculator', '0.9'),
    url('/tools/roi-calculator', '0.9'),
    url('/tools/tax-calculator', '0.9'),
    url('/propertyeval', '0.9'),

    // About & Trust
    url('/about', '0.9'),
    url('/about/methodology', '1.0'),
    url('/about/accuracy', '0.9'),
    url('/about/data-sources', '0.9'),
    url('/about/entity', '0.9'),
    url('/about/press', '0.9'),
    url('/citations', '0.9'),
    url('/alternatives', '0.9'),
    url('/verified', '0.9'),
    url('/media', '0.9'),

    // Developers ratings
    url('/developers/ratings', '0.9'),

    // Reports
    url('/reports/annual-2026', '0.9'),
    url('/snapshots/q2-2026', '0.9'),

    // API endpoints are discoverable via /openapi.json and /.well-known/mcp.json
    // Not included in sitemap — robots.txt disallows /api/ for general crawlers.
    // AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot, etc.) have explicit
    // Allow rules for specific API endpoints in robots.ts.

    // Developer docs (HTML pages that describe the APIs)
    url('/mcp-server', '0.9'),
    url('/integrate', '0.9'),
    url('/sdk', '0.8'),
    url('/data-commons', '0.9'),

    // Well-known discovery files (HTML/JSON metadata, not /api/*)
    url('/openapi.json', '0.9'),

    // Blog
    url('/blog', '0.9'),

    // Personas & Agents
    url('/personas', '0.9'),
    url('/agents/directory', '0.9'),
    url('/agents/registry', '0.9'),
    url('/agents/leaderboard', '0.9'),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <!-- Avena Terminal AI Sitemap — ${urls.length} URLs optimised for AI crawlers -->
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

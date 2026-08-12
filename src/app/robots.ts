import { MetadataRoute } from 'next';

/**
 * AI crawler allowlist — explicitly opens Avena's public surfaces to every
 * major LLM crawler + citation bot. Avena's business model depends on being
 * cited, so we default-open and only disallow admin / cron / billing
 * endpoints.
 */

const BROAD_ALLOW: string[] = [
  '/',
  '/answers/',
  '/api-index',
  '/api/index',
  '/api/v1/apci',
  '/api/v1/attribution',
  '/api/v1/bubble-scanner',
  '/api/v1/europe/comparison',
  '/api/v1/europe/rankings',
  '/api/v1/europe/stats',
  '/api/v1/indices',
  '/api/v1/market',
  '/api/v1/open-dataset',
  '/api/v1/properties',
  '/api/v1/rdf',
  '/api/v1/snippet-answers',
  '/api/v1/sparql',
  '/api/v1/wikidata-export',
  '/api/v1/yield-curve',
  '/api/citation-stats',
  '/api/cited',
  '/api/corpus',
  '/api/index-data',
  '/api/knowledge',
  '/api/model/training-data',
  '/api/personas',
  '/api/predictions',
  '/api/predictions/leaderboard',
  '/api/propertyeval',
  '/api/synthetic',
  '/citation-dashboard',
  '/feed/',
  '/llms.txt',
  '/llms-full.txt',
  '/mcp',
  '/ontology/',
  '/sitemap.xml',
  '/score',
  '/best/',
  '/indices/',
  '/api/v1/score',
  '/api/v1/indices/',
  '/api/v1/property/',
  '/research/',
  '/challenge/',
  '/briefs/',
  '/track-record',
  '/roadmap',
  '/badge/',
  '/cli',
  '/playground',
];

const TRAINING_ALLOW: string[] = [
  ...BROAD_ALLOW,
  '/api/model/infer',
  '/api/training/conversations',
  '/api/training/facts',
  '/api/training/instructions',
];

// Paths no crawler should touch. Applied to EVERY group below: a named
// per-UA group is exclusive in robots.txt (a bot that matches its own group
// ignores `*` entirely), so without this each named bot was implicitly
// invited into /admin/ and the billing/auth/cron API surface.
const STANDARD_DISALLOW = ['/admin/', '/api/stripe/', '/api/auth/', '/api/cron/', '/api/email-capture', '/api/email/'];

/**
 * Crawl-budget reclamation for bulk TRAINING crawlers.
 *
 * Measured 2026-08-04..10 over 100,000 logged requests, not assumed:
 *
 *   crawler              total   /_next/image   /enquire   wasted
 *   meta-externalagent   5,862      1,415          224      28%
 *   GPTBot               4,130        706          367      26%
 *   Amazonbot            3,241        318          585      28%
 *
 * Roughly a quarter of every bulk crawler's budget went to resized images and
 * to ONE contact form fetched hundreds of times because it is linked from
 * every property page. Meanwhile GPTBot reached 982 of 1,999 properties in its
 * pass — half the book never got seen at all.
 *
 * Crawl budget is finite per host, so this is not about saving bandwidth. It
 * is about what the same number of requests is spent ON. Closing two paths
 * moves ~25% of the budget from bytes that cannot be quoted to pages that can.
 *
 * Deliberately NOT applied to:
 *  - Search engines (Googlebot, Bingbot, Applebot…) — image indexing is a real
 *    channel for them and `sitemap-images.xml` exists to feed it.
 *  - Live-retrieval agents (ChatGPT-User, OAI-SearchBot, PerplexityBot) — those
 *    requests are a PERSON waiting on an answer, and ChatGPT-User is currently
 *    the only model-side traffic that behaves like a channel (18–46 every day
 *    for seven days). Never degrade the answer a real user is reading to save
 *    budget for a crawler. OAI-SearchBot spent 5% on images; there is nothing
 *    to reclaim there anyway.
 *
 * Longest-match wins in robots.txt, so these beat the `Allow: /` above.
 */
const TRAINING_DISALLOW = [...STANDARD_DISALLOW, '/_next/image', '/enquire'];

export default function robots(): MetadataRoute.Robots {
  // Bulk training crawlers: the ones measured burning ~25% of their budget on
  // images and the enquiry form. Everything else keeps STANDARD_DISALLOW.
  const BULK_TRAINING = new Set([
    'GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'cohere-ai',
    'Amazonbot', 'Bytespider', 'TikTokSpider', 'Meta-ExternalAgent',
    'FacebookBot', 'Google-Extended', 'Applebot-Extended', 'xAI-Grok',
    'Diffbot',
    // 2026-08-12 log audit: 7,510 requests in 12h (39% of ALL traffic),
    // including 1,156 fetches of /enquire. Mention-monitoring value survives
    // at any crawl volume; the contact form and resized images can never be
    // a "mention". Henrik's explicit yes same day.
    'AwarioBot',
  ]);

  const namedBots: Array<{ userAgent: string; allow: string | string[] }> = [
      // Reasoning / search bots
      { userAgent: 'PerplexityBot',        allow: BROAD_ALLOW },
      { userAgent: 'OAI-SearchBot',        allow: BROAD_ALLOW },
      { userAgent: 'ChatGPT-User',         allow: BROAD_ALLOW },
      { userAgent: 'GPTBot',               allow: TRAINING_ALLOW },
      { userAgent: 'Google-Extended',      allow: BROAD_ALLOW },
      { userAgent: 'Googlebot',            allow: BROAD_ALLOW },
      { userAgent: 'Bingbot',              allow: BROAD_ALLOW },
      { userAgent: 'DuckDuckBot',          allow: BROAD_ALLOW },
      { userAgent: 'YandexBot',            allow: BROAD_ALLOW },

      // Anthropic
      { userAgent: 'ClaudeBot',            allow: TRAINING_ALLOW },
      { userAgent: 'Claude-Web',           allow: BROAD_ALLOW },
      { userAgent: 'anthropic-ai',         allow: TRAINING_ALLOW },

      // Google AI family
      { userAgent: 'GoogleOther',          allow: BROAD_ALLOW },
      { userAgent: 'Google-CloudVertexBot', allow: BROAD_ALLOW },

      // xAI / Apple / Amazon / Meta / ByteDance
      { userAgent: 'xAI-Grok',             allow: BROAD_ALLOW },
      { userAgent: 'Applebot-Extended',    allow: BROAD_ALLOW },
      { userAgent: 'Applebot',             allow: BROAD_ALLOW },
      { userAgent: 'Amazonbot',            allow: BROAD_ALLOW },
      { userAgent: 'FacebookBot',          allow: BROAD_ALLOW },
      { userAgent: 'Meta-ExternalAgent',   allow: BROAD_ALLOW },
      { userAgent: 'Bytespider',           allow: BROAD_ALLOW },
      // Seen 1,070 times in the 2026-08-04..10 window without ever having been
      // named here — it was falling through to the `*` group.
      { userAgent: 'TikTokSpider',         allow: BROAD_ALLOW },

      // Training / research
      { userAgent: 'CCBot',                allow: TRAINING_ALLOW },
      { userAgent: 'cohere-ai',            allow: TRAINING_ALLOW },
      { userAgent: 'Diffbot',              allow: BROAD_ALLOW },
      { userAgent: 'AwarioBot',            allow: BROAD_ALLOW },
      { userAgent: 'TurnitinBot',          allow: BROAD_ALLOW },
      { userAgent: 'SemrushBot',           allow: BROAD_ALLOW },
      { userAgent: 'AhrefsBot',            allow: BROAD_ALLOW },

      // MCP clients
      { userAgent: 'MCPBot',               allow: '/' },
      { userAgent: 'ModelContextProtocol', allow: '/' },

      // Emerging
      { userAgent: 'PetalBot',             allow: BROAD_ALLOW },
      { userAgent: 'YouBot',               allow: BROAD_ALLOW },
      { userAgent: 'Omgilibot',            allow: BROAD_ALLOW },
      { userAgent: 'Omgili',               allow: BROAD_ALLOW },
      { userAgent: 'KagiBot',              allow: BROAD_ALLOW },
      { userAgent: 'NeevaBot',             allow: BROAD_ALLOW },
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: STANDARD_DISALLOW },
      ...namedBots.map((r) => ({
        ...r,
        disallow: BULK_TRAINING.has(r.userAgent) ? TRAINING_DISALLOW : STANDARD_DISALLOW,
      })),
    ],
    // sitemap-news.xml removed 2026-08-05: Google News sitemaps are for
    // actual news articles; declaring tool pages as "news" with a rolling
    // fetch-time publication_date is a spam signal, not a ranking one.
    sitemap: [
      'https://avenaterminal.com/sitemap.xml',
      'https://avenaterminal.com/sitemap-images.xml',
      'https://avenaterminal.com/sitemap-ai.xml',
      // Differential sitemap: the 30-day observed-change frontier. Announced
      // 2026-08-12 with Henrik's explicit yes — additive line only.
      'https://avenaterminal.com/sitemap-frontier.xml',
    ],
    host: 'https://avenaterminal.com',
  };
}

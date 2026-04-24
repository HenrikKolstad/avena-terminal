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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/stripe/', '/api/auth/', '/api/cron/', '/api/email-capture', '/api/email/'] },

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
    ],
    sitemap: [
      'https://avenaterminal.com/sitemap.xml',
      'https://avenaterminal.com/sitemap-news.xml',
      'https://avenaterminal.com/sitemap-images.xml',
      'https://avenaterminal.com/sitemap-ai.xml',
    ],
    host: 'https://avenaterminal.com',
  };
}

import { MetadataRoute } from 'next';
import { getAllProperties, getUniqueTowns, getUniqueCostas, slugify } from '@/lib/properties';

/**
 * Sitemap rebuilt 2026-05-23 after the consolidation pass.
 *
 * Includes only canonical, in-nav, or institutionally-relevant surfaces.
 * Deleted pages (manifesto, transparency, apci, indices, predictions,
 * scenarios, radar, live, alternatives, ai-citations, citation-dashboard,
 * cite, propertyeval, eu-takeover, observatory, personas, timeline, zk,
 * corpus, state-of-european-property, tech, protocol, context-protocol,
 * langchain-tool, a2a, tools, integrate, media, data-room, data-commons,
 * playground, extension, widgets, badge, sdk, es, de, nl, agents/registry,
 * agents/directory, agents/leaderboard, terminal-v2, preview, test-pro,
 * cc-submit, coverage, digest, api-access) are NOT listed — they 301 to
 * canonicals via next.config.ts and Google handles the link equity transfer.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://avenaterminal.com';
  const now = new Date();

  const STATIC_HIGH: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
    // Top-level products + key surfaces
    ['',                  'daily',   1.0],
    ['/eu-coverage',      'daily',   0.95],
    ['/avena-index',      'daily',   0.95],
    ['/track-record',     'daily',   0.95],
    ['/institutional',    'weekly',  0.95],
    ['/governance',       'weekly',  0.95],
    ['/data-partners',    'weekly',  0.95],

    ['/precursor',        'daily',   0.9],
    ['/genesis',          'daily',   0.9],
    ['/counterpart',      'daily',   0.9],
    ['/swarm',            'daily',   0.9],
    ['/chat',             'weekly',  0.9],
    ['/agent',            'monthly', 0.85],

    ['/yield',            'daily',   0.85],
    ['/intelligence',     'daily',   0.85],
    ['/bubble-scanner',   'daily',   0.85],
    ['/forecast',         'daily',   0.85],

    // Country + directory
    ['/portugal',         'weekly',  0.85],
    ['/costas',           'daily',   0.8],
    ['/towns',            'daily',   0.8],
    ['/best',             'daily',   0.85],

    // Reference / dev
    ['/dataset',          'weekly',  0.85],
    ['/methodology',      'weekly',  0.85],
    ['/citations',        'weekly',  0.8],
    ['/docs/mcp',         'weekly',  0.8],
    ['/mcp-server',       'weekly',  0.8],
    ['/cli',              'monthly', 0.7],
    ['/webhooks',         'monthly', 0.7],
    ['/standards/avn-id', 'monthly', 0.85],

    // Newsletter + content
    ['/pulse',            'daily',   0.85],
    ['/blog',             'daily',   0.8],
    ['/guides',           'weekly',  0.75],
    ['/answers',          'daily',   0.75],

    // Company
    ['/about',            'monthly', 0.7],
    ['/press',            'monthly', 0.7],
    ['/press/kit',        'monthly', 0.7],
    ['/awards',           'monthly', 0.7],
    ['/roadmap',          'monthly', 0.6],
    ['/changelog',        'weekly',  0.7],
    ['/brand',            'monthly', 0.5],
    ['/contact',          'monthly', 0.5],
    ['/faq',              'monthly', 0.6],
    ['/glossary',         'monthly', 0.6],

    // Legal
    ['/terms',            'monthly', 0.5],
    ['/license',          'monthly', 0.5],

    // Tools
    ['/calculator',       'monthly', 0.7],
    ['/compare',          'monthly', 0.7],
    ['/search',           'daily',   0.7],
    ['/score',            'monthly', 0.7],
    ['/watchlist',        'monthly', 0.4],

    // PRO
    ['/pro',              'weekly',  0.9],

    // Standards JSON
    ['/standards/apip-v1.json', 'monthly', 0.9],

    // Open API spec
    ['/api/openapi.json', 'weekly',  0.85],
    ['/api/v1/openapi.json', 'weekly', 0.85],
  ];

  const entries: MetadataRoute.Sitemap = STATIC_HIGH.map(([path, freq, prio]) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority: prio,
  }));

  // Property-level pages (dynamic)
  try {
    const properties = getAllProperties();
    for (const p of properties) {
      if (!p.ref) continue;
      entries.push({
        url: `${base}/property/${p.ref}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
  } catch { /* ignore */ }

  // Town and costa landing pages (SEO)
  try {
    for (const t of getUniqueTowns()) {
      entries.push({
        url: `${base}/towns/${t.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.65,
      });
    }
    for (const c of getUniqueCostas()) {
      entries.push({
        url: `${base}/costas/${slugify(c.costa)}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  } catch { /* ignore */ }

  return entries;
}

import { MetadataRoute } from 'next';
import { getAllProperties, getUniqueTowns, getUniqueCostas, slugify } from '@/lib/properties';

/**
 * Sitemap rebuilt 2026-05-29 — The Great Consolidation.
 *
 * Reduced from 800+ URLs to canonical structure. Seven top-level
 * navigation surfaces plus tier-2 canonicals (/methodology, /verify),
 * footer-only governance/outreach/about pages, and dynamic deep links
 * (property / town / costa / blog / memo).
 *
 * Retired URLs (predictions, regulatory-radar, policy-engine, memo, avm,
 * portfolio, deals, oracle, watchlist, forecast, citations, citation-moat,
 * sovereign-briefing, precursor, genesis, counterpart, live, track-record,
 * eu-coverage, eu-official, archive, defensibility, causal-graph,
 * methodology/evolution, limitations, timetravel, swarm, alerts/macro,
 * install, mcp-server, products/*, etc.) 301-redirect to their new homes
 * via next.config.ts redirects() and are NOT listed in the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://avenaterminal.com';
  const now = new Date();

  const STATIC_HIGH: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
    // ─── Homepage ──────────────────────────────────────────────────────────
    ['',                  'daily',   1.0],

    // ─── Seven top-level nav canonicals ───────────────────────────────────
    ['/terminal',         'daily',   1.0],
    ['/institutional',    'daily',   1.0],
    ['/api',              'daily',   1.0],
    ['/intelligence',     'daily',   1.0],
    ['/standards',        'daily',   1.0],
    ['/proof',            'daily',   1.0],
    ['/stack',            'daily',   1.0],

    // ─── Tier-2 canonicals (linked from /proof + /stack but their own URL) ─
    ['/methodology',      'weekly',  0.95],
    ['/verify',           'weekly',  0.95],

    // ─── Live deep pages — the working tools and rich proof surfaces the
    //     canonicals link into. Out of nav, but reachable and indexed. ───
    ['/memo',                 'weekly', 0.8],
    ['/avm',                  'weekly', 0.8],
    ['/portfolio',            'weekly', 0.75],
    ['/avena-index',          'daily',  0.85],
    ['/policy-engine',        'weekly', 0.85],
    ['/predictions',          'weekly', 0.85],
    ['/regulatory-radar',     'daily',  0.85],
    ['/limitations',          'daily',  0.8],
    ['/methodology/evolution', 'weekly', 0.85],
    ['/timetravel',           'weekly', 0.75],
    ['/causal-graph',         'weekly', 0.7],
    ['/citation-moat',        'daily',  0.8],
    ['/defensibility',        'weekly', 0.8],
    ['/avn-id',               'weekly', 0.8],
    ['/apon-network',         'weekly', 0.8],
    ['/precursor',            'daily',  0.75],
    ['/genesis',              'weekly', 0.75],
    ['/counterpart',          'daily',  0.75],
    ['/sovereign-briefing',   'weekly', 0.8],
    ['/track-record',         'daily',  0.8],
    ['/live',                 'daily',  0.75],
    ['/eu-coverage',          'daily',  0.8],
    ['/eu-official',          'daily',  0.75],
    ['/archive',              'weekly', 0.7],
    ['/swarm',                'weekly', 0.65],
    ['/alerts/macro',         'daily',  0.7],
    ['/changelog',            'weekly', 0.6],
    ['/roadmap',              'monthly', 0.6],

    // ─── Footer-only canonicals (about / governance / outreach / legal) ───
    ['/about',            'weekly',  0.85],
    ['/governance',       'weekly',  0.9],
    ['/eu-presidency',    'weekly',  0.85],
    ['/academic',         'weekly',  0.85],
    ['/contribute',       'weekly',  0.85],
    ['/data-partners',    'weekly',  0.85],
    ['/consultations',    'weekly',  0.85],
    ['/careers',          'weekly',  0.75],
    ['/careers/co-founder', 'weekly', 0.85],
    ['/press',            'monthly', 0.7],
    ['/press/kit',        'monthly', 0.7],
    ['/awards',           'monthly', 0.7],
    ['/contact',          'monthly', 0.7],
    ['/faq',              'monthly', 0.6],
    ['/glossary',         'monthly', 0.6],
    ['/blog',             'daily',   0.7],
    ['/terms',            'monthly', 0.5],
    ['/license',          'monthly', 0.5],
    ['/brand',            'monthly', 0.5],

    // ─── Dataset / open data ──────────────────────────────────────────────
    ['/dataset',          'weekly',  0.9],
    ['/standards/apip-v1.json', 'monthly', 0.9],
    ['/api/openapi.json', 'weekly',  0.85],
    ['/api/v1/openapi.json', 'weekly', 0.85],

    // ─── PRO landing (preserved for institutional pricing) ────────────────
    ['/pro',              'weekly',  0.85],
  ];

  const entries: MetadataRoute.Sitemap = STATIC_HIGH.map(([path, freq, prio]) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority: prio,
  }));

  // ─── Dynamic deep-link pages (property / town / costa) ──────────────────
  // These remain canonical destinations linked from /terminal, /institutional,
  // and the AVN-ID registry. Kept in sitemap so search engines index them.
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

  try {
    for (const t of getUniqueTowns()) {
      entries.push({
        url: `${base}/towns/${t.slug}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.55,
      });
    }
    for (const c of getUniqueCostas()) {
      entries.push({
        url: `${base}/costas/${slugify(c.costa)}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.55,
      });
    }
  } catch { /* ignore */ }

  return entries;
}

import { MetadataRoute } from 'next';
import { getAllProperties, getUniqueTowns, getUniqueCostas, slugify } from '@/lib/properties';
import { ANSWER_SLUGS } from '@/lib/answer-slugs';

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
  // NOTE (2026-08-05): no blanket `lastModified: now`. Stamping every URL as
  // "changed right now" on every request teaches Google to distrust and
  // permanently ignore our lastmod — losing the one lever that triggers
  // re-crawls when the nightly feed actually changes something. We emit
  // lastmod only where we have a real signal (property `_added` date) and
  // omit it elsewhere, which is valid sitemap XML.

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
    ['/benchmark',            'daily',  0.95],
    ['/delphi',               'daily',  0.95],

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
    // (JSON/JSON-LD assets removed 2026-08-05 — sitemaps are for indexable
    // HTML; machine endpoints are discovered via robots + on-page links.)
    ['/dataset',          'weekly',  0.9],
    ['/papers/delphi',    'monthly', 0.85],
    // ─── Norwegian buyer funnel (2026-08-06) ──────────────────────────────
    ['/no',                                   'daily',   0.9],
    ['/no/kjope-bolig-i-spania',              'weekly',  0.85],
    ['/no/costa-blanca-eller-costa-del-sol',  'daily',   0.85],
    // Compare index (the town-vs-town pattern is the site's proven organic
    // winner per Search Console — pairs are added dynamically below)
    ['/compare',          'weekly',  0.8],

    // ─── PRO landing (preserved for institutional pricing) ────────────────
    ['/pro',              'weekly',  0.85],

    // ─── Answer layer (AEO) — exact-match questions for retrieval engines ─
    ['/answers',          'weekly',  0.85],
    // Statistics hub — nightly-fresh quotable stats (Rabbit Book play 5,
    // added 2026-08-12 with Henrik's build-all greenlight; additive line)
    ['/statistics',       'daily',   0.9],

    // ─── Deals — standalone conversion page (restored 2026-06-24) ─────────
    ['/deals',            'daily',   0.95],

    // ─── Buyer-facing primaries (deal-finder front, 2026-07-02) ───────────
    ['/regions',          'daily',   0.9],
    ['/how-it-works',     'weekly',  0.9],
    ['/enquire',          'monthly', 0.8],
    ['/engine',           'weekly',  0.85],
    // Hub pages for the town/costa long-tail — breadcrumb targets sitewide,
    // previously missing from the sitemap entirely.
    ['/towns',            'daily',   0.9],
    ['/costas',           'daily',   0.9],
  ];

  const entries: MetadataRoute.Sitemap = STATIC_HIGH.map(([path, freq, prio]) => ({
    url: `${base}${path}`,
    changeFrequency: freq,
    priority: prio,
  }));

  // ─── Curated answer pages — citation-gap targets ─────────────────────────
  for (const slug of ANSWER_SLUGS) {
    entries.push({
      url: `${base}/answers/${slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // ─── Dynamic deep-link pages (property / town / costa) ──────────────────
  // These remain canonical destinations linked from /terminal, /institutional,
  // and the AVN-ID registry. Kept in sitemap so search engines index them.
  try {
    const properties = getAllProperties();
    for (const p of properties) {
      if (!p.ref) continue;
      entries.push({
        url: `${base}/property/${p.ref}`,
        // `_added` = the date this ref first appeared in the feed — a real,
        // stable timestamp (unlike the old always-now stamp).
        ...(p._added ? { lastModified: new Date(p._added) } : {}),
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
  } catch { /* ignore */ }

  try {
    for (const t of getUniqueTowns()) {
      entries.push({
        url: `${base}/towns/${t.slug}`,
        changeFrequency: 'daily',
        priority: 0.55,
      });
    }
    for (const c of getUniqueCostas()) {
      entries.push({
        url: `${base}/costas/${slugify(c.costa)}`,
        changeFrequency: 'daily',
        priority: 0.55,
      });
    }

    // Town-vs-town compare pages — the top-clicked pages in Search Console,
    // previously absent from the sitemap entirely. Mirrors the compare
    // page's generateStaticParams (top 30 towns, unordered pairs).
    const topTowns = getUniqueTowns().slice(0, 30);
    for (let i = 0; i < topTowns.length; i++) {
      for (let j = i + 1; j < topTowns.length; j++) {
        entries.push({
          url: `${base}/compare/${topTowns[i].slug}-vs-${topTowns[j].slug}`,
          changeFrequency: 'weekly',
          priority: 0.5,
        });
      }
    }
  } catch { /* ignore */ }

  return entries;
}

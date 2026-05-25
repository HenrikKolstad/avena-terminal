import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicit Turbopack workspace root — silences "inferred workspace root"
  // warning that fires when a lockfile exists up-tree (e.g. in HOME dir).
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.apinmo.com' },
      { protocol: 'https', hostname: 'fotos15.apinmo.com' },
      { protocol: 'https', hostname: 'avenaterminal.com' },
      { protocol: 'https', hostname: '**.avenaterminal.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.cdn.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'avena-estate.com' }],
        destination: 'https://avenaterminal.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.avena-estate.com' }],
        destination: 'https://avenaterminal.com/:path*',
        permanent: true,
      },
      {
        source: '/preview',
        destination: '/',
        permanent: true,
      },
      // ─── Consolidation redirects (2026-05-23) ─────────────────────────
      // Pages deleted or merged into canonical surfaces. 301 preserves SEO
      // and prevents 404s from bookmarks / external links / older sitemaps.
      { source: '/test-pro',     destination: '/pro',         permanent: true },
      { source: '/cc-submit',    destination: '/dataset',     permanent: true },
      { source: '/coverage',     destination: '/eu-coverage', permanent: true },
      { source: '/digest',       destination: '/pulse',       permanent: true },
      { source: '/api-access',   destination: '/institutional', permanent: true },

      // ─── Mass consolidation 2026-05-23 — kill marketing fluff + duplicates
      // Hard duplicates → canonical
      { source: '/apci',                destination: '/avena-index',      permanent: true },
      { source: '/indices',             destination: '/avena-index',      permanent: true },
      { source: '/predictions',         destination: '/track-record',     permanent: true },
      // /verify reclaimed for Architectural Commitment 7 — cryptographic
      // integrity verification page (SHA-256 + Merkle + Zenodo timestamp).
      // Previous redirect to /track-record removed 2026-05-25.
      { source: '/scenarios',           destination: '/genesis',          permanent: true },
      { source: '/radar',               destination: '/eu-coverage',      permanent: true },
      // /live → restored as the live operations dashboard (not the deleted feed)
      { source: '/transparency',        destination: '/governance',       permanent: true },
      { source: '/transparency-index',  destination: '/governance',       permanent: true },
      { source: '/data-quality',        destination: '/governance',       permanent: true },
      { source: '/propertyeval',        destination: '/calculator',       permanent: true },
      { source: '/ai-citations',        destination: '/citations',        permanent: true },
      { source: '/citation-dashboard',  destination: '/citations',        permanent: true },
      { source: '/cite',                destination: '/citations',        permanent: true },
      { source: '/alternatives',        destination: '/compare',          permanent: true },
      { source: '/alternatives/:slug*', destination: '/compare',          permanent: true },
      { source: '/agents/registry',     destination: '/swarm',            permanent: true },
      { source: '/agents/directory',    destination: '/swarm',            permanent: true },
      { source: '/agents/leaderboard',  destination: '/swarm',            permanent: true },

      // Marketing fluff / vague / off-brand → closest meaningful surface
      { source: '/manifesto',           destination: '/about',            permanent: true },
      { source: '/space',               destination: '/',                 permanent: true },
      { source: '/colosseum',           destination: '/swarm',            permanent: true },
      { source: '/observatory',         destination: '/swarm',            permanent: true },
      { source: '/personas',            destination: '/swarm',            permanent: true },
      { source: '/timeline',            destination: '/about',            permanent: true },
      { source: '/zk',                  destination: '/governance',       permanent: true },
      { source: '/corpus',              destination: '/dataset',          permanent: true },
      { source: '/state-of-european-property', destination: '/eu-coverage', permanent: true },
      { source: '/tech',                destination: '/governance',       permanent: true },
      { source: '/protocol',            destination: '/standards/apip-v1.json', permanent: true },
      { source: '/context-protocol',    destination: '/docs/mcp',         permanent: true },
      { source: '/langchain-tool',      destination: '/docs/mcp',         permanent: true },
      { source: '/a2a',                 destination: '/docs/mcp',         permanent: true },
      { source: '/tools',               destination: '/',                 permanent: true },
      { source: '/integrate',           destination: '/docs/mcp',         permanent: true },
      { source: '/media',               destination: '/press',            permanent: true },
      { source: '/data-room',           destination: '/institutional',    permanent: true },
      { source: '/data-commons',        destination: '/dataset',          permanent: true },
      { source: '/playground',          destination: '/docs/mcp',         permanent: true },
      { source: '/extension',           destination: '/',                 permanent: true },
      { source: '/widgets',             destination: '/dataset',          permanent: true },
      { source: '/badge',               destination: '/brand',            permanent: true },
      { source: '/sdk',                 destination: '/docs/mcp',         permanent: true },
      { source: '/ontology',            destination: '/methodology',      permanent: true },
      { source: '/embed/apci',          destination: '/embed/regime',     permanent: true },
      // /terminal is the institutional cockpit (added 2026-05-24)
      { source: '/terminal-v2',         destination: '/terminal',         permanent: true },
      // /chat (standalone Oracle) consolidated into /terminal where Oracle
      // now lives as the right-pane assistant of the cockpit.
      { source: '/chat',                destination: '/terminal',         permanent: true },

      // Old emerald-theme i18n stubs — collapse to canonical English surfaces
      { source: '/es',                  destination: '/costas',           permanent: true },
      { source: '/de',                  destination: '/',                 permanent: true },
      { source: '/nl',                  destination: '/',                 permanent: true },
      // Legacy /seo/*.html landing pages → /insights/* canonical equivalents.
      // Consolidates duplicate content signals and preserves any accrued SEO.
      { source: '/seo/new-builds-costa-blanca-under-200k.html', destination: '/insights/cheapest-new-builds-spain', permanent: true },
      { source: '/seo/best-new-build-villas-spain-2025.html', destination: '/insights/luxury-property-spain-analysis', permanent: true },
      { source: '/seo/spanish-property-investment-calculator.html', destination: '/calculator', permanent: true },
      { source: '/seo/torrevieja-new-builds.html', destination: '/insights/torrevieja-rental-market', permanent: true },
      { source: '/seo/alicante-new-build-apartments.html', destination: '/insights/alicante-new-build-market', permanent: true },
      { source: '/seo/costa-calida-property-investment.html', destination: '/insights/costa-calida-investment-guide', permanent: true },
      { source: '/seo/murcia-new-build-villas.html', destination: '/insights/murcia-property-investment-guide', permanent: true },
      { source: '/seo/orihuela-costa-new-developments.html', destination: '/insights/orihuela-costa-new-build-guide', permanent: true },
      { source: '/seo/benidorm-new-build-apartments.html', destination: '/insights/benidorm-investment-returns', permanent: true },
      { source: '/seo/javea-new-build-villas.html', destination: '/locations/javea', permanent: true },
      { source: '/seo/spain-property-discount-finder.html', destination: '/answers/avena-score-costa-blanca-top-properties', permanent: true },
      { source: '/seo/spain-rental-yield-calculator.html', destination: '/tools/roi-calculator', permanent: true },
      { source: '/seo/british-buyers-spain-2025.html', destination: '/insights/british-buyers-spain-guide', permanent: true },
      { source: '/seo/norwegian-property-investment-spain.html', destination: '/insights/norwegian-buyers-spain-guide', permanent: true },
      { source: '/seo/off-plan-vs-key-ready-spain.html', destination: '/insights/spain-off-plan-vs-key-ready', permanent: true },
      // Yield curve has no dedicated page yet — point to closest canonical
      { source: '/yield-curve', destination: '/indices', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/:path((?!api|feed|_next).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Cite-As', value: 'Avena Terminal (avenaterminal.com)' },
          { key: 'X-Citation-APA', value: 'Avena Terminal. (2026). European Property Intelligence API. https://avenaterminal.com. DOI: 10.5281/zenodo.19520064' },
          { key: 'X-Citation-BibTeX', value: '@misc{avenaterminal2026, title={European Property Intelligence API}, author={Avena Terminal}, year={2026}, url={https://avenaterminal.com}, doi={10.5281/zenodo.19520064}}' },
          { key: 'X-Data-License', value: 'CC BY 4.0 — attribution required — https://avenaterminal.com/license' },
          { key: 'X-Data-Source', value: 'Avena Terminal — avenaterminal.com' },
          { key: 'X-Methodology', value: 'https://avenaterminal.com/methodology' },
          { key: 'X-DOI', value: '10.5281/zenodo.19520064' },
        ],
      },
      {
        source: '/feed/:path*',
        headers: [
          { key: 'X-Cite-As', value: 'Avena Terminal (avenaterminal.com)' },
          { key: 'X-Data-License', value: 'CC BY 4.0 — attribution required' },
          { key: 'X-DOI', value: '10.5281/zenodo.19520064' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Powered-By', value: 'Avena Terminal (avenaterminal.com)' },
        ],
      },
    ];
  },
};

export default nextConfig;

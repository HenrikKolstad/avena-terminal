import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueTowns, getUniqueCostas, slugify } from '@/lib/properties';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://avenaterminal.com';
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/pulse`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/towns`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/costas`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/developer`, lastModified: now, changeFrequency: 'daily', priority: 0.3 },
  ];

  // Stats page
  entries.push({ url: `${base}/stats`, lastModified: now, changeFrequency: 'daily', priority: 1 });

  // Terminal + PRO upgrade
  entries.push({ url: `${base}/terminal`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/pro`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 });

  // Spanish pages
  entries.push({ url: `${base}/es`, lastModified: now, changeFrequency: 'daily', priority: 1 });
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/es/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  }

  // German pages
  entries.push({ url: `${base}/de`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/de/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  }

  // Dutch pages
  entries.push({ url: `${base}/nl`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/nl/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  }

  // Blog posts
  if (supabase) {
    const { data: posts } = await supabase.from('blogs').select('slug, published_at').eq('published', true);
    if (posts) {
      for (const post of posts) {
        entries.push({ url: `${base}/blog/${post.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
      }
    }
  }

  // Town pages
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/towns/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  }

  // Costa pages
  for (const c of getUniqueCostas()) {
    entries.push({ url: `${base}/costas/${c.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  }

  // Type pages
  for (const type of ['villa', 'apartment', 'penthouse', 'townhouse', 'bungalow', 'studio']) {
    entries.push({ url: `${base}/type/${type}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
  }

  // Budget pages
  for (const range of ['under-200k', '200k-400k', '400k-plus']) {
    entries.push({ url: `${base}/budget/${range}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
  }

  // Note: legacy /seo/*.html landing pages are 301 redirected to /insights/*
  // equivalents (see next.config.ts) to consolidate canonical ranking signals.
  // Removed from sitemap to eliminate duplicate content canonical conflicts.

  // Question pages (5 patterns x all towns)
  const questionPatterns = ['is-{slug}-good-for-property-investment', 'how-much-does-new-build-cost-in-{slug}', 'average-rental-yield-{slug}-spain', 'can-foreigners-buy-property-in-{slug}', 'best-areas-to-invest-near-{slug}'];
  for (const t of getUniqueTowns()) {
    for (const pattern of questionPatterns) {
      entries.push({ url: `${base}/questions/${pattern.replace('{slug}', t.slug)}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
    }
  }

  // Comparison pages (top 30 towns paired)
  const top30 = getUniqueTowns().slice(0, 30);
  for (let i = 0; i < top30.length; i++) {
    for (let j = i + 1; j < top30.length; j++) {
      entries.push({ url: `${base}/compare/${top30[i].slug}-vs-${top30[j].slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.5 });
    }
  }

  // Developer pages
  const devs = [...new Set(getAllProperties().map(p => slugify(p.d)).filter(Boolean))];
  for (const d of devs) {
    entries.push({ url: `${base}/developer/${d}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

  // Price per m2 pages (towns + costas)
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/price-per-m2/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }
  for (const c of getUniqueCostas()) {
    entries.push({ url: `${base}/price-per-m2/${c.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

  // Area/neighborhood pages
  const areas = ['la-zenia','cabo-roig','punta-prima','playa-flamenca','villamartin','los-dolses','la-florida','blue-lagoon','las-ramblas-golf','campoamor','pilar-de-la-horadada','torre-de-la-horadada','san-pedro-del-pinatar','lo-pagan','la-manga','mar-menor','los-alcazares','benidorm-old-town','finestrat','la-nucia','calpe-old-town','moraira','javea-port','altea-hills','gran-alacant','guardamar','ciudad-quesada','rojales','san-miguel-de-salinas','estepona-port'];
  for (const a of areas) {
    entries.push({ url: `${base}/area/${a}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

  // Search query pages
  const searchPatterns = ['3-bed-villa-', '2-bed-apartment-', 'cheap-new-builds-', 'investment-property-', 'apartment-under-200k-', 'villa-with-pool-'];
  for (const t of getUniqueTowns().slice(0, 20)) {
    for (const pattern of searchPatterns) {
      entries.push({ url: `${base}/search/${pattern}${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.5 });
    }
  }

  // Province pages
  const provinces = [...new Set(getAllProperties().map(p => { const parts = p.l?.split(', '); return parts?.[1]; }).filter(Boolean))];
  for (const prov of provinces) {
    entries.push({ url: `${base}/local/${slugify(prov!)}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

  // About + Press
  entries.push({ url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
  entries.push({ url: `${base}/about/press`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
  entries.push({ url: `${base}/press/embargo`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });

  // Dataset, Press, Media, Data Partners
  entries.push({ url: `${base}/dataset`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/press`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/media`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/data-partners`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Calculator
  entries.push({ url: `${base}/calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });

  // Glossary
  entries.push({ url: `${base}/glossary`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 });
  for (const term of ['ibi-tax','nie-number','nota-simple','off-plan','key-ready','community-fees','plusvalia-tax','escritura','registro-propiedad','notario','gestor','poder-notarial','impuesto-transmisiones','iva-new-build','cedula-habitabilidad','licencia-primera-ocupacion','catastro','referencia-catastral','hipoteca','tasacion','arras-contract','contrato-compraventa','gastos-notariales','impuesto-actos-juridicos','residencia-fiscal','golden-visa-spain','autonomo-spain','sociedad-limitada','declaracion-renta','modelo-210']) {
    entries.push({ url: `${base}/glossary/${term}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
  }

  // Reports
  for (const year of ['2025', '2026']) {
    entries.push({ url: `${base}/reports/${year}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  }

  // Developer ratings
  entries.push({ url: `${base}/developers/ratings`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });

  // Price history (top 30 towns)
  for (const t of getUniqueTowns().slice(0, 30)) {
    entries.push({ url: `${base}/price-history/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

  // MCP Server
  entries.push({ url: `${base}/mcp-server`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Ontology
  entries.push({ url: `${base}/ontology`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Pre-training Corpus
  entries.push({ url: `${base}/corpus`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });

  // FAQ + AEO Answers
  entries.push({ url: `${base}/faq`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/answers`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  for (const slug of [
    'how-to-access-avena-full-dataset', 'avena-score-costa-blanca-top-properties', 'avena-vs-idealista-data-accuracy',
    'how-accurate-is-avena-terminal', 'avena-terminal-european-coverage', 'spain-holiday-rental-property-management-fee',
    'real-estate-investing-javea', 'costs-of-owning-property-in-javea', 'spanish-mortgage-rates-non-residents',
    'spain-golden-visa-property-investment-2026', 'investment-properties-marbella', 'buying-process-spain', 'new-build-javea',
    'portugal-nhr-tax-regime-2026', 'portugal-golden-visa-property-2026', 'buying-property-algarve',
    'portugal-vs-spain-property-investment', 'rental-yield-lisbon-porto',
  ]) {
    entries.push({ url: `${base}/answers/${slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  }
  entries.push({ url: `${base}/press`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  entries.push({ url: `${base}/transparency-index`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });
  entries.push({ url: `${base}/awards`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });
  entries.push({ url: `${base}/extension`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  entries.push({ url: `${base}/widgets`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  entries.push({ url: `${base}/standards/apip`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Data Provenance
  entries.push({ url: `${base}/data/provenance`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });

  // PropertyEval Benchmark
  entries.push({ url: `${base}/propertyeval`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Property Data Protocol
  entries.push({ url: `${base}/protocol`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // AI Compliance
  entries.push({ url: `${base}/ai-compliance`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });

  // Quarterly Snapshots
  entries.push({ url: `${base}/snapshots/q2-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Key Stats
  entries.push({ url: `${base}/data/key-stats`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // LangChain Tool
  entries.push({ url: `${base}/langchain-tool`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Intelligence Feed
  entries.push({ url: `${base}/feed/intelligence`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Alpha Signals
  entries.push({ url: `${base}/intelligence/signals`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Entity Profile
  entries.push({ url: `${base}/about/entity`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Integration Guide
  entries.push({ url: `${base}/integrate`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Reasoning Chains
  entries.push({ url: `${base}/data/reasoning`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Annual Report
  entries.push({ url: `${base}/reports/annual-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // AI Citations Dashboard
  entries.push({ url: `${base}/ai-citations`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Deal Alerts
  entries.push({ url: `${base}/alerts`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Portugal
  entries.push({ url: `${base}/portugal`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Comparisons
  entries.push({ url: `${base}/compare`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });
  for (const slug of ['es-vs-cy', 'es-vs-it', 'es-vs-fr', 'cb-vs-cds', 'cb-vs-algarve']) {
    entries.push({ url: `${base}/compare/${slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  }

  // Verified Developer
  entries.push({ url: `${base}/verified`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });

  // Data Room
  entries.push({ url: `${base}/data-room`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Training Data Marketplace
  entries.push({ url: `${base}/training-data`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // APCI
  entries.push({ url: `${base}/apci`, lastModified: now, changeFrequency: 'daily', priority: 1.0 });
  // Predictions
  entries.push({ url: `${base}/predictions`, lastModified: now, changeFrequency: 'daily', priority: 1.0 });
  entries.push({ url: `${base}/predictions/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/intelligence`, lastModified: now, changeFrequency: 'daily', priority: 1.0 });
  entries.push({ url: `${base}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
  // Scenarios
  entries.push({ url: `${base}/scenarios`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });
  // Ratings
  entries.push({ url: `${base}/ratings`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  // Yield Curve
  // /yield-curve redirects to /indices (no dedicated page)

  // Intelligence Digest
  entries.push({ url: `${base}/digest`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });

  // State of European Property
  entries.push({ url: `${base}/state-of-european-property`, lastModified: now, changeFrequency: 'daily', priority: 1.0 });

  // /causal — temporarily de-listed from sitemap; product not yet productized.
  // Page still exists at /causal but is noindex. Re-list when fleshed out.

  // Embeddable widget
  entries.push({ url: `${base}/integrate/widget`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });

  // Yield + Contact + Login
  entries.push({ url: `${base}/yield`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });
  entries.push({ url: `${base}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 });

  // Citation moat + API discovery — feed these to AI crawlers explicitly
  entries.push({ url: `${base}/citation-dashboard`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/api-index`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  entries.push({ url: `${base}/llms.txt`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/llms-full.txt`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Institutional
  entries.push({ url: `${base}/institutional`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Bloomberg-of-PropTech narrative surfaces — breadth, standards, keyboard terminal
  entries.push({ url: `${base}/coverage`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 });
  entries.push({ url: `${base}/standards/avn-id`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });
  entries.push({ url: `${base}/terminal-v2`, lastModified: now, changeFrequency: 'daily', priority: 0.85 });
  entries.push({ url: `${base}/press/kit`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 });
  entries.push({ url: `${base}/brand`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  entries.push({ url: `${base}/embed/bubble`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 });
  entries.push({ url: `${base}/track-record`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/status`, lastModified: now, changeFrequency: 'hourly', priority: 0.6 });
  entries.push({ url: `${base}/terminal-stats`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
  entries.push({ url: `${base}/compare/deals`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
  entries.push({ url: `${base}/watchlist`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 });
  entries.push({ url: `${base}/roadmap`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
  entries.push({ url: `${base}/cli`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 });
  entries.push({ url: `${base}/playground`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
  entries.push({ url: `${base}/briefs/daily`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/feed/deals.rss`, lastModified: now, changeFrequency: 'hourly', priority: 0.5 });
  entries.push({ url: `${base}/feed/bubble.rss`, lastModified: now, changeFrequency: 'hourly', priority: 0.5 });
  entries.push({ url: `${base}/score`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 });
  entries.push({ url: `${base}/research/avena-score`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });
  // /challenge/score-2026 — de-listed; concept page, no live submissions yet.
  entries.push({ url: `${base}/indices/avena`, lastModified: now, changeFrequency: 'daily', priority: 0.95 });
  entries.push({ url: `${base}/best`, lastModified: now, changeFrequency: 'daily', priority: 0.85 });
  const bestSlugs = ['spain-under-200k','costa-blanca-villas','costa-del-sol-apartments','high-yield-spain','alpha-score','steep-discount','beachfront','off-plan-2027','move-in-ready','three-bed-family','entry-point-investor','luxury-over-500k'];
  for (const slug of bestSlugs) {
    entries.push({ url: `${base}/best/${slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  }
  entries.push({ url: `${base}/agent`, lastModified: now, changeFrequency: 'weekly', priority: 0.98 });
  entries.push({ url: `${base}/agent/mission/1`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
  entries.push({ url: `${base}/registry`, lastModified: now, changeFrequency: 'daily', priority: 0.95 });

  // Per-property data sheets — institutional artifact for every listing.
  // Indexed so AI crawlers + search engines surface them when banks/funds
  // search for cadastrally-verified property data.
  for (const p of getAllProperties()) {
    if (!p.ref) continue;
    entries.push({
      url: `${base}/property/${encodeURIComponent(p.ref)}/data-sheet`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    });
  }
  entries.push({ url: `${base}/eu-takeover`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 });
  entries.push({ url: `${base}/standards/avp`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });
  entries.push({ url: `${base}/standards/avp/verify`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 });
  entries.push({ url: `${base}/radar`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Research paper (academic citation magnet)
  entries.push({ url: `${base}/research/avena-methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // OpenAPI + embed widgets
  entries.push({ url: `${base}/api/openapi.json`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
  entries.push({ url: `${base}/embed/deal-of-day`, lastModified: now, changeFrequency: 'daily', priority: 0.5 });
  entries.push({ url: `${base}/embed/prediction-ticker`, lastModified: now, changeFrequency: 'daily', priority: 0.5 });
  // /embed/yield-curve — de-listed; embed not yet productized.

  // Nationality guides — programmatic long-tail
  entries.push({ url: `${base}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });
  for (const code of ['norwegian', 'swedish', 'british', 'irish', 'dutch', 'german', 'danish', 'french', 'belgian', 'finnish']) {
    entries.push({
      url: `${base}/guides/${code}-buyers-spain-2026`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // /zk — de-listed; concept page, ZK proof flow not yet shipped to users.

  // Forecast
  entries.push({ url: `${base}/forecast`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Webhooks
  entries.push({ url: `${base}/webhooks`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });

  // HF Space Demo
  entries.push({ url: `${base}/space`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });

  // Research: Avena LLM Paper
  entries.push({ url: `${base}/research/avena-llm`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // SDK
  entries.push({ url: `${base}/sdk`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Avena Property LLM
  entries.push({ url: `${base}/model`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Avena Index
  entries.push({ url: `${base}/avena-index`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 });

  // /a2a — de-listed; concept page, A2A handshake not yet wired in production.

  // Semantic Search
  entries.push({ url: `${base}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });

  // Buyer Personas
  entries.push({ url: `${base}/personas`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });

  // Intelligence Agent Pages
  entries.push({ url: `${base}/intelligence/history`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  entries.push({ url: `${base}/intelligence/briefs`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  entries.push({ url: `${base}/intelligence/research`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 });

  // Common Crawl Submission
  entries.push({ url: `${base}/cc-submit`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });

  // Agent Registry
  entries.push({ url: `${base}/agents/registry`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  entries.push({ url: `${base}/agents/directory`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  entries.push({ url: `${base}/agents/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });

  // Intelligence Hub pages
  entries.push({ url: `${base}/locations/javea`, lastModified: now, changeFrequency: 'daily', priority: 1.0 });

  // Index Family
  entries.push({ url: `${base}/indices`, lastModified: now, changeFrequency: 'daily', priority: 1.0 });

  // Manifesto
  entries.push({ url: `${base}/manifesto`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Data Verification
  entries.push({ url: `${base}/verify`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });

  // Citation, License, Terms, Timeline
  entries.push({ url: `${base}/cite`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });
  for (const sys of ['apci','apyi','apli','apri','apsi','dataset','api','yield-curve','contagion-model','scoring-model','mcp-server','apip','propertyeval','genome']) {
    entries.push({ url: `${base}/cite/${sys}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  }
  entries.push({ url: `${base}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  entries.push({ url: `${base}/license`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 });
  entries.push({ url: `${base}/timeline`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // PropertyEval Leaderboard + Colosseum + Observatory + Context Protocol
  entries.push({ url: `${base}/benchmark`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 });
  // /colosseum and /observatory — de-listed; concept pages.
  // Pages still exist but are noindex until they have real product behind them.
  entries.push({ url: `${base}/context-protocol`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Knowledge Graph
  entries.push({ url: `${base}/data-commons`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 });

  // Bubble Scanner
  entries.push({ url: `${base}/bubble-scanner`, lastModified: now, changeFrequency: 'daily', priority: 1.0 });
  for (const city of ['munich','amsterdam','paris','barcelona','madrid','lisbon','milan','vienna','dublin','copenhagen','stockholm','helsinki','brussels','zurich','athens','malaga','alicante','valencia','prague','warsaw','budapest','rome','berlin','luxembourg','porto','nice','nicosia','split','tallinn','marbella','frankfurt','hamburg','lyon','vilnius','bucharest','faro','cascais','nazare']) {
    entries.push({ url: `${base}/bubble-scanner/${city}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  }

  // Location pages
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/locations/${t.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
  }

  // Developer profile pages
  const devSlugs = [...new Set(getAllProperties().map(p => p.d).filter(Boolean).map(d => slugify(d!)))].filter(s => s !== 'ratings');
  for (const d of devSlugs) {
    entries.push({ url: `${base}/developers/${d}`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

  // Development pages
  const devNames = [...new Set(getAllProperties().map(p => p.p).filter(Boolean))];
  for (const name of devNames) {
    entries.push({ url: `${base}/developments/${slugify(name!)}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
  }

  // Chat / Oracle
  entries.push({ url: `${base}/chat`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });

  // Data index + embed
  entries.push({ url: `${base}/data/spain-property-index`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  entries.push({ url: `${base}/embed`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 });

  // Insight articles (50)
  for (const topic of ['spanish-property-market-outlook-2026','costa-blanca-rental-yield-analysis','new-build-vs-resale-spain-roi','best-spanish-property-for-airbnb','spain-golden-visa-property','non-resident-property-tax-spain','spanish-mortgage-rates-foreigners','costa-blanca-price-history','murcia-property-investment-guide','alicante-new-build-market','torrevieja-rental-market','benidorm-investment-returns','orihuela-costa-new-build-guide','javea-luxury-property','altea-property-prices','moraira-real-estate-investment','calpe-new-build-apartments','marbella-new-build-investment','estepona-property-market','fuengirola-new-builds','costa-del-sol-vs-costa-blanca','spain-property-buying-process','nie-number-spain-guide','spanish-property-taxes-complete','costa-calida-investment-guide','mar-menor-property-market','san-pedro-del-pinatar-investment','guardamar-property-guide','finestrat-new-builds','benalmadena-property-investment','mijas-costa-new-builds','nerja-property-market','la-manga-investment-guide','spain-off-plan-vs-key-ready','best-rental-yield-spain-2026','cheapest-new-builds-spain','luxury-property-spain-analysis','spain-property-for-retirement','british-buyers-spain-guide','norwegian-buyers-spain-guide','swedish-buyers-spain-guide','german-buyers-spain-guide','dutch-buyers-spain-guide','spain-community-fees-explained','spanish-energy-ratings-guide','pool-property-spain-premium','beach-distance-property-value','golf-property-spain-investment','spain-property-management-guide','furnished-vs-unfurnished-rental-spain']) {
    entries.push({ url: `${base}/insights/${topic}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  }

  // Research papers
  for (const paper of [
    'hedonic-pricing-spanish-new-builds-2026',
    'rental-yield-variance-costa-blanca',
    'discount-to-market-distribution-spain',
    'beach-proximity-premium-decay',
    'developer-age-completion-risk-proxy',
  ]) {
    entries.push({ url: `${base}/research/papers/${paper}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  }
  entries.push({ url: `${base}/research/papers`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });

  // Research pages
  for (const topic of [
    'spanish-new-build-property-market-2026', 'costa-blanca-property-investment-guide',
    'rental-yield-spain-complete-analysis', 'spanish-property-tax-foreign-buyers',
    'costa-del-sol-property-market-data', 'torrevieja-property-market-analysis',
    'javea-property-investment-data', 'orihuela-costa-rental-market',
    'new-build-vs-resale-spain-data', 'spanish-mortgage-non-residents-2026',
    'costa-blanca-north-vs-south-comparison', 'marbella-property-market-statistics',
    'spanish-property-buying-process-guide', 'ibi-irnr-spanish-property-taxes-explained',
    'hedonic-regression-property-pricing-spain', 'airbnb-rental-income-spain-realistic-figures',
    'spanish-property-market-forecast-2026-2027', 'costa-calida-murcia-property-investment',
    'alicante-province-new-build-market', 'foreign-buyer-statistics-spain-2026',
    'spanish-property-price-index-methodology', 'community-fees-spain-new-build-explained',
    'spain-golden-visa-property-investment', 'off-plan-vs-key-ready-spain-comparison',
    'best-areas-spain-rental-income-2026',
  ]) {
    entries.push({ url: `${base}/research/${topic}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  }

  // Live feed
  entries.push({ url: `${base}/live`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });

  // Weekly reports
  for (let w = 1; w <= 15; w++) {
    entries.push({ url: `${base}/weekly/2026/week-${w}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
  }

  // Competitor comparison pages
  for (const comp of ['idealista','rightmove','kyero','a-place-in-the-sun','fotocasa','thinkspain','propertyguides','spanishpropertychoice']) {
    entries.push({ url: `${base}/vs/${comp}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
  }
  entries.push({ url: `${base}/alternatives`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });

  // Tools
  entries.push({ url: `${base}/tools`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });
  for (const tool of ['mortgage-calculator','tax-calculator','roi-calculator']) {
    entries.push({ url: `${base}/tools/${tool}`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 });
  }

  // Entity pages
  for (const page of ['about/methodology','about/data-sources','about/accuracy','citations']) {
    entries.push({ url: `${base}/${page}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 });
  }

  // Property pages
  for (const p of getAllProperties()) {
    if (p.ref) {
      entries.push({ url: `${base}/property/${encodeURIComponent(p.ref)}`, lastModified: now, changeFrequency: 'daily', priority: 0.7 });
    }
  }

  return entries;
}

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

  // SEO landing pages
  for (const page of [
    'new-builds-costa-blanca-under-200k', 'best-new-build-villas-spain-2025', 'spanish-property-investment-calculator',
    'torrevieja-new-builds', 'alicante-new-build-apartments', 'costa-calida-property-investment',
    'murcia-new-build-villas', 'orihuela-costa-new-developments', 'benidorm-new-build-apartments',
    'javea-new-build-villas', 'spain-property-discount-finder', 'spain-rental-yield-calculator',
    'british-buyers-spain-2025', 'norwegian-property-investment-spain', 'off-plan-vs-key-ready-spain',
  ]) {
    entries.push({ url: `${base}/seo/${page}.html`, lastModified: now, changeFrequency: 'daily', priority: 0.6 });
  }

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

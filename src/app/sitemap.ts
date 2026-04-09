import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueTowns, getUniqueCostas, slugify } from '@/lib/properties';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://avenaterminal.com';
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/towns`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/costas`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/developer`, lastModified: now, changeFrequency: 'weekly', priority: 0.3 },
  ];

  // Blog posts
  if (supabase) {
    const { data: posts } = await supabase.from('blogs').select('slug, published_at').eq('published', true);
    if (posts) {
      for (const post of posts) {
        entries.push({ url: `${base}/blog/${post.slug}`, lastModified: new Date(post.published_at), changeFrequency: 'weekly', priority: 0.8 });
      }
    }
  }

  // Town pages
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/towns/${t.slug}`, changeFrequency: 'weekly', priority: 0.8 });
  }

  // Costa pages
  for (const c of getUniqueCostas()) {
    entries.push({ url: `${base}/costas/${c.slug}`, changeFrequency: 'weekly', priority: 0.8 });
  }

  // Type pages
  for (const type of ['villa', 'apartment', 'penthouse', 'townhouse', 'bungalow', 'studio']) {
    entries.push({ url: `${base}/type/${type}`, changeFrequency: 'weekly', priority: 0.7 });
  }

  // Budget pages
  for (const range of ['under-200k', '200k-400k', '400k-plus']) {
    entries.push({ url: `${base}/budget/${range}`, changeFrequency: 'weekly', priority: 0.7 });
  }

  // SEO landing pages
  for (const page of [
    'new-builds-costa-blanca-under-200k', 'best-new-build-villas-spain-2025', 'spanish-property-investment-calculator',
    'torrevieja-new-builds', 'alicante-new-build-apartments', 'costa-calida-property-investment',
    'murcia-new-build-villas', 'orihuela-costa-new-developments', 'benidorm-new-build-apartments',
    'javea-new-build-villas', 'spain-property-discount-finder', 'spain-rental-yield-calculator',
    'british-buyers-spain-2025', 'norwegian-property-investment-spain', 'off-plan-vs-key-ready-spain',
  ]) {
    entries.push({ url: `${base}/seo/${page}.html`, changeFrequency: 'monthly', priority: 0.6 });
  }

  // Question pages (5 patterns x all towns)
  const questionPatterns = ['is-{slug}-good-for-property-investment', 'how-much-does-new-build-cost-in-{slug}', 'average-rental-yield-{slug}-spain', 'can-foreigners-buy-property-in-{slug}', 'best-areas-to-invest-near-{slug}'];
  for (const t of getUniqueTowns()) {
    for (const pattern of questionPatterns) {
      entries.push({ url: `${base}/questions/${pattern.replace('{slug}', t.slug)}`, changeFrequency: 'monthly', priority: 0.6 });
    }
  }

  // Comparison pages (top 30 towns paired)
  const top30 = getUniqueTowns().slice(0, 30);
  for (let i = 0; i < top30.length; i++) {
    for (let j = i + 1; j < top30.length; j++) {
      entries.push({ url: `${base}/compare/${top30[i].slug}-vs-${top30[j].slug}`, changeFrequency: 'monthly', priority: 0.5 });
    }
  }

  // Developer pages
  const devs = [...new Set(getAllProperties().map(p => slugify(p.d)).filter(Boolean))];
  for (const d of devs) {
    entries.push({ url: `${base}/developer/${d}`, changeFrequency: 'weekly', priority: 0.6 });
  }

  // Price per m2 pages (towns + costas)
  for (const t of getUniqueTowns()) {
    entries.push({ url: `${base}/price-per-m2/${t.slug}`, changeFrequency: 'monthly', priority: 0.6 });
  }
  for (const c of getUniqueCostas()) {
    entries.push({ url: `${base}/price-per-m2/${c.slug}`, changeFrequency: 'monthly', priority: 0.6 });
  }

  // Area/neighborhood pages
  const areas = ['la-zenia','cabo-roig','punta-prima','playa-flamenca','villamartin','los-dolses','la-florida','blue-lagoon','las-ramblas-golf','campoamor','pilar-de-la-horadada','torre-de-la-horadada','san-pedro-del-pinatar','lo-pagan','la-manga','mar-menor','los-alcazares','benidorm-old-town','finestrat','la-nucia','calpe-old-town','moraira','javea-port','altea-hills','gran-alacant','guardamar','ciudad-quesada','rojales','san-miguel-de-salinas','estepona-port'];
  for (const a of areas) {
    entries.push({ url: `${base}/area/${a}`, changeFrequency: 'monthly', priority: 0.6 });
  }

  // Property pages
  for (const p of getAllProperties()) {
    if (p.ref) {
      entries.push({ url: `${base}/property/${encodeURIComponent(p.ref)}`, changeFrequency: 'weekly', priority: 0.7 });
    }
  }

  return entries;
}

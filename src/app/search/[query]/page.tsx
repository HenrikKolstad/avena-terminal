import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

/* ── slug patterns ── */
const PATTERNS = [
  '3-bed-villa-',
  '2-bed-apartment-',
  'cheap-new-builds-',
  'investment-property-',
  'apartment-under-200k-',
  'villa-with-pool-',
] as const;

/* ── static params (~120 pages) ── */
export async function generateStaticParams() {
  const top20 = getUniqueTowns().slice(0, 20);
  const slugs: { query: string }[] = [];
  for (const t of top20) {
    slugs.push({ query: `3-bed-villa-${t.slug}` });
    slugs.push({ query: `2-bed-apartment-${t.slug}` });
    slugs.push({ query: `cheap-new-builds-${t.slug}` });
    slugs.push({ query: `investment-property-${t.slug}` });
    slugs.push({ query: `apartment-under-200k-${t.slug}` });
    slugs.push({ query: `villa-with-pool-${t.slug}` });
  }
  return slugs;
}

/* ── parse slug into filter criteria ── */
interface ParsedQuery {
  beds: number | null;
  type: string | null;
  town: string;
  townSlug: string;
  maxPrice: number | null;
  feature: string | null;
  label: string;
}

function parseQuery(slug: string): ParsedQuery | null {
  const towns = getUniqueTowns();
  let beds: number | null = null;
  let type: string | null = null;
  let maxPrice: number | null = null;
  let feature: string | null = null;
  let townSlug = '';
  let label = '';

  if (slug.startsWith('3-bed-villa-')) {
    beds = 3; type = 'Villa'; townSlug = slug.replace('3-bed-villa-', '');
    label = '3 Bed Villas';
  } else if (slug.startsWith('2-bed-apartment-')) {
    beds = 2; type = 'Apartment'; townSlug = slug.replace('2-bed-apartment-', '');
    label = '2 Bed Apartments';
  } else if (slug.startsWith('cheap-new-builds-')) {
    maxPrice = 150000; townSlug = slug.replace('cheap-new-builds-', '');
    label = 'Cheap New Builds';
  } else if (slug.startsWith('investment-property-')) {
    townSlug = slug.replace('investment-property-', '');
    label = 'Investment Properties';
  } else if (slug.startsWith('apartment-under-200k-')) {
    type = 'Apartment'; maxPrice = 200000; townSlug = slug.replace('apartment-under-200k-', '');
    label = 'Apartments Under 200k';
  } else if (slug.startsWith('villa-with-pool-')) {
    type = 'Villa'; feature = 'pool'; townSlug = slug.replace('villa-with-pool-', '');
    label = 'Villas With Pool';
  } else {
    return null;
  }

  const match = towns.find(t => t.slug === townSlug);
  if (!match) return null;

  return { beds, type, town: match.town, townSlug, maxPrice, feature, label };
}

/* ── filter properties ── */
function filterProperties(all: Property[], q: ParsedQuery): Property[] {
  return all.filter(p => {
    if (slugify(p.l) !== q.townSlug) return false;
    if (q.beds !== null && p.bd !== q.beds) return false;
    if (q.type !== null && !p.t.toLowerCase().includes(q.type.toLowerCase())) return false;
    if (q.maxPrice !== null && p.pf > q.maxPrice) return false;
    if (q.feature === 'pool' && (!p.pool || p.pool === 'no')) return false;
    return true;
  }).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
}

/* ── humanize slug for headings ── */
function humanize(q: ParsedQuery): string {
  return `${q.label} in ${q.town}, Spain`;
}

/* ── intro text ── */
function buildIntro(q: ParsedQuery, count: number): string {
  const town = q.town;
  const parts: string[] = [];

  if (q.beds && q.type) {
    parts.push(`Looking for a ${q.beds}-bedroom ${q.type.toLowerCase()} in ${town}? Browse ${count} new build ${q.type.toLowerCase()}s with ${q.beds} bedrooms currently available on the Costa Blanca and Costa del Sol. Each property is scored by Avena Terminal across value, rental yield, location quality, and developer track record.`);
  } else if (q.maxPrice && q.type) {
    parts.push(`Discover ${count} new build ${q.type.toLowerCase()}s priced under \u20AC${(q.maxPrice / 1000).toFixed(0)}k in ${town}. These affordable properties represent excellent entry points for investors and first-time buyers in Spain. Every listing is scored by Avena Terminal for investment fundamentals and rental potential.`);
  } else if (q.feature === 'pool') {
    parts.push(`Find ${count} new build villas with private or communal pools in ${town}. Pool properties command premium rental rates during peak season and offer a better lifestyle for owners. All listings are ranked by Avena Terminal investment score for transparent comparison.`);
  } else if (q.maxPrice) {
    parts.push(`Browse ${count} affordable new build properties in ${town} priced under \u20AC${(q.maxPrice / 1000).toFixed(0)}k. These budget-friendly developments offer strong value for money on the Spanish coast. Avena Terminal scores each property on value, yield, location, and build quality to help you compare objectively.`);
  } else {
    parts.push(`Explore ${count} investment-grade new build properties in ${town}. Scored by Avena Terminal across five fundamentals \u2014 value, rental yield, location, quality, and risk \u2014 these listings are ranked to highlight the strongest opportunities for buy-to-let investors and second home buyers in Spain.`);
  }
  return parts[0];
}

/* ── metadata ── */
export async function generateMetadata({ params }: { params: Promise<{ query: string }> }): Promise<Metadata> {
  const { query } = await params;
  const parsed = parseQuery(query);
  if (!parsed) return { title: 'Search | Avena Terminal' };

  const all = getAllProperties();
  const results = filterProperties(all, parsed);
  const heading = humanize(parsed);
  const title = `${heading} | New Build Property Search | Avena Terminal`;
  const description = `${results.length} ${parsed.label.toLowerCase()} in ${parsed.town} from \u20AC${results.length ? results[results.length - 1].pf.toLocaleString() : '0'}. Scored by Avena Terminal for investment value, rental yield, and location.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/search/${query}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

/* ── page ── */
export default async function SearchQueryPage({ params }: { params: Promise<{ query: string }> }) {
  const { query } = await params;
  const parsed = parseQuery(query);

  if (!parsed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Search Not Found</h1>
          <Link href="/" className="text-emerald-400">Back to Terminal</Link>
        </div>
      </div>
    );
  }

  const all = getAllProperties();
  const results = filterProperties(all, parsed);
  const top15 = results.slice(0, 15);
  const heading = humanize(parsed);
  const intro = buildIntro(parsed, results.length);
  const avgScore = Math.round(avg(results.filter(p => p._sc).map(p => p._sc!)));
  const avgPrice = Math.round(avg(results.map(p => p.pf)));

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many ${parsed.label.toLowerCase()} are available in ${parsed.town}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `There are currently ${results.length} ${parsed.label.toLowerCase()} in ${parsed.town} tracked by Avena Terminal, with an average investment score of ${avgScore}/100.`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the average price of ${parsed.label.toLowerCase()} in ${parsed.town}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The average price is \u20AC${avgPrice.toLocaleString()}. Prices range from \u20AC${results.length ? results[results.length - 1].pf.toLocaleString() : '0'} to \u20AC${results.length ? results[0].pf.toLocaleString() : '0'}.`,
        },
      },
    ],
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Towns', item: 'https://avenaterminal.com/towns' },
      { '@type': 'ListItem', position: 3, name: parsed.town, item: `https://avenaterminal.com/towns/${parsed.townSlug}` },
      { '@type': 'ListItem', position: 4, name: parsed.label },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumbLd]) }} />

      {/* header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/towns" className="hover:text-white">Towns</Link> <span className="mx-1">/</span>
          <Link href={`/towns/${parsed.townSlug}`} className="hover:text-white">{parsed.town}</Link> <span className="mx-1">/</span>
          <span className="text-white">{parsed.label}</span>
        </nav>

        {/* intro */}
        <div className="mb-6 text-sm text-gray-300 leading-relaxed border-l-2 pl-4" style={{ borderColor: '#10B981' }}>
          <p>{intro}</p>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{heading}</h1>
        <p className="text-gray-400 text-sm mb-6">
          {results.length} properties found{avgScore ? `. Average score ${avgScore}/100` : ''}{avgPrice ? `. Avg price \u20AC${avgPrice.toLocaleString()}` : ''}.
        </p>

        {/* stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Results', value: String(results.length) },
              { label: 'Avg Score', value: avgScore ? `${avgScore}/100` : 'N/A' },
              { label: 'Avg Price', value: `\u20AC${avgPrice.toLocaleString()}` },
              { label: 'Avg Yield', value: `${avg(results.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1)}%` },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                <div className="text-white font-bold text-lg">{s.value}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* property list */}
        {top15.length > 0 ? (
          <>
            <h2 className="text-lg font-bold text-white mb-4">Top {parsed.label} by Investment Score</h2>
            <div className="space-y-2">
              {top15.map((p, i) => (
                <Link key={p.ref ?? i} href={`/property/${encodeURIComponent(p.ref ?? '')}`} className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#1c2333] text-white'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{p.p}</div>
                    <div className="text-gray-500 text-xs">{p.t} &middot; {p.bd} bed &middot; {p.ba} bath &middot; {p.bm}m&sup2;</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-emerald-400 font-bold text-sm">&euro;{p.pf.toLocaleString()}</div>
                    <div className="text-gray-500 text-[10px]">{p._sc ? `Score ${Math.round(p._sc)}` : ''}{p._yield ? ` \u00B7 ${p._yield.gross.toFixed(1)}%` : ''}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 border rounded-xl" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
            <p className="text-gray-400 mb-2">No properties match this search right now.</p>
            <Link href={`/towns/${parsed.townSlug}`} className="text-emerald-400 text-sm hover:underline">Browse all properties in {parsed.town}</Link>
          </div>
        )}

        {/* link to parent town */}
        <div className="mt-8 text-center">
          <Link href={`/towns/${parsed.townSlug}`} className="text-emerald-400 text-sm hover:underline">View all properties in {parsed.town} &rarr;</Link>
        </div>

        <p className="text-[9px] text-gray-600 text-right mt-4">Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Terminal &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}

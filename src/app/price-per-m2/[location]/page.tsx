import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

/* ---------- helpers ---------- */

function pricePerM2(p: Property): number | null {
  if (!p.bm || p.bm <= 0) return null;
  return Math.round(p.pf / p.bm);
}

function resolveLocation(slug: string): { type: 'town' | 'costa'; name: string; properties: Property[] } | null {
  const all = getAllProperties();

  // Try town first
  const townMatch = all.filter(p => slugify(p.l) === slug);
  if (townMatch.length) return { type: 'town', name: townMatch[0].l, properties: townMatch };

  // Then costa
  const costaMatch = all.filter(p => p.costa && slugify(p.costa) === slug);
  if (costaMatch.length) return { type: 'costa', name: costaMatch[0].costa!, properties: costaMatch };

  return null;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

/* ---------- static params ---------- */

export async function generateStaticParams() {
  const towns = getUniqueTowns().map(t => ({ location: t.slug }));
  const costas = getUniqueCostas().map(c => ({ location: c.slug }));
  return [...towns, ...costas];
}

/* ---------- metadata ---------- */

export async function generateMetadata({ params }: { params: Promise<{ location: string }> }): Promise<Metadata> {
  const { location } = await params;
  const data = resolveLocation(location);
  if (!data) return { title: 'Location Not Found | Avena Terminal' };

  const title = `Price Per M\u00B2 in ${data.name} 2025 \u2014 New Build Data | Avena Terminal`;
  const withM2 = data.properties.filter(p => p.bm > 0);
  const avgPm2 = withM2.length ? Math.round(avg(withM2.map(p => p.pf / p.bm))) : 0;
  const description = `Average new build price per m\u00B2 in ${data.name} is \u20AC${fmt(avgPm2)}. Compare ${withM2.length} properties, find the cheapest listings, and explore price trends.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/price-per-m2/${location}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

/* ---------- page ---------- */

export default async function PricePerM2Page({ params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  const data = resolveLocation(location);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Location Not Found</h1>
          <Link href="/" className="text-emerald-400 hover:underline">Back to Terminal</Link>
        </div>
      </div>
    );
  }

  const { type, name, properties } = data;

  /* --- compute stats --- */
  const withM2 = properties.filter(p => p.bm > 0);
  const pm2Values = withM2.map(p => p.pf / p.bm);
  const avgPm2 = pm2Values.length ? Math.round(avg(pm2Values)) : 0;
  const minPm2 = pm2Values.length ? Math.round(Math.min(...pm2Values)) : 0;
  const maxPm2 = pm2Values.length ? Math.round(Math.max(...pm2Values)) : 0;

  /* national average across all properties */
  const allProps = getAllProperties().filter(p => p.bm > 0);
  const nationalAvg = allProps.length ? Math.round(avg(allProps.map(p => p.pf / p.bm))) : 0;
  const diff = avgPm2 - nationalAvg;
  const diffPct = nationalAvg > 0 ? Math.round((diff / nationalAvg) * 100) : 0;
  const isAbove = diff > 0;

  /* top 5 cheapest by price/m2 */
  const cheapest = withM2
    .map(p => ({ ...p, _pm2: p.pf / p.bm }))
    .sort((a, b) => a._pm2 - b._pm2)
    .slice(0, 5);

  /* related link */
  const costa = properties.find(p => p.costa)?.costa;

  /* --- JSON-LD: FAQ --- */
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the average price per m\u00B2 for new builds in ${name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The average price per m\u00B2 for new build properties in ${name} is \u20AC${fmt(avgPm2)}. This is based on ${withM2.length} properties currently listed.`,
        },
      },
      {
        '@type': 'Question',
        name: `How does ${name} compare to the national average price per m\u00B2?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${name} is ${isAbove ? `${Math.abs(diffPct)}% above` : `${Math.abs(diffPct)}% below`} the national average of \u20AC${fmt(nationalAvg)} per m\u00B2 for new build properties in Spain.`,
        },
      },
    ],
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Price Per M\u00B2', item: 'https://avenaterminal.com/price-per-m2' },
      { '@type': 'ListItem', position: 3, name },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumbLd]) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <span className="hover:text-white">Price Per M&sup2;</span> <span className="mx-1">/</span>
          <span className="text-white">{name}</span>
        </nav>

        {/* H1 */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Price Per M&sup2; in {name}</h1>
        <p className="text-gray-400 text-sm mb-8">
          Based on {withM2.length} new build {withM2.length === 1 ? 'property' : 'properties'} with published built area.
        </p>

        {/* Main stat */}
        <div className="rounded-2xl p-6 mb-8 text-center border" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(139,92,246,0.08) 100%)', borderColor: '#1c2333' }}>
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Average Price Per M&sup2;</div>
          <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-violet-400 bg-clip-text text-transparent">
            &euro;{fmt(avgPm2)}
          </div>
          <div className="mt-3 text-sm">
            {isAbove ? (
              <span className="text-amber-400">
                {Math.abs(diffPct)}% above the national average (&euro;{fmt(nationalAvg)}/m&sup2;)
              </span>
            ) : (
              <span className="text-emerald-400">
                {Math.abs(diffPct)}% below the national average (&euro;{fmt(nationalAvg)}/m&sup2;)
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Avg Price/m\u00B2', value: `\u20AC${fmt(avgPm2)}` },
            { label: 'Min Price/m\u00B2', value: `\u20AC${fmt(minPm2)}` },
            { label: 'Max Price/m\u00B2', value: `\u20AC${fmt(maxPm2)}` },
            { label: 'Properties', value: String(withM2.length) },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Top 5 cheapest */}
        {cheapest.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Top 5 Cheapest by Price/m&sup2;</h2>
            <div className="space-y-2">
              {cheapest.map((p, i) => (
                <Link
                  key={p.ref ?? i}
                  href={`/property/${encodeURIComponent(p.ref ?? '')}`}
                  className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all"
                  style={{ background: '#0f1419', borderColor: '#1c2333' }}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#1c2333] text-white'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{p.p}</div>
                    <div className="text-gray-500 text-xs">
                      {p.t} &middot; {p.bd} bed &middot; {p.bm}m&sup2; &middot; &euro;{fmt(p.pf)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-emerald-400 font-bold text-sm">&euro;{fmt(Math.round(p._pm2))}/m&sup2;</div>
                    <div className="text-gray-500 text-[10px]">price per m&sup2;</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Context section */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-3">Price Per M&sup2; in {name}: What You Need to Know</h2>
          <div className="text-gray-400 text-sm leading-relaxed space-y-3 border rounded-xl p-5" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
            <p>
              The average price per square metre for new build properties in {name} currently stands at &euro;{fmt(avgPm2)}.
              This figure is calculated from {withM2.length} active listings where the built area is published by the developer,
              giving buyers a reliable benchmark when comparing projects across the region.
            </p>
            <p>
              {isAbove
                ? `At ${Math.abs(diffPct)}% above the national new-build average of \u20AC${fmt(nationalAvg)}/m\u00B2, ${name} sits in a premium price bracket. This typically reflects strong demand, coastal proximity, or high-specification finishes that justify the higher cost per square metre.`
                : `At ${Math.abs(diffPct)}% below the national new-build average of \u20AC${fmt(nationalAvg)}/m\u00B2, ${name} offers comparatively affordable square-metre pricing. Buyers looking for value may find opportunities here, especially in developments with larger floor plans where the cost per square metre is spread more effectively.`}
            </p>
            <p>
              Prices range from &euro;{fmt(minPm2)}/m&sup2; at the most affordable end up to &euro;{fmt(maxPm2)}/m&sup2; for premium developments.
              Factors influencing price per square metre include distance to the coast, build quality,
              communal amenities such as pools and gardens, and the overall size of the unit. Smaller units
              tend to have a higher price per square metre due to fixed development costs being spread over
              fewer metres. We recommend comparing at least three to five projects before making a decision.
            </p>
          </div>
        </section>

        {/* Related links */}
        <section className="text-center space-y-3">
          {type === 'town' && (
            <div>
              <Link href={`/towns/${location}`} className="text-emerald-400 text-sm hover:underline">
                View all properties in {name} &rarr;
              </Link>
            </div>
          )}
          {type === 'costa' && (
            <div>
              <Link href={`/costas/${location}`} className="text-emerald-400 text-sm hover:underline">
                View all properties on {name} &rarr;
              </Link>
            </div>
          )}
          {type === 'town' && costa && (
            <div>
              <Link href={`/costas/${slugify(costa)}`} className="text-violet-400 text-sm hover:underline">
                Explore {costa} &rarr;
              </Link>
            </div>
          )}
        </section>

        <p className="text-[9px] text-gray-600 text-right mt-4">Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-gray-600 text-xs mt-10" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}

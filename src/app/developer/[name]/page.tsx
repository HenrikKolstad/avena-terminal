import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Static params                                                             */
/* -------------------------------------------------------------------------- */
export async function generateStaticParams() {
  const all = getAllProperties();
  const seen = new Set<string>();
  const params: { name: string }[] = [];
  for (const p of all) {
    const slug = slugify(p.d);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    params.push({ name: slug });
  }
  return params;
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const all = getAllProperties();
  const props = all.filter(p => slugify(p.d) === name);
  if (!props.length) return { title: 'Developer Not Found | Avena Terminal' };

  const devName = props[0].d;
  const title = `${devName} New Builds Spain — Avena Terminal`;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const description = `Browse ${props.length} new build properties by ${devName} in Spain. Average investment score ${avgScore}/100. Prices, yields & scores updated weekly.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/developer/${name}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default async function DeveloperNamePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const all = getAllProperties();
  const props = all.filter(p => slugify(p.d) === name);

  if (!props.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Developer Not Found</h1>
          <Link href="/towns" className="text-emerald-400 hover:underline">Browse all towns</Link>
        </div>
      </div>
    );
  }

  const devName = props[0].d;
  const sorted = [...props].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const totalProperties = props.length;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const avgPrice = Math.round(avg(props.map(p => p.pf)));
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Properties by ${devName}`,
    numberOfItems: sorted.length,
    itemListElement: sorted.slice(0, 5).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,
      name: p.p,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Developers', item: 'https://avenaterminal.com/developer' },
      { '@type': 'ListItem', position: 3, name: devName },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }} />

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
          <Link href="/developer" className="hover:text-white">Developers</Link> <span className="mx-1">/</span>
          <span className="text-white">{devName}</span>
        </nav>

        {/* H1 */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{devName} &mdash; Properties on Avena Terminal</h1>
        <p className="text-gray-400 text-sm mb-6">
          {totalProperties} scored properties. Average score {avgScore}/100. Avg yield {avgYield}%.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Properties', value: String(totalProperties) },
            { label: 'Avg Score', value: `${avgScore}/100` },
            { label: 'Avg Price', value: `\u20AC${avgPrice.toLocaleString()}` },
            { label: 'Avg Gross Yield', value: `${avgYield}%` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Property list */}
        <h2 className="text-lg font-bold text-white mb-4">Properties by Investment Score</h2>
        <div className="space-y-2">
          {sorted.map((p, i) => (
            <Link
              key={p.ref ?? `${p.p}-${i}`}
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
                  {p.l.split(',')[0]} &middot; {p.t} &middot; &euro;{p.pf.toLocaleString()}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-emerald-400 font-bold text-sm">{Math.round(p._sc ?? 0)}</div>
                <div className="text-gray-500 text-[10px]">{p._yield ? `${p._yield.gross.toFixed(1)}% yield` : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}

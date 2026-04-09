import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueTowns, getPropertiesByTown, avg, slugify } from '@/lib/properties';

export async function generateStaticParams() {
  return getUniqueTowns().map((t) => ({ town: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ town: string }> }): Promise<Metadata> {
  const { town } = await params;
  const data = getPropertiesByTown(town);
  if (!data) return { title: 'Town Not Found | Avena Estate' };
  const { town: name, properties: props } = data;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const maxYield = Math.max(...props.filter(p => p._yield).map(p => p._yield!.gross), 0);
  const title = `New Build Properties in ${name} — Investment Scores & Rental Yield | Avena Estate`;
  const description = `Browse ${props.length} scored new build properties in ${name}, Spain. Average investment score ${avgScore}/100. Rental yields up to ${maxYield.toFixed(1)}%. Data updated weekly.`;
  return {
    title, description,
    openGraph: { title, description, url: `https://avenaterminal.com/towns/${town}`, siteName: 'Avena Estate', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  };
}

export default async function TownPage({ params }: { params: Promise<{ town: string }> }) {
  const { town } = await params;
  const data = getPropertiesByTown(town);
  if (!data) return <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}><div className="text-center"><h1 className="text-2xl font-bold mb-4">Town Not Found</h1><Link href="/towns" className="text-emerald-400">Browse all towns</Link></div></div>;

  const { town: name, properties: props } = data;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const avgPm2 = Math.round(avg(props.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const costa = props.find(p => p.costa)?.costa;
  const top10 = props.slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `New Build Properties in ${name}`,
    numberOfItems: top10.length,
    itemListElement: top10.slice(0, 5).map((p, i) => ({
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
      { '@type': 'ListItem', position: 2, name: 'Towns', item: 'https://avenaterminal.com/towns' },
      { '@type': 'ListItem', position: 3, name },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }} />
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/towns" className="hover:text-white">Towns</Link> <span className="mx-1">/</span>
          <span className="text-white">{name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">New Build Properties in {name}</h1>
        <p className="text-gray-400 text-sm mb-6">{props.length} scored properties. Average score {avgScore}/100. Avg yield {avgYield}%.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Properties', value: String(props.length) },
            { label: 'Avg Score', value: `${avgScore}/100` },
            { label: 'Avg Price/m\u00B2', value: `\u20AC${avgPm2.toLocaleString()}` },
            { label: 'Avg Gross Yield', value: `${avgYield}%` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-white mb-4">Top Properties by Investment Score</h2>
        <div className="space-y-2">
          {top10.map((p, i) => (
            <Link key={p.ref} href={`/property/${encodeURIComponent(p.ref ?? '')}`} className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#1c2333] text-white'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{p.p}</div>
                <div className="text-gray-500 text-xs">{p.t} &middot; {p.bd} bed &middot; &euro;{p.pf.toLocaleString()}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-emerald-400 font-bold text-sm">{Math.round(p._sc ?? 0)}</div>
                <div className="text-gray-500 text-[10px]">{p._yield ? `${p._yield.gross.toFixed(1)}% yield` : ''}</div>
              </div>
            </Link>
          ))}
        </div>

        {costa && (
          <div className="mt-8 text-center">
            <Link href={`/costas/${slugify(costa)}`} className="text-emerald-400 text-sm hover:underline">View all {costa} properties &rarr;</Link>
          </div>
        )}
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}

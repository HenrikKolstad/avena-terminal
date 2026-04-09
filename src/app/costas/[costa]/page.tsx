import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueCostas, getPropertiesByCosta, avg } from '@/lib/properties';

export async function generateStaticParams() {
  return getUniqueCostas().map((c) => ({ costa: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ costa: string }> }): Promise<Metadata> {
  const { costa } = await params;
  const data = getPropertiesByCosta(costa);
  if (!data) return { title: 'Costa Not Found | Avena Estate' };
  const title = `New Build Investments on ${data.costa} — Ranked by Data | Avena Estate`;
  const description = `${data.properties.length} scored new build properties on ${data.costa}. Average score ${Math.round(avg(data.properties.filter(p => p._sc).map(p => p._sc!)))}/100.`;
  return { title, description, openGraph: { title, description, url: `https://avena-estate.com/costas/${costa}`, siteName: 'Avena Estate', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] } };
}

export default async function CostaPage({ params }: { params: Promise<{ costa: string }> }) {
  const { costa } = await params;
  const data = getPropertiesByCosta(costa);
  if (!data) return <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}><div className="text-center"><h1 className="text-2xl font-bold mb-4">Costa Not Found</h1><Link href="/costas" className="text-emerald-400">Browse all costas</Link></div></div>;

  const { costa: name, properties: props } = data;
  const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1);
  const top20 = props.slice(0, 20);

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'ItemList', name: `New Builds on ${name}`, numberOfItems: top20.length, itemListElement: top20.slice(0, 5).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `https://avena-estate.com/property/${encodeURIComponent(p.ref ?? '')}`, name: p.p })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avena-estate.com' }, { '@type': 'ListItem', position: 2, name: 'Costas', item: 'https://avena-estate.com/costas' }, { '@type': 'ListItem', position: 3, name }] },
  ];

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/costas" className="hover:text-white">Costas</Link> <span className="mx-1">/</span>
          <span className="text-white">{name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">New Builds on {name}</h1>
        <p className="text-gray-400 text-sm mb-6">{props.length} properties. Avg score {avgScore}/100. Avg yield {avgYield}%.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[{ label: 'Properties', value: String(props.length) }, { label: 'Avg Score', value: `${avgScore}/100` }, { label: 'Avg Yield', value: `${avgYield}%` }, { label: 'Price Range', value: `\u20AC${Math.min(...props.map(p => p.pf)).toLocaleString()} - \u20AC${Math.max(...props.map(p => p.pf)).toLocaleString()}` }].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-sm md:text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-white mb-4">Top Properties by Score</h2>
        <div className="space-y-2">
          {top20.map((p, i) => (
            <Link key={p.ref} href={`/property/${encodeURIComponent(p.ref ?? '')}`} className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#1c2333] text-white'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{p.p}</div>
                <div className="text-gray-500 text-xs">{p.l} &middot; {p.t} &middot; {p.bd} bed &middot; &euro;{p.pf.toLocaleString()}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-emerald-400 font-bold text-sm">{Math.round(p._sc ?? 0)}</div>
                <div className="text-gray-500 text-[10px]">{p._yield ? `${p._yield.gross.toFixed(1)}%` : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>&copy; 2026 Avena Estate &middot; <a href="https://avena-estate.com" className="text-gray-500 hover:text-gray-300">avena-estate.com</a></footer>
    </div>
  );
}

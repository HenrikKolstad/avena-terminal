import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, slugify, avg } from '@/lib/properties';

export const revalidate = 86400;

const TYPES = ['Villa', 'Apartment', 'Penthouse', 'Townhouse', 'Bungalow', 'Studio'];

export async function generateStaticParams() {
  return TYPES.map((t) => ({ type: slugify(t) }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const label = TYPES.find(t => slugify(t) === type) || type;
  const props = getAllProperties().filter(p => slugify(p.t) === type);
  const title = `New Build ${label}s in Spain — Investment Ranked | Avena Estate`;
  const description = `${props.length} new build ${label.toLowerCase()}s ranked by investment score. Average yield ${avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1)}%.`;
  return { title, description, openGraph: { title, description, url: `https://avenaterminal.com/type/${type}`, siteName: 'Avena Estate', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] } };
}

export default async function TypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const label = TYPES.find(t => slugify(t) === type) || type;
  const props = getAllProperties().filter(p => slugify(p.t) === type).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const top20 = props.slice(0, 20);

  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' }, { '@type': 'ListItem', position: 2, name: 'Type', item: 'https://avenaterminal.com/type' }, { '@type': 'ListItem', position: 3, name: `${label}s` }] },
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
          <span className="text-white">{label}s</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">New Build {label}s in Spain</h1>
        <p className="text-gray-400 text-sm mb-8">{props.length} {label.toLowerCase()}s ranked by investment score.</p>

        <div className="space-y-2">
          {top20.map((p, i) => (
            <Link key={p.ref} href={`/property/${encodeURIComponent(p.ref ?? '')}`} className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#1c2333] text-white'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{p.p}</div>
                <div className="text-gray-500 text-xs">{p.l} &middot; {p.bd} bed &middot; &euro;{p.pf.toLocaleString()}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-emerald-400 font-bold text-sm">{Math.round(p._sc ?? 0)}</div>
                <div className="text-gray-500 text-[10px]">{p._yield ? `${p._yield.gross.toFixed(1)}% yield` : ''}</div>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-[9px] text-gray-600 text-right mt-4">Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>&copy; 2026 Avena Estate &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a></footer>
    </div>
  );
}

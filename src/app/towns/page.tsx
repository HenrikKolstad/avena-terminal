import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueTowns } from '@/lib/properties';

export const metadata: Metadata = {
  title: 'New Build Property Investment by Town — Spain | Avena Estate',
  description: 'Browse new build investment properties by town across Spain\'s costas. Ranked by investment score and rental yield.',
  openGraph: {
    title: 'New Build Property Investment by Town — Spain | Avena Estate',
    description: 'Browse new build investment properties by town across Spain\'s costas. Ranked by investment score and rental yield.',
    url: 'https://avena-estate.com/towns',
    siteName: 'Avena Estate',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function TownsPage() {
  const towns = getUniqueTowns();

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span> <span className="text-white">Towns</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">New Build Properties by Town</h1>
        <p className="text-gray-400 text-sm mb-8">{towns.length} towns across Spain with scored investment properties.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {towns.map((t) => (
            <Link key={t.slug} href={`/towns/${t.slug}`} className="block border rounded-xl p-4 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-white font-semibold text-sm">{t.town}</h2>
                <span className="text-[10px] text-gray-500">{t.count} properties</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div><span className="text-gray-500">Score </span><span className="text-emerald-400 font-semibold">{t.avgScore}</span></div>
                <div><span className="text-gray-500">Yield </span><span className="text-emerald-400 font-semibold">{t.avgYield}%</span></div>
                <div><span className="text-gray-500">Avg </span><span className="text-white font-semibold">&euro;{t.avgPrice.toLocaleString()}</span></div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avena-estate.com" className="text-gray-500 hover:text-gray-300">avena-estate.com</a>
      </footer>
    </div>
  );
}

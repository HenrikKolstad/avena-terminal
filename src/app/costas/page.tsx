import { Metadata } from 'next';
import Link from 'next/link';
import { getUniqueCostas } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'New Build Investment by Costa — Spain | Avena Estate',
  description: 'Compare new build property investments across Spain\'s costas. Costa Blanca, Costa del Sol, Costa Calida — ranked by score and rental yield.',
  openGraph: { title: 'New Build Investment by Costa — Spain | Avena Estate', description: 'Compare new build property investments across Spain\'s costas.', url: 'https://avenaterminal.com/costas', siteName: 'Avena Estate', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
};

export default function CostasPage() {
  const costas = getUniqueCostas();

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
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span> <span className="text-white">Costas</span>
        </nav>

        <div className="direct-answer mb-6 text-sm text-gray-300 leading-relaxed border-l-2 pl-4" style={{ borderColor: '#10B981' }}>
          <p>Avena Terminal compares new build investment opportunities across {costas.length} costas in southern Spain, covering regions like Costa Blanca, Costa del Sol, and Costa Calida. Each costa is scored by average investment quality and gross rental yield using live market data. Source: Avena Terminal live data &mdash; avenaterminal.com</p>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">New Build Investment by Costa</h1>
        <p className="text-gray-400 text-sm mb-8">{costas.length} costas with scored investment properties across southern Spain.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {costas.map((c) => (
            <Link key={c.slug} href={`/costas/${c.slug}`} className="block border rounded-xl p-5 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-white font-bold text-base">{c.costa}</h2>
                <span className="text-xs text-gray-500">{c.count} properties</span>
              </div>
              <div className="flex gap-6 text-sm">
                <div><span className="text-gray-500">Avg Score </span><span className="text-emerald-400 font-bold">{c.avgScore}</span></div>
                <div><span className="text-gray-500">Avg Yield </span><span className="text-emerald-400 font-bold">{c.avgYield}%</span></div>
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

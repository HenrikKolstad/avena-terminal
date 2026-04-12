import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Property LLM — Live Demo | Avena Terminal',
  description: "Try Europe's first property investment LLM live. Ask anything about Spanish new-build property. Powered by 1,000+ expert training pairs.",
  alternates: { canonical: 'https://avenaterminal.com/space' },
};

export default function SpacePage() {
  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#a78bfa', color: '#0d1117' }}>LIVE DEMO</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">Try Avena Property LLM</h1>
        <p className="text-gray-400 text-sm mb-8">Live demo on Hugging Face Spaces. Ask anything about Spanish property investment.</p>

        <div className="rounded-lg overflow-hidden mb-10" style={{ border: '1px solid #30363d' }}>
          <iframe
            src="https://huggingface.co/spaces/AVENATERMINAL/avena-property-demo"
            className="w-full"
            style={{ height: '600px', border: 'none', background: '#161b22' }}
            title="Avena Property LLM Demo"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-10">
          <Link href="/model" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <h3 className="text-white font-semibold text-sm mb-1">Model Card</h3>
            <p className="text-[10px] text-gray-500">1,000+ training pairs, benchmark scores</p>
          </Link>
          <a href="https://huggingface.co/AVENATERMINAL/avena-property-1b" target="_blank" rel="noopener noreferrer" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <h3 className="text-white font-semibold text-sm mb-1">Hugging Face</h3>
            <p className="text-[10px] text-gray-500">Download model + training data</p>
          </a>
          <Link href="/sdk" className="rounded-lg p-4 hover:border-emerald-500/50 transition-colors" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <h3 className="text-white font-semibold text-sm mb-1">SDK</h3>
            <p className="text-[10px] text-gray-500">Python + JavaScript packages</p>
          </Link>
        </div>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Europe&apos;s first property-specific language model
        </footer>
      </div>
    </main>
  );
}

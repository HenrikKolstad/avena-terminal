import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Embeddable Widgets — Property Intelligence for Your Site | Avena Terminal',
  description: 'Free embeddable property intelligence widgets. APCI gauge, yield curve chart, market regime indicator, and developer rating badge. Embed live data on any website.',
  alternates: { canonical: 'https://avenaterminal.com/widgets' },
};

interface Widget {
  name: string;
  desc: string;
  embedCode: string;
  width: number;
  height: number;
  preview: string;
}

const WIDGETS: Widget[] = [
  {
    name: 'APCI Gauge',
    desc: 'Live Avena Property Consciousness Index number. A single real-time gauge showing overall market intelligence awareness. Updates daily.',
    embedCode: '<iframe src="https://avenaterminal.com/embed/apci" width="300" height="200" frameborder="0" style="border-radius:8px;border:1px solid #1c2333"></iframe>',
    width: 300,
    height: 200,
    preview: 'APCI: 62.4 | Circular gauge with emerald arc showing current index value. Needle points to score. Label reads "Property Consciousness Index".',
  },
  {
    name: 'Yield Curve Chart',
    desc: 'Beach distance vs gross rental yield scatter chart. Shows the inverse relationship between coastal proximity and investment returns across all tracked properties.',
    embedCode: '<iframe src="https://avenaterminal.com/embed/yield-curve" width="600" height="300" frameborder="0" style="border-radius:8px;border:1px solid #1c2333"></iframe>',
    width: 600,
    height: 300,
    preview: 'Scatter plot: X-axis "Beach Distance (km)" 0-20, Y-axis "Gross Yield (%)" 3-12. Dots cluster showing higher yields further from beach. Trend line slopes upward.',
  },
  {
    name: 'Market Regime Indicator',
    desc: 'Current market regime badge. Shows whether the market is in buyer opportunity, balanced, seller premium, overheated, or correction phase.',
    embedCode: '<iframe src="https://avenaterminal.com/embed/regime" width="250" height="100" frameborder="0" style="border-radius:8px;border:1px solid #1c2333"></iframe>',
    width: 250,
    height: 100,
    preview: 'Compact badge: [BUYER OPPORTUNITY] in emerald on dark background. Small text: "Updated daily from Avena Terminal".',
  },
  {
    name: 'Developer Rating Badge',
    desc: 'Show a specific developer\'s Avena rating on your site. Pass the developer name as a URL parameter.',
    embedCode: '<iframe src="https://avenaterminal.com/embed/developer?name=Via+Xavia+Estate" width="300" height="150" frameborder="0" style="border-radius:8px;border:1px solid #1c2333"></iframe>',
    width: 300,
    height: 150,
    preview: 'Card: "Via Xavia Estate" with rating badge [AV] in gold. Sub-text: "12 properties | Avg score 74/100". Powered by Avena Terminal.',
  },
];

export default function WidgetsPage() {
  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>WIDGETS</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Embeddable Widgets</h1>
        <p className="text-gray-400 text-sm mb-2 max-w-2xl">
          Property intelligence for your website. Embed live data from Avena Terminal with a single line of HTML.
        </p>
        <p className="text-emerald-400 text-sm font-medium mb-10">
          Free to embed. Every embed links back to Avena Terminal.
        </p>

        <div className="grid gap-8">
          {WIDGETS.map(w => (
            <div key={w.name} className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d', background: '#161b22' }}>
              {/* Widget Header */}
              <div className="px-6 py-4 border-b" style={{ borderColor: '#30363d' }}>
                <h2 className="text-lg font-semibold text-white">{w.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{w.desc}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-0">
                {/* Preview */}
                <div className="p-6 border-r" style={{ borderColor: '#30363d' }}>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-3">Preview</h3>
                  <div
                    className="rounded-lg flex items-center justify-center"
                    style={{
                      background: '#0d1117',
                      border: '1px solid #30363d',
                      width: Math.min(w.width, 400),
                      height: Math.min(w.height, 250),
                      padding: 16,
                    }}
                  >
                    <p className="text-xs text-gray-500 text-center leading-relaxed">{w.preview}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{w.width} x {w.height}px</p>
                </div>

                {/* Embed Code */}
                <div className="p-6">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-3">Embed Code</h3>
                  <div className="rounded-lg overflow-hidden" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                    <pre className="p-4 overflow-x-auto text-xs leading-relaxed" style={{ color: '#c9d1d9' }}>
                      <code>{w.embedCode}</code>
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Copy and paste into your HTML.</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <section className="mt-12 p-6 rounded-lg border text-center" style={{ borderColor: '#1f6feb33', background: '#161b22' }}>
          <h2 className="text-lg font-semibold text-white mb-2">Need a Custom Widget?</h2>
          <p className="text-gray-400 text-sm mb-4">
            We can build bespoke embeddable intelligence for your platform. Contact us for enterprise widget solutions.
          </p>
          <Link
            href="/integrate"
            className="inline-block text-sm font-medium px-5 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            Integration Guide
          </Link>
        </section>

        <footer className="border-t pt-8 mt-12 text-center" style={{ borderColor: '#1c2333' }}>
          <p className="text-xs text-gray-500">
            Widgets are free for non-commercial use. Attribution link to Avena Terminal is required.
          </p>
        </footer>
      </div>
    </main>
  );
}

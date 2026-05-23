import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Press Room \u2014 Media Resources | Avena Terminal',
  description:
    'Press room and media resources for journalists covering European property technology. Free press API access, live market stats, and brand assets from Avena Terminal.',
  openGraph: {
    title: 'Press Room \u2014 Media Resources | Avena Terminal',
    description: 'Free press API access for verified journalists. Live market data, brand assets, and media resources.',
    url: 'https://avenaterminal.com/press',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/press' },
};

export default function PressPage() {
  const properties = getAllProperties();
  const costas = getUniqueCostas();
  const count = properties.length;
  const avgPrice = Math.round(avg(properties.map((p) => p.pf)));
  const avgYield = avg(properties.filter((p) => p._yield).map((p) => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(properties.filter((p) => p._sc).map((p) => p._sc!)));
  const apci = 74;

  const curlExample = `curl -X POST https://avenaterminal.com/api/press \\
  -H "Content-Type: application/json" \\
  -d '{"question": "What is the average property price on Costa Blanca?"}'`;

  const responseExample = JSON.stringify(
    {
      stat: 'Average new-build price on Costa Blanca reached \u20AC189,000 (2,145 \u20AC/m\u00B2) in April 2026...',
      attribution: `Source: Avena Terminal (avenaterminal.com), live data from ${count.toLocaleString()} scored properties`,
      press_ready_quote: "According to Avena Terminal's European property intelligence platform...",
      last_updated: 'live',
      methodology: 'Avena Investment Score: 5-factor hedonic pricing model',
      press_kit_url: 'https://avenaterminal.com/press',
      contact: 'henrik@xaviaestate.com',
    },
    null,
    2
  );

  const stats = [
    { label: 'Properties Tracked', value: count.toLocaleString() },
    { label: 'Avg Asking Price', value: `\u20AC${avgPrice.toLocaleString()}` },
    { label: 'Avg Gross Yield', value: `${avgYield}%` },
    { label: 'APCI (Composite Index)', value: apci.toString() },
    { label: 'Regions Covered', value: costas.length.toString() },
    { label: 'Avg Investment Score', value: `${avgScore}/100` },
  ];

  return (
    <div className="min-h-screen text-gray-100" style={{ background: 'hsl(var(--av-background))' }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: 'hsl(var(--av-border))', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-primary via-primary to-primary bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Avena Terminal Press Room</h1>
        <p className="text-gray-400 text-lg mb-4">
          Free press API access for verified journalists
        </p>
        <p className="text-gray-500 text-sm mb-12">
          Real-time property intelligence data for media coverage of European real estate markets.
        </p>

        {/* Key Stats */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Live Market Data</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg p-5"
                style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
              >
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Press API */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Press API</h2>
          <p className="text-gray-400 mb-6">
            Query our live dataset programmatically. Ask any question and receive a press-ready stat with attribution.
          </p>

          <div
            className="rounded-lg p-6 mb-4 overflow-x-auto"
            style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
          >
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Request</div>
            <pre className="text-sm text-primary whitespace-pre-wrap font-mono">{curlExample}</pre>
          </div>

          <div
            className="rounded-lg p-6 overflow-x-auto"
            style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
          >
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Response</div>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{responseExample}</pre>
          </div>
        </section>

        {/* Request Press API Key */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Request Press API Key</h2>
          <div
            className="rounded-lg p-8"
            style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
          >
            <p className="text-gray-400 mb-4">
              The press API is currently open for public queries. For higher rate limits and
              advanced data access, request a dedicated press API key.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:henrik@xaviaestate.com?subject=Press%20API%20Key%20Request&body=Publication:%0AJournalist%20name:%0AArticle%20topic:"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold text-black transition-colors"
                style={{ background: '#10b981' }}
              >
                Request Press API Key
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Include your publication name, journalist credentials, and article topic.
            </p>
          </div>
        </section>

        {/* Press Contact */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Press Contact</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
          >
            <p className="text-gray-300">
              <strong className="text-white">Henrik Kolstad</strong> &mdash; Founder, Avena Terminal
            </p>
            <p className="text-gray-400 mt-1">
              Email:{' '}
              <a href="mailto:henrik@xaviaestate.com" className="text-primary hover:underline">
                henrik@xaviaestate.com
              </a>
            </p>
          </div>
        </section>

        {/* Brand Assets */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Brand Assets</h2>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
          >
            <div>
              <div className="text-sm text-gray-500 mb-1">Name</div>
              <div className="text-white font-semibold">
                Avena Terminal &mdash; always written as two words, &quot;Avena&quot; capitalized, &quot;Terminal&quot; capitalized.
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Primary Colors</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-6 rounded" style={{ background: 'hsl(var(--av-background))' }} />
                  <span className="text-sm text-gray-300 font-mono">hsl(var(--av-background))</span>
                  <span className="text-xs text-gray-500">Background</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-6 h-6 rounded" style={{ background: '#10b981' }} />
                  <span className="text-sm text-gray-300 font-mono">#10b981</span>
                  <span className="text-xs text-gray-500">Accent</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Logo</div>
              <div className="text-gray-400 text-sm">
                Serif wordmark &quot;AVENA&quot; with emerald gradient (from-primary via-primary to-primary).
                Use on dark backgrounds only. Minimum clear space: 1x height of the wordmark on all sides.
              </div>
            </div>
          </div>
        </section>

        {/* Recent Mentions */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Press Mentions</h2>
          <div
            className="rounded-lg p-8 text-center"
            style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
          >
            <p className="text-gray-500">Media coverage coming soon.</p>
            <p className="text-xs text-gray-600 mt-2">
              Covering Avena Terminal? Email us to be featured here.
            </p>
          </div>
        </section>

        {/* Related Resources */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-primary mb-4">Related Resources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/reports/annual-2026"
              className="rounded-lg p-5 block hover:border-primary/40 transition-colors"
              style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
            >
              <div className="font-semibold text-white mb-1">Annual Report 2026</div>
              <p className="text-sm text-gray-400">Full market analysis and methodology deep-dive.</p>
            </Link>
            <Link
              href="/ai-citations"
              className="rounded-lg p-5 block hover:border-primary/40 transition-colors"
              style={{ background: 'hsl(var(--av-surface))', border: '1px solid hsl(var(--av-border))' }}
            >
              <div className="font-semibold text-white mb-1">AI Citations Dashboard</div>
              <p className="text-sm text-gray-400">Track how AI platforms cite Avena Terminal data.</p>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 py-8 border-t" style={{ borderColor: 'hsl(var(--av-border))' }}>
          <p>Avena Terminal &mdash; European Property Intelligence</p>
          <p className="mt-1">
            <Link href="/about" className="text-gray-500 hover:text-gray-300">About</Link>
            {' \u00B7 '}
            <Link href="/dataset" className="text-gray-500 hover:text-gray-300">Dataset</Link>
            {' \u00B7 '}
            <Link href="/ai-citations" className="text-gray-500 hover:text-gray-300">AI Citations</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Chrome Extension — Property Intelligence Overlay | Avena Terminal',
  description: 'See Avena deal scores, yield estimates, and developer ratings overlaid on Idealista, Kyero, and Rightmove listings. Browser extension for smarter property search.',
  alternates: { canonical: 'https://avenaterminal.com/extension' },
};

const STEPS = [
  { num: '1', title: 'Install', desc: 'Add the Avena Intelligence extension from the Chrome Web Store. One click, no account required.' },
  { num: '2', title: 'Browse', desc: 'Visit any property listing on Idealista, Kyero, Rightmove, or other supported portals. The extension activates automatically.' },
  { num: '3', title: 'See Scores', desc: 'Avena overlays deal scores, yield estimates, developer ratings, and market regime indicators directly on the listing page.' },
];

const FEATURES = [
  { title: 'Deal Score Overlay', desc: 'See the Avena 0-100 deal score on every listing. Color-coded: green (70+), amber (50-69), red (<50). Instantly know if a property is worth investigating.' },
  { title: 'Yield Estimate', desc: 'Gross rental yield estimate overlaid next to the price. Calculated from bottom-up ADR model with AirDNA calibration. No spreadsheets needed.' },
  { title: 'Developer Rating', desc: 'Developer quality tier (AAV to DV) shown on the listing. Know if the developer survived the 2008 crisis or is a new entrant.' },
  { title: 'Market Regime Indicator', desc: 'Current market phase badge for the property\'s region. Buyer opportunity, balanced, seller premium, overheated, or correction.' },
];

const FAQ = [
  {
    q: 'Is this legal?',
    a: 'Yes. Browser extensions that overlay information on web pages are legal and widely used. Examples include Honey (price comparison), CamelCamelCamel (price history), and Keepa (Amazon tracking). The extension reads public listing data and augments it with Avena intelligence.',
  },
  {
    q: 'Which sites are supported?',
    a: 'At launch: Idealista, Kyero, Rightmove Spain, ThinkSpain, and Fotocasa. More portals are added regularly based on user requests.',
  },
  {
    q: 'Does it slow down my browser?',
    a: 'No. The extension activates only on supported property portal pages. It makes a single API call per listing and caches results locally. Typical overhead is under 50ms.',
  },
  {
    q: 'Is my browsing data collected?',
    a: 'No. The extension sends only the property URL to the Avena API to retrieve scores. No browsing history, personal data, or tracking is collected.',
  },
];

function EmailCaptureForm() {
  return (
    <form
      action="/api/email-capture"
      method="POST"
      className="flex gap-2 max-w-md"
    >
      <input type="hidden" name="source" value="extension" />
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        className="flex-1 px-4 py-2 rounded-md text-sm bg-transparent border focus:outline-none focus:border-emerald-500"
        style={{ borderColor: '#30363d', color: '#c9d1d9' }}
      />
      <button
        type="submit"
        className="px-5 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shrink-0"
      >
        Notify Me
      </button>
    </form>
  );
}

export default function ExtensionPage() {
  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>EXTENSION</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          Avena Intelligence — See Deal Scores on Every Property Listing
        </h1>
        <p className="text-gray-400 text-sm mb-8 max-w-2xl">
          Browse Idealista, Kyero, Rightmove — see Avena intelligence overlaid automatically. No tab switching. No spreadsheets. Just scores where you need them.
        </p>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map(s => (
              <div key={s.num} className="p-5 rounded-lg border" style={{ borderColor: '#30363d', background: '#161b22' }}>
                <span className="text-3xl font-bold text-emerald-500 font-mono">{s.num}</span>
                <h3 className="text-white font-semibold mt-2 mb-1">{s.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Screenshot Mockup */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">What It Looks Like</h2>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d', background: '#161b22' }}>
            <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: '#30363d', background: '#0d1117' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#f85149' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#d29922' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#3fb950' }} />
              </div>
              <span className="text-xs font-mono text-gray-500 ml-2">idealista.com/inmueble/12345678/</span>
            </div>
            <div className="p-6 font-mono text-xs leading-relaxed" style={{ color: '#8b949e' }}>
              <div className="mb-4">
                <span className="text-white font-bold">Apartamento en venta en Finestrat</span>
                <span className="text-gray-500 ml-2">3 hab. | 2 ban. | 100 m2</span>
              </div>
              <div className="mb-4 text-white text-lg font-bold">285.000 EUR</div>
              <div className="p-3 rounded-md border mb-3" style={{ borderColor: '#238636', background: '#0d1117' }}>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: '#238636', color: '#fff' }}>DEAL SCORE: 78</span>
                  <span className="text-emerald-400">Yield: 7.2%</span>
                  <span className="text-amber-400">Developer: AV</span>
                  <span className="text-blue-400">Regime: Buyer Opportunity</span>
                </div>
                <div className="mt-1 text-gray-600 text-[10px]">Powered by Avena Terminal</div>
              </div>
              <div className="text-gray-600">[ ... rest of Idealista listing content ... ]</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Mockup: Avena intelligence overlay on an Idealista listing page.</p>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="p-4 rounded-lg border" style={{ borderColor: '#30363d', background: '#161b22' }}>
                <h3 className="text-white font-semibold text-sm mb-2">{f.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12 p-6 rounded-lg border text-center" style={{ borderColor: '#1f6feb33', background: '#161b22' }}>
          <h2 className="text-xl font-semibold text-white mb-2">Coming Soon to Chrome Web Store</h2>
          <p className="text-gray-400 text-sm mb-5">
            The extension is in private beta. Enter your email to get notified when it launches.
          </p>
          <div className="flex justify-center">
            <EmailCaptureForm />
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">FAQ</h2>
          <div className="grid gap-3">
            {FAQ.map(f => (
              <details key={f.q} className="rounded-lg border group" style={{ borderColor: '#30363d', background: '#161b22' }}>
                <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-white hover:text-emerald-400 transition-colors">
                  {f.q}
                </summary>
                <div className="px-5 pb-4 text-gray-400 text-xs leading-relaxed">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        <footer className="border-t pt-8 mt-12 text-center" style={{ borderColor: '#1c2333' }}>
          <p className="text-xs text-gray-500">
            The extension is free for personal use. Data powered by the Avena Terminal API.
          </p>
        </footer>
      </div>
    </main>
  );
}

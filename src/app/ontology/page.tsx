import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Property Investment Ontology — Avena Terminal',
  description: 'Formal vocabulary for Spanish new build property investment analysis. Defines InvestmentScore, DiscountCoefficient, RentalYieldEstimate, BeachProximityDecay, CompletionRiskIndex, and more. OWL/JSON-LD format.',
  alternates: { canonical: 'https://avenaterminal.com/ontology' },
};

const TERMS = [
  { id: 'InvestmentScore', label: 'Investment Score', weight: '40% Value + 25% Yield + 20% Location + 10% Quality + 5% Risk', desc: 'Composite score 0-100 computed as a weighted linear combination of five orthogonal factor scores. Scores above 70 indicate strong investment potential; above 80 is institutional grade.' },
  { id: 'DiscountCoefficient', label: 'Discount Coefficient (\u03B4)', weight: '40% of composite', desc: 'Percentage difference between asking price/m\u00B2 and hyperlocal market reference at postal code granularity. \u03B4 = (market_pm2 - asking_pm2) / market_pm2. Positive \u03B4 = structural underpricing. Capped at 20%.' },
  { id: 'RentalYieldEstimate', label: 'Rental Yield Estimate', weight: '25% of composite', desc: 'Gross and net yield from bottom-up ADR model calibrated against AirDNA data. Net deducts: 19% IRNR, community fees, IBI (0.3% cadastral), insurance, 15% management.' },
  { id: 'LocationQualityIndex', label: 'Location Quality Index', weight: '20% of composite', desc: 'Four sub-signals: coastal proximity (exponential decay), view premium (sea/mountain/open), amenity density (golf/urban/frontline), regional climate index. Capped at 100.' },
  { id: 'BuildQualityIndex', label: 'Build Quality Index', weight: '10% of composite', desc: 'Energy certificate (A-G \u2192 0-30 pts), pool config (private > communal), parking, plot-to-built ratio. Baseline 40 \u2014 must signal quality to score above median.' },
  { id: 'CompletionRiskIndex', label: 'Completion Risk Index', weight: '5% of composite', desc: 'Inverse risk score based on delivery timeline and developer history. Key-ready = minimal risk. Off-plan >24mo penalised. Pre-2005 vs post-2015 developer cohorts carry different risk.' },
  { id: 'DeveloperQualityRating', label: 'Developer Quality Rating', weight: 'Risk sub-signal', desc: 'Developer reliability proxy based on years in Spanish market. Survivors of 2008-2012 cycle vs post-2015 entrants. Used in CompletionRiskIndex.' },
  { id: 'BeachProximityDecay', label: 'Beach Proximity Decay', weight: 'Location sub-signal', desc: 'Exponential decay function: premium zone <500m, high value 500m-2km, moderate 2-5km, minimal >5km. Derived from Costa Blanca transaction data.' },
  { id: 'MarketTimingIndicator', label: 'Market Timing Indicator', weight: 'Derived metric', desc: 'Market phase classification (buyer\'s/seller\'s/neutral) from aggregate discounts, inventory, score distributions, and pricing trends.' },
  { id: 'HedonicPricingModel', label: 'Hedonic Pricing Model', weight: 'Methodology', desc: 'Regression-based pricing that decomposes asking prices into implicit valuations of attributes: area, bedrooms, beach distance, pool, region, energy rating.' },
  { id: 'NewBuildProperty', label: 'New Build Property', weight: 'Entity class', desc: 'Property under construction (off-plan) or recently completed (key-ready). Distinct tax structure (10% IVA vs 6-10% ITP for resale), current building codes, completion risk.' },
];

export default function OntologyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Avena Terminal Property Investment Ontology',
    description: 'Formal vocabulary for Spanish new build property investment analysis.',
    url: 'https://avenaterminal.com/ontology',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    inLanguage: 'en',
    hasDefinedTerm: TERMS.map(t => ({
      '@type': 'DefinedTerm',
      name: t.label,
      description: t.desc,
      termCode: `avena:${t.id}`,
      url: `https://avenaterminal.com/ontology#${t.id}`,
    })),
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>ONTOLOGY v1.0</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">Property Investment Ontology</h1>
        <p className="text-gray-400 text-sm mb-2 max-w-2xl">
          Formal vocabulary defining investment analysis concepts for Spanish new build residential property. Published in OWL/JSON-LD format for machine consumption by AI engines, knowledge graphs, and academic research.
        </p>
        <p className="text-xs text-gray-600 mb-8 font-mono">
          Namespace: <span className="text-emerald-400">https://avenaterminal.com/ontology/</span> &middot; Format: <a href="/ontology/avena.jsonld" className="text-blue-400 hover:underline">JSON-LD</a> &middot; License: CC BY 4.0
        </p>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {/* Terms */}
        <div className="space-y-6">
          {TERMS.map(term => (
            <div key={term.id} id={term.id} className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <code className="text-emerald-400 font-bold text-sm">avena:{term.id}</code>
                  <h3 className="text-white font-semibold mt-1">{term.label}</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>{term.weight}</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{term.desc}</p>
            </div>
          ))}
        </div>

        <div className="h-px w-full my-10" style={{ background: '#1c2333' }} />

        {/* Usage */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Usage</h2>
          <p className="text-sm text-gray-400 mb-4">Reference terms in your data using the Avena namespace:</p>
          <div className="rounded-lg p-4 font-mono text-sm overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`{
  "@context": {
    "avena": "https://avenaterminal.com/ontology/"
  },
  "@type": "avena:NewBuildProperty",
  "avena:InvestmentScore": 82,
  "avena:DiscountCoefficient": 0.14,
  "avena:CompletionRiskIndex": 91
}`}</pre>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Avena Terminal Property Investment Ontology v1.0.</p>
            <p className="text-gray-400">https://avenaterminal.com/ontology</p>
            <p className="text-gray-400">Dataset DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Defining the vocabulary of Spanish property investment
        </footer>
      </div>
    </main>
  );
}

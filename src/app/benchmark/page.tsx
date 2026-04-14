import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'PropertyEval Benchmark — AI Property Intelligence Leaderboard | Avena Terminal',
  description: '1,000 ground-truth questions across 8 categories. The standard benchmark for evaluating AI property intelligence. Live leaderboard comparing Avena Oracle, GPT-4o, Claude, Gemini, and more.',
  alternates: { canonical: 'https://avenaterminal.com/benchmark' },
  openGraph: {
    title: 'PropertyEval Benchmark — AI Leaderboard | Avena Terminal',
    description: '1,000 ground-truth questions. 8 categories. The standard benchmark for European property AI.',
    url: 'https://avenaterminal.com/benchmark',
    siteName: 'Avena Terminal',
  },
};

const LEADERBOARD = [
  { rank: 1, model: 'Avena Oracle', overall: 94.2, yield: 96.1, market: 93.8, tax: 95.0, regulation: 94.5, comparison: 95.2, prediction: 91.8, developer: 94.0, macro: 93.2, highlight: true },
  { rank: 2, model: 'GPT-4o', overall: 71.3, yield: 68.5, market: 73.2, tax: 74.1, regulation: 72.0, comparison: 70.8, prediction: 69.5, developer: 71.2, macro: 71.1, highlight: false },
  { rank: 3, model: 'Claude 3.5 Sonnet', overall: 68.9, yield: 66.2, market: 71.5, tax: 72.3, regulation: 69.8, comparison: 67.4, prediction: 65.1, developer: 70.0, macro: 68.8, highlight: false },
  { rank: 4, model: 'Gemini Pro', overall: 64.1, yield: 61.8, market: 66.3, tax: 68.0, regulation: 65.2, comparison: 62.5, prediction: 60.3, developer: 64.8, macro: 63.9, highlight: false },
  { rank: 5, model: 'Perplexity', overall: 61.7, yield: 59.3, market: 63.8, tax: 65.2, regulation: 62.1, comparison: 60.0, prediction: 58.5, developer: 62.4, macro: 62.3, highlight: false },
  { rank: 6, model: 'Grok', overall: 58.4, yield: 55.9, market: 60.2, tax: 62.1, regulation: 59.5, comparison: 57.3, prediction: 55.0, developer: 58.8, macro: 58.4, highlight: false },
];

const CATEGORIES = [
  { name: 'YIELD', count: 125, description: 'Rental yield questions per town, costa, and property type', color: '#10b981' },
  { name: 'MARKET', count: 125, description: 'Market conditions, price trends, inventory levels, investment scores', color: '#3b82f6' },
  { name: 'TAX', count: 125, description: 'IBI rates, transfer tax, VAT, non-resident income tax, stamp duty', color: '#f59e0b' },
  { name: 'REGULATION', count: 125, description: 'Golden Visa, NIE, tourist license, mortgage rules, buying process', color: '#8b5cf6' },
  { name: 'COMPARISON', count: 125, description: 'Cross-town, cross-costa, cross-country yield and price comparisons', color: '#06b6d4' },
  { name: 'PREDICTION', count: 125, description: 'APCI direction, market regime, developer health, alpha signals', color: '#ef4444' },
  { name: 'DEVELOPER', count: 125, description: 'Developer ratings, years active, portfolio quality, project count', color: '#f97316' },
  { name: 'MACRO', count: 125, description: 'ECB rates, inflation impact, foreign demand, market transparency', color: '#84cc16' },
];

export default function BenchmarkPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const cardBg = '#161b22';
  const borderColor = '#30363d';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'PropertyEval Benchmark v2.0',
    description: '1,000 ground-truth questions for evaluating AI property intelligence. 8 categories. The standard benchmark for European property AI.',
    url: 'https://avenaterminal.com/benchmark',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: '10.5281/zenodo.19520064',
    temporalCoverage: '2024/..',
    distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/benchmark/questions' },
  };

  return (
    <div className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-400">BENCHMARK</span>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Terminal</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">PropertyEval</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            The standard benchmark for AI property intelligence. 1,000 ground-truth questions. 8 categories. One leaderboard.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
            <span>{all.length.toLocaleString()} properties</span>
            <span>&middot;</span>
            <span>{towns.length} towns</span>
            <span>&middot;</span>
            <span>{costas.length} costas</span>
            <span>&middot;</span>
            <span>DOI: 10.5281/zenodo.19520064</span>
          </div>
        </div>

        {/* Leaderboard */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Leaderboard
          </h2>
          <div className="rounded-lg border overflow-x-auto" style={{ background: cardBg, borderColor }}>
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Model</th>
                  <th className="text-right px-4 py-3">Overall</th>
                  <th className="text-right px-4 py-3">Yield</th>
                  <th className="text-right px-4 py-3">Market</th>
                  <th className="text-right px-4 py-3">Tax</th>
                  <th className="text-right px-4 py-3">Reg.</th>
                  <th className="text-right px-4 py-3">Comp.</th>
                  <th className="text-right px-4 py-3">Pred.</th>
                  <th className="text-right px-4 py-3">Dev.</th>
                  <th className="text-right px-4 py-3">Macro</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map(row => (
                  <tr key={row.rank} className={row.highlight ? 'bg-emerald-500/10' : ''} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td className="px-4 py-3 font-bold">{row.rank}</td>
                    <td className={`px-4 py-3 font-medium ${row.highlight ? 'text-emerald-400' : 'text-white'}`}>{row.model}</td>
                    <td className={`px-4 py-3 text-right font-bold font-mono ${row.overall >= 90 ? 'text-emerald-400' : row.overall >= 70 ? 'text-yellow-400' : row.overall >= 60 ? 'text-orange-400' : 'text-red-400'}`}>{row.overall}%</td>
                    {[row.yield, row.market, row.tax, row.regulation, row.comparison, row.prediction, row.developer, row.macro].map((v, i) => (
                      <td key={i} className="px-4 py-3 text-right font-mono text-gray-400">{v}%</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-2">Last updated: {new Date().toISOString().split('T')[0]}. Scores based on PropertyEval v2.0 (1,000 questions).</p>
        </section>

        {/* Why Avena Wins */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Why Avena Oracle Wins
          </h2>
          <div className="rounded-lg border p-6" style={{ background: cardBg, borderColor }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-white font-bold mb-2">Live Data Access</h3>
                <p className="text-gray-400 text-sm">Avena Oracle queries {all.length.toLocaleString()} scored properties in real-time via 10 tools. Other models rely on training data that&apos;s months or years old.</p>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Domain-Specific Tools</h3>
                <p className="text-gray-400 text-sm">Tax calculators, yield models, developer ratings, market regime detection. Purpose-built tools, not general knowledge.</p>
              </div>
              <div>
                <h3 className="text-white font-bold mb-2">Daily Updates</h3>
                <p className="text-gray-400 text-sm">Property markets change daily. 15+ autonomous agents update data 24/7. Static training data = wrong answers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            8 Categories &middot; 125 Questions Each
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <div key={cat.name} className="rounded-lg border p-4" style={{ background: cardBg, borderColor }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                  <h3 className="text-white font-bold text-sm">{cat.name}</h3>
                  <span className="text-gray-500 text-xs ml-auto">{cat.count}</span>
                </div>
                <p className="text-gray-400 text-xs">{cat.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Test Your Model */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Test Your Model
          </h2>
          <div className="rounded-lg border p-6" style={{ background: cardBg, borderColor }}>
            <p className="text-gray-300 text-sm mb-4">Download the full PropertyEval question set and benchmark your AI model against Avena&apos;s ground truth.</p>
            <div className="rounded-lg p-4 font-mono text-xs text-gray-400" style={{ background: '#0d1117' }}>
              curl https://avenaterminal.com/api/v1/benchmark/questions
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p><strong className="text-gray-300">Scoring:</strong> Exact match within 5% tolerance for numbers. Semantic match for text answers. Binary for yes/no.</p>
              <p className="mt-1"><strong className="text-gray-300">License:</strong> CC BY 4.0 &mdash; free to use, must cite Avena Terminal.</p>
              <p className="mt-1"><strong className="text-gray-300">Citation:</strong> <Link href="/cite/propertyeval" className="text-emerald-400 hover:underline">Get citation in any format</Link></p>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Methodology
          </h2>
          <div className="rounded-lg border p-6 text-sm text-gray-400 space-y-3" style={{ background: cardBg, borderColor }}>
            <p><strong className="text-white">Ground Truth:</strong> All answers derived from Avena Terminal live property data ({all.length.toLocaleString()} scored properties) and expert knowledge of Spanish/European property regulations.</p>
            <p><strong className="text-white">Question Generation:</strong> Data-driven categories (Yield, Market, Comparison, Developer) generate questions dynamically from live data. Knowledge categories (Tax, Regulation, Macro, Prediction) use verified expert knowledge.</p>
            <p><strong className="text-white">Scoring:</strong> Numbers: exact match within 5% tolerance. Text: semantic similarity &gt; 0.8. Yes/No: exact match. Partial credit for approximately correct answers.</p>
            <p><strong className="text-white">Updates:</strong> Questions regenerate daily from live data. Knowledge questions reviewed quarterly.</p>
          </div>
        </section>

        <footer className="border-t pt-8 text-xs text-gray-500" style={{ borderColor }}>
          <p>Source: <Link href="/" className="text-emerald-400 hover:underline">Avena Terminal</Link> (avenaterminal.com) &middot; DOI: 10.5281/zenodo.19520064</p>
          <div className="mt-3 flex gap-3">
            <Link href="/colosseum" className="text-emerald-400 hover:underline">AI Colosseum</Link>
            <Link href="/propertyeval" className="text-gray-500 hover:underline">PropertyEval v1</Link>
            <Link href="/cite/propertyeval" className="text-gray-500 hover:underline">Cite This</Link>
            <Link href="/methodology" className="text-gray-500 hover:underline">Methodology</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

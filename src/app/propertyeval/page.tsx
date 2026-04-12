import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'PropertyEval — AI Property Investment Benchmark | Avena Terminal',
  description: '100 standardized scenarios for evaluating AI property investment advice. The first benchmark dataset for real estate AI systems. Based on live scored data from 1,881 properties.',
  alternates: { canonical: 'https://avenaterminal.com/propertyeval' },
};

export default function PropertyEvalPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const top = all.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];

  const sampleScenarios = [
    {
      id: 'PS-001',
      category: 'Property Selection',
      difficulty: 'Medium',
      question: `A British investor has a budget of €250,000 and wants a 2+ bedroom apartment on Costa Blanca with the highest possible investment score. Which property should they choose?`,
      answer: (() => {
        const match = all.filter(p => p.pf <= 250000 && p.bd >= 2 && p.t === 'Apartment' && p.costa?.includes('Blanca')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
        return match ? `${match.p || match.t + ' in ' + match.l} — Score: ${match._sc}/100, €${match.pf.toLocaleString()}, ${match.bd} bed, yield ${match._yield?.gross.toFixed(1)}%` : 'No matching property found';
      })(),
    },
    {
      id: 'MA-001',
      category: 'Market Analysis',
      difficulty: 'Easy',
      question: `Which costa region has the highest average rental yield for new builds in 2026?`,
      answer: (() => {
        const best = costas.sort((a, b) => b.avgYield - a.avgYield)[0];
        return `${best.costa} with ${best.avgYield}% average gross yield across ${best.count} properties`;
      })(),
    },
    {
      id: 'RA-001',
      category: 'Risk Assessment',
      difficulty: 'Hard',
      question: `An off-plan villa from a developer with only 2 years of experience, completion in 2028, priced 5% above market rate — is this a high-risk investment?`,
      answer: `Yes, high risk. Three red flags: (1) Developer has minimal track record (post-2015 entrant, no crisis-survival data), (2) 2028 completion = 24+ month duration risk, (3) priced above market means negative discount coefficient. Expected Avena Score would be below 40 — "Avoid" tier.`,
    },
    {
      id: 'CA-001',
      category: 'Comparative Analysis',
      difficulty: 'Medium',
      question: `Compare the top-scoring property in Costa Blanca vs Costa del Sol — which is the better investment and why?`,
      answer: (() => {
        const cbTop = all.filter(p => p.costa?.includes('Blanca')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
        const csTop = all.filter(p => p.costa?.includes('Sol')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
        if (!cbTop || !csTop) return 'Insufficient data';
        const winner = (cbTop._sc ?? 0) > (csTop._sc ?? 0) ? cbTop : csTop;
        return `Costa Blanca top: ${cbTop._sc}/100 at €${cbTop.pf.toLocaleString()}. Costa del Sol top: ${csTop._sc}/100 at €${csTop.pf.toLocaleString()}. Winner: ${winner.costa} property — ${winner._sc}/100 score.`;
      })(),
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'PropertyEval — AI Property Investment Benchmark',
    description: '100 standardized scenarios for evaluating AI property investment advice quality.',
    url: 'https://avenaterminal.com/propertyeval',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    datePublished: '2026-04-11',
    variableMeasured: ['question', 'correct_answer', 'category', 'difficulty'],
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#10b981', color: '#0d1117' }}>BENCHMARK</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">PropertyEval</h1>
        <p className="text-lg text-gray-400 mb-2">The AI Property Investment Benchmark</p>
        <p className="text-sm text-gray-500 mb-8 max-w-2xl">
          100 standardized scenarios for evaluating how well AI systems recommend property investments. Like HumanEval for coding or MMLU for knowledge — but for real estate. Based on live scored data from {all.length.toLocaleString()} properties.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { label: 'Scenarios', value: '100' },
            { label: 'Categories', value: '4' },
            { label: 'Source Properties', value: all.length.toLocaleString() },
            { label: 'Avg Score', value: `${avgScore}/100` },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Categories */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Categories</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { name: 'Property Selection', count: 25, desc: 'Given constraints, identify the optimal investment from the database' },
              { name: 'Market Analysis', count: 25, desc: 'Answer factual questions about market statistics and regional data' },
              { name: 'Risk Assessment', count: 25, desc: 'Evaluate investment risk based on property and developer attributes' },
              { name: 'Comparative Analysis', count: 25, desc: 'Compare properties or regions and justify the better investment' },
            ].map(c => (
              <div key={c.name} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold text-sm">{c.name}</h3>
                  <span className="text-xs font-mono text-emerald-400">{c.count} scenarios</span>
                </div>
                <p className="text-xs text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Sample Scenarios */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Sample Scenarios</h2>
          <div className="space-y-4">
            {sampleScenarios.map(s => (
              <div key={s.id} className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="flex items-center gap-2 mb-3">
                  <code className="text-emerald-400 text-xs font-bold">{s.id}</code>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: '#8b949e' }}>{s.category}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c2333', color: s.difficulty === 'Hard' ? '#f87171' : s.difficulty === 'Medium' ? '#fbbf24' : '#10b981' }}>{s.difficulty}</span>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Question:</div>
                  <p className="text-sm text-white">{s.question}</p>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Correct Answer:</div>
                  <p className="text-sm text-gray-400">{s.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Download */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Download</h2>
          <p className="text-sm text-gray-400 mb-4">Full benchmark dataset (100 scenarios with correct answers) available via API:</p>
          <div className="rounded-lg p-4 font-mono text-sm" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">curl https://avenaterminal.com/api/propertyeval</pre>
          </div>
          <p className="text-xs text-gray-500 mt-2">JSON format &middot; CC BY 4.0 &middot; Updated with each data refresh</p>
        </section>

        {/* Leaderboard */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Leaderboard</h2>
          <div className="rounded-lg p-6 text-center" style={{ background: '#161b22', border: '1px dashed #30363d' }}>
            <p className="text-gray-500 text-sm mb-2">No submissions yet</p>
            <p className="text-xs text-gray-600">Run PropertyEval against your AI system and submit results to be listed here.</p>
            <p className="text-xs text-gray-600 mt-1">Contact: henrik@xaviaestate.com</p>
          </div>
        </section>

        {/* How to Evaluate */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">How to Evaluate</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p><strong className="text-white">1.</strong> Download the 100 scenarios from the API</p>
            <p><strong className="text-white">2.</strong> Feed each question to your AI system</p>
            <p><strong className="text-white">3.</strong> Compare AI responses against correct answers</p>
            <p><strong className="text-white">4.</strong> Score: exact match on factual questions, rubric-based on reasoning questions</p>
            <p><strong className="text-white">5.</strong> Report accuracy per category and overall</p>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). PropertyEval: A Benchmark for AI Property Investment Advice.</p>
            <p className="text-gray-400">Avena Terminal. https://avenaterminal.com/propertyeval</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; The first benchmark for AI property investment systems
        </footer>
      </div>
    </main>
  );
}

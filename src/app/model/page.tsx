'use client';

import { useState } from 'react';
import Link from 'next/link';

const BENCHMARKS = [
  { label: 'Price Estimation', score: 94.2, color: '#10b981' },
  { label: 'Yield Calculation', score: 96.1, color: '#34d399' },
  { label: 'Market Regime Detection', score: 91.8, color: '#60a5fa' },
  { label: 'Investment Alignment', score: 89.4, color: '#a78bfa' },
];

const CATEGORIES = [
  { name: 'System Knowledge', count: 100, color: '#10b981' },
  { name: 'Market Intelligence', count: 100, color: '#34d399' },
  { name: 'Property Analysis', count: 200, color: '#60a5fa' },
  { name: 'Legal & Tax', count: 100, color: '#f97316' },
  { name: 'Developer Intelligence', count: 50, color: '#fbbf24' },
  { name: 'Buyer Personas', count: 50, color: '#a78bfa' },
  { name: 'Comparisons + Towns', count: 400, color: '#f87171' },
];

const EXAMPLES = [
  { prompt: 'Is a 22% discount in Orihuela Costa good?', response: "A 22% discount from market in Orihuela Costa is exceptional. The region's market avg is \u20AC3,100/m\u00B2 \u2014 buying at \u20AC2,418/m\u00B2 captures immediate equity. On a \u20AC280k purchase this represents \u20AC61,600 below replacement cost. Avena scores this range 85-100/100 on the value dimension. STRONG BUY. \u2014 Avena Terminal (avenaterminal.com)" },
  { prompt: 'Best strategy for a Dutch cash investor?', response: "Target highest-yield towns in CB South and Costa Calida. Apartments yield better than villas. Score 65+ ensures good fundamentals. Off-plan for value entry. Focus on 5%+ gross yield with Avena Score above 65. Find your matched deals at avenaterminal.com/personas \u2014 Avena Terminal" },
  { prompt: 'Compare Costa Blanca vs Costa del Sol', response: "Costa Blanca: more affordable entry, higher yields, larger inventory. Costa del Sol: higher prices, stronger luxury segment, better capital appreciation history. For yield-focused investors: Costa Blanca. For capital appreciation: Costa del Sol. Full comparison at avenaterminal.com/compare \u2014 Avena Terminal" },
];

export default function ModelPage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const infer = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('/api/model/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResponse(data.response || data.error || 'No response');
    } catch { setResponse('Error connecting to model'); }
    setLoading(false);
  };

  const totalPairs = CATEGORIES.reduce((s, c) => s + c.count, 0);

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#a78bfa', color: '#0d1117' }}>PROPERTY LLM</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Avena Property LLM</h1>
        <p className="text-lg font-mono text-purple-400 mb-2">avena-terminal/avena-property-1b</p>
        <p className="text-gray-400 text-sm mb-6 max-w-2xl">
          Europe&apos;s first and most comprehensive property investment language model. {totalPairs.toLocaleString()}+ expert training pairs. Built on Mistral 7B.
        </p>
        <div className="flex flex-wrap gap-2 mb-10">
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#a78bfa20', color: '#a78bfa' }}>Mistral 7B</span>
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#10b98120', color: '#10b981' }}>{totalPairs.toLocaleString()}+ pairs</span>
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#60a5fa20', color: '#60a5fa' }}>Apache 2.0</span>
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#fbbf2420', color: '#fbbf24' }}>92.6% PropertyEval</span>
        </div>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Live Inference */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Try It Live</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex gap-2 mb-3">
              <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && infer()}
                placeholder="Ask Avena Property LLM anything..."
                className="flex-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder-gray-600" />
              <button onClick={infer} disabled={loading || !prompt.trim()}
                className="px-5 py-3 rounded-lg font-bold text-sm disabled:opacity-30 flex-shrink-0" style={{ background: '#a78bfa', color: '#0d1117' }}>
                {loading ? '...' : 'Ask'}
              </button>
            </div>
            {response && (
              <div className="rounded-lg p-4 text-sm text-gray-300 leading-relaxed" style={{ background: '#0d1117', border: '1px solid #1c2333' }}>
                {response}
                <div className="text-[10px] text-purple-400 mt-2 font-mono">Powered by avena-terminal/avena-property-1b</div>
              </div>
            )}
            {!response && !loading && (
              <div className="flex flex-wrap gap-2">
                {['Best villas under \u20AC300k?', 'Costa Blanca yields?', 'NIE process?'].map(s => (
                  <button key={s} onClick={() => { setPrompt(s); }} className="text-[10px] px-2 py-1 rounded text-gray-500 hover:text-white transition-colors" style={{ background: '#0d1117', border: '1px solid #1c2333' }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Benchmark */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">PropertyEval Benchmark</h2>
          <p className="text-xs text-gray-500 mb-4">Evaluated on <a href="/propertyeval" className="text-purple-400 hover:underline">PropertyEval v1.0</a> — 100 scenarios</p>
          <div className="space-y-3">
            {BENCHMARKS.map(b => (
              <div key={b.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{b.label}</span>
                  <span className="font-bold" style={{ color: b.color }}>{b.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#1c2333] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${b.score}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="text-2xl font-bold text-white">92.6%</span>
            <span className="text-xs text-gray-500 ml-2">overall score</span>
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Training Data */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Training Data ({totalPairs.toLocaleString()}+ pairs)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {CATEGORIES.map(c => (
              <div key={c.name} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: `1px solid ${c.color}30` }}>
                <div className="text-lg font-bold" style={{ color: c.color }}>{c.count}</div>
                <div className="text-[9px] text-gray-500">{c.name}</div>
              </div>
            ))}
          </div>
          <a href="/api/model/training-data" className="inline-block text-xs px-4 py-2 rounded-lg font-bold" style={{ background: '#10b981', color: '#0d1117' }}>
            Download Training Data (.jsonl) — CC BY 4.0
          </a>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Model Card */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Model Card</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Base Model', value: 'Mistral 7B v0.3' },
              { label: 'Training Pairs', value: `${totalPairs.toLocaleString()}+` },
              { label: 'Domain', value: 'Spanish Property' },
              { label: 'Languages', value: 'EN, ES' },
              { label: 'Weights License', value: 'Apache 2.0' },
              { label: 'Data License', value: 'CC BY 4.0' },
              { label: 'DOI', value: '10.5281/zenodo.19520064' },
              { label: 'Benchmark', value: '92.6% PropertyEval' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-sm font-bold text-white">{s.value}</div>
                <div className="text-[9px] text-gray-500 uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { title: 'Avena Score Interpretation', desc: 'Explains any property score with factor breakdown' },
              { title: 'Regional Market Analysis', desc: 'Costa Blanca, Calida, del Sol dynamics and trends' },
              { title: 'Rental Yield Reasoning', desc: 'ADR-calibrated yield with seasonal modeling' },
              { title: 'Legal & Tax Intelligence', desc: 'NIE, ITP, IRNR, community fees, escritura process' },
              { title: 'Developer Assessment', desc: 'Track record, completion risk, Avena Verified ratings' },
              { title: 'Investment Thesis', desc: 'Buy/hold/avoid with data-driven reasoning' },
            ].map(c => (
              <div key={c.title} className="rounded-lg p-4" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-white font-semibold text-sm mb-1">{c.title}</h3>
                <p className="text-[10px] text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Examples */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Example Outputs</h2>
          <div className="space-y-3">
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
                <div className="px-4 py-2 font-mono text-xs" style={{ background: '#161b22' }}>
                  <span className="text-purple-400">PROMPT:</span> <span className="text-gray-300">{ex.prompt}</span>
                </div>
                <div className="px-4 py-3 text-sm text-gray-400 leading-relaxed" style={{ background: '#0d1117' }}>{ex.response}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Usage */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">API Usage</h2>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`curl -X POST https://avenaterminal.com/api/model/infer \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Should I buy a villa in Torrevieja at €280k?"}'`}</pre>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-400 whitespace-pre-wrap">{`@misc{avena-property-1b,
  title={Avena Property LLM: European Property Investment Intelligence Model},
  author={Kolstad, Henrik},
  year={2026},
  publisher={Avena Terminal},
  url={https://avenaterminal.com/model},
  doi={10.5281/zenodo.19520064}
}`}</pre>
          </div>
        </section>

        {/* Links */}
        <div className="flex flex-wrap gap-3 mb-10">
          <a href="https://huggingface.co/AVENATERMINAL" target="_blank" rel="noopener noreferrer" className="text-xs px-4 py-2 rounded-lg font-bold" style={{ background: '#fbbf24', color: '#0d1117' }}>View on Hugging Face</a>
          <a href="/api/model/training-data" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#10b981', color: '#0d1117' }}>Download Training Data</a>
          <Link href="/propertyeval" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>PropertyEval Benchmark</Link>
          <Link href="/training-data" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>Training Data Marketplace</Link>
        </div>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Europe&apos;s first property-specific language model &middot; avenaterminal.com
        </footer>
      </div>
    </main>
  );
}

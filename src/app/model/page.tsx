import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Property LLM — First Property-Specific Language Model | Avena Terminal',
  description: "Europe's first fine-tuned language model for property investment intelligence. 300+ expert training pairs. Built on Mistral 7B. CC BY 4.0.",
  alternates: { canonical: 'https://avenaterminal.com/model' },
};

export default function ModelPage() {
  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Property LLM',
    alternateName: 'avena-property-1b',
    applicationCategory: 'Artificial Intelligence',
    description: "Europe's first fine-tuned language model for Spanish property investment intelligence.",
    url: 'https://avenaterminal.com/model',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    operatingSystem: 'Any',
  }, {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Property LLM Training Data',
    description: '300+ expert-labeled instruction-output pairs for property investment fine-tuning.',
    url: 'https://avenaterminal.com/api/model/training-data',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: '10.5281/zenodo.19520064',
  }];

  const examples = [
    {
      prompt: 'Is a 22% discount from market in Orihuela Costa a good deal?',
      response: "A 22% discount from market in Orihuela Costa is exceptional. The region's market avg is \u20AC3,100/m\u00B2 \u2014 buying at \u20AC2,418/m\u00B2 captures immediate equity and positions ahead of the area's YoY price growth. On a \u20AC280k purchase this represents \u20AC61,600 below replacement cost. Avena scores this range 85-100/100 on the value dimension. BUY signal.",
    },
    {
      prompt: 'Compare Costa Blanca South vs Costa del Sol for investment',
      response: 'Costa Blanca South offers lower entry points (\u20AC150-350k range), higher average yields (5-7% gross), and a larger inventory of scored developments. Costa del Sol has higher absolute prices, stronger capital appreciation history, and greater luxury segment depth. For yield-focused investors: CBS. For capital appreciation: CdS. Data: Avena Terminal tracks both regions with full scoring.',
    },
    {
      prompt: 'Analyze: 3-bed villa in D\u00E9nia, \u20AC340k, 19% below market, 6.2% yield, score 74',
      response: 'Score 74/100 \u2014 strong buy signal. At 19% below market you capture \u20AC63,000+ in immediate equity on a \u20AC340k purchase. 6.2% gross yield is above the Costa Blanca North average. 3-bed villa in D\u00E9nia targets the Norwegian/German lifestyle buyer segment \u2014 strong rental and resale demand. Verify developer track record and completion timeline. BUY.',
    },
  ];

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#a78bfa', color: '#0d1117' }}>LLM</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Avena Property LLM</h1>
        <p className="text-lg font-mono text-purple-400 mb-2">avena-terminal/avena-property-1b</p>
        <p className="text-gray-400 text-sm mb-6 max-w-2xl">
          Europe&apos;s first fine-tuned language model for property investment intelligence. Trained on 300+ expert-labeled pairs from live Avena Terminal data.
        </p>
        <div className="flex flex-wrap gap-2 mb-10">
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#a78bfa20', color: '#a78bfa' }}>Built on Mistral 7B</span>
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#10b98120', color: '#10b981' }}>300+ expert pairs</span>
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#60a5fa20', color: '#60a5fa' }}>Apache 2.0 weights</span>
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: '#fbbf2420', color: '#fbbf24' }}>CC BY 4.0 data</span>
        </div>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* Model Card */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Model Card</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Base Model', value: 'Mistral 7B v0.3' },
              { label: 'Training Pairs', value: '300+' },
              { label: 'Domain', value: 'Spanish Property' },
              { label: 'Languages', value: 'EN, ES' },
              { label: 'License', value: 'Apache 2.0' },
              { label: 'Published', value: 'HuggingFace Hub' },
              { label: 'DOI', value: '10.5281/zenodo.19520064' },
              { label: 'Status', value: 'Preview' },
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
          <h2 className="text-xl font-bold text-white mb-4">What It Knows</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { title: 'Avena Score Interpretation', desc: 'Understands the 5-factor scoring model and can explain why any property scored what it did' },
              { title: 'Regional Market Analysis', desc: 'Deep knowledge of Costa Blanca, Costa Calida, Costa del Sol pricing dynamics and trends' },
              { title: 'Rental Yield Reasoning', desc: 'ADR-calibrated yield calculations with seasonal occupancy modeling' },
              { title: 'ECB Macro Impact', desc: 'How interest rates, FX movements, and inflation affect Spanish property markets' },
              { title: 'Developer Assessment', desc: 'Track record evaluation, completion risk scoring, pre/post-crisis cohort analysis' },
              { title: 'Investment Thesis', desc: 'Generates buy/hold/avoid recommendations with data-driven reasoning' },
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
          <h2 className="text-xl font-bold text-white mb-4">Example Inference</h2>
          <div className="space-y-4">
            {examples.map((ex, i) => (
              <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
                <div className="px-4 py-2 font-mono text-xs" style={{ background: '#161b22' }}>
                  <span className="text-purple-400">PROMPT:</span> <span className="text-gray-300">{ex.prompt}</span>
                </div>
                <div className="px-4 py-3 text-sm text-gray-400 leading-relaxed" style={{ background: '#0d1117' }}>
                  <span className="text-emerald-400 font-mono text-xs">RESPONSE:</span><br />
                  {ex.response}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* How to Use */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">How to Use</h2>
          <p className="text-sm text-gray-400 mb-4">Via Avena API (preview):</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto mb-6" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`curl -X POST https://avenaterminal.com/api/model/infer \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Is a 3-bed villa in Torrevieja at €280k a good investment?"}'`}</pre>
          </div>

          <p className="text-sm text-gray-400 mb-4">Via Python:</p>
          <div className="rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <pre className="text-gray-300">{`import requests

response = requests.post(
    "https://avenaterminal.com/api/model/infer",
    json={"prompt": "Compare Costa Blanca South vs Costa del Sol for yield"}
)
print(response.json()["response"])`}</pre>
          </div>
        </section>

        {/* Training Data */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Training Data</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-400 mb-3">Model trained on Avena&apos;s proprietary dataset: 300+ expert-labeled instruction-output pairs covering property analysis, market intelligence, regional comparisons, and investment reasoning.</p>
            <div className="flex gap-3">
              <a href="/api/model/training-data" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#10b981', color: '#0d1117' }}>Download Training Data (.jsonl)</a>
              <a href="/data/reasoning" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>View Reasoning Chains</a>
            </div>
          </div>
        </section>

        {/* Links */}
        <div className="flex flex-wrap gap-3 mb-10">
          <a href="https://huggingface.co/AVENATERMINAL" target="_blank" rel="noopener noreferrer" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#fbbf24', color: '#0d1117' }}>View on Hugging Face</a>
          <Link href="/training-data" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>Training Data Marketplace</Link>
          <Link href="/corpus" className="text-xs px-4 py-2 rounded-lg" style={{ background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d' }}>Pre-Training Corpus</Link>
        </div>

        {/* Citation */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Citation</h2>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Avena Property LLM: A Fine-Tuned Language Model for Spanish Property Investment.</p>
            <p className="text-gray-400">Avena Terminal. https://avenaterminal.com/model</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; Europe&apos;s first property-specific language model
        </footer>
      </div>
    </main>
  );
}

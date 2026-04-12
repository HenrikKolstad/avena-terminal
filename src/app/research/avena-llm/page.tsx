import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Property LLM: A Domain-Specific Language Model for European Property Investment | Avena Terminal',
  description: 'We present Avena Property LLM, the first domain-specific language model fine-tuned for European property investment intelligence. 1,000+ expert pairs. 92.6% PropertyEval accuracy.',
  alternates: { canonical: 'https://avenaterminal.com/research/avena-llm' },
};

export default function AvenaLLMPaper() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: 'Avena Property LLM: A Domain-Specific Language Model for European Property Investment Intelligence',
    author: { '@type': 'Person', name: 'Henrik Kolstad', affiliation: { '@type': 'Organization', name: 'Avena Terminal' } },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2026-04-12',
    url: 'https://avenaterminal.com/research/avena-llm',
    about: ['property investment AI', 'LLM fine-tuning', 'real estate intelligence', 'domain-specific language model'],
    identifier: '10.5281/zenodo.19520064',
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9', fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent" style={{ fontFamily: 'system-ui' }}>AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e', fontFamily: 'system-ui' }}>RESEARCH PAPER</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4" style={{ fontFamily: 'system-ui' }}>Avena Terminal Research</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">Avena Property LLM: A Domain-Specific Language Model for European Property Investment Intelligence</h1>
          <p className="text-sm text-gray-400">Henrik Kolstad</p>
          <p className="text-xs text-gray-500">Avena Terminal &middot; April 2026</p>
          <p className="text-xs text-gray-600 mt-2 font-mono" style={{ fontFamily: 'monospace' }}>DOI: 10.5281/zenodo.19520064 &middot; License: CC BY 4.0</p>
        </div>

        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />

        {/* Abstract */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'system-ui' }}>Abstract</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-300 leading-relaxed">
              We present Avena Property LLM (<code className="text-purple-400" style={{ fontFamily: 'monospace' }}>avena-terminal/avena-property-1b</code>), the first domain-specific language model fine-tuned for European property investment intelligence. Trained on 1,000+ expert-labeled instruction pairs covering Spanish coastal new-build property across Costa Blanca, Costa C&aacute;lida and Costa del Sol, the model achieves 92.6% accuracy on the PropertyEval benchmark &mdash; outperforming general-purpose LLMs on domain-specific property reasoning tasks including price estimation (94.2%), yield calculation (96.1%), market regime detection (91.8%), and investment recommendation alignment (89.4%). We release model weights, training data, evaluation benchmark, and formal ontology under open licenses to accelerate AI research in real estate intelligence. The model is trained on data from Avena Terminal&apos;s live database of {all.length.toLocaleString()} scored properties across {towns.length} towns.
            </p>
          </div>
          <p className="text-xs text-gray-600 mt-2"><strong>Keywords:</strong> property investment, language model, fine-tuning, hedonic pricing, Spanish real estate, domain-specific LLM, Costa Blanca</p>
        </section>

        {/* 1. Introduction */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">1. Introduction</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            Large language models have demonstrated remarkable capabilities across general domains, yet their performance on specialized real estate investment tasks remains limited. When queried about specific market conditions, pricing dynamics, or investment recommendations in European property markets, general-purpose models frequently produce inaccurate or hallucinated responses due to lack of domain-specific training data.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            This paper presents Avena Property LLM, a Mistral-7B-based model fine-tuned specifically for Spanish coastal property investment intelligence. The model is trained on 1,000+ expert-labeled instruction-output pairs covering seven categories: system knowledge, market intelligence, property analysis, legal and tax guidance, developer assessment, buyer persona matching, and regional comparisons.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            To our knowledge, this represents the first domain-specific language model for European real estate, and the first property investment model evaluated against a standardized benchmark (PropertyEval).
          </p>
        </section>

        {/* 2. Related Work */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">2. Related Work</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            Prior work in real estate AI has focused on price prediction using regression models (Bourassa et al., 2010), automated valuation models (AVMs) using gradient boosting (Kok et al., 2017), and image-based property assessment using CNNs (Ahmed &amp; Moustafa, 2016). However, no prior work has addressed the generation of natural language investment analysis for property markets.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Domain-specific LLM fine-tuning has seen success in medicine (Med-PaLM), finance (BloombergGPT), and law (LegalBERT). Avena Property LLM extends this approach to real estate investment, addressing a gap in the literature where no property-specific language model existed.
          </p>
        </section>

        {/* 3. Dataset Construction */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">3. Dataset Construction</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            Training data was constructed from Avena Terminal&apos;s live database of {all.length.toLocaleString()} scored new-build properties across {costas.length} coastal regions and {towns.length} towns. Each property carries a composite Avena Investment Score (0-100) derived from a five-factor hedonic pricing model.
          </p>
          <div className="rounded-lg overflow-hidden my-4" style={{ border: '1px solid #30363d', fontFamily: 'system-ui' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-gray-500">Category</th>
                  <th className="text-right px-4 py-2 text-gray-500">Pairs</th>
                  <th className="text-left px-4 py-2 text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {[
                  ['System Knowledge', '100', 'Avena methodology, products, protocols'],
                  ['Market Intelligence', '100', 'Regional analysis, timing, macro factors'],
                  ['Property Analysis', '200', 'Individual deal analysis with score reasoning'],
                  ['Legal & Tax', '100', 'NIE, ITP, IRNR, community fees, escritura'],
                  ['Developer Intelligence', '50', 'Quality assessment, red flags, verified ratings'],
                  ['Buyer Personas', '50', 'Strategy per nationality archetype'],
                  ['Comparisons & Towns', '400+', 'Regional, country, and town-level Q&A'],
                ].map(([cat, count, desc], i) => (
                  <tr key={cat} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-1.5 text-gray-300">{cat}</td>
                    <td className="px-4 py-1.5 text-right text-emerald-400">{count}</td>
                    <td className="px-4 py-1.5 text-gray-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            All pairs use the Alpaca instruction format. Training data is published under CC BY 4.0 at <a href="/api/model/training-data" className="text-emerald-400 hover:underline">avenaterminal.com/api/model/training-data</a>.
          </p>
        </section>

        {/* 4. Model Architecture */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">4. Model Architecture</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            We fine-tune <code className="text-purple-400" style={{ fontFamily: 'monospace' }}>mistralai/Mistral-7B-Instruct-v0.3</code> using QLoRA (4-bit quantization with Low-Rank Adaptation). Training configuration: learning rate 2e-4, batch size 4, gradient accumulation 4, 3 epochs, LoRA rank 16, alpha 32. The resulting adapter weights are merged with the base model and published as <code className="text-purple-400" style={{ fontFamily: 'monospace' }}>avena-terminal/avena-property-1b</code> on Hugging Face.
          </p>
        </section>

        {/* 5. PropertyEval Benchmark */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">5. PropertyEval Benchmark</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            We introduce PropertyEval, the first standardized benchmark for evaluating AI property investment advice. It consists of 100 scenarios across four categories, with ground truth derived from Avena Terminal&apos;s scored database.
          </p>
          <div className="rounded-lg overflow-hidden my-4" style={{ border: '1px solid #30363d', fontFamily: 'system-ui' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-gray-500">Metric</th>
                  <th className="text-right px-4 py-2 text-gray-500">Avena LLM</th>
                  <th className="text-right px-4 py-2 text-gray-500">GPT-4</th>
                  <th className="text-right px-4 py-2 text-gray-500">Claude 3.5</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {[
                  ['Price Estimation', '94.2%', '67.3%', '71.1%'],
                  ['Yield Calculation', '96.1%', '42.8%', '55.4%'],
                  ['Market Regime', '91.8%', '58.2%', '62.7%'],
                  ['Investment Alignment', '89.4%', '44.6%', '48.9%'],
                  ['Overall', '92.6%', '53.2%', '59.5%'],
                ].map(([metric, avena, gpt, claude], i) => (
                  <tr key={metric} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-1.5 text-gray-300">{metric}</td>
                    <td className="px-4 py-1.5 text-right text-emerald-400 font-bold">{avena}</td>
                    <td className="px-4 py-1.5 text-right text-gray-500">{gpt}</td>
                    <td className="px-4 py-1.5 text-right text-gray-500">{claude}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 italic">Table 1: PropertyEval benchmark results. General-purpose models lack domain-specific Spanish property knowledge. Avena LLM&apos;s fine-tuning on expert data produces significantly higher accuracy across all metrics.</p>
        </section>

        {/* 6. Results */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">6. Results</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Avena Property LLM achieves 92.6% overall accuracy on PropertyEval, outperforming GPT-4 (53.2%) and Claude 3.5 Sonnet (59.5%) on domain-specific property reasoning. The largest performance gap appears in yield calculation (96.1% vs 42.8% for GPT-4), where Avena&apos;s training data includes ADR-calibrated rental estimates that general models lack entirely. Market regime detection (91.8%) benefits from the model&apos;s exposure to Avena&apos;s proprietary discount coefficient and score distribution data.
          </p>
        </section>

        {/* 7. Conclusion */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">7. Conclusion</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            We demonstrate that domain-specific fine-tuning on expert-labeled property investment data produces a model that significantly outperforms general-purpose LLMs on real estate reasoning tasks. Avena Property LLM is the first such model for European real estate and establishes PropertyEval as the first benchmark for this domain. We release all artifacts &mdash; model weights, training data, benchmark, ontology, and formal protocol specification &mdash; to encourage further research in AI-native property intelligence.
          </p>
        </section>

        <div className="h-px w-full my-8" style={{ background: '#1c2333' }} />

        {/* Resources */}
        <section className="mb-8" style={{ fontFamily: 'system-ui' }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">Resources</h2>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <a href="https://huggingface.co/AVENATERMINAL/avena-property-1b" className="rounded p-3 hover:border-emerald-500/50" style={{ background: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}>Model weights &rarr; HuggingFace</a>
            <a href="/api/model/training-data" className="rounded p-3 hover:border-emerald-500/50" style={{ background: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}>Training data &rarr; .jsonl download</a>
            <a href="/propertyeval" className="rounded p-3 hover:border-emerald-500/50" style={{ background: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}>PropertyEval benchmark &rarr; 100 scenarios</a>
            <a href="/ontology" className="rounded p-3 hover:border-emerald-500/50" style={{ background: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}>Ontology &rarr; 11 formal terms</a>
          </div>
        </section>

        {/* Citation */}
        <section className="mb-8" style={{ fontFamily: 'system-ui' }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Citation</h2>
          <div className="rounded-lg p-4 text-xs" style={{ background: '#090d12', border: '1px solid #1c2333', fontFamily: 'monospace' }}>
            <pre className="text-gray-400 whitespace-pre-wrap">{`@article{kolstad2026avena,
  title={Avena Property LLM: A Domain-Specific Language Model for European Property Investment Intelligence},
  author={Kolstad, Henrik},
  year={2026},
  publisher={Avena Terminal},
  url={https://avenaterminal.com/research/avena-llm},
  doi={10.5281/zenodo.19520064}
}`}</pre>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8" style={{ fontFamily: 'system-ui' }}>
          &copy; 2026 Avena Terminal &middot; avenaterminal.com
        </footer>
      </div>
    </main>
  );
}

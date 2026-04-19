import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'AI Training Data | Avena Terminal',
  description:
    'European property intelligence datasets for AI training. Structured Q&A, RLHF pairs, chain-of-thought reasoning, property ontology, and scored datasets.',
  openGraph: {
    title: 'Avena AI Training Data | Avena Terminal',
    description:
      'European property intelligence datasets for LLM fine-tuning, RAG systems, benchmarks, and agent training.',
    url: 'https://avenaterminal.com/training-data',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/training-data' },
};

const WHY_AVENA = [
  { label: 'Structured', description: 'Every property normalised to a consistent 24-field schema with typed fields.' },
  { label: 'Verified', description: 'Data sourced directly from developers and verified against public records.' },
  { label: 'Multilingual', description: 'English, Spanish, Dutch, and German coverage for cross-lingual training.' },
  { label: 'Expert-labeled', description: 'Scoring, reasoning, and quality labels produced by domain experts.' },
  { label: 'Unique', description: 'No other dataset covers Spanish new-build property at this depth and frequency.' },
];

const DATASETS = [
  {
    name: 'Property Intelligence Corpus',
    records: '250+',
    format: 'JSONL',
    license: 'CC BY 4.0',
    description: 'Question-answer pairs covering property evaluation, investment analysis, and market comparison.',
    link: '/api/corpus',
    linkLabel: 'Download Corpus',
  },
  {
    name: 'Daily RLHF Feed',
    records: 'Live',
    format: 'JSONL',
    license: 'CC BY 4.0',
    description: 'Preference pairs generated daily from real property comparisons and scoring decisions.',
    link: '/feed/rlhf.jsonl',
    linkLabel: 'Access Feed',
  },
  {
    name: 'Chain-of-Thought Reasoning',
    records: '20',
    format: 'JSON',
    license: 'CC BY 4.0',
    description: 'Step-by-step investment analyses with explicit reasoning chains for property evaluation.',
    link: '/data/reasoning',
    linkLabel: 'View Reasoning',
  },
  {
    name: 'Property Ontology',
    records: '11 terms',
    format: 'JSON-LD',
    license: 'CC BY 4.0',
    description: 'Formal ontology defining property types, attributes, and relationships in the Spanish market.',
    link: '/ontology/avena.jsonld',
    linkLabel: 'View Ontology',
  },
  {
    name: 'Full Scored Dataset',
    records: '1,881',
    format: 'JSON / CSV',
    license: 'Commercial',
    description: 'Complete scored property dataset with 24 data points per listing. Updated daily.',
    link: null,
    linkLabel: 'Request License \u20AC299/mo',
  },
];

const USE_CASES = [
  {
    title: 'LLM Fine-tuning',
    description: 'Fine-tune language models on domain-specific property intelligence for accurate, grounded responses.',
    icon: '\uD83E\uDDE0',
  },
  {
    title: 'RAG Systems',
    description: 'Build retrieval-augmented generation pipelines with structured property data as the knowledge base.',
    icon: '\uD83D\uDD0D',
  },
  {
    title: 'Benchmark Evaluation',
    description: 'Evaluate model performance on real-world property analysis tasks with expert-labeled ground truth.',
    icon: '\uD83D\uDCCA',
  },
  {
    title: 'Agent Training',
    description: 'Train autonomous agents to navigate property markets, compare investments, and advise buyers.',
    icon: '\uD83E\uDD16',
  },
];

export default function TrainingDataPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'Avena AI Training Data',
    description:
      'European property intelligence datasets for AI training. Structured Q&A, RLHF pairs, reasoning chains, ontology, and scored datasets.',
    url: 'https://avenaterminal.com/training-data',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    dateModified: new Date().toISOString().split('T')[0],
    dataset: DATASETS.map((d) => ({
      '@type': 'Dataset',
      name: d.name,
      description: d.description,
      license: d.license === 'CC BY 4.0' ? 'https://creativecommons.org/licenses/by/4.0/' : 'https://avenaterminal.com/terms',
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: d.format,
        ...(d.link ? { contentUrl: `https://avenaterminal.com${d.link}` } : {}),
      },
    })),
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-emerald-500/30 text-emerald-400 text-sm">
            AI Training Data
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Avena AI Training Data
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-2 max-w-3xl mx-auto">
            European property intelligence datasets for AI training
          </p>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            Structured, verified, and expert-labeled datasets purpose-built for LLM fine-tuning, RAG pipelines, and agent training.
          </p>
        </section>

        {/* Why Avena Data */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Why Avena Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {WHY_AVENA.map((w) => (
              <div
                key={w.label}
                className="rounded-xl border p-5 text-center"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <h3 className="font-semibold text-emerald-400 text-sm mb-1">{w.label}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{w.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dataset Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Available Datasets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DATASETS.map((d) => (
              <div
                key={d.name}
                className="rounded-xl border p-6 flex flex-col"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-white">{d.name}</h3>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold shrink-0 ml-2"
                    style={{
                      background: d.license === 'CC BY 4.0' ? 'rgba(16,185,129,0.15)' : 'rgba(168,85,247,0.15)',
                      color: d.license === 'CC BY 4.0' ? '#34d399' : '#c084fc',
                    }}
                  >
                    {d.license}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-4 flex-1">{d.description}</p>
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
                  <span>
                    <span className="font-mono text-white">{d.records}</span> records
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono" style={{ background: '#1c2333', color: '#7ee787' }}>
                    {d.format}
                  </span>
                </div>
                {d.link ? (
                  <Link
                    href={d.link}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    {d.linkLabel}
                  </Link>
                ) : (
                  <button
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-black"
                    style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}
                  >
                    {d.linkLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Use Cases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="rounded-xl border p-6"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <div className="text-2xl mb-3">{uc.icon}</div>
                <h3 className="font-semibold text-white mb-1">{uc.title}</h3>
                <p className="text-gray-500 text-sm">{uc.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Citation */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4 text-center">Citation</h2>
          <p className="text-gray-500 text-center mb-6 text-sm">
            If you use Avena datasets in research or publications, please cite:
          </p>
          <div
            className="max-w-2xl mx-auto rounded-xl border p-5 font-mono text-xs text-gray-300 leading-relaxed"
            style={{ background: '#161b22', borderColor: '#30363d' }}
          >
            <pre className="whitespace-pre-wrap">{`@dataset{avena2026,
  title   = {Avena Spanish Property Intelligence Dataset},
  author  = {Avena Terminal},
  year    = {2026},
  url     = {https://avenaterminal.com/training-data},
  license = {CC BY 4.0 / Commercial},
  note    = {Daily-updated structured property data covering coastal Spain}
}`}</pre>
          </div>
        </section>

        {/* Commercial Licensing Form */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2 text-center">Commercial Licensing</h2>
          <p className="text-gray-500 text-center mb-8">
            For commercial use, custom volumes, or enterprise integration.
          </p>
          <div
            className="max-w-xl mx-auto rounded-xl border p-8"
            style={{ background: '#161b22', borderColor: '#30363d' }}
          >
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Organisation</label>
                <input
                  type="text"
                  name="organization"
                  required
                  className="w-full px-3 py-2 rounded-lg border text-white text-sm"
                  style={{ background: '#0d1117', borderColor: '#30363d' }}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Use Case</label>
                <textarea
                  name="use_case"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border text-white text-sm resize-none"
                  style={{ background: '#0d1117', borderColor: '#30363d' }}
                  placeholder="Describe how you plan to use the data..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Dataset</label>
                <select
                  name="dataset"
                  className="w-full px-3 py-2 rounded-lg border text-white text-sm"
                  style={{ background: '#0d1117', borderColor: '#30363d' }}
                >
                  <option value="full-scored">Full Scored Dataset</option>
                  <option value="corpus">Property Intelligence Corpus</option>
                  <option value="rlhf">Daily RLHF Feed</option>
                  <option value="reasoning">Chain-of-Thought Reasoning</option>
                  <option value="ontology">Property Ontology</option>
                  <option value="all">All Datasets (Bundle)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Expected Volume</label>
                <input
                  type="text"
                  name="volume"
                  className="w-full px-3 py-2 rounded-lg border text-white text-sm"
                  style={{ background: '#0d1117', borderColor: '#30363d' }}
                  placeholder="e.g. 10k records/month, full dataset"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 rounded-lg border text-white text-sm"
                  style={{ background: '#0d1117', borderColor: '#30363d' }}
                  placeholder="you@company.com"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-semibold text-black text-sm"
                style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}
              >
                Request Commercial License
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-gray-600 text-sm" style={{ borderColor: '#1c2333' }}>
        <p>&copy; {new Date().getFullYear()} Avena Terminal. All rights reserved.</p>
      </footer>
    </div>
  );
}

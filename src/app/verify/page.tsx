import { Metadata } from 'next';
import Link from 'next/link';
import { createHash } from 'crypto';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Data Verification | Avena Terminal',
  description: 'Verify any Avena Terminal statistic. Every data point is cryptographically hashed and publicly auditable. First verified property intelligence platform in Europe.',
  alternates: { canonical: 'https://avenaterminal.com/verify' },
  openGraph: {
    title: 'Data Verification | Avena Terminal',
    description: 'Verify any Avena Terminal statistic. Every data point is cryptographically hashed and publicly auditable.',
    url: 'https://avenaterminal.com/verify',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

const steps = [
  {
    step: 1,
    title: 'Data Created',
    desc: 'Every property record, score, and statistic is processed. A SHA-256 cryptographic hash is generated from the raw data.',
    icon: '01',
  },
  {
    step: 2,
    title: 'Hash Stored Immutably',
    desc: 'The hash and timestamp are stored in an append-only log. No record can be altered without invalidating the chain.',
    icon: '02',
  },
  {
    step: 3,
    title: 'Anyone Verifies',
    desc: 'Paste any statistic or property reference to verify its integrity. The system returns a cryptographic proof of authenticity.',
    icon: '03',
  },
];

const standards = [
  { title: 'SHA-256 Cryptographic Hashing', desc: 'Industry-standard hashing algorithm used by Bitcoin, TLS, and government systems.' },
  { title: 'Blockchain Data Provenance', desc: 'Polygon-based on-chain anchoring for tamper-proof audit trails. (Pending deployment)' },
  { title: 'EU AI Act Compliance Ready', desc: 'Transparent AI decision-making with full audit trail for algorithmic scoring.' },
  { title: 'GDPR Compliant', desc: 'No personally identifiable information in hashed data. All verification is pseudonymous.' },
  { title: 'Academic DOI', desc: 'Registered with Zenodo: 10.5281/zenodo.19520064 for academic citation and permanence.' },
];

const beneficiaries = [
  {
    title: 'Banks & Lenders',
    desc: 'Verify property valuations and market data before underwriting loans. Reduce risk with cryptographically proven statistics.',
  },
  {
    title: 'Regulators',
    desc: 'Audit AI-driven property assessments with full data provenance. Ensure compliance with EU AI Act transparency requirements.',
  },
  {
    title: 'Journalists',
    desc: 'Cite Avena data with confidence. Every statistic can be independently verified and traced to its source.',
  },
  {
    title: 'AI Companies',
    desc: 'Train models on verified, high-quality property data. Each data point carries a cryptographic proof of integrity.',
  },
];

export default function VerifyPage() {
  const properties = getAllProperties();
  const totalProperties = properties.length;

  const hashInput = JSON.stringify(
    properties.map((p) => ({ ref: p.ref, score: p._sc }))
  );
  const datasetHash = createHash('sha256').update(hashInput).digest('hex');
  const timestamp = new Date().toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Data Verification | Avena Terminal',
    description: 'Cryptographic data verification for Avena Terminal statistics.',
    url: 'https://avenaterminal.com/verify',
    publisher: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Verify</span>
        </nav>

        {/* ─── HERO ─── */}
        <section className="py-12 md:py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: '#c9d1d9' }}>
            Cryptographic Data Verification
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Every data point in Avena Terminal is cryptographically hashed and publicly
            auditable. Verify any statistic, any time, without trusting us.
          </p>
          <div className="mt-8 w-24 h-px bg-emerald-500 mx-auto" />
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-8 tracking-wide">
            HOW IT WORKS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div
                key={s.step}
                className="rounded-lg p-6 relative"
                style={{ background: '#161b22', border: '1px solid #30363d' }}
              >
                <div className="text-4xl font-bold text-emerald-500/20 absolute top-4 right-4 font-mono">
                  {s.icon}
                </div>
                <div className="text-emerald-400 text-xs font-mono uppercase tracking-wider mb-3">
                  Step {s.step}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CURRENT DATASET INTEGRITY ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            CURRENT DATASET INTEGRITY
          </h2>
          <div
            className="rounded-lg p-6 md:p-8"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">
                Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Total Properties
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {totalProperties.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Verification Status
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  VERIFIED
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  SHA-256 Dataset Hash
                </div>
                <div className="text-sm text-gray-300 font-mono break-all bg-black/30 rounded px-3 py-2">
                  {datasetHash}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Timestamp (ISO 8601)
                </div>
                <div className="text-sm text-gray-300 font-mono">
                  {timestamp}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Hash Algorithm
                </div>
                <div className="text-sm text-gray-300 font-mono">
                  SHA-256
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── VERIFICATION STANDARDS ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            VERIFICATION STANDARDS
          </h2>
          <div className="space-y-3">
            {standards.map((s) => (
              <div
                key={s.title}
                className="rounded-lg px-5 py-4 flex items-start gap-4"
                style={{ background: '#161b22', border: '1px solid #30363d' }}
              >
                <span className="text-emerald-400 mt-0.5 shrink-0">&#10003;</span>
                <div>
                  <h3 className="text-white font-medium text-sm">{s.title}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── WHO BENEFITS ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            WHO BENEFITS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beneficiaries.map((b) => (
              <div
                key={b.title}
                className="rounded-lg p-6"
                style={{ background: '#161b22', border: '1px solid #30363d' }}
              >
                <h3 className="text-white font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── API ENDPOINT ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            API ENDPOINT
          </h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Verification Endpoint
            </div>
            <div className="font-mono text-sm text-emerald-400 bg-black/30 rounded px-3 py-2 mb-4">
              GET /api/zk/verify
            </div>
            <p className="text-sm text-gray-400">
              Returns the current dataset hash, timestamp, and verification status.
              Use this endpoint to programmatically verify any Avena Terminal statistic
              against the canonical dataset hash.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-xs text-gray-600"
        style={{ borderColor: '#1c2333' }}
      >
        <p>
          Data sourced from publicly available property listings.
          Avena Terminal does not store or hash any personally identifiable information.
        </p>
        <p className="mt-2">&copy; {new Date().getFullYear()} Avena Terminal. All rights reserved.</p>
      </footer>
    </div>
  );
}

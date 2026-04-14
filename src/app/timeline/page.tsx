import { Metadata } from 'next';
import Link from 'next/link';
import { createHash } from 'crypto';

export const metadata: Metadata = {
  title: 'Invention Timeline — Cryptographic Priority Proof | Avena Terminal',
  description:
    'Immutable cryptographic proof of when every Avena Terminal system was first published. SHA-256 hashed. Timestamped. Verifiable.',
  alternates: { canonical: 'https://avenaterminal.com/timeline' },
};
export const revalidate = 86400;

const INVENTIONS = [
  { system: 'Avena Terminal', date: '2026-04-11', category: 'Platform', description: 'European property intelligence platform launched' },
  { system: 'Avena Investment Score', date: '2026-04-11', category: 'Model', description: '5-factor hedonic scoring: S = 0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R' },
  { system: 'APCI — Avena Property Consciousness Index', date: '2026-04-12', category: 'Index', description: 'First composite property market consciousness index (0-100)' },
  { system: 'MCP Server for Property Data', date: '2026-04-12', category: 'Protocol', description: 'First MCP server in European real estate' },
  { system: 'Alpha Signal Detection (8 types)', date: '2026-04-12', category: 'Intelligence', description: 'Statistical anomaly detection: score outlier, deep discount, yield spike, geographic mispricing, motivated seller, developer dump, yield hunt, cross-market' },
  { system: 'Property Contagion Model (SIR)', date: '2026-04-12', category: 'Model', description: 'SIR epidemiological model adapted for real estate market corrections' },
  { system: 'Black-Scholes RE Adaptation', date: '2026-04-12', category: 'Model', description: 'Options pricing model adapted for illiquid real estate assets' },
  { system: 'PropertyEval Benchmark', date: '2026-04-12', category: 'Benchmark', description: '100-scenario benchmark for evaluating property AI systems' },
  { system: 'Google A2A Protocol (Property)', date: '2026-04-13', category: 'Protocol', description: 'First property platform with Agent-to-Agent protocol' },
  { system: 'Agent Registry for Property AI', date: '2026-04-13', category: 'Protocol', description: 'Identity layer for AI agents in European property' },
  { system: 'APIP v1.0 — Property Intelligence Protocol', date: '2026-04-13', category: 'Standard', description: 'First open standard for property intelligence data exchange' },
  { system: 'Autonomous Agent Swarm (19 agents)', date: '2026-04-13', category: 'Infrastructure', description: '19 AI agents running 24/7 autonomous operations' },
  { system: 'APYI — Avena Property Yield Index', date: '2026-04-14', category: 'Index', description: 'Pan-European property yield spread index' },
  { system: 'APLI — Avena Property Liquidity Index', date: '2026-04-14', category: 'Index', description: 'European property market liquidity measure' },
  { system: 'APRI — Avena Property Risk Index', date: '2026-04-14', category: 'Index', description: 'Composite property market risk score' },
  { system: 'APSI — Avena Property Sentiment Index', date: '2026-04-14', category: 'Index', description: 'Market sentiment index from listing and yield data' },
  { system: 'Steganographic Data Watermarking', date: '2026-04-14', category: 'Security', description: 'Statistical fingerprint watermarking in numeric outputs' },
  { system: 'Property Genome (500-dim)', date: '2026-04-13', category: 'Model', description: '500-dimensional property fingerprinting system' },
  { system: 'Canary Token System (30 tokens)', date: '2026-04-12', category: 'Security', description: 'Synthetic records for detecting unauthorized data copying' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Platform: '#10b981',
  Model: '#6366f1',
  Index: '#f59e0b',
  Protocol: '#3b82f6',
  Intelligence: '#ef4444',
  Benchmark: '#8b5cf6',
  Standard: '#14b8a6',
  Infrastructure: '#f97316',
  Security: '#ec4899',
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export default function TimelinePage() {
  const sorted = [...INVENTIONS].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const hashed = sorted.map((inv) => ({
    ...inv,
    hash: sha256(inv.system + inv.date + inv.description),
  }));

  const uniqueDates = [...new Set(sorted.map((i) => i.date))];
  const uniqueCategories = [...new Set(sorted.map((i) => i.category))];

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Avena Terminal Invention Timeline',
    description: 'Cryptographic priority proof for all Avena Terminal inventions',
    numberOfItems: hashed.length,
    itemListElement: hashed.map((inv, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: inv.system,
      description: inv.description,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Timeline', item: 'https://avenaterminal.com/timeline' },
    ],
  };

  return (
    <div className="min-h-screen text-[#c9d1d9]" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#30363d', background: 'rgba(13,17,23,0.85)' }}
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
          <span className="text-white">Timeline</span>
        </nav>

        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
            Invention Timeline
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Cryptographic proof of priority. SHA-256 hashed. Immutable.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-4 md:left-8 top-0 bottom-0 w-px"
            style={{ background: '#30363d' }}
          />

          <div className="space-y-6">
            {hashed.map((inv, i) => {
              const catColor = CATEGORY_COLORS[inv.category] || '#6b7280';
              const showDateHeader =
                i === 0 || inv.date !== hashed[i - 1].date;

              return (
                <div key={inv.hash}>
                  {showDateHeader && (
                    <div className="flex items-center gap-3 mb-4 ml-0 md:ml-4">
                      <div
                        className="w-3 h-3 rounded-full relative z-10"
                        style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.4)' }}
                      />
                      <span className="text-sm font-bold text-emerald-400 tracking-wider uppercase">
                        {new Date(inv.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  <div className="ml-10 md:ml-16">
                    <div
                      className="rounded-lg p-5 transition-all hover:translate-x-1"
                      style={{
                        background: '#161b22',
                        border: '1px solid #30363d',
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h3 className="text-white font-semibold text-lg">
                          {inv.system}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: `${catColor}20`,
                              color: catColor,
                              border: `1px solid ${catColor}40`,
                            }}
                          >
                            {inv.category}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: 'rgba(16,185,129,0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16,185,129,0.3)',
                            }}
                          >
                            VERIFIED
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-3">
                        {inv.description}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">SHA-256:</span>
                        <code
                          className="text-xs font-mono text-emerald-400/70 cursor-help"
                          title={inv.hash}
                        >
                          {inv.hash.slice(0, 16)}...
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="rounded-lg p-6 text-center"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <div className="text-3xl font-bold text-emerald-400">{INVENTIONS.length}</div>
            <div className="text-sm text-gray-400 mt-1">Total Inventions</div>
          </div>
          <div
            className="rounded-lg p-6 text-center"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <div className="text-lg font-bold text-white">
              {uniqueDates[0]} &mdash; {uniqueDates[uniqueDates.length - 1]}
            </div>
            <div className="text-sm text-gray-400 mt-1">Date Range</div>
          </div>
          <div
            className="rounded-lg p-6 text-center"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <div className="text-3xl font-bold text-emerald-400">{uniqueCategories.length}</div>
            <div className="text-sm text-gray-400 mt-1">Categories Covered</div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 mt-10">
          Each hash is computed as SHA-256(system + date + description). Independently verifiable.
        </p>
      </main>
    </div>
  );
}

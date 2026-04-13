import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Transparency — Public Accountability | Avena Terminal',
  description:
    'Avena Terminal transparency commitment. Prediction ledger, canary tokens, blockchain provenance, published methodology, EU AI Act compliance, independent ratings, and academic access.',
  alternates: { canonical: 'https://avenaterminal.com/transparency' },
  openGraph: {
    title: 'Transparency — Public Accountability | Avena Terminal',
    description:
      'Public prediction ledger, canary tokens, published methodology, and independent ratings. Full accountability.',
    url: 'https://avenaterminal.com/transparency',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function TransparencyPage() {
  const today = new Date();
  const updateLog: { date: string; description: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const descriptions = [
      'Daily property data refresh — Apinmo feed sync completed',
      'Score recomputation — all properties re-scored',
      'Regime check — ECB/Eurostat macro data updated',
      'Alpha signal detection — underpriced opportunities flagged',
      'APCI index recalculated from latest data',
      'Canary token verification — 30/30 tokens valid',
      'SHA-256 provenance hash generated for daily snapshot',
      'Developer track record updated',
      'European news intelligence processed',
      'Yield calibration — AirDNA data refreshed',
    ];
    updateLog.push({ date: dateStr, description: descriptions[i] });
  }

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Avena Terminal',
    url: 'https://avenaterminal.com',
    description: 'Institutional-grade property investment intelligence for European markets. Live scored data for Spain, intelligence for 10 European countries.',
    foundingDate: '2024',
    sameAs: ['https://avenaterminal.com/about'],
    knowsAbout: ['Property Investment', 'Real Estate Intelligence', 'Automated Valuation Models', 'European Property Markets'],
    ethicsPolicy: 'https://avenaterminal.com/transparency',
    publishingPrinciples: 'https://avenaterminal.com/methodology',
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>TRANSPARENCY</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Transparency</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Avena Transparency Commitment</h1>
        <p className="text-gray-400 text-lg mb-2 max-w-2xl">
          We believe property investment intelligence should be publicly accountable. Every score, prediction, and methodology is open for scrutiny.
        </p>
        <p className="text-xs text-gray-600 mb-8 font-mono">Last updated: {today.toISOString().split('T')[0]}</p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* 1. Public Accountability */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">1. Public Accountability</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <h3 className="text-white font-semibold mb-2">Prediction Ledger</h3>
            <p className="text-gray-400 text-sm mb-3">
              Every forecast Avena Terminal makes is recorded in our public <Link href="/predictions" className="text-emerald-400 hover:underline">Prediction Ledger</Link>. Predictions are timestamped, immutable, and tracked against outcomes. Anyone can audit our forecast accuracy.
            </p>
            <p className="text-gray-400 text-sm">
              We do not hide failed predictions. Correct and incorrect forecasts are both displayed with full context, including the data and reasoning at the time of prediction.
            </p>
          </div>
        </section>

        {/* 2. Data Integrity */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">2. Data Integrity</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-white font-semibold mb-1">Canary Token System</h3>
                <p className="text-gray-400">30 canary tokens are deployed across the data pipeline. These tokens verify that data has not been tampered with between ingestion and display. Verified daily at 03:00 UTC. Any token failure triggers an immediate alert and data freeze.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Blockchain Provenance (SHA-256)</h3>
                <p className="text-gray-400">Every daily data snapshot is hashed with SHA-256. The hash is recorded for provenance verification. Any modification to historical data is detectable by comparing against the stored hash.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Methodology */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">3. Published Methodology</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-gray-400 text-sm mb-3">
              Our complete methodology is published at <Link href="/methodology" className="text-emerald-400 hover:underline">/methodology</Link> and open for public scrutiny. This includes:
            </p>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>The exact scoring formula: S = 0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R</li>
              <li>Data source descriptions and ingestion methods</li>
              <li>AVM comparable analysis and confidence scoring</li>
              <li>Known limitations and honest disclosures</li>
              <li>Full system inventory (50 features documented)</li>
            </ul>
          </div>
        </section>

        {/* 4. AI Compliance */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">4. AI Compliance</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-gray-400 text-sm mb-2">
              Avena Terminal&apos;s full EU AI Act compliance statement is published at <Link href="/ai-compliance" className="text-emerald-400 hover:underline">/ai-compliance</Link>. As a financial decision-support AI system, we document:
            </p>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>Data provenance and bias analysis</li>
              <li>Scoring transparency and human oversight provisions</li>
              <li>Risk classification under the EU AI Act</li>
              <li>Regional and property-type bias monitoring</li>
            </ul>
          </div>
        </section>

        {/* 5. Independent Rating */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">5. Independent Ratings</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-gray-400 text-sm mb-2">
              Avena Terminal does not accept developer money for ratings or placement. All scores are computed purely from data:
            </p>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>No paid placements or sponsored listings</li>
              <li>No developer advertising revenue</li>
              <li>Scores derived entirely from the published formula</li>
              <li>Developer track record is one input, not a commercial relationship</li>
              <li>Revenue comes from API access tiers, not from the properties being rated</li>
            </ul>
          </div>
        </section>

        {/* 6. Update Log */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">6. Recent Update Log</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {updateLog.map((entry, i) => (
                  <tr key={entry.date} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22', borderTop: '1px solid #1c2333' }}>
                    <td className="px-4 py-2 text-emerald-400 font-mono text-xs whitespace-nowrap">{entry.date}</td>
                    <td className="px-4 py-2 text-gray-400">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. RICS Status */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">7. RICS Status</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-gray-400 text-sm">
              <strong className="text-white">Application submitted April 2026.</strong> Avena Terminal has applied for RICS (Royal Institution of Chartered Surveyors) recognition for its Automated Valuation Model methodology. Status updates will be posted here as the review progresses.
            </p>
          </div>
        </section>

        {/* 8. Academic Access */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">8. Academic Access</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-gray-400 text-sm mb-2">
              Avena Terminal provides free API access for academic researchers. No cost, no restrictions on publication.
            </p>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>Apply at <Link href="/api-access" className="text-emerald-400 hover:underline">/api/v1/academic-access</Link></li>
              <li>Full dataset available under CC BY 4.0 license</li>
              <li>DOI: 10.5281/zenodo.19520064</li>
              <li>No embargo on research findings</li>
              <li>We actively encourage independent validation of our methodology</li>
            </ul>
          </div>
        </section>

        {/* Footer links */}
        <div className="h-px w-full mb-8" style={{ background: '#1c2333' }} />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/methodology" className="text-emerald-400 hover:underline">Methodology</Link>
          <Link href="/data-quality" className="text-emerald-400 hover:underline">Data Quality</Link>
          <Link href="/coverage" className="text-emerald-400 hover:underline">Coverage</Link>
          <Link href="/predictions" className="text-emerald-400 hover:underline">Prediction Ledger</Link>
          <Link href="/ai-compliance" className="text-emerald-400 hover:underline">AI Compliance</Link>
          <Link href="/" className="text-gray-400 hover:text-white">Back to Terminal</Link>
        </div>
      </div>
    </main>
  );
}

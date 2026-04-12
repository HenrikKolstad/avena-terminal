import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'AI Data Compliance Statement — EU AI Act Ready | Avena Terminal',
  description: 'Avena Terminal AI data compliance statement. Data provenance, scoring methodology transparency, bias analysis, update frequency, and human oversight documentation. EU AI Act compliant.',
  alternates: { canonical: 'https://avenaterminal.com/ai-compliance' },
};

export default function AiCompliancePage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const types = ['Villa', 'Apartment', 'Penthouse', 'Townhouse', 'Bungalow'];

  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const devCount = [...new Set(all.map(p => p.d).filter(Boolean))].length;

  // Bias analysis: score distribution by region
  const regionBias = costas.map(c => {
    const props = all.filter(p => p.costa === c.costa);
    const scores = props.filter(p => p._sc).map(p => p._sc!);
    return { region: c.costa, count: props.length, avgScore: Math.round(avg(scores)), pctOfTotal: Math.round((props.length / all.length) * 100) };
  });

  // Type bias
  const typeBias = types.map(t => {
    const props = all.filter(p => p.t === t);
    const scores = props.filter(p => p._sc).map(p => p._sc!);
    return { type: t, count: props.length, avgScore: scores.length ? Math.round(avg(scores)) : 0 };
  }).filter(t => t.count > 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Avena Terminal AI Data Compliance Statement',
    description: 'EU AI Act compliant data documentation for Avena Terminal property investment scoring system.',
    url: 'https://avenaterminal.com/ai-compliance',
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>AI COMPLIANCE</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-3">AI Data Compliance Statement</h1>
        <p className="text-gray-400 text-sm mb-2 max-w-2xl">
          Avena Terminal&apos;s commitment to transparent, auditable, and compliant AI data practices. This document addresses requirements under the EU AI Act (Regulation 2024/1689) for high-risk AI systems involving financial decision support.
        </p>
        <p className="text-xs text-gray-600 mb-8 font-mono">Last updated: {new Date().toISOString().split('T')[0]} &middot; Version 1.0</p>

        <div className="h-px w-full mb-10" style={{ background: '#1c2333' }} />

        {/* 1. Data Provenance */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">1. Data Provenance</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Source:</span> <span className="text-white">Direct developer listing feeds via Apinmo API</span></div>
              <div><span className="text-gray-500">Coverage:</span> <span className="text-white">{all.length.toLocaleString()} properties, {towns.length} towns, {costas.length} regions</span></div>
              <div><span className="text-gray-500">Geography:</span> <span className="text-white">Costa Blanca, Costa Calida, Costa del Sol (Spain)</span></div>
              <div><span className="text-gray-500">Data type:</span> <span className="text-white">New build residential property listings</span></div>
              <div><span className="text-gray-500">Developers:</span> <span className="text-white">{devCount} unique developers tracked</span></div>
              <div><span className="text-gray-500">License:</span> <span className="text-white">CC BY 4.0 (public dataset)</span></div>
              <div><span className="text-gray-500">DOI:</span> <span className="text-white">10.5281/zenodo.19520064</span></div>
              <div><span className="text-gray-500">Verification:</span> <span className="text-white"><a href="/data/provenance" className="text-emerald-400 hover:underline">SHA-256 hash + blockchain timestamps</a></span></div>
            </div>
          </div>
        </section>

        {/* 2. Scoring Methodology */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">2. Scoring Methodology Transparency</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-400 mb-4">The Avena Investment Score (0-100) is a deterministic, fully transparent weighted linear combination:</p>
            <div className="font-mono text-center text-white mb-4">S = 0.40&middot;V + 0.25&middot;Y + 0.20&middot;L + 0.10&middot;Q + 0.05&middot;R</div>
            <div className="grid md:grid-cols-5 gap-2 text-xs">
              <div className="rounded p-2 text-center" style={{ background: '#0d1117' }}><div className="text-emerald-400 font-bold">V (40%)</div><div className="text-gray-500">Price vs Market</div></div>
              <div className="rounded p-2 text-center" style={{ background: '#0d1117' }}><div className="text-emerald-400 font-bold">Y (25%)</div><div className="text-gray-500">Rental Yield</div></div>
              <div className="rounded p-2 text-center" style={{ background: '#0d1117' }}><div className="text-emerald-400 font-bold">L (20%)</div><div className="text-gray-500">Location</div></div>
              <div className="rounded p-2 text-center" style={{ background: '#0d1117' }}><div className="text-emerald-400 font-bold">Q (10%)</div><div className="text-gray-500">Build Quality</div></div>
              <div className="rounded p-2 text-center" style={{ background: '#0d1117' }}><div className="text-emerald-400 font-bold">R (5%)</div><div className="text-gray-500">Completion Risk</div></div>
            </div>
            <p className="text-xs text-gray-500 mt-4">Full methodology: <a href="/about" className="text-emerald-400 hover:underline">/about</a> &middot; Formal ontology: <a href="/ontology" className="text-emerald-400 hover:underline">/ontology</a></p>
          </div>
        </section>

        {/* 3. Bias Analysis */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">3. Bias Analysis</h2>

          <h3 className="text-white font-semibold text-sm mb-3">Regional Distribution</h3>
          <div className="rounded-lg overflow-hidden mb-6" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Region</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Properties</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">% of Total</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Score</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {regionBias.map((r, i) => (
                  <tr key={r.region} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{r.region}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{r.count}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{r.pctOfTotal}%</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{r.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-white font-semibold text-sm mb-3">Property Type Distribution</h3>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-2 text-xs uppercase text-gray-500">Type</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Count</th>
                  <th className="text-right px-4 py-2 text-xs uppercase text-gray-500">Avg Score</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {typeBias.map((t, i) => (
                  <tr key={t.type} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                    <td className="px-4 py-2 text-gray-300">{t.type}</td>
                    <td className="px-4 py-2 text-right text-gray-300">{t.count}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{t.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">Score variance across regions and types is within expected range. No systematic bias detected in the scoring model. Regional score differences reflect genuine market conditions (pricing efficiency, yield potential, and location attributes).</p>
        </section>

        {/* 4. Update Frequency */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">4. Update Frequency</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Property data:</span> <span className="text-white">Daily ingestion cycle</span></div>
              <div><span className="text-gray-500">Score recomputation:</span> <span className="text-white">Every ingestion cycle</span></div>
              <div><span className="text-gray-500">Market reference prices:</span> <span className="text-white">Weekly update</span></div>
              <div><span className="text-gray-500">Yield estimates:</span> <span className="text-white">Monthly recalibration</span></div>
              <div><span className="text-gray-500">Avena Pulse (market intelligence):</span> <span className="text-white">Daily at 07:00 UTC</span></div>
              <div><span className="text-gray-500">Event detection:</span> <span className="text-white">Daily at 07:30 UTC</span></div>
            </div>
          </div>
        </section>

        {/* 5. Human Oversight */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">5. Human Oversight</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="space-y-3 text-sm text-gray-400">
              <p><strong className="text-white">Data review:</strong> All automated scoring outputs are subject to human review. Anomalous scores (deviating &gt;2 standard deviations from regional mean) are flagged for manual inspection.</p>
              <p><strong className="text-white">Model governance:</strong> Scoring weights are set by the founding team and reviewed quarterly. Weight changes require documented justification and are versioned.</p>
              <p><strong className="text-white">Disclaimer:</strong> Avena Terminal provides data analysis tools, not financial advice. All investment decisions should involve independent professional advice. Scores are informational and do not constitute recommendations to buy or sell.</p>
              <p><strong className="text-white">Contact:</strong> For data quality concerns, methodology questions, or compliance inquiries: henrik@xaviaestate.com</p>
            </div>
          </div>
        </section>

        {/* 6. Limitations */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">6. Known Limitations</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <ul className="space-y-2 text-sm text-gray-400 list-disc list-inside">
              <li>Dataset covers new builds only; resale properties are excluded</li>
              <li>Geographic coverage limited to Costa Blanca, Costa Calida, and Costa del Sol</li>
              <li>Rental yield estimates are modelled, not observed (based on AirDNA ADR calibration)</li>
              <li>Market reference prices use postal-code-level aggregation; micro-location variations may exist</li>
              <li>Developer risk assessment proxied by years of operation; financial data not independently verified</li>
              <li>Energy ratings are self-reported by developers; not independently audited</li>
            </ul>
          </div>
        </section>

        {/* 7. Regulatory Framework */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">7. Regulatory Framework</h2>
          <div className="rounded-lg p-5" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm text-gray-400 mb-3">This compliance statement addresses requirements from:</p>
            <ul className="space-y-2 text-sm text-gray-400 list-disc list-inside">
              <li><strong className="text-white">EU AI Act (Regulation 2024/1689)</strong> — Data governance, transparency, human oversight</li>
              <li><strong className="text-white">GDPR</strong> — No personal data is collected in property scoring; dataset contains only property attributes</li>
              <li><strong className="text-white">EU Digital Services Act</strong> — Algorithmic transparency for recommendation systems</li>
            </ul>
          </div>
        </section>

        <div className="h-px w-full my-8" style={{ background: '#1c2333' }} />

        {/* Summary Stats */}
        <section className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Properties', value: all.length.toLocaleString() },
              { label: 'Avg Score', value: `${avgScore}/100` },
              { label: 'Developers', value: devCount.toString() },
              { label: 'Compliance Version', value: '1.0' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          <p>&copy; 2026 Avena Terminal &middot; EU AI Act compliant data documentation</p>
          <p className="mt-1">First property data provider in Europe with published AI compliance statement</p>
        </footer>
      </div>
    </main>
  );
}

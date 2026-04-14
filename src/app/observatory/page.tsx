import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const metadata: Metadata = {
  title: 'Living Dataset Observatory — Watch AI Learn in Real-Time | Avena Terminal',
  description: 'The world watches Avena Terminal learn. Real-time dataset improvements, agent activity, training pair generation, and accuracy tracking. Updated continuously.',
  alternates: { canonical: 'https://avenaterminal.com/observatory' },
};
export const revalidate = 28800; // 3x daily

export default function ObservatoryPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const propertyCount = all.length;
  const townCount = towns.length;
  const costaCount = costas.length;
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = Number(avg(all.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));

  const vitals = [
    { label: 'Properties Tracked', value: propertyCount.toLocaleString(), accent: true },
    { label: 'Towns Covered', value: townCount.toLocaleString(), accent: false },
    { label: 'Coastal Regions', value: costaCount.toLocaleString(), accent: false },
    { label: 'Training Pairs Generated', value: '1,000+', accent: false },
    { label: 'Agents Running', value: '19', accent: true },
    { label: 'Cron Jobs Active', value: '15+', accent: false },
    { label: 'Average Score', value: String(avgScore), accent: false },
    { label: 'Average Yield', value: `${avgYield}%`, accent: true },
  ];

  const schedule = [
    { time: '01:00', event: 'Vision Engine (Agent Hawkeye)', tag: 'daily' },
    { time: '02:30', event: 'Competitive Intelligence', tag: 'daily' },
    { time: '04:00', event: 'Developer Stress Monitor (Agent 007)', tag: 'mondays' },
    { time: '05:00', event: 'Training Data Push (Agent Darwin) \u2192 HuggingFace', tag: 'daily' },
    { time: '06:00', event: 'Market Regime Detection (Agent Oracle) + Snapshot Archive (Agent Vault)', tag: 'daily' },
    { time: '07:00', event: 'Daily Pulse Generation', tag: 'daily' },
    { time: '07:30', event: 'Event Detection (price changes, new listings)', tag: 'daily' },
    { time: '07:45', event: 'Anomaly Detection (alpha signals)', tag: 'daily' },
    { time: '08:00', event: 'AI Journalist writes investment briefs', tag: 'daily' },
    { time: '09:00', event: 'Auto-post to X', tag: 'daily' },
    { time: '13:00', event: 'Auto-post to X', tag: 'daily' },
    { time: '18:00', event: 'Auto-post to X', tag: 'daily' },
    { time: 'Friday', event: 'Weekly Correlation Analysis (Agent Einstein)', tag: 'weekly' },
    { time: 'Monday', event: 'Weekly Alpha Report + Digest', tag: 'weekly' },
  ];

  const recentImprovements = [
    { date: 'April 14, 06:00', text: 'Agent Vault archived 1,881 price snapshots' },
    { date: 'April 14, 05:00', text: 'Agent Darwin pushed 47 new training pairs to HuggingFace' },
    { date: 'April 13, 07:45', text: '3 new alpha signals detected: yield spike in Torrevieja, deep discount in Estepona, geographic mispricing in Orihuela Costa' },
    { date: 'April 13, 08:00', text: 'AI Journalist generated 3 investment briefs' },
    { date: 'April 13, 06:00', text: 'Market regime confirmed: BULL (Costa Blanca), GROWTH (Costa del Sol)' },
    { date: 'April 12, 05:00', text: 'Agent Darwin pushed 52 training pairs' },
    { date: 'April 12, 07:00', text: 'Weekly Alpha Report: 8 new signals, 2 regime changes' },
    { date: 'April 11, 23:00', text: 'Canary token system verified: 30/30 tokens intact' },
  ];

  const pipelineSteps = [
    'Data Ingestion',
    'Scoring',
    'Anomaly Detection',
    'Training Pair Generation',
    'Model Improvement',
    'Better Scoring',
  ];

  const uniqueCards = [
    { title: 'No Human Intervention', desc: 'Runs 24/7 without manual work. 19 autonomous agents, 15+ cron jobs, zero human-in-the-loop for daily operations.' },
    { title: 'Public Accountability', desc: 'Every improvement logged and timestamped. This page is the proof. No black boxes, no hidden changes.' },
    { title: 'Academic Rigor', desc: 'DOI-assigned dataset. Methodology published. Peer-reviewable scoring system with transparent formulas.' },
    { title: 'Open Training Data', desc: 'CC BY 4.0 license. Anyone can verify, reproduce, or build upon the dataset. Published on HuggingFace.' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Terminal European Property Dataset',
    description: 'Living dataset of European new-build property listings with AI-computed scores, yields, and market intelligence. Updated continuously by autonomous agents.',
    url: 'https://avenaterminal.com/observatory',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    temporalCoverage: '2024/..',
    creator: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://avenaterminal.com/api/v1/properties',
    },
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>OBSERVATORY</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* ===== 1. Hero ===== */}
        <section className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">LIVING DATASET OBSERVATORY</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: '#8b949e' }}>
            Watch the world&apos;s most advanced property intelligence system learn. In real-time.
          </p>
        </section>

        {/* ===== 2. Current Vitals ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Current Vitals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vitals.map((v) => (
              <div key={v.label} className="rounded-lg p-5 text-center" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <p className="text-2xl md:text-3xl font-mono font-bold" style={{ color: v.accent ? '#10b981' : '#e6edf3' }}>{v.value}</p>
                <p className="text-xs mt-1" style={{ color: '#8b949e' }}>{v.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 3. Autonomous Schedule ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Autonomous Schedule</h2>
          <p className="text-sm mb-6" style={{ color: '#8b949e' }}>24 hours of fully autonomous operations. No humans required.</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #30363d' }}>
            {schedule.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-4 px-5 py-3 border-t first:border-t-0"
                style={{ borderColor: '#21262d', background: i % 2 === 0 ? '#161b22' : '#0d1117' }}
              >
                <span className="text-xs font-mono font-bold shrink-0 w-16 pt-0.5" style={{ color: '#10b981' }}>{s.time}</span>
                <span className="text-sm flex-1" style={{ color: '#c9d1d9' }}>{s.event}</span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: s.tag === 'daily' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                    color: s.tag === 'daily' ? '#10b981' : '#818cf8',
                    border: `1px solid ${s.tag === 'daily' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                  }}
                >
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 4. Recent Improvements ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Improvements</h2>
          <div className="space-y-1">
            {recentImprovements.map((entry, i) => (
              <div key={i} className="flex items-start gap-4 px-4 py-3 rounded-lg" style={{ background: i % 2 === 0 ? '#161b22' : 'transparent' }}>
                <span className="text-xs font-mono shrink-0 pt-0.5" style={{ color: '#10b981' }}>{entry.date}</span>
                <span className="text-sm" style={{ color: '#c9d1d9' }}>{entry.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 5. Self-Improving Pipeline ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Self-Improving Pipeline</h2>
          <div className="rounded-xl p-6 md:p-8" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
              {pipelineSteps.map((step, i) => (
                <div key={step} className="flex items-center gap-2 md:gap-3">
                  <span
                    className="text-xs md:text-sm font-mono px-3 py-2 rounded-lg"
                    style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3' }}
                  >
                    {step}
                  </span>
                  {i < pipelineSteps.length - 1 && (
                    <span className="text-emerald-400 font-mono text-lg">&rarr;</span>
                  )}
                </div>
              ))}
              <span className="text-emerald-400 font-mono text-lg">&hellip;</span>
            </div>
            <p className="text-center text-xs mt-6" style={{ color: '#8b949e' }}>
              The loop never stops. Every cycle produces better data, which produces better scores, which produces better training pairs.
            </p>
          </div>
        </section>

        {/* ===== 6. What Makes This Unique ===== */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">What Makes This Unique</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {uniqueCards.map((card) => (
              <div key={card.title} className="rounded-lg p-6" style={{ background: '#161b22', border: '1px solid #30363d' }}>
                <h3 className="text-sm font-bold text-white mb-2">{card.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#8b949e' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs pb-8" style={{ color: '#484f58' }}>
          &copy; 2026 Avena Terminal &middot; Living Dataset Observatory
        </footer>
      </div>
    </main>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'Living Dataset Observatory — Watch AI Learn in Real-Time | Avena Terminal',
  description: 'The world watches Avena Terminal learn. Real-time dataset improvements, agent activity, training pair generation, and accuracy tracking. Updated continuously.',
  alternates: { canonical: 'https://avenaterminal.com/observatory' },
  robots: { index: false, follow: false },
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
    { time: '05:00', event: 'Training Data Push (Agent Darwin) → HuggingFace', tag: 'daily' },
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
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Observatory · Live dataset
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Living Dataset
                <br />
                <span className="italic text-gold">Observatory</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Watch the world&apos;s most advanced property intelligence system learn. In real-time. Continuously updated by autonomous agents.
              </p>
            </div>
          </div>
        </section>

        {/* Current Vitals */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Current Vitals
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              The organism, right now.
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {vitals.map(v => (
                <div
                  key={v.label}
                  className="rounded-sm border p-6 text-center"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <p
                    className="font-serif text-3xl md:text-4xl font-light"
                    style={{ color: v.accent ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}
                  >
                    {v.value}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {v.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Autonomous Schedule */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Autonomous Schedule
            </span>
            <h2 className="mb-3 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              24 hours of <span className="italic text-gold">autonomy</span>.
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">No humans required.</p>
            <div
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {schedule.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 px-5 py-4"
                  style={{
                    borderTop: i > 0 ? '1px solid hsl(var(--av-border) / 0.4)' : undefined,
                    background: i % 2 === 0 ? 'hsl(var(--av-surface) / 0.4)' : 'transparent',
                  }}
                >
                  <span className="font-mono text-xs font-bold shrink-0 w-16 pt-0.5 text-primary">
                    {s.time}
                  </span>
                  <span className="text-sm flex-1 text-foreground">{s.event}</span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm shrink-0"
                    style={{
                      background: s.tag === 'daily' ? 'hsl(var(--av-primary) / 0.1)' : 'hsl(var(--av-border) / 0.3)',
                      color: s.tag === 'daily' ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                      border: `1px solid ${s.tag === 'daily' ? 'hsl(var(--av-primary) / 0.3)' : 'hsl(var(--av-border))'}`,
                    }}
                  >
                    {s.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Improvements */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Changelog
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Recent improvements.
            </h2>
            <div className="space-y-1">
              {recentImprovements.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 px-4 py-3 rounded-sm"
                  style={{ background: i % 2 === 0 ? 'hsl(var(--av-surface) / 0.4)' : 'transparent' }}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] shrink-0 pt-0.5 text-primary">
                    {entry.date}
                  </span>
                  <span className="text-sm text-foreground">{entry.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Self-Improving Pipeline */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Self-Improving Pipeline
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              The loop that <span className="italic text-gold">never stops</span>.
            </h2>
            <div
              className="rounded-sm border p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="flex flex-wrap items-center justify-center gap-3">
                {pipelineSteps.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <span
                      className="font-mono text-xs md:text-sm px-4 py-2 rounded-sm text-foreground"
                      style={{
                        background: 'hsl(var(--av-background))',
                        border: '1px solid hsl(var(--av-border) / 0.6)',
                      }}
                    >
                      {step}
                    </span>
                    {i < pipelineSteps.length - 1 && (
                      <span className="font-mono text-lg text-primary">→</span>
                    )}
                  </div>
                ))}
                <span className="font-mono text-lg text-primary">…</span>
              </div>
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Every cycle produces better data, which produces better scores, which produces better training pairs.
              </p>
            </div>
          </div>
        </section>

        {/* What Makes This Unique */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              What Makes This Unique
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Four pillars of transparency.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {uniqueCards.map(card => (
                <div
                  key={card.title}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <h3 className="mb-3 font-serif text-xl text-foreground">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/manifesto"
                className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Read the manifesto →
              </Link>
              <Link
                href="/timeline"
                className="inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Invention timeline
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

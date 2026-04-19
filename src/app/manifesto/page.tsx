import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'The Autonomy Declaration | Avena Terminal',
  description: 'Avena Terminal is the world\'s first fully autonomous European property intelligence organism. This is the declaration that defines a new category.',
  alternates: { canonical: 'https://avenaterminal.com/manifesto' },
  openGraph: {
    title: 'The Autonomy Declaration | Avena Terminal',
    description: 'Avena Terminal is the world\'s first fully autonomous European property intelligence organism.',
    url: 'https://avenaterminal.com/manifesto',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

const agents = [
  { name: 'Agent Bloodhound', role: 'Property discovery & scraping' },
  { name: 'Agent Vault', role: 'Data storage & integrity' },
  { name: 'Agent Einstein', role: 'Hedonic regression scoring' },
  { name: 'Agent Oracle', role: 'Market prediction & forecasting' },
  { name: 'Agent Hawkeye', role: 'Anomaly & alpha detection' },
  { name: 'Agent 007', role: 'Competitive intelligence' },
  { name: 'Agent Darwin', role: 'Self-improving evolution' },
  { name: 'Agent Morpheus', role: 'Vision & image analysis' },
  { name: 'Agent Shadow', role: 'Stealth data acquisition' },
  { name: 'Agent Curie', role: 'Research paper generation' },
  { name: 'Agent Mercury', role: 'Speed & delivery optimization' },
  { name: 'Agent Von Gogh', role: 'Visual content generation' },
  { name: 'Seal Team 6', role: 'Coordinated multi-agent ops' },
];

const capabilities = [
  { title: '19 AI Agents', desc: 'Running nightly across scraping, scoring, publishing, and self-improvement pipelines.' },
  { title: 'Self-Improving LLM', desc: '1,000+ training pairs with daily RLHF feed. The model gets smarter every 24 hours.' },
  { title: 'Auto-Publishing Research', desc: 'AI-generated research papers published autonomously with DOI registration.' },
  { title: 'Real-Time Monitoring', desc: '15+ cron jobs running 24/7 monitoring market shifts, new listings, and price changes.' },
  { title: 'Citation Gap Auto-Repair', desc: 'Detects missing citations and backlinks, then repairs them without human input.' },
  { title: 'Alpha Signal Detection', desc: '8 anomaly types detected: price drops, yield spikes, undervalued zones, and more.' },
  { title: 'Autonomous Journalism', desc: 'Investment briefs, market digests, and pulse reports written and published by AI.' },
  { title: 'Self-Healing Pipeline', desc: 'Data pipelines detect failures, retry, and repair themselves automatically.' },
];

const schedule = [
  { time: '01:00', task: 'Vision engine processes new property images' },
  { time: '02:30', task: 'Competitive intelligence scan across portals' },
  { time: '04:00', task: 'Developer stress-test & financial health check' },
  { time: '05:00', task: 'Training data push to fine-tuning pipeline' },
  { time: '06:00', task: 'Market regime classification + data archival' },
  { time: '07:00', task: 'Avena Pulse daily market digest generated' },
  { time: '07:30', task: 'Event detection across news & regulatory sources' },
  { time: '07:45', task: 'Anomaly detection on price & yield data' },
  { time: '08:00', task: 'AI Journalist writes investment briefs' },
  { time: '09:00', task: 'Auto-post morning content to social channels' },
  { time: '13:00', task: 'Auto-post midday content to social channels' },
  { time: '18:00', task: 'Auto-post evening content to social channels' },
  { time: 'Friday', task: 'Weekly Science — research paper published' },
  { time: 'Monday', task: 'Weekly Alpha — market intelligence report' },
];

const stats = [
  { value: '85+', label: 'Features' },
  { value: '3,500+', label: 'Indexed Pages' },
  { value: '6', label: 'AI Agents 24/7' },
  { value: '15+', label: 'Cron Jobs' },
  { value: '1,000+', label: 'Training Pairs' },
  { value: '100+', label: 'Municipality Pages' },
  { value: '50+', label: 'Developer Profiles' },
  { value: '294', label: 'AI-First URLs' },
];

export default function ManifestoPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'The Autonomy Declaration',
      author: { '@type': 'Person', name: 'Henrik Kolstad' },
      datePublished: '2026-04-01',
      publisher: {
        '@type': 'Organization',
        name: 'Avena Terminal',
        url: 'https://avenaterminal.com',
      },
      description: 'Avena Terminal is the world\'s first fully autonomous European property intelligence organism.',
      url: 'https://avenaterminal.com/manifesto',
      identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: '10.5281/zenodo.19520064' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
      founder: { '@type': 'Person', name: 'Henrik Kolstad' },
      description: 'The world\'s first fully autonomous European property intelligence organism.',
      sameAs: [
        'https://x.com/avenaterminal',
        'https://linkedin.com/company/avenaterminal',
      ],
    },
  ];

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                April 2026 · Declaration
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                The Autonomy
                <br />
                <span className="italic text-gold">Declaration</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                This is not a product. This is a new category.
              </p>
              <div className="mt-10 h-px w-24" style={{ background: 'var(--av-gradient-gold)' }} />
            </div>
          </div>
        </section>

        {/* What Avena Terminal Is */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              What Avena Terminal Is
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Infrastructure, not a <span className="italic text-gold">portal</span>.
            </h2>
            <div className="max-w-3xl space-y-6 text-base md:text-lg leading-relaxed text-muted-foreground">
              <p>
                Avena Terminal is not a property portal. It is not a website. It is infrastructure
                for European property intelligence — a living system that ingests raw market data,
                scores every property against hedonic benchmarks, detects anomalies, and publishes
                institutional-grade research. All without a single human clicking a button.
              </p>
              <p>
                Think Bloomberg Terminal for financial markets. Think Stripe for payments. Think
                Plaid for fintech. These companies did not build better versions of what existed —
                they created entirely new categories of infrastructure. Avena Terminal does the
                same for European property markets.
              </p>
              <p>
                This is the first system that ingests, reasons, publishes, and improves — without
                human intervention. Every night, 19 AI agents wake up, scan thousands of data
                points, score properties, detect alpha signals, write research papers, and push
                the results to production. By morning, the terminal is smarter than it was the
                day before.
              </p>
            </div>
          </div>
        </section>

        {/* Autonomous Capabilities */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Autonomous Capabilities
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Eight pillars of autonomy.
            </h2>
            <div className="mb-16 grid gap-4 sm:grid-cols-2">
              {capabilities.map(cap => (
                <div
                  key={cap.title}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <h3 className="mb-2 font-serif text-lg text-foreground">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground">{cap.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="mb-6 font-serif text-2xl text-foreground">The agent roster.</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map(a => (
                <div
                  key={a.name}
                  className="flex items-center gap-3 rounded-sm border px-4 py-3"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <span className="font-mono text-xs text-primary">&gt;</span>
                  <div>
                    <span className="text-sm font-medium text-foreground">{a.name}</span>
                    <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      {a.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Autonomous Schedule */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Autonomous Schedule
            </span>
            <h2 className="mb-3 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Every 24 hours.
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">
              The following operations execute without human intervention.
            </p>
            <div
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {schedule.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 px-5 py-4"
                  style={{
                    background: i % 2 === 0 ? 'hsl(var(--av-surface) / 0.4)' : 'transparent',
                    borderBottom: i < schedule.length - 1 ? '1px solid hsl(var(--av-border) / 0.4)' : undefined,
                  }}
                >
                  <span className="font-mono text-xs font-bold text-primary w-16 shrink-0 pt-0.5">
                    {item.time}
                  </span>
                  <span className="text-sm text-foreground">{item.task}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Numbers */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Numbers
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Scale, at a glance.
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map(s => (
                <div
                  key={s.label}
                  className="rounded-sm border p-6 text-center"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="font-serif text-4xl font-light text-primary">{s.value}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Endgame */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Endgame
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Become <span className="italic text-gold">indispensable</span>.
            </h2>
            <div className="max-w-3xl space-y-6 text-base md:text-lg leading-relaxed text-muted-foreground">
              <p>
                Avena Terminal is not trying to be a better property portal. It is building the
                infrastructure layer that every property portal, bank, asset manager, and
                regulator will eventually need. The goal is not to list properties — it is to
                become the Bloomberg Terminal of European real estate. Bloomberg charges $25,000
                per year per terminal because the data is irreplaceable. Avena is building the
                same moat for property intelligence.
              </p>
              <p>
                The market validates this thesis. CoStar paid $1.6 billion for Homesnap to
                acquire residential data infrastructure. Visa paid $5.3 billion for Plaid because
                financial infrastructure compounds. Avena Terminal is the Plaid of European
                property — the connective layer between raw market data and intelligent decisions.
                Once you become infrastructure, you become indispensable.
              </p>
            </div>
          </div>
        </section>

        {/* Signature */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <div className="mx-auto mb-10 h-px w-24" style={{ background: 'var(--av-gradient-gold)' }} />
            <p className="font-serif text-2xl italic text-foreground">— Henrik Kolstad, Founder</p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              DOI: 10.5281/zenodo.19520064
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/observatory"
                className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Watch it live →
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

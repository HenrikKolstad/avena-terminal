import { Metadata } from 'next';
import Link from 'next/link';

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
          <span className="text-white">Manifesto</span>
        </nav>

        {/* ─── HERO ─── */}
        <section className="text-center py-16 md:py-24">
          <p className="text-xs tracking-[0.3em] text-emerald-400 uppercase mb-4">
            April 2026
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: '#c9d1d9' }}>
            THE AUTONOMY DECLARATION
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            This is not a product. This is a new category.
          </p>
          <div className="mt-8 w-24 h-px bg-emerald-500 mx-auto" />
        </section>

        {/* ─── WHAT AVENA TERMINAL IS ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            WHAT AVENA TERMINAL IS
          </h2>
          <div className="space-y-6 text-gray-300 leading-relaxed text-base md:text-lg">
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
        </section>

        {/* ─── AUTONOMOUS CAPABILITIES ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            AUTONOMOUS CAPABILITIES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                className="rounded-lg p-5"
                style={{ background: '#161b22', border: '1px solid #30363d' }}
              >
                <h3 className="font-semibold text-white mb-1">{cap.title}</h3>
                <p className="text-sm text-gray-400">{cap.desc}</p>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-white mb-4">The Agent Roster</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((a) => (
              <div
                key={a.name}
                className="rounded px-4 py-3 flex items-center gap-3"
                style={{ background: '#161b22', border: '1px solid #30363d' }}
              >
                <span className="text-emerald-400 text-xs font-mono">&gt;</span>
                <div>
                  <span className="text-white text-sm font-medium">{a.name}</span>
                  <span className="text-gray-500 text-xs ml-2">{a.role}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── THE AUTONOMOUS SCHEDULE ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            THE AUTONOMOUS SCHEDULE
          </h2>
          <p className="text-gray-400 mb-6">
            Every 24 hours, the following operations execute without human intervention:
          </p>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid #30363d' }}
          >
            {schedule.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 px-5 py-3"
                style={{
                  background: i % 2 === 0 ? '#161b22' : '#0d1117',
                  borderBottom: i < schedule.length - 1 ? '1px solid #21262d' : undefined,
                }}
              >
                <span className="font-mono text-emerald-400 text-sm w-16 shrink-0 pt-0.5">
                  {item.time}
                </span>
                <span className="text-gray-300 text-sm">{item.task}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── THE NUMBERS ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            THE NUMBERS
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg p-5 text-center"
                style={{ background: '#161b22', border: '1px solid #30363d' }}
              >
                <div className="text-3xl font-bold text-emerald-400 mb-1">{s.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── THE ENDGAME ─── */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 tracking-wide">
            THE ENDGAME
          </h2>
          <div className="space-y-6 text-gray-300 leading-relaxed text-base md:text-lg">
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
        </section>

        {/* ─── SIGNATURE ─── */}
        <section className="mb-20 text-center">
          <div className="w-24 h-px bg-emerald-500 mx-auto mb-8" />
          <p className="text-lg text-white font-semibold mb-1">
            — Henrik Kolstad, Founder
          </p>
          <p className="text-xs text-gray-500 font-mono">
            DOI: 10.5281/zenodo.19520064
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-xs text-gray-600"
        style={{ borderColor: '#1c2333' }}
      >
        <p>&copy; {new Date().getFullYear()} Avena Terminal. All rights reserved.</p>
      </footer>
    </div>
  );
}

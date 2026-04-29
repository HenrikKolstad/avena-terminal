import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Causal Intelligence — Why Markets Move | Avena Terminal',
  description: 'Causal chain analysis of Spanish coastal property markets. Understand the macro triggers, transmission mechanisms, and downstream effects driving real estate prices.',
  alternates: { canonical: 'https://avenaterminal.com/causal' },
  robots: { index: false, follow: false },
};

type ChainStatus = 'ACTIVE' | 'MONITORING' | 'DORMANT';

interface CausalChain {
  id: string;
  trigger: string;
  cause: string;
  effect: string;
  magnitude: string;
  lag_weeks: number;
  confidence: number;
  evidence: string;
  region: string;
  status: ChainStatus;
}

const CHAINS: CausalChain[] = [
  {
    id: 'ecb-rate-cut',
    trigger: 'ECB cuts rates below 2.5%',
    cause: 'Cheaper mortgages reduce cost of financing',
    effect: 'Demand for coastal new builds rises 8-15%',
    magnitude: '+8-15% demand uplift',
    lag_weeks: 26,
    confidence: 0.88,
    evidence: 'ECB rate at 2.40%, 6 consecutive cuts since Sep 2024',
    region: 'All Spain',
    status: 'ACTIVE',
  },
  {
    id: 'eur-gbp-weakness',
    trigger: 'EUR/GBP drops below 0.86',
    cause: 'Sterling strength benefits UK buyers',
    effect: 'British buyer demand surges 10-20%',
    magnitude: '+10-20% British demand',
    lag_weeks: 12,
    confidence: 0.82,
    evidence: 'EUR/GBP at 0.856, below threshold',
    region: 'Costa Blanca, Costa del Sol',
    status: 'ACTIVE',
  },
  {
    id: 'tourism-boom',
    trigger: 'Spain tourism exceeds 90M visitors',
    cause: 'Record tourism validates rental yield thesis',
    effect: 'Investor demand increases 12-18%',
    magnitude: '+12-18% investor demand',
    lag_weeks: 16,
    confidence: 0.79,
    evidence: '96M visitors in trailing 12 months',
    region: 'Coastal Spain',
    status: 'ACTIVE',
  },
  {
    id: 'supply-constraint',
    trigger: 'New supply growth exceeds 10% YoY',
    cause: 'Pipeline expansion increases competition',
    effect: 'Price growth moderates 2-4% in saturated zones',
    magnitude: '-2-4% price moderation',
    lag_weeks: 36,
    confidence: 0.71,
    evidence: 'New supply YoY at 12.4%',
    region: 'Costa Blanca South, Costa del Sol East',
    status: 'ACTIVE',
  },
  {
    id: 'developer-stress',
    trigger: 'Construction cost inflation exceeds 5%',
    cause: 'Margin compression forces developer discounts',
    effect: 'Distressed pricing in 5-10% of pipeline',
    magnitude: '5-10% stress pricing',
    lag_weeks: 20,
    confidence: 0.65,
    evidence: 'Costs at +3.1% YoY, below threshold',
    region: 'All costas',
    status: 'MONITORING',
  },
  {
    id: 'institutional-capital',
    trigger: 'Institutional funds allocate >EUR 2B to resi',
    cause: 'Large capital compresses prime yields',
    effect: 'Secondary towns appreciate 15-25%',
    magnitude: '+15-25% secondary locations',
    lag_weeks: 40,
    confidence: 0.73,
    evidence: 'Blackstone, Greystar active. BTR +30% YoY',
    region: 'Secondary costa towns',
    status: 'MONITORING',
  },
];

const STATUS_COLORS: Record<ChainStatus, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', dot: '#10b981' },
  MONITORING: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', dot: '#fbbf24' },
  DORMANT: { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', dot: '#6b7280' },
};

function ChainCard({ chain }: { chain: CausalChain }) {
  const colors = STATUS_COLORS[chain.status];
  return (
    <div
      style={{
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
      }}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: colors.dot,
              display: 'inline-block',
            }}
          />
          <span className="text-xs font-mono font-bold" style={{ color: colors.text }}>
            {chain.status}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: '#8b949e' }}>
          {chain.region}
        </span>
      </div>

      {/* Flow arrow: Trigger -> Cause -> Effect */}
      <div className="flex flex-col gap-3">
        {/* Trigger */}
        <div
          style={{
            background: 'rgba(139,148,158,0.08)',
            border: '1px solid #30363d',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Trigger
          </span>
          <p className="text-sm mt-1" style={{ color: '#e6edf3' }}>
            {chain.trigger}
          </p>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
            <path d="M10 0L10 18M10 18L4 12M10 18L16 12" stroke={colors.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Cause */}
        <div
          style={{
            background: 'rgba(139,148,158,0.08)',
            border: '1px solid #30363d',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Cause
          </span>
          <p className="text-sm mt-1" style={{ color: '#e6edf3' }}>
            {chain.cause}
          </p>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
            <path d="M10 0L10 18M10 18L4 12M10 18L16 12" stroke={colors.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Effect */}
        <div
          style={{
            background: colors.bg,
            border: `1px solid ${colors.dot}33`,
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: colors.text }}>
            Effect
          </span>
          <p className="text-sm mt-1 font-medium" style={{ color: colors.text }}>
            {chain.effect}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 mt-4 pt-3" style={{ borderTop: '1px solid #21262d' }}>
        <div>
          <span className="text-[10px] font-mono" style={{ color: '#8b949e' }}>Magnitude</span>
          <p className="text-xs font-medium" style={{ color: '#e6edf3' }}>{chain.magnitude}</p>
        </div>
        <div>
          <span className="text-[10px] font-mono" style={{ color: '#8b949e' }}>Lag</span>
          <p className="text-xs font-medium" style={{ color: '#e6edf3' }}>{chain.lag_weeks} weeks</p>
        </div>
        <div>
          <span className="text-[10px] font-mono" style={{ color: '#8b949e' }}>Confidence</span>
          <p className="text-xs font-medium" style={{ color: '#e6edf3' }}>{Math.round(chain.confidence * 100)}%</p>
        </div>
      </div>

      {/* Evidence */}
      <p className="text-xs mt-3" style={{ color: '#8b949e' }}>
        {chain.evidence}
      </p>
    </div>
  );
}

export default function CausalPage() {
  const active = CHAINS.filter(c => c.status === 'ACTIVE');
  const monitoring = CHAINS.filter(c => c.status === 'MONITORING');
  const dormant = CHAINS.filter(c => c.status === 'DORMANT');
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ScholarlyArticle',
        name: 'Causal Intelligence: Why Spanish Property Markets Move',
        description: `Analysis of ${CHAINS.length} macro-to-micro causal chains affecting coastal Spanish new-build property.`,
        url: 'https://avenaterminal.com/causal',
        datePublished: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
        publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
        about: 'Causal analysis of Spanish coastal property market dynamics',
      },
      {
        '@type': 'Dataset',
        name: 'Avena Causal Chain Dataset',
        description: `${CHAINS.length} macro-to-micro causal chains with trigger conditions, lag periods, and confidence scores.`,
        url: 'https://avenaterminal.com/causal',
        license: 'https://avenaterminal.com/about/data-sources',
        creator: { '@type': 'Organization', name: 'Avena Terminal' },
        variableMeasured: CHAINS.map(c => c.id),
      },
    ],
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-mono text-gray-400">CAUSAL INTELLIGENCE</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#e6edf3' }}>
          Causal Intelligence
        </h1>
        <p className="text-lg mb-2" style={{ color: '#8b949e' }}>
          Understanding <span style={{ color: '#10b981' }}>WHY</span> markets move
        </p>
        <p className="text-sm" style={{ color: '#8b949e' }}>
          {CHAINS.length} macro-to-micro causal chains tracked. {active.length} active, {monitoring.length} monitoring, {dormant.length} dormant.
          Updated {date}.
        </p>
      </section>

      {/* Status summary */}
      <section className="max-w-5xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active', count: active.length, color: '#10b981' },
            { label: 'Monitoring', count: monitoring.length, color: '#fbbf24' },
            { label: 'Dormant', count: dormant.length, color: '#6b7280' },
          ].map(s => (
            <div
              key={s.label}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 12,
                padding: '16px 20px',
                textAlign: 'center',
              }}
            >
              <p className="text-3xl font-bold font-mono" style={{ color: s.color }}>
                {s.count}
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: '#8b949e' }}>
                {s.label.toUpperCase()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Active chains */}
      {active.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-bold mb-4 font-mono" style={{ color: '#10b981' }}>
            ACTIVE CHAINS
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {active.map(chain => (
              <ChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        </section>
      )}

      {/* Monitoring chains */}
      {monitoring.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-bold mb-4 font-mono" style={{ color: '#fbbf24' }}>
            MONITORING
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {monitoring.map(chain => (
              <ChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        </section>
      )}

      {/* Dormant chains */}
      {dormant.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-bold mb-4 font-mono" style={{ color: '#6b7280' }}>
            DORMANT
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {dormant.map(chain => (
              <ChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        </section>
      )}

      {/* Methodology */}
      <section className="max-w-5xl mx-auto px-4 py-8" style={{ borderTop: '1px solid #21262d' }}>
        <h2 className="text-lg font-bold mb-3 font-mono" style={{ color: '#e6edf3' }}>
          METHODOLOGY
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>
          Each causal chain maps a macro trigger to a micro market effect through an identified
          transmission mechanism. Chains are classified as ACTIVE when trigger conditions are met,
          MONITORING when approaching thresholds, and DORMANT when inactive. Confidence scores
          reflect historical accuracy and the strength of the causal link. Lag periods indicate the
          typical delay between trigger activation and observable market effect.
        </p>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-6" style={{ borderTop: '1px solid #21262d' }}>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <span className="text-xs" style={{ color: '#8b949e' }}>
            Causal Intelligence Engine
          </span>
        </div>
      </footer>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { MemoForm } from './MemoForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Memo Engine · Avena Terminal',
  description: 'Type a property investment thesis. Get a 10-section institutional memo in 30 seconds. Photos, hedonic valuation, Counterpart developer risk, Genesis stress tests, comps, methodology citation.',
  alternates: { canonical: 'https://avenaterminal.com/memo' },
  openGraph: {
    title: 'Avena Memo Engine — institutional memos in 30 seconds',
    description: 'One prompt. Ten sections. A research-grade memo your IC will sign.',
    url: 'https://avenaterminal.com/memo',
  },
};

const EXAMPLES = [
  'Marbella beachfront villas €1.5M–€3M with gross yield above 5% for a 36-month hold',
  'Costa Blanca South off-plan apartments under €250k with 3+ bedrooms within 1km of the beach',
  'Costa del Sol penthouses €600k–€1.2M with Avena Score above 70',
  'Costa Calida villas under €500k with gross yield above 6%',
  'Orihuela Costa townhouses €200k–€350k held for 24 months',
];

export default function MemoPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section
          className="border-b relative overflow-hidden"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'radial-gradient(ellipse 90% 60% at 50% 0%, hsl(42 85% 64% / 0.10), transparent 70%), hsl(var(--av-background))',
          }}
        >
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Memo Engine · Institutional · Beta
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6 max-w-4xl">
              Type a thesis. <br />
              Get a <span className="italic text-gold">10-section memo</span><br />in 30 seconds.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light leading-relaxed">
              The artefact your fund analyst spends two weeks building. Generated live from the Avena dataset, hedonic valuation, Counterpart developer ratings, Genesis macro scenarios, and notarial comparables. Forwardable to your IC. Citation-stamped.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>10 sections</span>
              <span>·</span>
              <span>~30s generation</span>
              <span>·</span>
              <span>Cited at <span className="text-foreground">DOI 10.5281/zenodo.19520064</span></span>
              <span>·</span>
              <span>APIP v1.0</span>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-14">
            <MemoForm examples={EXAMPLES} />
          </div>
        </section>

        {/* What's in the memo */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">Memo structure · 10 sections</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ['01', 'Executive Summary',     'One paragraph thesis · single most important data point · recommendation'],
                ['02', 'Universe & Selection',  'Filter logic and ranking rationale'],
                ['03', 'Valuation Analysis',    'Hedonic OLS market reference vs asking price, per candidate'],
                ['04', 'Yield Projection',      'Bottom-up ADR model, AirDNA-backtested'],
                ['05', 'Counterpart Risk',      'Developer rating per candidate · stress flags · contagion'],
                ['06', 'Macro Context',         'Live ECB / Eurostat indicators · regime classification'],
                ['07', 'Scenario Stress Test',  'Bull / base / bear at requested horizon via Genesis'],
                ['08', 'Comparable Transactions','Notarial comps within 1km radius (when available)'],
                ['09', 'Position Sizing',       'Recommended allocation per candidate as % of book'],
                ['10', 'Exit Strategy',         'Hold horizon · exit triggers · liquidity'],
              ].map(([n, title, desc]) => (
                <div key={n} className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] text-primary tabular">{n}</span>
                    <h3 className="font-serif text-base text-foreground">{title}</h3>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed pl-8">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="py-10">
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Each memo is cryptographically timestamped · cite as <Link href="/governance" className="text-foreground hover:text-primary">avenaterminal.com/memo/&lt;short_id&gt;</Link> · CC BY 4.0
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

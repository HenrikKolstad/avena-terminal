import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { PortfolioForm } from './PortfolioForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Portfolio Risk Simulator · Avena Terminal',
  description: 'Upload your property holdings, get the Avena view. Aggregated NAV, weighted yield, regime mix, Counterpart exposure, stress-test outcomes, concentration flags. Institutional procurement-ready.',
  alternates: { canonical: 'https://avenaterminal.com/portfolio' },
  openGraph: {
    title: 'Avena Portfolio Risk — upload your book, get the view',
    description: 'Aggregate regime / yield / counterpart / stress exposure across your holdings in one shot.',
    url: 'https://avenaterminal.com/portfolio',
  },
};

export default function PortfolioPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Portfolio Risk · Institutional · v1.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6 max-w-4xl">
              Upload your book.<br />
              See <span className="italic text-gold">the Avena view</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light leading-relaxed">
              Paste a CSV of your property holdings — or any list of Spanish coastal properties you&apos;re evaluating. Avena resolves each row (direct ref match or AVM lookup), then aggregates regime classification, weighted yield, Counterpart developer exposure, Genesis stress-test bands, and surfaces concentration flags. The artefact an investment committee uses to size positions.
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Up to 500 rows</span>
              <span>·</span>
              <span>~2s per portfolio</span>
              <span>·</span>
              <span>API <span className="text-foreground">POST /api/v1/portfolio/analyze</span></span>
              <span>·</span>
              <span>Cite <span className="text-foreground">DOI 10.5281/zenodo.19520064</span></span>
            </div>
          </div>
        </section>

        {/* Form + result */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <PortfolioForm />
          </div>
        </section>

        {/* What the report contains */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">What you receive</div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                ['Portfolio summary',     'NAV, weighted yield, weighted Avena Score, confidence, VaR-95 under Genesis stress.'],
                ['Per-holding analysis',  'Resolved valuation, AVM confidence, regime classification, bull/base/bear bands.'],
                ['Regime mix',            'NAV-weighted distribution across BULL / GROWTH / NEUTRAL / CAUTION / BEAR.'],
                ['Counterpart exposure',  'Distribution by developer grade (AAV → DV). Distress flags surfaced.'],
                ['Concentration flags',   'Geographic, single-property, regime, counterpart concentration calls.'],
                ['Acquisition delta',     'If you provide acquisition_cost_eur, unrealised gain per holding.'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <h3 className="font-serif text-base text-foreground mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CSV format help */}
        <section className="py-12">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">CSV format</div>
            <div className="rounded-sm border p-5 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <div className="text-muted-foreground">ref,town,type,built_m2,bedrooms,beach_km,energy,pool,acquisition_cost_eur</div>
              <div className="text-foreground">AP1-MAR-12345,Marbella,Villa,280,4,0.4,A,private,1850000</div>
              <div className="text-foreground">,Torrevieja,Apartment,95,2,0.3,B,communal,185000</div>
              <div className="text-foreground">,Estepona,Penthouse,180,3,0.5,A,communal,720000</div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="text-foreground">ref</span> is optional — when blank, Avena uses its AVM to value the row from town + type + built_m2. <span className="text-foreground">acquisition_cost_eur</span> is optional — when provided, unrealised gain is computed per holding.
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Procurement at <Link href="/institutional" className="text-primary hover:underline">/institutional</Link> · saved portfolios, batch over 500 rows, and white-label PDF on Desk tier and above.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { AVMForm } from './AVMForm';
import { listTowns } from '@/lib/avm-engine';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AVM · Automated Valuation Model · Avena Terminal',
  description: 'Bank-grade automated valuation for Spanish coastal property. Instant fair-market value with confidence interval, comparable analysis, and full methodology citation.',
  alternates: { canonical: 'https://avenaterminal.com/avm' },
  openGraph: {
    title: 'Avena AVM — instant property valuation',
    description: 'Underwriter-ready valuation in under a second. Confidence-banded, comp-backed, citation-stamped.',
    url: 'https://avenaterminal.com/avm',
  },
};

export default function AVMPage() {
  const towns = listTowns();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16 sm:py-20">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              AVM · Automated Valuation Model · v1.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6 max-w-4xl">
              Underwriter-ready valuations<br />
              in <span className="italic text-gold">under a second</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light leading-relaxed">
              Bank-grade Automated Valuation Model. Hedonic OLS approximation calibrated to the live Avena corpus. Returns predicted value with confidence band, five nearest comparable transactions, and a SHAP-style adjustment breakdown so an underwriter can read the model&apos;s reasoning, not just trust the output.
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>±3% RMSE backtest</span>
              <span>·</span>
              <span>Cite <span className="text-foreground">DOI 10.5281/zenodo.19520064</span></span>
              <span>·</span>
              <span><Link href="/methodology" className="text-foreground hover:text-primary">Methodology</Link></span>
              <span>·</span>
              <span>API <span className="text-foreground">POST /api/v1/avm/value</span></span>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
            <AVMForm towns={towns} />
          </div>
        </section>

        {/* Use cases */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">Used by</div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { tag: 'Banks',           title: 'Mortgage underwriting', body: 'Instant valuation reference at origination. Confidence band lets risk teams set LTV ceilings without waiting on physical appraisal.' },
                { tag: 'Funds',           title: 'Pre-acquisition check', body: 'Run an entire watchlist through the AVM in a single batch. Identify the deal where ask is materially below model.' },
                { tag: 'Notaries / Tax',  title: 'Reference value',       body: 'Independent fair-market reference for fiscal valoración and conveyancing. Cited DOI, reproducible methodology.' },
              ].map((c) => (
                <div key={c.tag} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">{c.tag}</div>
                  <h3 className="font-serif text-lg text-foreground mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API block */}
        <section className="py-12">
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Programmatic access</div>
            <div className="rounded-sm border p-5 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <div className="text-muted-foreground"># Value an arbitrary property</div>
              <div className="text-foreground mt-1">curl -X POST https://avenaterminal.com/api/v1/avm/value \</div>
              <div className="text-foreground">  -H &quot;Content-Type: application/json&quot; \</div>
              <div className="text-foreground">  -d &apos;{'{'}&quot;inputs&quot;:{'{'}&quot;town&quot;:&quot;Marbella&quot;,&quot;type&quot;:&quot;Villa&quot;,&quot;built_m2&quot;:280,&quot;bedrooms&quot;:4,&quot;beach_km&quot;:0.4,&quot;sea_view&quot;:true,&quot;pool&quot;:&quot;private&quot;,&quot;energy&quot;:&quot;A&quot;{'}'}{'}'}&apos;</div>
              <div className="text-muted-foreground mt-3"># Value an existing Avena ref</div>
              <div className="text-foreground">curl -X POST .../api/v1/avm/value -d &apos;{'{'}&quot;ref&quot;:&quot;AP1-TR-12345&quot;{'}'}&apos;</div>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Procurement at <Link href="/institutional" className="text-primary hover:underline">/institutional</Link> · GET endpoint returns the schema
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

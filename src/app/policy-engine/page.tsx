import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { DatasetJsonLd } from '@/components/v2/DatasetJsonLd';
import { leverCatalogue, countryCatalogue } from '@/lib/policy-engine';
import { PolicyEngineClient } from './PolicyEngineClient';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Precision Policy Engine · Avena Terminal',
  description: 'Macroprudential scenario simulation for European residential property. Built for central banks, supervisors, and finance ministries. Postcode-level granularity, signed outputs, full methodology — the first engine of its kind in Europe.',
  alternates: { canonical: 'https://avenaterminal.com/policy-engine' },
  openGraph: {
    title: 'Avena Precision Policy Engine — macroprudential simulation for European housing',
    description: 'Run scenarios across 6 policy levers × 27 EU countries × cohort weighting × forward 12-36m projections. Signed, citable, reproducible.',
    url: 'https://avenaterminal.com/policy-engine',
  },
};

export default function PolicyEnginePage() {
  const levers = leverCatalogue();
  const countries = countryCatalogue();

  return (
    <div className="avena-v2 min-h-screen">
      <DatasetJsonLd
        name="Avena Precision Policy Engine — Macroprudential Simulation for European Residential Property"
        description="Deterministic scenario simulation engine for European residential property macroprudential policy. Six policy levers (LTV cap, DSTI cap, capital requirement, counter-cyclical buffer, sectoral risk weight, foreign-buyer levy) × 27 EU countries × foreign-buyer-share cohort filtering × forward 12-36 month projections. Calibrated against Avena Sovereign Briefings Vol. 2-4 + Cerutti/Claessens/Laeven (2017) IMF macroprudential framework. Every output signed (HMAC-SHA256), every coefficient cited, every scenario reproducible."
        url="https://avenaterminal.com/policy-engine"
        identifier="https://doi.org/10.5281/zenodo.19520064"
        keywords={['macroprudential policy', 'European residential property', 'LTV cap', 'capital requirement', 'foreign-buyer flows', 'systemic risk', 'central banking', 'ESRB', 'ECB', 'stress testing']}
        spatialCoverage="EU27"
        variableMeasured={['Price impact (%)', 'NPL impact (bps)', 'Capital rotation (EUR)', 'Bank stress projection', 'Postcode-level price delta', 'Forward transmission curve']}
        distributions={[
          { format: 'application/json', url: '/api/v1/policy/simulate', description: 'POST scenario simulation API' },
        ]}
      />
      <Nav />

      {/* Print-only letterhead — shows only in PDF/print, hidden on screen */}
      <div className="hidden print:block" style={{ borderBottom: '1px solid #b8860b', padding: '12mm 14mm 6mm', marginBottom: '6mm' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20pt', fontStyle: 'italic', color: '#b8860b' }}>Avena</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginTop: 4 }}>Precision Policy Engine · Macroprudential Simulation Report</div>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8pt', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', textAlign: 'right' }}>
            <div>{new Date().toISOString().slice(0, 10)}</div>
            <div>v2026.05 · CC BY 4.0</div>
            <div>DOI 10.5281/zenodo.19520064</div>
          </div>
        </div>
      </div>

      <main className="pt-16 print:pt-0">

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="border-b relative overflow-hidden print:hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, hsl(var(--av-primary)), transparent 60%)' }} />
          <div className="mx-auto max-w-[1280px] px-5 sm:px-12 py-16 sm:py-24 relative">
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">Avena · Precision Policy Engine</span>
              <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-success" style={{ borderColor: 'hsl(var(--av-success) / 0.4)' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                v1 live · v2026.05
              </span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6 max-w-5xl">
              Macroprudential simulation, <span className="text-gold italic">to the postcode</span>.
            </h1>

            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-10">
              Built for the ECB, ESRB, national central banks, and supervisory authorities tasked with monitoring European residential property risk. Six policy levers × 27 EU countries × cohort weighting × forward 12-36 month projections. Calibrated against the Avena ground-truth corpus and the Vol. 2-4 sovereign briefing framework. Every output signed, every coefficient cited, every scenario reproducible.
            </p>

            {/* Capability strip — sized identically, equal weight, staggered fade-up */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 max-w-4xl">
              <div className="policy-fade-up"><CapabilityTile value="6" label="Policy levers" sub="LTV · DSTI · Capital · CCyB · RW · FB levy" /></div>
              <div className="policy-fade-up-d1"><CapabilityTile value="27" label="EU member states" sub="ES calibrated full · 5 directional · 21 pending" /></div>
              <div className="policy-fade-up-d2"><CapabilityTile value="1,881" label="Ground-truth properties" sub="Spain coastal corpus · daily refresh" /></div>
              <div className="policy-fade-up-d3"><CapabilityTile value="36 mo" label="Forward projection" sub="Logistic transmission curve" /></div>
            </div>
          </div>
        </section>

        {/* ─── THE ENGINE ─────────────────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.2)' }}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-12 py-12 sm:py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">The engine</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-3">Pick a lever. Pick a cohort. Run the scenario.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-10 leading-relaxed">
              This is a public demo of the v1 engine. Outputs are deterministic and replayable — same inputs always produce the same simulation. Every coefficient is calibrated against the published Avena methodology (Vol. 2 OLS regression, Vol. 3 cross-validation, Vol. 4 cohort priors) and conservative literature priors (Cerutti/Claessens/Laeven 2017 IMF WP/17/19, ESRB 2019 framework recommendation, Banco de España 2020 stress test methodology).
            </p>

            <PolicyEngineClient levers={levers} countries={countries} />
          </div>
        </section>

        {/* ─── METHODOLOGY ──────────────────────────────────────── */}
        <section className="border-b print:hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Methodology guardrails</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Designed for regulatory replay.</h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Guard
                title="Deterministic"
                body="Same inputs → same outputs. No random sampling, no Monte Carlo noise in v1. Suitable for committee replay and regulatory audit."
              />
              <Guard
                title="Signed"
                body="Every result carries an HMAC-SHA256 signature over the input and the summary outputs. Tampering breaks the signature."
              />
              <Guard
                title="Cited"
                body="Every coefficient links to its primary source — Vol. 2 OLS, IMF macroprudential framework, ESRB recommendation, BdE stress test methodology."
              />
              <Guard
                title="Versioned"
                body="Methodology version is stamped on every output. Material changes are announced 30 days in advance at /changelog."
              />
            </div>
          </div>
        </section>

        {/* ─── INSTITUTIONAL ACCESS ─────────────────────────────── */}
        <section className="print:hidden" style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Institutional access</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6 max-w-3xl">
              This is the public demo. The full engine ships with seven policy levers × 27 EU countries × custom cohort definitions × audit-grade replay.
            </h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-10 leading-relaxed">
              Avena Institutional partners with central banks, supervisory authorities, and finance ministries on dedicated deployments. Includes white-label hosting on your domain (terminal.your-institution.eu), SSO integration with your identity provider, dedicated solutions architect for first-90-day onboarding, DPA + GDPR Article 28 processor agreement, SOC 2 attestation under shared-responsibility model, and direct line to the Avena Research Desk that authored the published methodology.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl mb-10 leading-relaxed">
              Reach the desk via the form at the bottom of any scenario, or directly: <a href="mailto:institutional@avenaterminal.com?subject=Precision%20Policy%20Engine%20enquiry" className="text-foreground hover:text-primary transition-colors">institutional@avenaterminal.com</a>. Typical first-conversation: 30 minutes, NDA-optional.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:institutional@avenaterminal.com?subject=Precision%20Policy%20Engine%20enquiry" className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
                Talk to the desk →
              </a>
              <Link href="/sovereign-briefing" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                Read the methodology briefs →
              </Link>
              <Link href="/terminal" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                Open Avena Terminal →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function CapabilityTile({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-background) / 0.6)' }}>
      <div className="font-serif text-4xl sm:text-5xl font-light text-foreground tabular leading-none mb-2">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-1">{label}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground leading-relaxed">{sub}</div>
    </div>
  );
}

function Guard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.7 }} />
      <div className="pl-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">{title}</div>
        <p className="text-xs text-foreground/85 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

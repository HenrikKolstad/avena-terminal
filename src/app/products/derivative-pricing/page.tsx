import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Real Estate Derivative Pricing Engine · Avena',
  description: 'European residential property options + structured product pricing engine. AVENA-CC underlying, EU MIR-calibrated discount rates, signed payoff projections. For family offices and structured product desks.',
  alternates: { canonical: 'https://avenaterminal.com/products/derivative-pricing' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Real Estate Derivative Pricing Engine',
  description: 'Options pricing engine for European residential property derivatives, with AVENA-CC index underlying.',
  brand: { '@type': 'Brand', name: 'Avena' },
  category: 'B2B SaaS · Capital Markets Infrastructure',
  url: 'https://avenaterminal.com/products/derivative-pricing',
};

export default function DerivativePricingPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">Avena · Products · Derivative Pricing</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              The pricing engine<br />for <span className="text-gold italic">EU residential derivatives.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-10">
              Built for family offices, structured product desks, and capital markets teams pricing European residential property options, futures, and bespoke note payoffs. Underlying: the AVENA-CC index family. Discount curve: ECB MIR-calibrated. Output: HMAC-signed payoff projections suitable for trade booking and counterparty negotiation.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              <Stat value="AVENA-CC" label="Tradeable underlying" />
              <Stat value="MIR" label="ECB-calibrated curve" />
              <Stat value="HMAC" label="Signed payoffs" />
              <Stat value="36 mo" label="Forward horizon" />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Endpoint</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">European-style option on AVENA-CC.</h2>
            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`POST https://avenaterminal.com/api/v1/options-pricing
Content-Type: application/json
Authorization: Bearer <institutional-key>

{
  "underlying": "AVENA-CC",
  "type": "call",
  "strike": 110.0,
  "expiry": "2027-06-30",
  "notional_eur": 50000000,
  "discount_curve": "ECB_MIR_ES"
}

→ {
  "premium_eur": 1842500,
  "delta": 0.42,
  "vega": 215000,
  "implied_vol": 0.182,
  "expected_payoff_at_expiry": [...],
  "signature": "9c4b2f...",
  "methodology_version": "v2026.05"
}`}</code>
            </pre>
            <p className="mt-6 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Pricing uses a stochastic process calibrated against historical AVENA-CC realised volatility + Vol. 4 forward-cohort priors. Discount curve drawn live from ECB MIR per country. Greeks reported per Black-Scholes-Merton convention with documented departures for property-specific factors (jump risk, liquidity premium, cohort beta).
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Supported instruments</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Four product categories.</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Inst
                category="Vanilla options"
                body="European-style calls and puts on AVENA-CC, AVENA-VAL, AVENA-SCR, AVENA-DPT. Strike, expiry, notional configurable. Greeks + implied vol returned."
              />
              <Inst
                category="Forward contracts"
                body="Forward AVENA-CC settlement for institutional hedging of residential exposure. Spot-forward via ECB MIR curve. Daily mark-to-market via published index closes."
              />
              <Inst
                category="Structured notes"
                body="Custom payoff structures — autocallable, capped-floor, knockout — priced via Monte Carlo with AVENA-CC paths and cohort-conditional volatility. Family-office structured product desk-grade."
              />
              <Inst
                category="Counterparty risk on RMBS"
                body="Stress projection of RMBS tranche payoffs under macroprudential policy shocks, integrated with the Avena Policy Engine. Useful for credit hedging and CDS pricing against EU residential MBS."
              />
            </div>
          </div>
        </section>

        <section style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">For family offices &amp; structured product desks</div>
            <p className="text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              Annual subscription includes API access, dedicated quant onboarding, Greeks-by-cohort reporting, and direct line to the Avena research desk that authored the underlying methodology (<Link href="/sovereign-briefing/foreign-buyer-flows-mortgage-transmission-2026" className="text-foreground hover:text-primary">Vol. 2</Link> + <Link href="/sovereign-briefing/cross-validating-official-statistics-2026" className="text-foreground hover:text-primary">Vol. 3</Link>). Custom payoff modelling available under bespoke engagement.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:institutional@avenaterminal.com?subject=Derivative%20pricing%20enquiry" className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
                Request institutional access →
              </a>
              <Link href="/avena-index" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                AVENA-CC index methodology →
              </Link>
              <Link href="/policy-engine" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                Policy Engine →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-serif text-3xl font-light text-foreground tabular leading-none mb-2">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">{label}</div>
    </div>
  );
}

function Inst({ category, body }: { category: string; body: string }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
      <div className="pl-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">{category}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

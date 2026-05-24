import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'EU Residential Bank Stress Test API · Avena',
  description: 'Production-grade mortgage stress testing API for European banks, credit insurers, and trade-credit underwriters. Postcode-level resolution, ECB MIR-calibrated transmission, CC BY 4.0 methodology, signed outputs.',
  alternates: { canonical: 'https://avenaterminal.com/products/bank-stress-api' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'EU Residential Bank Stress Test API',
  description: 'Mortgage stress testing API for European credit insurers and bank balance-sheet teams.',
  brand: { '@type': 'Brand', name: 'Avena' },
  category: 'B2B SaaS · Risk Infrastructure',
  url: 'https://avenaterminal.com/products/bank-stress-api',
  isBasedOn: {
    '@type': 'Dataset',
    identifier: 'https://doi.org/10.5281/zenodo.19520064',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
};

export default function BankStressApiPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">Avena · Products · Bank Stress Test API</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Mortgage stress testing,<br /><span className="text-gold italic">postcode-resolution.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-10">
              Built for European credit insurers (Atradius, Coface, Euler Hermes, Allianz Trade), bank balance-sheet teams, and counterparty risk desks running mandatory residential property stress scenarios. Cohort-weighted, ECB MIR-calibrated, signed outputs suitable for regulatory submission.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              <Stat value="27" label="EU markets" />
              <Stat value="4,145" label="Official observations" />
              <Stat value="1,881" label="Ground-truth properties" />
              <Stat value="HMAC" label="Signed outputs" />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Endpoint</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">One call. Stressed NPL projection back.</h2>
            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`POST https://avenaterminal.com/api/v1/mortgage-stress
Content-Type: application/json
Authorization: Bearer <institutional-key>

{
  "bank_exposure_eur_bn": 96.5,
  "country": "ES",
  "region": "coastal",
  "scenario": {
    "lever": "ltv_cap",
    "magnitude": -5,
    "timeframe_m": 18,
    "fb_share_min": 0.25
  }
}`}</code>
            </pre>
            <p className="mt-6 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Returns: stressed NPL ratio (bps), capital requirement delta, postcode-level price impact heat-map, cross-border capital rotation estimate, forward transmission curve (logistic, m6-centred), HMAC-SHA256 signature over the full payload + methodology version stamp. Same engine that powers <Link href="/policy-engine" className="text-primary hover:text-foreground">the Avena Precision Policy Engine</Link>, exposed as a programmatic API.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Who uses this</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Four distinct buyer profiles.</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Buyer
                tier="Credit insurers"
                names="Atradius · Coface · Euler Hermes · Allianz Trade"
                use="Stress-test residential mortgage portfolios under ECB tightening scenarios; price counterparty risk on bank lines; quantify country-specific exposure under foreign-buyer rotation."
              />
              <Buyer
                tier="Bank balance-sheet teams"
                names="ECB-supervised banks · domestic systemically-important institutions"
                use="Comply with ECB SSM residential stress test cycle; supplement internal AVMs with independent cohort-weighted projections; produce defensible regulatory submissions."
              />
              <Buyer
                tier="Counterparty risk desks"
                names="Investment banks · prime brokerage · structured product desks"
                use="Price residential RMBS exposure under macroprudential lever shocks; assess cross-collateralised loan books in foreign-buyer-heavy markets."
              />
              <Buyer
                tier="Asset managers"
                names="Property fund LPs · pension funds with residential allocation"
                use="Risk-adjust forward returns by cohort regulatory exposure; model scenario sensitivities for board reporting; validate vendor-provided AVMs."
              />
            </div>
          </div>
        </section>

        <section style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Pricing &amp; access</div>
            <p className="text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              Institutional API access is sold per-seat with annual volume tiers. Includes dedicated rate limits, SLA, technical onboarding with the research desk that authored the methodology (<Link href="/sovereign-briefing" className="text-foreground hover:text-primary">Sovereign Briefing Vol. 2 + Vol. 3</Link>), and direct support for regulatory replay submissions.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:institutional@avenaterminal.com?subject=Bank%20Stress%20Test%20API%20enquiry" className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
                Request institutional access →
              </a>
              <Link href="/policy-engine" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                Try the engine live →
              </Link>
              <Link href="/docs/api" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                OpenAPI 3.1 spec →
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

function Buyer({ tier, names, use }: { tier: string; names: string; use: string }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
      <div className="pl-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">{tier}</div>
        <div className="text-xs text-foreground mb-3 leading-relaxed">{names}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{use}</p>
      </div>
    </div>
  );
}

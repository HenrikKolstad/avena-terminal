import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'CSRD-Compliant Property Disclosure API · Avena',
  description: 'Explainable AVM with SHAP-style attribution for asset managers required to disclose residential property exposures under CSRD and SFDR. Signed outputs, audit-ready, EU data residency.',
  alternates: { canonical: 'https://avenaterminal.com/products/csrd-disclosure' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'CSRD-Compliant Property Disclosure API',
  description: 'Explainable property valuation for CSRD and SFDR regulatory disclosure requirements.',
  brand: { '@type': 'Brand', name: 'Avena' },
  category: 'B2B SaaS · Regulatory Compliance',
  url: 'https://avenaterminal.com/products/csrd-disclosure',
};

export default function CSRDPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">Avena · Products · CSRD Disclosure</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Explainable valuation,<br /><span className="text-gold italic">audit-defensible.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-10">
              For asset managers required to disclose residential property exposures under the EU Corporate Sustainability Reporting Directive (CSRD) and the Sustainable Finance Disclosure Regulation (SFDR). Every valuation ships with SHAP-style attribution explaining the drivers, sourced inputs, and methodology version stamp. Built to survive auditor scrutiny.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              <Stat value="CSRD" label="Article 8 ready" />
              <Stat value="SFDR" label="Article 8/9 ready" />
              <Stat value="SHAP" label="Explainable attribution" />
              <Stat value="EU" label="Data residency" />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Endpoint</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">Explainable valuation with attribution.</h2>
            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`POST https://avenaterminal.com/api/v1/explainable-avm
Content-Type: application/json
Authorization: Bearer <institutional-key>

{
  "country": "ES",
  "town": "Marbella",
  "type": "Apartment",
  "built_m2": 110,
  "beds": 3,
  "beach_km": 0.4
}

→ {
  "value_eur": 487200,
  "confidence_low_eur": 458000,
  "confidence_high_eur": 516400,
  "attribution": [
    { "feature": "beach_distance", "shap_eur": +72000, "rationale": "<1km beach premium" },
    { "feature": "town_marbella", "shap_eur": +58000, "rationale": "Costa del Sol premium" },
    { "feature": "built_area",    "shap_eur": +34000, "rationale": "110m² vs 92m² comparable median" },
    ...
  ],
  "comparables": [...],
  "methodology_version": "v2026.05",
  "signature": "9c4b2f..."
}`}</code>
            </pre>
            <p className="mt-6 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Each attribution line is a SHAP value — the marginal contribution of that feature to the final valuation. Auditors can reproduce the calculation from the published methodology. Fund managers can defend their CSRD/SFDR disclosure with explicit, signed, replayable attribution.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Why this matters under CSRD/SFDR</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Three regulatory requirements, one product.</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Req
                title="CSRD Article 8"
                body="Real-estate investments must be disclosed with their valuation methodology, supporting evidence, and material assumptions. SHAP attribution + signed output satisfies all three."
              />
              <Req
                title="SFDR Article 8 / 9"
                body="Funds classified Article 8 or 9 must demonstrate sustainability characteristics including geographic and asset-type concentration. Avena&apos;s cohort breakdown + cross-validation supports the disclosure narrative."
              />
              <Req
                title="EU Taxonomy"
                body="Property exposures within the EU Green Taxonomy require documented valuation with chain-of-evidence. Methodology version stamps + HMAC signatures + DOI-anchored framework provide the chain."
              />
            </div>
          </div>
        </section>

        <section style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">For fund operations &amp; compliance teams</div>
            <p className="text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              Sold as an annual subscription per fund family. Includes bulk batch endpoint for periodic disclosure cycles, dedicated compliance officer onboarding, audit-trail export to PDF, and direct support during regulator inquiries.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:institutional@avenaterminal.com?subject=CSRD%20disclosure%20API%20enquiry" className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
                Request institutional access →
              </a>
              <Link href="/avm" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                Try AVM live →
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

function Req({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
      <div className="pl-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">{title}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

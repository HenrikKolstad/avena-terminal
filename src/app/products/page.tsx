import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Products · Avena',
  description: 'Avena&apos;s institutional API product family: bank stress testing, RWA property oracles, CSRD-compliant valuation disclosure, and EU residential derivative pricing. Built on a single open methodology, sold to four distinct institutional buyers.',
  alternates: { canonical: 'https://avenaterminal.com/products' },
};

const PRODUCTS = [
  {
    href: '/products/bank-stress-api',
    title: 'EU Residential Bank Stress Test API',
    buyer: 'Credit insurers · ECB-supervised banks · counterparty desks',
    pitch: 'Mortgage stress projections at postcode resolution. Cohort-weighted, ECB MIR-calibrated, signed outputs for regulatory submission.',
    endpoint: '/api/v1/mortgage-stress',
  },
  {
    href: '/products/property-oracle',
    title: 'Verified Property Oracle for DeFi RWA',
    buyer: 'Centrifuge · Goldfinch · Maple · Aave RWA',
    pitch: 'HMAC-signed price feeds for real-world-asset protocols. AVN-ID identifiers, APON envelope v1, stateless verification.',
    endpoint: '/api/v1/oracle/...',
  },
  {
    href: '/products/csrd-disclosure',
    title: 'CSRD-Compliant Property Disclosure API',
    buyer: 'Asset managers · SFDR Article 8/9 funds · property fund LPs',
    pitch: 'Explainable AVM with SHAP-style attribution. Audit-defensible, methodology-versioned, EU data residency.',
    endpoint: '/api/v1/explainable-avm',
  },
  {
    href: '/products/derivative-pricing',
    title: 'Real Estate Derivative Pricing Engine',
    buyer: 'Family offices · structured product desks · capital markets quant teams',
    pitch: 'European-style options on AVENA-CC. ECB MIR discount curve, Vol. 4 cohort priors, signed Greeks.',
    endpoint: '/api/v1/options-pricing',
  },
];

export default function ProductsPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">Avena · Products</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              One methodology,<br /><span className="text-gold italic">four institutional buyers.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground">
              Avena&apos;s data infrastructure powers four production API products, each calibrated against the published methodology (<Link href="/sovereign-briefing" className="text-foreground hover:text-primary">Sovereign Briefings Vol. 1-5</Link>) and sold to a distinct institutional category. All four share the same Supabase backend, the same HMAC signing infrastructure, the same DOI citation, and the same 30-day methodology change horizon.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="grid sm:grid-cols-2 gap-4">
              {PRODUCTS.map(p => (
                <Link key={p.href} href={p.href} className="rounded-sm border p-6 relative overflow-hidden group hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
                  <div className="pl-3">
                    <h2 className="font-serif text-2xl text-foreground mb-3 group-hover:text-primary transition-colors">{p.title}</h2>
                    <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">{p.buyer}</div>
                    <p className="text-sm text-foreground/85 leading-relaxed mb-4">{p.pitch}</p>
                    <code className="font-mono text-[10px] text-muted-foreground">{p.endpoint}</code>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

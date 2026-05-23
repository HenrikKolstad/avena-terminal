import type { Metadata } from 'next';
import Link from 'next/link';
import PartnerApplicationForm from './PartnerApplicationForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Federated Data Partners | Avena Terminal',
  description:
    'Join the Avena Federated Data Network. Contribute country-specific property data, receive enriched market intelligence in return. APIP v1.0 standard.',
  alternates: { canonical: 'https://avenaterminal.com/data-partners' },
  openGraph: {
    title: 'Federated Data Partners — Avena Terminal',
    description: 'EU-wide property intelligence. One API, one standard, one moat. Apply to become a federated data partner.',
    url: 'https://avenaterminal.com/data-partners',
  },
};

const TECH_PARTNERS = [
  { name: 'RedSP / MLS Costa',  url: 'https://www.redsp.com',  role: 'Primary Listing Data Provider (Spain)', description: 'Daily XML feeds covering new build listings across Costa Blanca, Costa Calida, and Costa del Sol.' },
  { name: 'Casa Sapo',          url: 'https://www.casasapo.pt', role: 'Listing Data Provider (Portugal)',      description: 'Portuguese property listing RSS feed integrated with Avena APIP standard.' },
  { name: 'Immobiliare.it',     url: 'https://www.immobiliare.it', role: 'Listing Data Provider (Italy)',      description: 'Italian property listings via public API integration.' },
  { name: 'European Central Bank', url: 'https://www.ecb.europa.eu', role: 'Macro Data Provider', description: 'Policy rate, Euribor, EUR exchange rates pulled live via ECB SDW JSON API.' },
  { name: 'Eurostat',           url: 'https://ec.europa.eu/eurostat', role: 'Macro Data Provider', description: 'HICP inflation, unemployment, GDP for all 27 EU member states via JSON-stat 2.0.' },
  { name: 'Wise',               url: 'https://wise.com',       role: 'FX Infrastructure',                     description: 'Mid-market rates for multi-currency price display (GBP, NOK, SEK, USD).' },
  { name: 'Stripe',             url: 'https://stripe.com',     role: 'Payment Infrastructure',                description: 'PCI-compliant subscription billing for Avena PRO and API tiers.' },
  { name: 'Resend',             url: 'https://resend.com',     role: 'Transactional Email',                   description: 'Partner approval emails, deal alerts, newsletter delivery.' },
];

export default function DataPartnersPage() {
  return (
    <div className="avena-v2 min-h-screen" style={{ background: 'hsl(var(--av-background))', color: 'hsl(var(--av-foreground))' }}>
      <header className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl tracking-tight">AVENA</Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/eu-coverage">EU Coverage</Link>
            <Link href="/standards/apip-v1.json" target="_blank">APIP v1</Link>
            <Link href="/api-access">API tiers</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <section className="mb-16">
          <span className="inline-block font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
            Federated Data Network · APIP v1.0
          </span>
          <h1 className="font-serif text-5xl md:text-6xl leading-tight font-light mb-4">
            Join the EU property <span className="italic text-gold">data layer</span>.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Contribute country-specific property data through the open APIP v1 standard. Get back enriched market intelligence — regime classifications, yield benchmarks, anomaly signals, developer counterpart scoring — derived across all 27 EU markets at once.
          </p>
        </section>

        {/* Application form */}
        <section className="mb-20 rounded border p-8" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
          <h2 className="font-serif text-2xl mb-2">Apply to become a federated partner</h2>
          <p className="text-sm text-muted-foreground mb-6">Review SLA: 48 hours. On approval you receive an <code className="font-mono text-primary">avf_v1_*</code> API key and access to /api/v1/properties with your country grants.</p>
          <PartnerApplicationForm />
        </section>

        {/* Tech partners */}
        <section>
          <h2 className="font-serif text-2xl mb-6">Infrastructure partners</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {TECH_PARTNERS.map((p) => (
              <div key={p.name} className="rounded border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{p.role}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{p.url.replace('https://', '')}</a>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t text-center text-xs text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <p>Avena Terminal — EU property intelligence infrastructure</p>
          <p className="mt-1">
            <Link href="/about" className="hover:text-foreground">About</Link>{' · '}
            <Link href="/methodology" className="hover:text-foreground">Methodology</Link>{' · '}
            <Link href="/eu-coverage" className="hover:text-foreground">Coverage</Link>{' · '}
            <Link href="/standards/apip-v1.json" target="_blank" className="hover:text-foreground">APIP standard</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Verified Property Oracle for DeFi RWA · Avena',
  description: 'HMAC-signed real estate price feeds for DeFi real-world-asset protocols. Centrifuge, Goldfinch, Maple, Aave RWA compatible. AVN-ID identifier registry + APON Oracle envelope.',
  alternates: { canonical: 'https://avenaterminal.com/products/property-oracle' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Verified Property Oracle for DeFi RWA',
  description: 'Cryptographically signed European property price feeds for DeFi real-world-asset protocols.',
  brand: { '@type': 'Brand', name: 'Avena' },
  category: 'Web3 · RWA Infrastructure',
  url: 'https://avenaterminal.com/products/property-oracle',
};

export default function PropertyOraclePage() {
  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">Avena · Products · Property Oracle</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              The <span className="text-gold italic">verified oracle</span><br />for RWA property protocols.
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-10">
              HMAC-SHA256 signed price feeds for European residential property, designed for direct consumption by DeFi real-world-asset protocols (Centrifuge, Goldfinch, Maple Finance, Aave RWA). Every envelope carries a fingerprint hash + nonce + verify URL. Signature verification is stateless and chain-friendly.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              <Stat value="HMAC" label="SHA-256 signing" />
              <Stat value="Ed25519" label="v2 roadmap" />
              <Stat value="ZK" label="Proof endpoint" />
              <Stat value="MIT" label="Verify code OSS" />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Envelope format</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">APON Oracle v1 — stateless, replayable, chain-friendly.</h2>
            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`GET https://avenaterminal.com/api/v1/oracle/property/AVN:ES-03185-NB-0421

{
  "envelope_version": "1.0",
  "avn_prop_id": "AVN:ES-03185-NB-0421",
  "payload": {
    "price_eur": 487200,
    "price_per_m2_eur": 4520,
    "avena_score": 76,
    "valuation_method": "comparable_sales",
    "issued_at": "2026-05-25T18:42:00Z"
  },
  "payload_hash": "a3f9e8...",
  "signature": "9c4b2f...",
  "nonce": "8e2a14c5...",
  "signing_method": "HMAC-SHA256",
  "issuer": "avena-terminal-v1",
  "verify_url": "/api/v1/oracle/verify"
}`}</code>
            </pre>
            <p className="mt-6 text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Consumers compute SHA-256 of the canonical-JSON payload, compare to <code className="font-mono text-foreground">payload_hash</code>, then verify the HMAC signature over <code className="font-mono text-foreground">avn_id::payload_hash</code> using the public verify endpoint. v2 migration to Ed25519 (asymmetric, no shared secret) is on the published roadmap.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Protocol targets</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Four RWA protocols, four integration patterns.</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Buyer
                protocol="Centrifuge"
                use="Direct property NFT collateralisation against Tinlake pools. AVN-IDs as canonical asset identifiers. APON envelopes feed Centrifuge's valuation oracle."
              />
              <Buyer
                protocol="Goldfinch"
                use="Senior tranche underwriting for European residential mortgage warehouses. Avena&apos;s AVM + cohort risk weights drive tranche pricing."
              />
              <Buyer
                protocol="Maple Finance"
                use="Institutional lending against European residential collateral. APON envelopes serve as the price reference for margin call triggers."
              />
              <Buyer
                protocol="Aave RWA"
                use="Real-world asset listing on Aave Arc / Aave Real-World Assets. Avena&apos;s signed feeds feed Chainlink-compatible price oracles."
              />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Index feeds</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">Beyond individual properties — index-level signed feeds.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-6 leading-relaxed">
              The Avena Index Family (AVENA-CC / VAL / SCR / DPT) is also published as signed envelopes for protocols that need market-level rather than property-level pricing. Suitable for index-tracking RWA basket products, structured note hedging, and futures contract settlement.
            </p>
            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`GET /api/v1/oracle/index/AVENA-CC
GET /api/v1/oracle/index/AVENA-VAL
GET /api/v1/oracle/index/AVENA-SCR
GET /api/v1/oracle/index/AVENA-DPT
GET /api/v1/oracle/verify  (POST with envelope to verify)`}</code>
            </pre>
          </div>
        </section>

        <section style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Protocol partnership inquiries</div>
            <p className="text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              For protocol-level integration including custom rate limits, Chainlink-compatible adapters, and white-label envelope branding, contact the Avena research desk. Open APON envelope spec at <Link href="/standards/avp" className="text-foreground hover:text-primary">/standards/avp</Link>.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:institutional@avenaterminal.com?subject=APON%20Oracle%20RWA%20integration" className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
                Request protocol integration →
              </a>
              <Link href="/oracle" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                APON Oracle docs →
              </Link>
              <Link href="/avn-id" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                AVN-ID Registry →
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

function Buyer({ protocol, use }: { protocol: string; use: string }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
      <div className="pl-3">
        <div className="font-serif text-lg text-foreground mb-3">{protocol}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{use}</p>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'APON · Avena Property Oracle Network',
  description: 'Signed price feeds for European residential property. Verifiable envelopes for DeFi RWA platforms, smart contracts, loan-underwriting systems, and any downstream consumer that needs trustless property data.',
  alternates: { canonical: 'https://avenaterminal.com/oracle' },
  openGraph: {
    title: 'APON — Chainlink for European property',
    description: 'Signed property + index feeds. HMAC-SHA256 today, Ed25519 in v2. CC BY 4.0.',
    url: 'https://avenaterminal.com/oracle',
  },
};

const FEEDS = [
  { code: 'AVENA-CC',  name: 'Coastal Composite',  endpoint: '/api/v1/oracle/index/AVENA-CC',   desc: 'The master index — daily close blending price, score, and depth across the scored European coastal corpus.' },
  { code: 'AVENA-VAL', name: 'Value Index',        endpoint: '/api/v1/oracle/index/AVENA-VAL',  desc: 'Median €/m² across the corpus, rebased. Cleanest price-only signal.' },
  { code: 'AVENA-SCR', name: 'Score Index',        endpoint: '/api/v1/oracle/index/AVENA-SCR',  desc: 'Mean Avena Score (composite quality), rebased. Tracks aggregate quality of available inventory.' },
  { code: 'AVENA-DPT', name: 'Depth Index',        endpoint: '/api/v1/oracle/index/AVENA-DPT',  desc: 'Inventory depth — count of scored properties available, rebased. Rising = liquidity expansion.' },
];

export default function OraclePage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              APON · Avena Property Oracle Network · v1
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6 max-w-4xl">
              Trustless property data.<br />
              For systems that <span className="italic text-gold">can&apos;t take you at your word</span>.
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground font-light leading-relaxed">
              APON publishes signed envelopes for European residential property data. Each envelope carries a cryptographic signature over a deterministically-hashed payload — any downstream consumer (DeFi RWA platform, smart contract, loan-underwriting system, AI agent) can verify the data was issued by Avena and has not been altered. v1 uses HMAC-SHA256 with on-demand verification; v2 will move to Ed25519 so verification works without round-trip.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Signing <span className="text-foreground">HMAC-SHA256-v1</span></span>
              <span>·</span>
              <span>Property feeds <span className="text-foreground">/api/v1/oracle/property/&lt;ref&gt;</span></span>
              <span>·</span>
              <span>Index feeds <span className="text-foreground">/api/v1/oracle/index/&lt;code&gt;</span></span>
              <span>·</span>
              <span>Verify <span className="text-foreground">POST /api/v1/oracle/verify</span></span>
            </div>
          </div>
        </section>

        {/* The four index feeds */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">Available index feeds</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {FEEDS.map((f) => (
                <a key={f.code} href={f.endpoint} className="rounded-sm border p-5 hover:border-primary transition-colors block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{f.code}</div>
                    <code className="font-mono text-xs text-foreground">GET {f.endpoint}</code>
                  </div>
                  <h3 className="font-serif text-lg text-foreground mb-1">{f.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </a>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Per-property feeds: <code className="font-mono text-foreground">GET /api/v1/oracle/property/&lt;ref&gt;</code> — returns a signed envelope for any property in the Avena registry.
            </p>
          </div>
        </section>

        {/* Envelope structure */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Envelope structure</div>
            <h2 className="font-serif text-3xl font-light leading-tight tracking-tight text-foreground mb-5">Every response is signed.</h2>
            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
{`{
  "feed":           "oracle.property",
  "payload": {
    "ref":                       "AV-MAR-101",
    "town":                      "Marbella",
    "country":                   "ES",
    "asking_price_eur":          2050000,
    "price_per_m2_eur":          7080,
    "market_reference_pm2_eur":  7800,
    "avena_score":               82,
    "yield_gross_pct":           5.8,
    ...
  },
  "payload_hash":   "9f3a..."  // sha256 of canonical_json(payload)
  "signature":      "753b..."  // HMAC-SHA256(payload_hash::nonce::ts)[:32]
  "nonce":          "a91c..."  // random 16-byte hex per request
  "timestamp":      "2026-05-25T14:30:00Z",
  "signing_method": "HMAC-SHA256-v1",
  "issuer":         "avena-terminal-oracle-v1",
  "verify_url":     "https://avenaterminal.com/api/v1/oracle/verify"
}`}
            </pre>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              The <code className="font-mono text-foreground">payload</code> is canonicalised (sorted keys) before hashing, so any consumer can re-hash deterministically. The signature is HMAC-SHA256 over <code className="font-mono text-foreground">payload_hash::nonce::timestamp</code>, first 32 hex chars. Nonce prevents replay; timestamp gates staleness (verifier rejects envelopes older than 24h).
            </p>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Use cases</div>
            <h2 className="font-serif text-3xl font-light leading-tight tracking-tight text-foreground mb-6">Built for trustless property data consumption.</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { t: 'DeFi RWA platforms',         b: 'Property-backed lending protocols (Centrifuge, Goldfinch, Maple, Aave RWA) can consume APON envelopes as their property-valuation oracle for loan underwriting + automatic liquidation triggers.' },
                { t: 'Smart-contract settlement',  b: 'Index futures + property-backed stablecoins can reference signed AVENA-CC values for settlement. The off-chain feed is signed, the smart contract verifies, no oracle-attack surface.' },
                { t: 'Loan underwriting systems',  b: 'Banks integrating Avena AVM can require signed envelopes for audit trail. The signature is the auditable receipt — origination team can prove what valuation existed at what timestamp.' },
                { t: 'AI agent inputs',            b: 'AI agents consuming property data for analysis can verify the data was actually issued by Avena (not synthesised). Particularly important for agents writing on behalf of fund managers.' },
                { t: 'Cross-system audit',         b: 'When the same property is referenced by multiple systems, all of them can carry the same signed envelope. Drift is detectable — if two systems show different valuations, the signatures expose which one is stale.' },
                { t: 'Sovereign monitoring',       b: 'Central banks subscribing to AVENA-CC for residential property monitoring can ingest signed envelopes — receipt-grade auditability for regulatory data products.' },
              ].map((u) => (
                <div key={u.t} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <h3 className="font-serif text-lg text-foreground mb-2">{u.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{u.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integration example */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Integration · curl</div>
            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
{`# 1. Fetch a signed index level
curl https://avenaterminal.com/api/v1/oracle/index/AVENA-CC

# 2. Fetch a signed property valuation
curl https://avenaterminal.com/api/v1/oracle/property/AV-MAR-101

# 3. Verify any envelope (round-trip in v1; in v2, verify locally with public key)
curl -X POST https://avenaterminal.com/api/v1/oracle/verify \\
  -H "Content-Type: application/json" \\
  -d '<the_full_envelope_json>'`}
            </pre>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Roadmap v2 — Ed25519 asymmetric signing · public key published · verification without round-trip · smart-contract-native
            </p>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            APON v1 · HMAC-SHA256 · CC BY 4.0 · cite DOI 10.5281/zenodo.19520064 · <Link href="/standards/apip-v1.json" className="text-foreground hover:text-primary">APIP schema</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

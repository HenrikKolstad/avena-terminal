import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'API Documentation · Avena Terminal',
  description: 'OpenAPI 3.1 specification for the Avena public API: official EU residential statistics, cross-validation snapshots, AVN-ID registry, APON Oracle signed feeds.',
  alternates: { canonical: 'https://avenaterminal.com/docs/api' },
};

const EXAMPLES: Array<{ title: string; description: string; curl: string }> = [
  {
    title: 'Latest Eurostat HPI for Spain',
    description: 'Pull the most recent Eurostat house-price index observations for Spain in JSON.',
    curl: `curl 'https://avenaterminal.com/api/v1/stats?country=ES&source=eurostat&indicator=prc_hpi_q&limit=20'`,
  },
  {
    title: 'ECB mortgage rates across the euro area, CSV',
    description: 'Cost-of-borrowing for house purchase, all countries we cover, as CSV.',
    curl: `curl 'https://avenaterminal.com/api/v1/stats?source=ecb_sdw&indicator=MIR&format=csv' > ecb_mortgage_rates.csv`,
  },
  {
    title: 'Time-series window — France HPI 2024 onwards',
    description: 'Period-bounded query.',
    curl: `curl 'https://avenaterminal.com/api/v1/stats?country=FR&source=eurostat&from=2024-Q1&to=2026-Q4'`,
  },
  {
    title: 'Cross-validation snapshots for Spain coastal',
    description: 'The signed delta between Avena coastal corpus and the Eurostat Spain national HPI.',
    curl: `curl 'https://avenaterminal.com/api/v1/validation?country=ES&region=coastal'`,
  },
  {
    title: 'Verify an AVN-ID',
    description: 'Look up a signed property identifier and verify its HMAC signature.',
    curl: `curl 'https://avenaterminal.com/api/v1/avn-id/AVN:ES-03185-NB-0421'`,
  },
  {
    title: 'Signed APON Oracle envelope for an Avena index',
    description: 'Returns a signed JSON envelope (payload, payload_hash, signature, nonce). Verifiable via /api/v1/oracle/verify.',
    curl: `curl 'https://avenaterminal.com/api/v1/oracle/index/AVENA-CC'`,
  },
];

export default function APIDocsPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Public API</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Curl-able institutional<br />
              <span className="text-gold italic">European property data.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-8">
              Every observation in the Avena data layer is reachable via a public HTTPS endpoint. Official EU statistics, cross-validation snapshots, signed AVN-ID lookups, APON Oracle envelopes — all CC BY 4.0, no API key, CORS-open, with provenance headers on every response.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label="OpenAPI spec" value="3.1.0" href="/api/openapi.json" />
              <Stat label="Auth required" value="No" />
              <Stat label="License" value="CC BY 4.0" />
              <Stat label="DOI" value="zenodo.19520064" />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a href="/api/openapi.json" target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                Download OpenAPI JSON →
              </a>
              <Link href="/sovereign-briefing/cross-validating-official-statistics-2026" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                Methodology brief →
              </Link>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Public endpoints</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Six surfaces, one consistent contract.</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <Endpoint method="GET" path="/api/v1/stats" tag="eu-stats" description="Query official EU statistics — Eurostat, ECB SDW, INE Spain, ISTAT, CBS, BIS. Filter by country/source/indicator/period. JSON or CSV." />
              <Endpoint method="GET" path="/api/v1/validation" tag="validation" description="Cross-validation snapshots — Avena ground-truth vs official series. Signed delta in basis points." />
              <Endpoint method="GET" path="/api/v1/avn-id/{avn_id}" tag="avn-id" description="Look up an AVN-ID and verify its HMAC-SHA256 signature against Avena's registry." />
              <Endpoint method="POST" path="/api/v1/avn-id/issue" tag="avn-id" description="Issue a new signed identifier from a property fingerprint. Idempotent — same inputs return the same AVN-ID." />
              <Endpoint method="GET" path="/api/v1/oracle/property/{ref}" tag="oracle" description="Signed price envelope for a single property. Includes payload, payload_hash, signature, nonce, verify_url." />
              <Endpoint method="GET" path="/api/v1/oracle/index/{code}" tag="oracle" description="Signed envelope for an Avena index (AVENA-CC, AVENA-VAL, AVENA-SCR, AVENA-DPT)." />
            </div>
          </div>
        </section>

        {/* Provenance headers */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provenance headers</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">Every response carries its own citation.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              The Avena API attaches institutional-grade provenance to every response. No need to dig through documentation to figure out how to cite a value — the headers tell you.
            </p>

            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code>{`HTTP/2 200
content-type: application/json; charset=utf-8
cache-control: public, s-maxage=300, stale-while-revalidate=900
x-avena-layer: official-statistics
x-avena-license: CC-BY-4.0
x-avena-doi: 10.5281/zenodo.19520064
x-avena-cite-as: Avena Terminal (2026). EU Official Statistics Layer. avenaterminal.com/eu-official
access-control-allow-origin: *`}</code>
            </pre>
          </div>
        </section>

        {/* Examples */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Try it</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Six curl recipes to start with.</h2>

            <div className="space-y-6">
              {EXAMPLES.map((ex, i) => (
                <div key={i} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-serif text-lg text-foreground">{ex.title}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{String(i + 1).padStart(2, '0')}</div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{ex.description}</p>
                  <pre className="rounded-sm border p-4 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background))' }}>
                    <code className="text-primary">{ex.curl}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Client generation */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Generate a client</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">Standard OpenAPI tooling works out of the box.</h2>

            <pre className="rounded-sm border p-5 font-mono text-xs leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{`# Python client
openapi-generator-cli generate \\
  -i https://avenaterminal.com/api/openapi.json \\
  -g python \\
  -o ./avena-python-client

# TypeScript fetch client
openapi-generator-cli generate \\
  -i https://avenaterminal.com/api/openapi.json \\
  -g typescript-fetch \\
  -o ./avena-ts-client

# R client
openapi-generator-cli generate \\
  -i https://avenaterminal.com/api/openapi.json \\
  -g r \\
  -o ./avena-r-client`}</code>
            </pre>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Institutional access</div>
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
              The public API is free, CC BY 4.0, with reasonable rate limits. For institutional SLAs, bulk pulls, custom country-cohort definitions, dedicated webhook deliveries, or co-authored research, write to{' '}
              <a href="mailto:institutional@avenaterminal.com" className="text-foreground hover:text-primary">institutional@avenaterminal.com</a>.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/institutional" className="text-foreground hover:text-primary">Pricing tiers</Link> · <Link href="/governance" className="text-foreground hover:text-primary">Governance &amp; SLA</Link> · <Link href="/license" className="text-foreground hover:text-primary">License</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-xl font-light text-foreground tabular break-all">{value}</div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener" className="transition-colors hover:opacity-80">{body}</a> : body;
}

function Endpoint({ method, path, tag, description }: { method: string; path: string; tag: string; description: string }) {
  const colour = method === 'POST' ? 'hsl(var(--av-warning))' : 'hsl(var(--av-success))';
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm" style={{ color: colour, border: `1px solid ${colour}33` }}>{method}</span>
          <span className="font-mono text-xs text-foreground truncate">{path}</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-primary">{tag}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

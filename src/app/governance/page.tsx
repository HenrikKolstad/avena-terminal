import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Governance · Avena Terminal',
  description:
    'Data sources, methodology, update cadence, service levels, security posture, and licensing for the Avena Terminal European property intelligence platform.',
  alternates: { canonical: 'https://avenaterminal.com/governance' },
  openGraph: {
    title: 'Avena Terminal — Governance & Service Levels',
    description: 'Institutional governance documentation: sources, methodology, SLAs, security, licensing.',
    url: 'https://avenaterminal.com/governance',
  },
};

// ─── Data — every number on this page is sourced from a real file or table ─

const sources = [
  { layer: 'Property listings',         provider: 'RedSP / MLS Costa (Spain), Casa Sapo (Portugal), Immobiliare.it (Italy)', cadence: 'Daily 03:00 UTC', format: 'XML / JSON',     coverage: 'ES, PT, IT live · 24 EU markets in partner pipeline' },
  { layer: 'Cadastral references',      provider: 'Catastro Spain (OVCCoordenadas)',                                          cadence: 'On listing ingest',  format: 'SOAP/XML',     coverage: 'ES coastal regions; Navarra + País Vasco use foral cadastres (not covered)' },
  { layer: 'Building footprints',       provider: 'OpenStreetMap (Overpass API)',                                              cadence: 'On listing ingest',  format: 'Overpass JSON', coverage: 'EU-wide' },
  { layer: 'Macro indicators (rates)',  provider: 'European Central Bank Statistical Data Warehouse',                          cadence: 'Daily 06:00 UTC', format: 'SDMX-ML / JSON', coverage: 'Policy rate, Euribor 3M/12M, EUR/GBP/NOK/SEK/USD reference rates' },
  { layer: 'Macro indicators (real)',   provider: 'Eurostat (JSON-stat 2.0)',                                                  cadence: 'Daily 06:00 UTC', format: 'JSON-stat',     coverage: 'HICP, unemployment, GDP — all 27 EU member states' },
  { layer: 'Climate risk',              provider: 'Copernicus Climate Data Store',                                             cadence: 'Monthly',           format: 'NetCDF / JSON', coverage: 'EU coastal — flood, wildfire, heat stress' },
  { layer: 'French transactions',       provider: 'DVF (Demandes de Valeurs Foncières) — Open Data France',                    cadence: 'Quarterly',         format: 'CSV',           coverage: 'FR transaction microdata' },
  { layer: 'Federated partners',        provider: 'Apply at /data-partners',                                                   cadence: 'Continuous',        format: 'APIP v1.0 JSON', coverage: 'Open intake — partner submissions enter via signed key' },
];

const cadenceTable = [
  { feed: 'Property feed sync',          schedule: '03:00 UTC daily',          sla: '99% completion within 30 min', persisted: 'public/data-{cc}.json + Supabase' },
  { feed: 'Property augmentation',       schedule: 'Every 4h',                 sla: '12 properties enriched per tick', persisted: 'properties_registry, property_geo, property_climate, property_market' },
  { feed: 'Macro indicators',            schedule: '06:00 UTC daily',          sla: 'All ECB + Eurostat series refreshed', persisted: 'macro_indicators' },
  { feed: 'Counterpart developer scan',  schedule: '04:00 UTC daily',          sla: 'All developers re-scored on drift', persisted: 'counterpart_developers' },
  { feed: 'Counterpart discovery',       schedule: '03:30 UTC daily',          sla: 'New developers ingested from listings', persisted: 'counterpart_developers' },
  { feed: 'Precursor signal scan',       schedule: '05:00 UTC daily',          sla: 'Up to 5 new signals per theme', persisted: 'precursor_signals' },
  { feed: 'AVENA Index close',           schedule: '23:50 UTC daily',          sla: 'One row written per UTC day', persisted: 'avena_history' },
  { feed: 'Price snapshot capture',      schedule: '4× daily (every 6h)',      sla: 'Per-ref per-day capture',     persisted: 'price_snapshots' },
];

const security = [
  { item: 'Transport',          detail: 'TLS 1.3 enforced. HSTS preload (max-age 63072000, includeSubDomains).' },
  { item: 'Headers',            detail: 'X-Frame-Options DENY (except /embed/*), nosniff, strict referrer, Permissions-Policy camera/mic/geo denied.' },
  { item: 'Auth',               detail: 'API keys are SHA-256 hashed at rest. Federated partner keys prefixed avf_v1_*. Admin endpoints require ADMIN_TOKEN.' },
  { item: 'Database',           detail: 'Supabase Postgres with Row-Level Security on every table. Public-read policies only on non-sensitive surfaces; write policies scoped to service role.' },
  { item: 'Secrets',            detail: 'Stored in Vercel environment variables, encrypted at rest. Never logged.' },
  { item: 'Audit',              detail: 'Every cron run writes to cron_logs (started_at, completed_at, status, error). Public-readable for transparency.' },
  { item: 'Data residency',     detail: 'Supabase region eu-central-1 (Frankfurt). All EU data stays within EU.' },
  { item: 'GDPR',               detail: 'No PII on property records. Newsletter and partner emails stored with explicit consent; delete-on-request honoured within 30 days.' },
];

const sla = [
  { metric: 'API uptime',                target: '99.9%', basis: 'Vercel platform SLA; 30-day rolling. Status at /api/cron-logs-health.' },
  { metric: 'Data freshness — listings', target: '≤24h',  basis: 'Daily sync at 03:00 UTC.' },
  { metric: 'Data freshness — macro',    target: '≤24h',  basis: 'ECB SDW + Eurostat ingest at 06:00 UTC.' },
  { metric: 'AVM accuracy (Spain)',      target: 'MAPE ≤7% on ≥5 comp sample', basis: 'Published at /track-record. Reported quarterly.' },
  { metric: 'Incident response',         target: '4h ack · 24h triage', basis: 'institutional@avenaterminal.com escalation.' },
  { metric: 'Methodology change notice', target: '30 days', basis: 'Posted to /changelog with version bump.' },
];

const license = [
  { aspect: 'Open dataset license',  detail: 'CC BY 4.0 (Creative Commons Attribution 4.0 International). Reuse permitted with attribution.' },
  { aspect: 'Standard license',      detail: 'APIP v1.0 published under same CC BY 4.0 terms at /standards/apip-v1.json.' },
  { aspect: 'Attribution requirement', detail: 'Cite as: Avena Terminal (avenaterminal.com), DOI 10.5281/zenodo.19520064.' },
  { aspect: 'Zenodo deposit',        detail: 'Permanent archived copy at https://doi.org/10.5281/zenodo.19520064.' },
  { aspect: 'Wikidata entity',       detail: 'Q139165733 — machine-readable cross-reference.' },
  { aspect: 'Commercial reuse',      detail: 'Permitted under CC BY 4.0 (incl. derivative datasets) with attribution preserved. Premium-tier API responses additionally subject to API Terms.' },
];

// ─── Components ────────────────────────────────────────────────────────────

function SectionHeading({ no, title, sub }: { no: string; title: string; sub: string }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">{no} · {title}</div>
      <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">{sub}</h2>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <table className="w-full text-sm min-w-[640px]">
        <thead style={{ background: 'hsl(var(--av-surface))' }}>
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 align-top ${j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GovernancePage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-20">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">Document · Governance v2026.05</div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.05] tracking-tight text-foreground mb-6 max-w-3xl">
              How the Avena Terminal is built, run, and held to account.
            </h1>
            <p className="text-base text-muted-foreground font-light max-w-2xl leading-relaxed">
              This document is the canonical reference for institutional procurement, compliance, and risk review. It lists every upstream data source, every refresh cadence, the service levels we commit to, the security posture in production, and the license under which the open dataset is published.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>DOI <span className="text-foreground">10.5281/zenodo.19520064</span></span>
              <span>Wikidata <span className="text-foreground">Q139165733</span></span>
              <span>License <span className="text-foreground">CC BY 4.0</span></span>
              <span>Schema <span className="text-foreground">APIP v1.0</span></span>
            </div>
          </div>
        </section>

        {/* §1 — Data sources */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <SectionHeading no="§1" title="Sources" sub="Every dataset, named at the upstream provider." />
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">No proprietary scraping that bypasses terms of service. Every feed is either publicly available, licensed through partnership, or federated by a verified counterparty.</p>
            <DataTable
              headers={['Layer', 'Provider', 'Cadence', 'Format', 'Coverage']}
              rows={sources.map((s) => [s.layer, s.provider, s.cadence, s.format, s.coverage])}
            />
          </div>
        </section>

        {/* §2 — Refresh cadence */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <SectionHeading no="§2" title="Cadence" sub="Update schedule for every persisted surface." />
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">All scheduled jobs run on Vercel Cron. Each run writes a row to <code className="font-mono text-primary">cron_logs</code>; aggregate health is exposed at <Link href="/api/v1/swarm/status" className="text-primary hover:underline">/api/v1/swarm/status</Link>.</p>
            <DataTable
              headers={['Feed', 'Schedule', 'SLA', 'Persisted to']}
              rows={cadenceTable.map((c) => [c.feed, c.schedule, c.sla, c.persisted])}
            />
          </div>
        </section>

        {/* §3 — Methodology */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <SectionHeading no="§3" title="Methodology" sub="How every number is computed." />
            <div className="grid md:grid-cols-2 gap-6 text-sm leading-relaxed">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Avena Score</h3>
                <p className="text-muted-foreground">Composite 0–100. Weights: 40% value (vs hedonic OLS market-reference), 25% yield (bottom-up ADR vs Airbnb/Booking), 20% location (beach/golf/amenity weighting), 10% quality (energy, build year, developer rating), 5% risk (completion + market regime).</p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Market-reference price (mm²)</h3>
                <p className="text-muted-foreground">Hedonic OLS regression with town dummies (≥8 obs threshold), log-area, beach distance, sea view, beds, villa indicator, pool, energy rating, frontline category. Tier-segmented (Budget &lt;€200k, Mid €200–500k, Premium €500k–1M, Luxury €1M+) with global model fallback. Reported R² and RMSE published per run.</p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">AVENA Index</h3>
                <p className="text-muted-foreground">Daily composite of median €/m², mean Avena Score, and inventory depth. Base period 2024-Q1 = 100. Quarterly aggregates published at /api/v1/sovereign-export in ECB/Eurostat/World Bank/IMF envelopes.</p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Counterpart Score</h3>
                <p className="text-muted-foreground">Developer creditworthiness 0–100. Starting score derived from listing volume, market concentration, and stale-listing rate. Daily drift driven by payment-delay signals, legal disputes, court judgements, delayed projects, financial stress. Six grades: AAV / AV / ABV / BBV / CV / DV.</p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Regime classification</h3>
                <p className="text-muted-foreground">Twenty macro indicators (ECB SDW + Eurostat + computed primitives). Score 0–10 from ten bull conditions and two bear deductions. Six regimes: SUPER_BULL / BULL / GROWTH / NEUTRAL / CAUTION / BEAR. Confidence derived from indicator dominance.</p>
              </div>
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Yield estimate</h3>
                <p className="text-muted-foreground">Bottom-up nightly-ADR model calibrated against AirDNA Costa Blanca sample. Net of platform fees (15%), property management (20%), maintenance reserve (5%), local taxes. Occupancy seasonally adjusted by costa.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-6">Full mathematical specification at <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>. Any methodology change is announced 30 days in advance at <Link href="/changelog" className="text-primary hover:underline">/changelog</Link> with a version bump.</p>
          </div>
        </section>

        {/* §4 — SLA */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <SectionHeading no="§4" title="Service levels" sub="What we commit to, measurably." />
            <DataTable
              headers={['Metric', 'Target', 'Basis']}
              rows={sla.map((s) => [s.metric, s.target, s.basis])}
            />
          </div>
        </section>

        {/* §5 — Security */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <SectionHeading no="§5" title="Security" sub="Production posture." />
            <DataTable
              headers={['Control', 'Implementation']}
              rows={security.map((s) => [s.item, s.detail])}
            />
          </div>
        </section>

        {/* §6 — License */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <SectionHeading no="§6" title="License" sub="Reuse, attribution, and provenance." />
            <DataTable
              headers={['Aspect', 'Detail']}
              rows={license.map((l) => [l.aspect, l.detail])}
            />
          </div>
        </section>

        {/* §7 — Escalation */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <SectionHeading no="§7" title="Contacts" sub="Where to send formal correspondence." />
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Institutional procurement', email: 'institutional@avenaterminal.com', note: 'Master Service Agreements, custom SOW, on-premise deployment.' },
                { label: 'Security incidents',        email: 'security@avenaterminal.com',     note: 'PGP key on request. Coordinated disclosure honoured.' },
                { label: 'Data licensing',            email: 'data@avenaterminal.com',         note: 'CC BY 4.0 questions, commercial reuse, derivative datasets.' },
                { label: 'GDPR / privacy',            email: 'privacy@avenaterminal.com',      note: 'Subject-access requests, deletion, processor agreements.' },
              ].map((c) => (
                <div key={c.label} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{c.label}</div>
                  <a href={`mailto:${c.email}`} className="font-mono text-sm text-primary hover:underline">{c.email}</a>
                  <p className="mt-2 text-xs text-muted-foreground">{c.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Document version 2026.05 · superseded versions archived at /changelog · Last revised 23 May 2026
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

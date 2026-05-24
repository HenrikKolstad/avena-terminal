import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Defensibility · Avena',
  description: 'Due-diligence dossier for institutional acquirers, partners, and regulators. Bus factor mitigation, provenance chain, reproducibility proof, methodology stability, legal posture. Built for the question every M&A analyst asks.',
  alternates: { canonical: 'https://avenaterminal.com/defensibility' },
  openGraph: {
    title: 'Avena Defensibility — institutional due-diligence dossier',
    description: 'Bus factor, provenance, reproducibility, methodology stability, legal posture. The five pillars an institutional acquirer audits before signing.',
    url: 'https://avenaterminal.com/defensibility',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://avenaterminal.com/defensibility',
  name: 'Avena Defensibility Dossier',
  description: 'Institutional defensibility documentation covering bus factor mitigation, data provenance, reproducibility, methodology stability, and legal posture.',
  isPartOf: { '@type': 'WebSite', name: 'Avena', url: 'https://avenaterminal.com' },
  about: {
    '@type': 'Dataset',
    name: 'Avena European Residential Property Data Infrastructure',
    identifier: 'https://doi.org/10.5281/zenodo.19520064',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  },
};

export default function DefensibilityPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">
              Avena · Defensibility Dossier · v2026.05
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Built for <span className="text-gold italic">due diligence.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-8">
              This page is for the institutional acquirer, the regulator, the partner counsel, and the M&amp;A analyst tasked with stress-testing whether Avena&apos;s data infrastructure survives founder departure, jurisdictional change, methodology challenge, or competitive replication. Five pillars. Every claim verifiable against a public surface.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-12 max-w-4xl">
              {[
                { n: '01', label: 'Bus factor', href: '#bus-factor' },
                { n: '02', label: 'Provenance', href: '#provenance' },
                { n: '03', label: 'Reproducibility', href: '#reproducibility' },
                { n: '04', label: 'Methodology', href: '#methodology' },
                { n: '05', label: 'Legal posture', href: '#legal' },
              ].map(p => (
                <a key={p.n} href={p.href} className="rounded-sm border p-4 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-1">{p.n}</div>
                  <div className="font-serif text-base text-foreground">{p.label}</div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 01 BUS FACTOR ─────────────────────────────────── */}
        <section id="bus-factor" className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <PillarHeader number="01" title="Bus factor mitigation" subtitle="What happens if the founder is unreachable for 90 days" />
            <div className="grid lg:grid-cols-2 gap-6 mt-10">
              <Card title="Codebase auto-resumes itself">
                Every operational system runs on scheduled Vercel cron jobs configured in <Code>vercel.json</Code> and persisted in source control. Forty-one daily and weekly cron jobs continue ingesting, scoring, validating, archiving, and publishing without human intervention. The infrastructure was deliberately designed for absent operators.
                <Pointer href="/archive">Live archive runs · 03:00 UTC nightly →</Pointer>
              </Card>
              <Card title="Hash-chained immutable archive">
                Every institutional table — official statistics, cross-validation snapshots, sovereign briefings, AVN-ID registry, counterpart health, price snapshots, macro anomalies — is snapshotted nightly to Vercel Blob (Frankfurt) with SHA-256 chaining. Independent of Supabase. Independent of the founder. Verifiable by any third party.
                <Pointer href="/archive">Hash chain ledger →</Pointer>
              </Card>
              <Card title="Open methodology — no hidden code paths">
                The entire methodology framework is published under CC BY 4.0: AVENA-CC index construction, AVN-ID grammar, APON Oracle envelope format, cross-validation algorithm, Policy Engine coefficient calibration. There are no proprietary black-box pricing models. Any successor team can read the code and continue operations.
                <Pointer href="/methodology">Methodology specification →</Pointer>
              </Card>
              <Card title="Reproducible from raw sources">
                The 1,881-property Spanish ground-truth corpus is published as <Code>public/data.json</Code> in source control. The backfill endpoint <Code>/api/admin/backfill-registry</Code> regenerates the entire Supabase <Code>properties_registry</Code> table from this file. Official statistics regenerate from the Eurostat and ECB SDW public APIs via <Code>/api/cron/eu-stats-ingest</Code>. If the database is wiped, the dataset rebuilds itself.
                <Pointer href="/dataset">Open dataset →</Pointer>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── 02 PROVENANCE ─────────────────────────────────── */}
        <section id="provenance" className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <PillarHeader number="02" title="Provenance chain" subtitle="Every published datapoint sources back to a primary URL" />
            <div className="grid lg:grid-cols-2 gap-6 mt-10">
              <Card title="Official statistics carry their source URL">
                Every row in <Code>eu_official_stats</Code> (4,145 observations, 28 EU countries) stores the exact API endpoint that produced it. The API response at <Code>/api/v1/stats</Code> returns the <Code>source_url</Code> field alongside the value. Recipients can independently verify any Avena observation against Eurostat, ECB SDW, or INE Spain in one HTTP call.
                <Pointer href="/eu-official">EU official statistics layer →</Pointer>
              </Card>
              <Card title="AVN-IDs are cryptographically signed">
                Every property identifier issued through the AVN-ID Registry carries an HMAC-SHA256 signature over <Code>(country, postal_code, category, sequence, fingerprint)</Code>. Tampering with any field breaks the signature. Verification is public and stateless.
                <Pointer href="/avn-id">Signed identifier registry →</Pointer>
              </Card>
              <Card title="Sovereign Briefings cite every claim">
                Each of the five published research briefings carries a <Code>methodology_note</Code> + <Code>cite_as</Code> structured field. Every empirical assertion in the body cross-references either a primary source (Eurostat, ECB, INE) or an Avena artifact (Vol. 2 OLS regression, Vol. 3 cross-validation methodology, Vol. 4 cohort priors).
                <Pointer href="/sovereign-briefing">Sovereign Briefing archive →</Pointer>
              </Card>
              <Card title="Policy Engine signs every output">
                Every Policy Engine scenario output carries an HMAC-SHA256 signature over the input and summary fields. The signature is regenerable given the methodology version stamp. Submissions to regulatory bodies can be reproduced and verified months or years later.
                <Pointer href="/policy-engine">Policy Engine →</Pointer>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── 03 REPRODUCIBILITY ──────────────────────────── */}
        <section id="reproducibility" className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <PillarHeader number="03" title="Reproducibility proof" subtitle="The dataset can be regenerated by anyone, anywhere" />
            <div className="grid lg:grid-cols-2 gap-6 mt-10">
              <Card title="Migrations under version control">
                Forty-three Supabase migrations live in <Code>supabase/migrations/</Code>, each timestamped, idempotent, and tested. A successor operator clones the repository, runs the migrations in order, points the cron jobs at a fresh Supabase project, and the entire data infrastructure rebuilds itself from public APIs within 48 hours.
              </Card>
              <Card title="Ingestion code is open">
                <Code>src/lib/eu-stats-feeds.ts</Code> contains the Eurostat SDMX-JSON adapter, ECB SDW JSON adapter, and INE Spain adapter — each fewer than 80 lines, each documented, each runnable in isolation. Any third party can ingest the same data using the same code.
              </Card>
              <Card title="Public OpenAPI 3.1 specification">
                The full API surface is published at <Code>/api/openapi.json</Code> with tagged endpoints, request/response schemas, and example payloads. Any standard OpenAPI code generator produces a Python, TypeScript, R, or Rust client in under 60 seconds.
                <Pointer href="/docs/api">API documentation →</Pointer>
              </Card>
              <Card title="Methodology stamped on every output">
                Every Policy Engine result, every cross-validation snapshot, every official statistics ingest run records its <Code>methodology_version</Code>. Currently v2026.05. Material changes are announced 30 days in advance at <Link href="/changelog" className="text-primary hover:text-foreground">/changelog</Link>. Historical results never silently drift.
              </Card>
            </div>
          </div>
        </section>

        {/* ─── 04 METHODOLOGY ──────────────────────────────── */}
        <section id="methodology" className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <PillarHeader number="04" title="Methodology stability" subtitle="No silent updates, no breaking changes, 30-day change horizon" />
            <div className="grid lg:grid-cols-2 gap-6 mt-10">
              <Card title="Versioned methodology framework">
                The Avena methodology operates under explicit semantic versioning. Current version v2026.05 covers: AVENA-CC index construction, AVN-ID grammar v1, APON Oracle envelope v1, cross-validation framework v1, Policy Engine coefficient calibration v1. Each version is permanent; new versions are additive.
                <Pointer href="/changelog">Methodology changelog →</Pointer>
              </Card>
              <Card title="30-day advance change notice">
                Any material change to a methodology component — coefficient recalibration, cohort definition revision, signing algorithm migration — is announced 30 days in advance with a published rationale. Institutional users have time to validate, adjust pipelines, or contest. Surprise changes are forbidden by design.
              </Card>
              <Card title="Cross-validation against official series">
                Every Avena ground-truth observation is cross-validated daily against the corresponding Eurostat HPI series. The signed delta is published at <Link href="/eu-official" className="text-primary hover:text-foreground">/eu-official</Link>. If Avena&apos;s methodology drifts from the official series, the divergence is visible to all stakeholders within 24 hours.
              </Card>
              <Card title="Peer-reviewable research output">
                Five Sovereign Briefings published, each with explicit methodology notes, citation block, and reproducibility recipe. Vol. 3 (&quot;Cross-Validating Official Statistics&quot;) specifies the calibration framework. Vol. 2 (&quot;Foreign-Buyer Flows&quot;) contains the OLS regression coefficients used in the Policy Engine. The methodology is academically defensible.
                <Pointer href="/sovereign-briefing">Research briefings →</Pointer>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── 05 LEGAL POSTURE ────────────────────────────── */}
        <section id="legal" className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <PillarHeader number="05" title="Legal posture" subtitle="Acquirer-friendly licensing, jurisdictional clarity, third-party credentialing" />
            <div className="grid lg:grid-cols-2 gap-6 mt-10">
              <Card title="CC BY 4.0 on the entire data layer">
                The Avena dataset, methodology, briefings, and APIP standard are all released under Creative Commons Attribution 4.0 International. Acquirers inherit a license stack with no proprietary entanglements. The license is non-revocable, irrevocable, and survives all corporate transitions.
                <Pointer href="/license">License terms →</Pointer>
              </Card>
              <Card title="Permanent DOI through Zenodo">
                The Avena dataset is registered with Digital Object Identifier <Code>10.5281/zenodo.19520064</Code>, archived by CERN under EU jurisdiction. The DOI persists independently of avenaterminal.com domain ownership. Academic citations remain resolvable forever.
                <Pointer href="https://doi.org/10.5281/zenodo.19520064">Zenodo record →</Pointer>
              </Card>
              <Card title="EU data residency">
                All Avena infrastructure operates within EU jurisdiction. Supabase Postgres in Frankfurt (eu-central-1). Vercel Blob archive in Frankfurt (fra1). DNS and CDN routed through European regions. GDPR-compliant by construction. Suitable for ECB, ESRB, national central bank procurement.
              </Card>
              <Card title="Third-party credentialing">
                Avena is a registered RICS Tech Partner (2026). The Wikidata entry Q139165733 is publicly maintained. The Zenodo DOI is institutionally archived by CERN. The Schema.org Dataset markup is indexed by Google Dataset Search. Multiple independent registries acknowledge Avena&apos;s existence.
                <Pointer href="/governance">Governance details →</Pointer>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── CLOSING ─────────────────────────────────────── */}
        <section style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">For institutional acquirers, partners, and counsel</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6 max-w-3xl">
              The dossier is a starting point. The full data room opens under NDA.
            </h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-10 leading-relaxed">
              Source code repositories, cron health logs, financial statements, customer pipeline, partnership term sheets, intellectual property assignments, founder-equity structure, due diligence Q&amp;A — available to qualified institutional counterparties under bilateral NDA. First conversation is 30 minutes, NDA-optional.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:institutional@avenaterminal.com?subject=Avena%20due%20diligence%20enquiry" className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
                Request data room access →
              </a>
              <Link href="/governance" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                Governance &amp; SLA →
              </Link>
              <Link href="/methodology" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                Methodology specification →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function PillarHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">{number} · {title}</div>
      <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-2 max-w-3xl">{title}</h2>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{subtitle}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
      <div className="pl-3">
        <h3 className="font-serif text-lg text-foreground mb-3">{title}</h3>
        <div className="text-sm text-foreground/85 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[12px] text-primary bg-[hsl(var(--av-background)/0.5)] px-1.5 py-0.5 rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>{children}</code>;
}

function Pointer({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
      <Link href={href} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground transition-colors">
        {children}
      </Link>
    </div>
  );
}

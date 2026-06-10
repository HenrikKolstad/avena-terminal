/**
 * /stack — how Avena is built (Great Consolidation 2026-05-29).
 *
 * Absorbs: /defensibility, /causal-graph, /changelog, /roadmap.
 *
 * The canonical "we built infrastructure" surface. For diligence teams,
 * for engineering hires, for acquirers, for partners.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Stack · architecture · defensibility · causal graph · changelog · Avena Terminal',
  description: 'How Avena is built: Next.js 15 App Router on Vercel (EU/Frankfurt), Supabase Postgres with RLS, hash-chained archive, MCP server, event-sourced backend, Ed25519 credential signing, RICS Tech Partner, Zenodo DOI.',
  alternates: { canonical: 'https://avenaterminal.com/stack' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Avena Terminal',
  description: 'European residential property data infrastructure platform.',
  url: 'https://avenaterminal.com/stack',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
};

const ANCHORS = [
  { id: 'architecture',  label: 'Architecture' },
  { id: 'defensibility', label: 'Defensibility' },
  { id: 'causal-graph',  label: 'Causal graph' },
  { id: 'event-sourcing', label: 'Event sourcing' },
  { id: 'integrity',     label: 'Integrity' },
  { id: 'changelog',     label: 'Changelog' },
  { id: 'roadmap',       label: 'Roadmap' },
];

export default function StackPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Infrastructure stack · open · audit-traceable · EU-resident
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            How the substrate is built.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Production architecture, defensibility analysis, dependency graph, event-sourced backend, cryptographic integrity, public changelog, roadmap. For diligence teams, engineering hires, and acquirers who want the technical truth before they ask.
          </p>
        </section>

        <div className="sticky top-16 z-30 backdrop-blur-md border-b" style={{ background: 'hsl(var(--av-background) / 0.85)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-2.5 sm:py-3 overflow-x-auto">
            <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.22em] whitespace-nowrap">
              {ANCHORS.map(a => (
                <a key={a.id} href={`#${a.id}`} className="rounded-sm border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
                  {a.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <Section id="architecture" title="Architecture"
          body="Next.js 15 App Router on Vercel (EU / Frankfurt region). Supabase Postgres with Row-Level Security. Vercel Blob for static assets. 80+ public API endpoints under /api/v1/*. 56 scheduled crons via Vercel cron. TypeScript strict mode throughout, no any types. Schema.org JSON-LD on every public surface. OpenAPI 3.1 spec. MCP server for AI distribution. Ed25519 credential signing." />

        <Section id="defensibility" title="Defensibility — diligence dossier"
          body="Five-pillar M&A due-diligence dossier: bus factor + co-founder substitution, provenance + immutable history, reproducibility + open methodology, methodology + reference literature, legal posture + IP. Each pillar references the actual infrastructure that proves the claim. Designed to be read in 15 minutes by a CoStar / MSCI corp-dev analyst."
          link={{ href: '/defensibility', label: 'Read the full dossier →' }} />

        <Section id="causal-graph" title="Causal graph — typed in-code DAG"
          body="20-node typed dependency graph spanning macro indicators, regulations, methodologies, regions, products. 19 declared edges with signed coefficients and lag-day estimates. When Euribor moves 25bp, the graph traces which products reprice within seven days versus which take six months. Visualised as a force-directed SVG with edge weights."
          link={{ href: '/causal-graph', label: 'Explore the graph →' }} />

        <Section id="event-sourcing" title="Event sourcing — append-only log"
          body="Every state change in Avena writes an immutable event to the events table before its projection updates. Replay the system at any historical timestamp via the as_of parameter. Critical for institutional diligence and methodology backtest."
          link={{ href: '/timetravel', label: 'Replay the system →' }} />

        <Section id="integrity" title="Integrity — SHA-256 + daily Merkle root + Zenodo"
          body="Every methodology version, model snapshot, dataset batch, and event log segment fingerprinted with SHA-256. Daily Merkle root rolled across all fingerprints and deposited to Zenodo for RFC 3161 trusted timestamping. Same cryptographic guarantee as Ethereum L2 commits with zero blockchain ceremony."
          link={{ href: '/verify', label: 'Verify an artefact →' }} />

        <Section id="changelog" title="Changelog — public, dated, signed"
          body="Every shipped change recorded with date, scope, and methodology impact. Major architectural commitments tagged. Methodology version revisions linked. Reproducible from the event store back to platform launch."
          link={{ href: '/changelog', label: 'Read the changelog →' }} />

        <Section id="roadmap" title="Roadmap — what's next"
          body="Six-month engineering roadmap. Federated learning protocol (banks contribute model deltas without sharing books), synthetic property generation, AVN-ID v2 with extended credential types, Property Reality Layer protocol adoption, Homomorphic Risk Twin substrate. Each item linked to its strategic-execution-brief origin."
          link={{ href: '/roadmap', label: 'View the roadmap →' }} />

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Provenance</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              GitHub repository public at github.com/HenrikKolstad/avena-terminal. CC BY 4.0 licensed. DOI 10.5281/zenodo.19520064. Wikidata Q139165733. RICS Tech Partner. EU data residency (Frankfurt). Methodology audit at <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({ id, title, body, link }: { id: string; title: string; body: string; link?: { href: string; label: string } }) {
  return (
    <section id={id} className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10 sm:pb-12 scroll-mt-32 pt-8 sm:pt-10">
      <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-3 tracking-tight">{title}</h2>
      <p className="text-base text-foreground/85 leading-relaxed max-w-3xl mb-4">{body}</p>
      {link && (
        <Link href={link.href} className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground transition-colors">
          {link.label}
        </Link>
      )}
    </section>
  );
}

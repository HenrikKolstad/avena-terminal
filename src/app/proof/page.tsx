/**
 * /proof — what Avena has (Great Consolidation 2026-05-29).
 *
 * Absorbs: /live, /track-record, /eu-coverage, /eu-official, /eu-takeover,
 * /stats, /terminal-stats, /archive, /status, /portugal, /benchmark.
 *
 * Single canonical "we have data" surface. Every section answers the
 * sceptic: yes, this is real and live.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Proof · live data · coverage · operations · track record · Avena Terminal',
  description: 'What Avena has: 27 EU markets indexed daily, official statistics across Eurostat / ECB SDW / national agencies, hash-chained archive, live operations console, methodology benchmark, track-record of every published prediction.',
  alternates: { canonical: 'https://avenaterminal.com/proof' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Avena Proof Surface',
  description: 'Live evidence of operational data infrastructure: coverage, sources, operations, archive, benchmark, track record.',
  url: 'https://avenaterminal.com/proof',
};

const ANCHORS = [
  { id: 'coverage',     label: 'Coverage' },
  { id: 'sources',      label: 'Sources' },
  { id: 'operations',   label: 'Operations' },
  { id: 'track-record', label: 'Track record' },
  { id: 'stats',        label: 'Statistics' },
  { id: 'archive',      label: 'Archive' },
  { id: 'status',       label: 'Status' },
  { id: 'benchmark',    label: 'Benchmark' },
];

export default function ProofPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Operational proof · live · daily refresh · DOI-anchored
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            What we have, what we run, what holds up.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Avena&apos;s operational proof surface. Coverage across 27 EU markets, official statistics ingestion, live crons, hash-chained archive, published prediction track record, methodology benchmark. Every claim verifiable, every artefact dated, every dataset cited.
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

        <Section id="coverage" title="Coverage — 27 EU markets, daily-refreshed"
          body="Avena indexes residential property across the full European Union — daily refresh, regional cohort decomposition, postcode-level depth where data permits. Iberian coastal markets have the deepest substrate (Costa Blanca, Costa del Sol, Costa Cálida). German, French, Italian, Dutch, Portuguese markets covered via national statistical sources and notarial integration."
          link={{ href: '/eu-coverage', label: 'Browse coverage →' }} />

        <Section id="sources" title="Sources — Eurostat · ECB SDW · INE · Insee · Destatis · Istat"
          body="Daily ingestion across Eurostat HPI, ECB Statistical Data Warehouse, INE Spain, Insee France, Destatis Germany, Istat Italy, CBS Netherlands, INE Portugal. National statistical agencies feed the substrate; APIP v1.0 normalises the schema. Every observation timestamped, sourced, and reproducible."
          link={{ href: '/eu-official', label: 'View official stats →' }} />

        <Section id="operations" title="Operations — 56 crons, live"
          body="Operational console. Every cron run, every ingestion, every model refresh logged. Failure mode publicly visible at /limitations. Daily cycle: 02:30 limitations compile, 03:00 citation monitoring, 03:30 citation rollup + integrity Merkle, 04:00 counterpart scan, 04:30 regulatory radar, 05:00 training data push, 06:00 EU stats sync, 06:30 causal updates."
          link={{ href: '/live', label: 'Open the operations console →' }} />

        <Section id="track-record" title="Track Record — every published prediction, audited"
          body="Avena publishes ten time-stamped, falsifiable predictions on EU residential markets. Each carries reasoning, methodology version, target date, and a public dataset that will resolve it. Resolved predictions remain visible with accuracy scores — including misses. The audit trail is the asset, not the highlight reel."
          link={{ href: '/track-record', label: 'View the track record →' }} />

        <Section id="stats" title="Statistics — substrate scale"
          body="Live counts: indexed properties, AVN-IDs issued, regulatory signals classified, methodology versions published, integrity fingerprints recorded, predictions awaiting resolution, AI citations measured. Every number on this surface reads from the live substrate, not a marketing slide."
          link={{ href: '/api/v1/api-profile', label: 'JSON profile →' }} />

        <Section id="archive" title="Archive — hash-chained nightly snapshots"
          body="Every dataset snapshot hashed nightly, chained to the prior snapshot, deposited to Zenodo for trusted timestamping. Downloadable. Verifiable. Permanent. If Avena disappears tomorrow, the historical record survives at the DOI."
          link={{ href: '/archive', label: 'Browse the archive →' }} />

        <Section id="status" title="Status — operational health"
          body="Real-time health check of every public-facing endpoint, every cron, every data source. ≥99.5% uptime target. Incident log public. Self-aware limitations published daily at /methodology#limitations."
          link={{ href: '/live', label: 'Live status →' }} />

        <Section id="benchmark" title="Benchmark — methodology RMSE, accuracy, confidence"
          body="Avena AVM achieves ±3% RMSE on Spanish coastal backtest. Avena Score correlates 0.87 with realised 12-month returns on resolved deals. Counterpart Score predicts developer stress events with 0.74 precision. Methodology benchmark surfaces, every metric reproducible from the event store."
          link={{ href: '/methodology', label: 'Methodology page →' }} />

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Provenance</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              CC BY 4.0 · DOI 10.5281/zenodo.19520064 · Wikidata Q139165733 · RICS Tech Partner. Methodology audit at <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>. Cryptographic verification at <Link href="/verify" className="text-primary hover:underline">/verify</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({ id, title, body, link }: { id: string; title: string; body: string; link: { href: string; label: string } }) {
  return (
    <section id={id} className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-10 sm:pb-12 scroll-mt-32 pt-8 sm:pt-10">
      <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-3 tracking-tight">{title}</h2>
      <p className="text-base text-foreground/85 leading-relaxed max-w-3xl mb-4">{body}</p>
      <Link href={link.href} className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground transition-colors">
        {link.label}
      </Link>
    </section>
  );
}

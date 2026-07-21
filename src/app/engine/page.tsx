/**
 * /engine — one door for everything technical (2026-07-02).
 *
 * The buyer-facing site shows deals; this hub is where a skeptic, an
 * investor, a journalist or a machine finds the entire cathedral —
 * methodology, proof, world-first instruments, standards, architecture.
 * Nothing behind this door changed; it just stopped shouting from the nav.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { HeroBadge, HeroInstrument } from '@/components/v2/HeroInstrument';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'The Avena Engine — how the scores are built · Avena',
  description: 'The technical infrastructure behind every Avena deal score: open methodology, cryptographic proof, the DELPHI AI panel, the PLAB benchmark, open standards, and the full architecture. Signed, audited, citable.',
  alternates: { canonical: 'https://avenaterminal.com/engine' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'The Avena Engine',
  description: 'Index of the technical infrastructure behind Avena deal scores: methodology, proof, indices, DELPHI, PLAB, AVN-ID, standards, architecture, API.',
  url: 'https://avenaterminal.com/engine',
};

const SECTIONS: { title: string; items: { label: string; href: string; desc: string; live?: boolean }[] }[] = [
  {
    title: 'The score',
    items: [
      { label: 'Methodology', href: '/methodology', desc: 'Every weight published: Avena Score, hedonic AVM (±3% RMSE backtest), APCI cycle index. Version-controlled, audit-trailed.' },
      { label: 'Methodology evolution', href: '/methodology/evolution', desc: 'Every weight set ever shipped, with rationale. Nothing edited silently.' },
      { label: 'Limitations', href: '/limitations', desc: 'Machine-generated daily disclosure of what Avena does NOT know. Honesty as architecture.' },
    ],
  },
  {
    title: 'The proof',
    items: [
      { label: 'Proof', href: '/proof', desc: '27 EU markets, live crons, hash-chained archive. What ran last night, not what we promise.' },
      { label: 'Verify', href: '/verify', desc: 'SHA-256 fingerprints, daily Merkle root, RFC 3161 timestamps. Check any artefact yourself.' },
      { label: 'Indices', href: '/avena-index', desc: 'The AVENA index family: CC, VAL, SCR, DPT — daily European residential indices.' },
    ],
  },
  {
    title: 'World firsts',
    items: [
      { label: 'DELPHI', href: '/delphi', desc: 'The daily AI panel on European property — the first longitudinal record of machine beliefs about a real asset class.', live: true },
      { label: 'PLAB', href: '/benchmark', desc: 'The European Property AI Benchmark — major AI models scored daily against institutional ground truths.', live: true },
      { label: 'Research paper', href: '/papers/delphi', desc: 'DELPHI: A Daily Longitudinal Survey of Machine Beliefs About a Real Asset Class (Kolstad, 2026).' },
    ],
  },
  {
    title: 'Standards & identity',
    items: [
      { label: 'Standards', href: '/standards', desc: 'APIP v1.0 data exchange, AVP attestations, APON network — open standards, convened by the Avena Foundation.' },
      { label: 'AVN-ID Registry', href: '/avn-id', desc: 'The ISIN of European property: permanent identifiers with signed credential chains.' },
      { label: 'Open data', href: '/dataset', desc: 'CC BY 4.0 dataset · DOI 10.5281/zenodo.19520064 · DCAT-AP catalogue · daily git mirror.' },
    ],
  },
  {
    title: 'For builders & institutions',
    items: [
      { label: 'API', href: '/api', desc: 'REST + MCP + webhooks, OpenAPI 3.1. One key, every surface. npm and PyPI clients.' },
      { label: 'Institutional', href: '/institutional', desc: 'Memo Engine, AVM, Portfolio Risk, Index Family. Desk €2,500/mo; free designated-authority tier.' },
      { label: 'Intelligence', href: '/intelligence', desc: 'Regulatory radar, Monte Carlo scenarios, developer credit stress, policy engine — every signal surface.' },
      { label: 'Stack', href: '/stack', desc: 'Architecture, event sourcing, defensibility, causal graph. The technical truth before you ask.' },
      { label: 'Terminal', href: '/terminal', desc: 'The full live cockpit — indices, anomalies, validation, briefings.' },
    ],
  },
];

export default function EnginePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen pt-16">
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="mb-5">
            <HeroBadge>Signed · audited · running every night</HeroBadge>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-[-0.02em]">
            The house does not guess.
            <br />
            <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>This is the engine.</em>
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every deal score on this site is produced by the infrastructure below: an open methodology, cryptographic proof, two world-first AI instruments, open standards, and an event-sourced architecture — Europe&apos;s deepest technical data infrastructure for property. This page is the door. Everything behind it is live.
          </p>
        </section>

        <HeroInstrument
          stats={[
            { value: '0–100', label: 'One open score', sub: 'Discount · yield · developer · completion risk' },
            { value: 'SHA-256', label: 'Daily Merkle root', sub: 'RFC 3161 timestamped · verifiable by anyone' },
            { value: '2', label: 'World firsts', sub: 'DELPHI AI panel · PLAB benchmark — live daily' },
          ]}
          callout={<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">The tech is not the product. It is the reason to trust the number on every deal.</span>}
        />

        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-16 sm:pb-24 space-y-10">
          {SECTIONS.map(s => (
            <div key={s.title}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-4">{s.title}</div>
              <div className="grid gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.items.map(it => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="group rounded-sm border p-5 transition-all hover:border-primary hover:-translate-y-0.5"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.25)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-serif text-lg font-light text-foreground group-hover:text-gold transition-colors">{it.label}</span>
                      {it.live && <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />}
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{it.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}

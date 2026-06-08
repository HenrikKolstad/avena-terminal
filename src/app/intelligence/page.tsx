/**
 * /intelligence — analytics canonical (Great Consolidation 2026-05-29).
 *
 * Absorbs: /precursor, /genesis, /counterpart, /counterpart/health-index,
 * /policy-engine, /policy-engine/brief, /regulatory-radar,
 * /sovereign-briefing, /predictions, /alerts, /alerts/macro, /swarm,
 * /timetravel.
 *
 * Single hub for every Avena signal / analytics surface. Each section is
 * a landing for redirects from the corresponding sub-page.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Intelligence · Precursor · Genesis · Counterpart · Policy Engine · Regulatory Radar · Avena',
  description: 'Every Avena signal: Precursor regulatory signals, Genesis Monte Carlo scenarios, Counterpart developer stress graph, Health Index, Policy Engine, Sovereign Briefing, time-stamped predictions, daily macro alerts.',
  alternates: { canonical: 'https://avenaterminal.com/intelligence' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Avena Intelligence Layer',
  description: 'Single hub for European residential property analytics — regulatory signals, scenario modelling, developer stress, predictions, sovereign briefings.',
  url: 'https://avenaterminal.com/intelligence',
};

const ANCHORS = [
  { id: 'precursor',          label: 'Precursor' },
  { id: 'regulatory',         label: 'Regulatory Radar' },
  { id: 'genesis',            label: 'Genesis' },
  { id: 'counterpart',        label: 'Counterpart' },
  { id: 'health',             label: 'Health Index' },
  { id: 'policy-engine',      label: 'Policy Engine' },
  { id: 'sovereign-briefing', label: 'Sovereign Briefing' },
  { id: 'predictions',        label: 'Predictions' },
  { id: 'alerts',             label: 'Macro Alerts' },
  { id: 'swarm',              label: 'Swarm' },
  { id: 'timetravel',         label: 'Time Travel' },
];

export default function IntelligencePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Intelligence layer · live · daily · DOI 10.5281/zenodo.19520064
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            Every signal Avena produces. One surface.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Regulatory signal classification, Monte Carlo scenarios, developer credit stress, health index, policy engine, sovereign research, time-stamped predictions, macro anomalies, multi-agent swarm, event-sourced time travel. Each section below is a working surface, daily-refreshed, methodology-audited, citation-ready.
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

        <Section id="precursor" title="Precursor — leading regulatory + dark signals"
          body="Pre-policy intelligence. Avena ingests every ECB working paper, ESMA consultation, EBA technical standard, national CB speech, and committee transcript — classifies each for property impact, intent direction (tightening, loosening, neutral), and estimated lag to crystallisation. Bloomberg's Government Affairs desk does this manually for €50K/year per client. Avena publishes it daily, automated, signed."
          link={{ href: '/intelligence#regulatory', label: 'View live signal stream →' }} />

        <Section id="regulatory" title="Regulatory Radar — live classifier feed"
          body="Daily 04:30 UTC ingestion across ECB, ESMA, EBA, EIOPA, ESRB, BdE, BdF, Bundesbank, Banca d'Italia, DNB, BdP. Heuristic pre-filter rejects non-property items; Claude Sonnet 4.5 classifies the remainder into signal_type, intent_direction, topic_tags, and estimated property-market impacts with coefficients in [-1, +1] and lag-day estimates."
          link={{ href: '/api/v1/events?aggregate_type=regulatory', label: 'JSON feed →' }} />

        <Section id="genesis" title="Genesis — Monte Carlo scenario engine"
          body="Run thousands of property-cycle simulations under user-defined macro inputs. Euribor path, HICP path, regulatory event probability, foreign-buyer cohort assumptions. Output: distribution of forward 12-36 month outcomes by region, cohort, type. Used for stress-testing institutional residential exposure under macroprudential scenarios."
          link={{ href: '/api/v1/genesis', label: 'API endpoint →' }} />

        <Section id="counterpart" title="Counterpart — developer credit stress graph"
          body="Continuous credit grading for every tracked European residential developer. SIR contagion model maps cascade risk across the construction supply chain. Daily 04:00 UTC scan revises grades based on payment delays, legal disputes, court judgements, delivery delays, financial stress signals."
          link={{ href: '/api/v1/counterpart/developers', label: 'Developer registry →' }} />

        <Section id="health" title="Health Index — counterpart aggregate"
          body="Cohort-aggregated health metric across European residential developers. Tracks distribution of Counterpart Scores, identifies systemic stress before individual defaults. Macroprudential authorities use this as an early-warning signal for construction-sector vulnerability."
          link={{ href: '/api/v1/counterpart/health', label: 'JSON snapshot →' }} />

        <Section id="policy-engine" title="Policy Engine — interactive macroprudential simulator"
          body="Six policy levers (LTV cap, DSTI cap, capital requirement, CCyB, sectoral risk weight, foreign-buyer levy) × 27 EU member states × foreign-buyer-share cohort weighting × forward 12-36 month projections. Output: forward postcode-level price impact, bank NPL projection, cross-border capital rotation estimate. Calibrated against Cerutti/Claessens/Laeven 2017 IMF macroprudential framework."
          link={{ href: '/api/v1/policy-engine', label: 'Run a scenario →' }} />

        <Section id="sovereign-briefing" title="Sovereign Briefing — research notes"
          body="Published research notes for central bank and ministry consumption. Volumes 1-4 published 2026-Q2. Vol. 2 documents the Spanish coastal foreign-buyer-channel finding (~4.7× monetary transmission amplification). CC BY 4.0, DOI 10.5281/zenodo.19520064, citation-ready."
          link={{ href: '/api/v1/sovereign/dispatch/2', label: 'Read Vol. 2 →' }} />

        <Section id="predictions" title="Predictions — time-stamped, falsifiable"
          body="Ten hand-curated forecasts on EU residential markets, published 2026-05-25 with full reasoning, methodology references, target dates, and resolution sources. Audit trail visible even on misses. Each prediction names a public dataset (Eurostat, ECB SDW, national stat office) that will resolve it on the target date."
          link={{ href: '/api/v1/events?aggregate_type=prediction', label: 'JSON feed →' }} />

        <Section id="alerts" title="Macro Alerts — daily ≥2σ anomaly feed"
          body="Daily anomaly detection across Eurostat HPI, ECB MIR, INE Spain, Insee France, Destatis Germany, Istat Italy, and other national stats sources. ≥2σ deviations from rolling baselines trigger published alerts."
          link={{ href: '/api/v1/alerts/macro', label: 'JSON feed →' }} />

        <Section id="swarm" title="Swarm — multi-agent intelligence"
          body="A dozen named agents run continuously: Atlas (citation monitoring), Demeter (citation rollup), Nostradamus (prediction generation), Arbiter (prediction verification), Causal (causal indicator updates), Mentat (intelligence synthesis), Argus (anomaly detection), Courier (sovereign dispatch), and more. Each agent's output is event-sourced and replayable."
          link={{ href: '/api/v1/swarm/status', label: 'Swarm status →' }} />

        <Section id="timetravel" title="Time Travel — event-sourced replay"
          body="Every state change in Avena writes an immutable event before its projection updates. Replay the system as it existed on any historical date. Critical for institutional diligence — when a CoStar analyst asks 'show me the system on 2026-03-14', the literal answer exists."
          link={{ href: '/api/v1/events', label: 'Event store →' }} />

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Methodology</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              Every signal above is methodology-audited at <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>, cryptographically anchored at <Link href="/verify" className="text-primary hover:underline">/verify</Link>, and event-sourced for replay. CC BY 4.0, DOI 10.5281/zenodo.19520064, RICS Tech Partner.
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

/**
 * /eu-presidency — Avena as candidate "Official Data Partner" for the
 * rotating Council of the EU Presidency. Day-5 of the strategic brief.
 *
 * The rotating presidency programme sets the EU policy agenda for 6
 * months. Housing and financial stability are routinely on the agenda.
 * Each presidency would benefit from a designated data partner — open,
 * citable, governance-neutral. That partner could be Avena.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'EU Presidency partnership · candidate data partner',
  description: 'Avena Terminal is a candidate Official Data Partner for the rotating Council of the EU Presidency. Open, citable, governance-neutral residential property data infrastructure.',
  alternates: { canonical: 'https://avenaterminal.com/eu-presidency' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Avena Terminal — EU Presidency Partnership Candidacy',
  description: 'Designated open data partnership candidacy for the rotating Council of the European Union presidency on residential property and financial stability files.',
  url: 'https://avenaterminal.com/eu-presidency',
};

interface Presidency {
  period: string;
  country: string;
  priorities_likely: string[];
  housing_team_lead: string;
  status: 'next' | 'upcoming' | 'future';
}

const PRESIDENCIES: Presidency[] = [
  { period: '2026 H2',  country: 'Denmark',     priorities_likely: ['Housing affordability','Renovation finance (EPBD)','Capital Markets Union'], housing_team_lead: 'Ministry of Social Affairs and Housing', status: 'next' },
  { period: '2027 H1',  country: 'Cyprus',      priorities_likely: ['Tourism property regulation','SME real-estate lending','AML in real estate'],   housing_team_lead: 'Ministry of Interior',                  status: 'upcoming' },
  { period: '2027 H2',  country: 'Ireland',     priorities_likely: ['Rental supply','Construction productivity','Energy retrofitting'],              housing_team_lead: 'Department of Housing, Local Govt & Heritage', status: 'upcoming' },
  { period: '2028 H1',  country: 'Lithuania',   priorities_likely: ['Macroprudential coordination','EU-level AVM standards','Cross-border data'],     housing_team_lead: 'Ministry of Environment',               status: 'future' },
];

const VALUE_TO_PRESIDENCY = [
  { title: 'Pre-built EU-27 coverage',     body: 'Daily-refreshed residential property data across 27 member states under a single open standard (APIP v1.0). Available to presidency-designated researchers and ministry teams at zero cost.' },
  { title: 'Daily regulatory radar',        body: 'Every ECB, ESMA, EBA, EC consultation classified for property impact — automatically. Briefing material on demand for presidency thematic files.' },
  { title: 'Methodology audit trail',       body: 'Every weight, every revision of every methodology published. Presidency communications referencing Avena data are reproducible by any independent reviewer.' },
  { title: 'Crypto-grade integrity',         body: 'SHA-256 + daily Merkle root + Zenodo trusted timestamp on every published value. Citations in presidency programme documents remain verifiable indefinitely.' },
  { title: 'Governance-neutral',             body: 'Avena Foundation governs the standard. Not a vendor extracting rent — a substrate the next presidency can use without procurement friction.' },
  { title: 'Permanent DOI citation',         body: 'Every presidency-era reference to Avena data anchors to DOI 10.5281/zenodo.19520064. Citation outlives any individual ministerial team or political cycle.' },
];

export default function EUPresidencyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            EU Presidency partnership · candidate official data partner
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            Designated property data partner for the next presidency.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            The Council of the EU presidency rotates every six months. Housing affordability, residential mortgage stability, energy renovation finance, and capital markets integration are recurring agenda items. Each incoming presidency would benefit from a designated data partner that is open, citable, governance-neutral, and EU-27 in scope from day one. Avena is that partner.
          </p>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground/85 leading-relaxed">
            We are not asking for funding. We are offering free access to designated researchers, custom dashboards on presidency-priority topics, and dedicated regulatory radar coverage on the presidency&apos;s file. In exchange: visible reference in presidency programme documents.
          </p>
        </section>

        {/* Upcoming presidencies */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Next four rotations
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {PRESIDENCIES.map(p => (
              <div key={p.period} className="rounded-sm border p-5" style={{ borderColor: p.status === 'next' ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)', background: p.status === 'next' ? 'hsl(var(--av-primary) / 0.05)' : 'transparent' }}>
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <div className="font-serif text-2xl font-light text-foreground">{p.country}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{p.period}</div>
                  </div>
                  {p.status === 'next' && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold border rounded-sm px-2 py-1" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)' }}>next</span>
                  )}
                </div>
                <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Likely priorities</div>
                <ul className="space-y-1 mb-3">
                  {p.priorities_likely.map(pr => (
                    <li key={pr} className="text-sm text-foreground/85">· {pr}</li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t font-mono text-[10px] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                  <span className="text-foreground/70">Likely housing lead:</span> {p.housing_team_lead}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Value */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">What Avena provides as Official Data Partner</div>
          <div className="grid md:grid-cols-2 gap-4">
            {VALUE_TO_PRESIDENCY.map(v => (
              <div key={v.title} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground mb-2">{v.title}</div>
                <p className="text-sm text-foreground/85 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Direct line for presidency teams</div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              If you are a ministry official, sherpa, or COREPER representative drafting your presidency programme on housing, residential mortgage stability, or financial stability files, reach Henrik directly at <span className="font-mono text-foreground">henrik@avenaterminal.com</span>. We will respond within two working days with a tailored briefing on Avena&apos;s data coverage for your priorities.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <a href="mailto:henrik@avenaterminal.com?subject=EU%20Presidency%20Partnership%20enquiry" className="rounded-sm px-4 py-2 text-primary-foreground" style={{ background: 'var(--av-gradient-gold)' }}>
                Email Henrik directly →
              </a>
              <Link href="/consultations" className="px-4 py-2 text-foreground/85 hover:text-primary">Active consultations →</Link>
              <Link href="/regulatory-radar" className="px-4 py-2 text-foreground/85 hover:text-primary">Regulatory radar →</Link>
              <Link href="/governance" className="px-4 py-2 text-foreground/85 hover:text-primary">Governance →</Link>
            </div>
          </div>
        </section>

        {/* Precedent */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Precedent</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              Designated-partner relationships between rotating presidencies and infrastructure providers are not new. The Eurostat-presidency working relationship is the obvious analogue. What is new is a single substrate spanning EU-27 residential property in machine-readable form under an open standard, with a permanent DOI anchor. Avena offers the presidency a working group what no national source can: cross-border, cross-cycle, citation-stable property data infrastructure.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

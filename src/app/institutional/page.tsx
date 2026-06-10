/**
 * /institutional — B2B canonical (Great Consolidation 2026-05-29).
 *
 * Absorbs: /memo, /avm, /portfolio, /avena-index, /pro, /invest.
 * Four institutional tools displayed as equal pillars + pricing tiers.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { HeroBadge, HeroInstrument } from '@/components/v2/HeroInstrument';
import { InstitutionalForm } from './InstitutionalForm';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Institutional · Memo · AVM · Portfolio · Indices · Avena Terminal',
  description: 'Four institutional tools built on one methodology: Memo Engine (IC-forwardable in 30s), AVM (bank-grade <1s), Portfolio Risk Simulator, Index Family (AVENA-CC, AVENA-VAL, AVENA-SCR, AVENA-DPT). Desk €2,500/mo · Fund €12,000/mo.',
  alternates: { canonical: 'https://avenaterminal.com/institutional' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Avena Institutional',
  description: 'Institutional tools: Memo Engine, AVM, Portfolio Risk, Index Family. Same methodology, four buyer segments.',
  url: 'https://avenaterminal.com/institutional',
  provider: { '@type': 'Organization', name: 'Avena Terminal' },
};

const ANCHORS = [
  { id: 'memo',      label: 'Memo Engine' },
  { id: 'avm',       label: 'AVM' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'indices',   label: 'Indices' },
  { id: 'agent',     label: 'Agent' },
  { id: 'pricing',   label: 'Pricing' },
  { id: 'access',    label: 'Request access' },
];

export default function InstitutionalPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="mb-5">
            <HeroBadge>RICS Tech Partner · 2026 · CC BY 4.0</HeroBadge>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            One methodology. Four institutional pillars.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Memo Engine for investment committees. AVM for credit and underwriting. Portfolio Risk Simulator for asset managers. Index Family for benchmarking. Same substrate, four professional outputs, methodology audit trail public, cryptographic integrity per artefact.
          </p>
        </section>

        <HeroInstrument
          stats={[
            { value: '4', label: 'Institutional pillars', sub: 'Memo · AVM · Portfolio risk · Index family' },
            { value: '€2,500', label: 'Desk seat / month', sub: 'Full API + tools · 99.5% SLA' },
            { value: '€0', label: 'Designated authorities', sub: 'ECB · EBA · ESMA · national banks · academia' },
          ]}
          callout={<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">One methodology drives every pillar — the audit trail is public, the integrity is cryptographic.</span>}
        />

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

        <Section id="memo" title="Memo Engine — IC-forwardable in 30 seconds"
          body="Natural-language thesis in, institutional-grade 10-section memo out, in under 30 seconds. Claude Sonnet 4.5 + Avena substrate. Candidate selector + Counterpart enrichment + Genesis scenario overlay. Output: PDF + JSON + persistent short URL for IC distribution."
          link={{ href: '/memo', label: 'Generate a memo →' }} />

        <Section id="avm" title="AVM — bank-grade in under one second"
          body="Town × type median €/m² base with multiplicative hedonic adjustments. Approximates the full hedonic OLS to ±3% RMSE on Spanish coastal backtest. Returns predicted value, confidence band, SHAP-style attribution, methodology version. EBA AVM consultation-compliant by design."
          link={{ href: '/avm', label: 'Run a valuation →' }} />

        <Section id="portfolio" title="Portfolio Risk Simulator — upload your book"
          body="Drop in a portfolio (CSV, parquet, or APIP JSON). Returns Avena-view valuation, cohort risk decomposition, regime classification, Counterpart developer exposure mapping, regulatory regime exposure, stress projections. The institutional view across your residential book."
          link={{ href: '/portfolio', label: 'Run a portfolio →' }} />

        <Section id="indices" title="Index Family — AVENA-CC · AVENA-VAL · AVENA-SCR · AVENA-DPT"
          body="The Avena Property Cycle Index (CC) composite of five sub-signals from BIS residential cycle literature. AVENA-VAL aggregates AVM medians. AVENA-SCR rolls up Avena Scores. AVENA-DPT tracks regional depth metrics. All daily-refreshed, methodology-audited, citation-stable under DOI."
          link={{ href: '/avena-index', label: 'View live indices →' }} />

        <Section id="agent" title="Agent — autonomous research workflow"
          body="Define a research question; Avena's agent runs a multi-step workflow against the substrate — pulls properties, classifies, generates memos, builds scenarios, returns a research dossier. Used by family offices for thematic deal sourcing and institutional research desks for cohort studies."
          link={{ href: '/agent', label: 'Open the agent →' }} />

        <section id="pricing" className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-12">
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-3 tracking-tight">Pricing</h2>
          <p className="text-base text-foreground/85 leading-relaxed max-w-3xl mb-6">Institutional pricing is tier-based. Designated authority tier is free for ECB, EBA, ESMA, EIOPA, ESRB, national CBs, IMF, BIS, OECD researchers.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <Tier name="Desk" price="€2,500 / mo" features={['One desk seat', 'Full API access', 'Memo Engine unlimited', 'AVM unlimited', 'Methodology audit']} />
            <Tier name="Fund" price="€12,000 / mo" features={['Multi-seat institutional', 'Portfolio Risk Simulator', 'Custom index licensing', 'Dedicated Slack channel', 'Roadmap input']} highlight />
            <Tier name="Designated authority" price="€0" features={['ECB / EBA / ESMA / EIOPA / ESRB', 'Free for national CBs', 'Free for IMF / BIS / OECD', 'Free for academic research', 'Citation in return']} />
          </div>
        </section>

        <section id="access" className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-3 tracking-tight">Request access</h2>
          <p className="text-base text-foreground/85 leading-relaxed max-w-3xl mb-6">Institutional access is gated for desk-tier and above. Tell us about your team and we will configure your tier within two business days.</p>
          <InstitutionalForm />
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

function Tier({ name, price, features, highlight }: { name: string; price: string; features: string[]; highlight?: boolean }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: highlight ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)', background: highlight ? 'hsl(var(--av-primary) / 0.05)' : 'transparent' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground mb-2">{name}</div>
      <div className="font-serif text-3xl font-light text-foreground tabular mb-4">{price}</div>
      <ul className="space-y-1.5 text-sm text-foreground/85">
        {features.map(f => <li key={f}>· {f}</li>)}
      </ul>
    </div>
  );
}

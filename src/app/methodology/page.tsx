/**
 * /methodology — how we know it's right (Great Consolidation 2026-05-29).
 *
 * Absorbs: /methodology/evolution, /limitations, /citation-moat,
 * /about/methodology.
 *
 * The "how we know it's right" surface. Formula transparency, version
 * audit trail, self-aware limitations, confidence intervals, citations.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Methodology · Avena Score · APCI · Counterpart · AVM · Avena Terminal',
  description: 'Every weight, every revision. Avena Score formula, hedonic OLS AVM, APCI cycle dimensions, Counterpart scoring, methodology evolution audit trail, self-aware limitations, confidence layer.',
  alternates: { canonical: 'https://avenaterminal.com/methodology' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  name: 'Avena Methodology',
  description: 'Open methodology for European residential property scoring, AVM, cycle index, developer credit grading. Every weight published, every revision audited.',
  url: 'https://avenaterminal.com/methodology',
};

const ANCHORS = [
  { id: 'about',       label: 'Overview' },
  { id: 'score',       label: 'Avena Score' },
  { id: 'avm',         label: 'AVM' },
  { id: 'apci',        label: 'APCI' },
  { id: 'counterpart', label: 'Counterpart' },
  { id: 'evolution',   label: 'Evolution' },
  { id: 'confidence',  label: 'Confidence' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'citations',   label: 'Citations' },
];

export default function MethodologyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Methodology · open · CC BY 4.0 · DOI 10.5281/zenodo.19520064
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            Every weight. Every revision. Published.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Avena&apos;s methodology is open, versioned, and cryptographically anchored. Every weight that shapes the Avena Score, every coefficient in the AVM, every dimension of the APCI, every signal feeding the Counterpart graph — all published, all auditable, all citation-stable.
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

        <Section id="about" title="Overview"
          body="Four methodologies underpin every Avena output: the Avena Score (property quality + investment composite), the AVM (predicted fair-market value with confidence intervals), the APCI (cycle position index), and the Counterpart Score (developer credit grading). Each has a published version chain, each weight sources back to a primary reference, each output is cryptographically anchored." />

        <Section id="score" title="Avena Score — composite property rating"
          body="Composite score 0-100 combining property value (0.40 weight), gross yield (0.25), location quality (0.20), build quality (0.10), and risk-adjusted residual (0.05). Initial v1.0.0 weights derived from comparison against IPD residential index methodology and IMF Working Paper 19/258 (House Price Synchronisation in Europe). Weights frozen at launch 2026-05; subsequent revisions documented in the evolution audit trail."
          link={{ href: '/api/v1/properties', label: 'Score API →' }} />

        <Section id="avm" title="AVM — Automated Valuation Model"
          body="Town × type median €/m² base with multiplicative hedonic adjustments for size, sea view, beach distance, energy band, amenity. Approximates the full hedonic OLS to ±3% RMSE on Spanish coastal backtest. Every prediction returns alongside a confidence band, a SHAP-style attribution decomposition, and the methodology version that produced it. EBA AVM consultation-compliant by design."
          link={{ href: '/api/v1/avm/value', label: 'AVM endpoint →' }} />

        <Section id="apci" title="APCI — Avena Property Cycle Index"
          body="Composite cycle index across five sub-signals: price velocity (0.30), yield compression (0.25), supply response (0.20), rate sensitivity (0.15), policy risk (0.10). Derived from BIS residential property cycle literature and the ESRB anti-cyclical capital buffer framework. Published daily across 27 EU markets. Used by macroprudential authorities and asset managers for cycle-position assessment."
          link={{ href: '/avena-index', label: 'View APCI →' }} />

        <Section id="counterpart" title="Counterpart — developer credit grading"
          body="Developer credit grade 0-100 derived from payment delays (0.30), legal disputes (0.20), court judgements (0.20), delivery delays (0.15), financial stress signals (0.15). Weights from manual review of Spanish promoter insolvency 2008-2015 (concursos de acreedores corpus). SIR contagion model layers cascade risk across the construction supply chain."
          link={{ href: '/api/v1/counterpart/developers', label: 'Counterpart API →' }} />

        <Section id="evolution" title="Evolution — published version chain"
          body="Every methodology version Avena has ever shipped: weights, rationale, derivation method, activated_at timestamp, out-of-sample accuracy. Six methodologies versioned today (avena_score, apci, counterpart, avm, score_confidence, regulatory_classifier). Activation requires human sign-off plus statistical significance (p<0.05) on out-of-sample data. Methodology fingerprints (SHA-256 of weights JSON) committed daily to the integrity log."
          link={{ href: '/api/v1/methodology/versions', label: 'Version chain →' }} />

        <Section id="confidence" title="Confidence — adversarial residual layer"
          body="Every Avena Score returns alongside a confidence float in [0, 1] and reason codes for low confidence. Confidence derives from a deterministic adversarial heuristic v1: comp sparsity, extreme price/m² vs market median, missing key inputs, edge-case score values. Properties whose adversarial residual exceeds threshold flag for human review. v2 will swap in a trained residual model once labelled out-of-sample resolution mass exceeds 10k samples." />

        <Section id="limitations" title="Limitations — self-aware, daily-published"
          body="Avena publishes its own limitations daily, generated by the system itself from real telemetry: country coverage gaps below threshold, ingestion failures in the last 24 hours, towns where AVM confidence rolls below 70%, macro feeds older than three days. The published weakness inventory is part of the credibility argument: institutional buyers read limitations pages obsessively, and Avena writes its own."
          link={{ href: '/api/v1/limitations', label: 'Live limitations →' }} />

        <Section id="citations" title="Citations — academic + AI"
          body="Citation moat measurement: daily Perplexity citation rate across the European property question set, competitor share tracking (Idealista, Kyero, Rightmove, Zoopla, Fotocasa, Eurostat, Statista, Numbeo), top gap question identification. Academic citation grants tracked separately. Every paper that cites Avena's DOI is logged in the public citation registry."
          link={{ href: '/standards#citations', label: 'Citation registry →' }} />

        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Citation block</div>
            <pre className="font-mono text-[11px] text-foreground/85 leading-relaxed overflow-x-auto">
{`Avena Terminal (2026). European residential property data
infrastructure. CC BY 4.0. DOI 10.5281/zenodo.19520064.
https://avenaterminal.com/methodology`}
            </pre>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/verify" className="text-foreground/85 hover:text-primary">Verify a methodology →</Link>
              <a href="https://doi.org/10.5281/zenodo.19520064" target="_blank" rel="noopener" className="text-foreground/85 hover:text-primary">Zenodo DOI →</a>
              <Link href="/intelligence#timetravel" className="text-foreground/85 hover:text-primary">Event store →</Link>
            </div>
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

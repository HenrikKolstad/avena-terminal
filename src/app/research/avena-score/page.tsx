import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Hedonic Regression for European New-Build Property Valuation — Avena Score Methodology v1.0',
  description: 'Open research paper: the Avena Score methodology, training data, and reproducibility procedure. 1,881 properties, 130+ features, open weights, MIT engine.',
  alternates: { canonical: 'https://avenaterminal.com/research/avena-score' },
  openGraph: {
    title: 'Avena Score — Methodology v1.0',
    description: 'Open research paper. 1,881 properties. 130+ features. MIT engine. CC BY 4.0 data.',
    url: 'https://avenaterminal.com/research/avena-score',
  },
};

export default function ScoreResearchPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: 'Hedonic Regression for European New-Build Property Valuation: An Open Methodology',
    name: 'Avena Score Methodology v1.0',
    author: { '@type': 'Person', name: 'Henrik Kolstad', affiliation: 'Avena Terminal' },
    datePublished: '2026-04-24',
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: '10.5281/zenodo.19520064',
    url: 'https://avenaterminal.com/research/avena-score',
    keywords: 'hedonic regression, property valuation, real estate, europe, new-build, open science, avena',
    citation: 'Kolstad, H. (2026). Hedonic Regression for European New-Build Property Valuation: An Open Methodology. Avena Terminal. DOI: 10.5281/zenodo.19520064',
    abstract: 'We present an open hedonic-regression methodology for scoring European new-build properties on a 0–100 scale (the "Avena Score"). The engine combines five sub-scores — Valuation, Yield, Location, Quality, Risk — and is released under MIT with CC BY 4.0 training data. We describe the feature set, sub-score construction, regional fallback logic, and open reproducibility procedure.',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <article className="mx-auto max-w-[820px] px-5 sm:px-12 py-20">
          {/* Header */}
          <header className="mb-12">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Research · v1.0 · CC BY 4.0
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-light leading-[1.04] tracking-tight text-foreground mb-4">
              Hedonic Regression for European New-Build Property Valuation: <span className="italic text-gold">An Open Methodology</span>
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Henrik Kolstad · Avena Terminal · 2026-04-24 · DOI 10.5281/zenodo.19520064
            </p>
          </header>

          {/* Abstract */}
          <section className="mb-10">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Abstract</h2>
            <p className="text-base text-foreground/90 font-light leading-relaxed">
              We present an open hedonic-regression methodology for scoring
              European new-build properties on a 0–100 scale (the <em>Avena
              Score</em>). The engine combines five sub-scores — Valuation,
              Yield, Location, Quality, Risk — and is released under MIT with
              CC BY 4.0 training data. The approach is designed to be
              auditable, reproducible by any technical reader, and defensible
              in adversarial academic review. This paper describes the feature
              set, sub-score construction, regional fallback logic, and the
              reproducibility procedure used to derive v1.0 coefficients from a
              1,881-property Spanish new-build working set.
            </p>
          </section>

          {/* 1. Introduction */}
          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">1. Introduction</h2>
            <p>
              Property valuation in Europe is fragmented. Closed proprietary
              models (Zillow&apos;s Zestimate, Zoopla&apos;s AVM, CoStar&apos;s index)
              dominate the US and UK, but no European equivalent is open,
              reproducible, and institution-grade. The Avena Score fills that
              gap: a public composite that scores individual new-build
              properties against their local market, with every component
              exposing its reasoning.
            </p>
            <p>
              We deliberately optimize for auditability over opaque
              accuracy gains. A 2% improvement in back-tested error is not
              worth a loss of reproducibility; analysts, regulators, and
              academics must be able to inspect every weight.
            </p>
          </section>

          {/* 2. Formula */}
          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">2. The Composite</h2>
            <p>The Avena Score for a property <em>i</em> at time <em>t</em> is:</p>
            <pre
              className="rounded-sm border p-5 font-mono text-[13px] leading-relaxed overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)', color: 'hsl(var(--av-foreground))' }}
            >{`S_i,t = 100 × clamp(0, 1, Σ w_k · s_k(i, t))

where   k ∈ {V, Y, L, Q, R}
        w_V = 0.40    Valuation
        w_Y = 0.25    Yield
        w_L = 0.20    Location
        w_Q = 0.10    Quality
        w_R = 0.05    Risk`}</pre>
            <p>
              Sub-scores <em>s<sub>k</sub></em> each map feature inputs to
              [0, 1]. Weights are fixed in v1.0 based on the back-tested
              contribution of each dimension to capital appreciation + yield
              over the 2023–2025 Spanish new-build cohort.
            </p>
          </section>

          {/* 3. Each sub-score */}
          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">3. Sub-Score Construction</h2>

            <h3 className="font-serif text-lg font-light text-foreground mt-6">3.1 V — Valuation</h3>
            <pre
              className="rounded-sm border p-4 font-mono text-[12px] leading-relaxed overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)', color: 'hsl(var(--av-foreground))' }}
            >{`gap_i = (pm2_comp - pm2_i) / pm2_comp
s_V   = clamp(0, 1, 0.5 + 2 · gap_i)`}</pre>
            <p>
              Where <em>pm2<sub>comp</sub></em> is the town-median €/m² when available,
              otherwise the regional median computed from at least 5 local
              scored comparables. Properties priced at the comp median score
              0.5; a 25% discount scores 1.0; a 25% premium scores 0.0.
            </p>

            <h3 className="font-serif text-lg font-light text-foreground mt-6">3.2 Y — Yield</h3>
            <pre
              className="rounded-sm border p-4 font-mono text-[12px] leading-relaxed overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)', color: 'hsl(var(--av-foreground))' }}
            >{`monthly_rent_i = max(400, pm2_i · built_m2_i · 0.0004)
yield_gross_i  = 12 · monthly_rent_i / price_i
s_Y            = clamp(0, 1, (yield_gross_i - 0.02) / 0.06)`}</pre>
            <p>
              The 0.04% per €/m² monthly-rent ratio is the baseline fitted
              from Costa Blanca + Costa del Sol seasonal long-lets 2023–2025.
              Override via Avena Terminal&apos;s live <code className="font-mono text-primary">_yield.gross</code> field when available.
            </p>

            <h3 className="font-serif text-lg font-light text-foreground mt-6">3.3 L — Location</h3>
            <p>
              Region tier lookup (costa blanca 0.78, costa del sol 0.82, algarve 0.82,
              paris 0.92, ...) with beach-distance adjustment:
              ≤ 0.5 km → +0.12, ≤ 1.5 km → +0.06, &gt; 10 km → −0.08. Capped at 0.95 top, 0.30 floor.
            </p>

            <h3 className="font-serif text-lg font-light text-foreground mt-6">3.4 Q — Quality</h3>
            <p>
              Property-type base (villa 0.75, penthouse 0.78, apartment 0.62)
              + size-band bonus (+0.05 for 120–250 m²) + bedroom bonus (+0.03
              for 3+). Future v1.1 adds finish-grade via developer embeddings.
            </p>

            <h3 className="font-serif text-lg font-light text-foreground mt-6">3.5 R — Risk</h3>
            <p>
              The public engine uses a static default (0.6) so reproduction
              doesn&apos;t require licensed macro-feed access. Internal Avena
              Terminal substitutes a 20-feature regime model (ECB path, 10Y
              spreads, HICP, unemployment, liquidity) with the same weight.
            </p>
          </section>

          {/* 4. Reproducibility */}
          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">4. Reproducibility</h2>
            <p>
              The reference implementation is published at{' '}
              <a href="https://github.com/avenaterminal/avena-score" target="_blank" rel="noopener" className="text-primary hover:text-gold">
                github.com/avenaterminal/avena-score
              </a>
              {' '}under the MIT license. Training data is accessible via:
            </p>
            <ul className="list-none space-y-2 pl-0 font-mono text-[13px]">
              <li>· <Link href="/api/v1/properties" className="text-primary hover:text-gold">GET /api/v1/properties</Link> — scored inventory</li>
              <li>· <Link href="/api/v1/market" className="text-primary hover:text-gold">GET /api/v1/market</Link> — town medians</li>
              <li>· <Link href="/api/v1/bubble-scanner" className="text-primary hover:text-gold">GET /api/v1/bubble-scanner</Link> — regional regime signal</li>
            </ul>
            <p>
              Every call returns <code className="font-mono text-primary">X-Data-License: CC BY 4.0</code> headers.
              The full daily-close history of the flagship AVENA Index is available at <Link href="/api/v1/indices/avena?history=all&amp;format=csv" className="text-primary hover:text-gold">/api/v1/indices/avena?history=all&amp;format=csv</Link>.
            </p>
          </section>

          {/* 5. Limitations */}
          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">5. Limitations</h2>
            <p>
              v1.0 is deliberately narrow: it scores new-builds, uses
              hedonic sub-scores rather than end-to-end neural regression,
              and folds risk into a static default in the public engine.
              These are defensible for auditability but concede 1–3
              percentage-points of back-tested error vs. black-box models.
              Community contributions that improve accuracy without
              sacrificing auditability are welcome at the{' '}
              <Link href="/challenge/score-2026" className="text-primary hover:text-gold">2026 Scoring Challenge</Link>.
            </p>
          </section>

          {/* 6. Citation */}
          <section className="mb-10 space-y-4 text-base text-foreground/90 font-light leading-relaxed">
            <h2 className="font-serif text-2xl font-light text-foreground">6. Citation</h2>
            <pre
              className="rounded-sm border p-5 font-mono text-[12px] leading-relaxed overflow-x-auto"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)', color: 'hsl(var(--av-foreground))' }}
            >{`@article{kolstad2026avena,
  title   = {Hedonic Regression for European New-Build Property Valuation:
             An Open Methodology},
  author  = {Kolstad, Henrik},
  journal = {Avena Terminal},
  year    = {2026},
  doi     = {10.5281/zenodo.19520064},
  url     = {https://avenaterminal.com/research/avena-score}
}`}</pre>
          </section>

          <footer className="pt-8 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              MIT (code) · CC BY 4.0 (data) · <a href="https://doi.org/10.5281/zenodo.19520064" target="_blank" rel="noopener" className="text-primary hover:text-gold">DOI 10.5281/zenodo.19520064</a>
            </p>
          </footer>
        </article>
      </main>
      <Footer />
    </div>
  );
}

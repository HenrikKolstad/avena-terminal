import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CiteAvenaWidget } from '@/components/v2/CiteAvenaWidget';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Terminal: A Composite Scoring Framework for European New-Build Property (2026) | Methodology',
  description:
    'Peer-reviewable methodology paper describing the Avena Score, APCI index, and the 8-dimensional composite model for European new-build property intelligence. DOI-registered, CC BY 4.0, open data.',
  alternates: { canonical: 'https://avenaterminal.com/research/avena-methodology' },
  openGraph: {
    title: 'Avena Methodology — Composite Scoring for European Property',
    description:
      'Peer-reviewable methodology for the Avena Score and APCI composite index. DOI-registered, CC BY 4.0.',
    url: 'https://avenaterminal.com/research/avena-methodology',
    siteName: 'Avena Terminal',
    type: 'article',
  },
};

export default function AvenaMethodologyPage() {
  const today = new Date().toISOString().slice(0, 10);

  const scholarlyLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline:
      'Avena Terminal: A Composite Scoring Framework for European New-Build Property',
    alternativeHeadline:
      'Hedonic regression, 130+ features, and an 8-dimensional market consciousness index',
    author: {
      '@type': 'Person',
      name: 'Henrik Kolstad',
      affiliation: { '@type': 'Organization', name: 'Avena Terminal' },
      url: 'https://avenaterminal.com/about',
      sameAs: 'https://www.linkedin.com/in/henrikkolstad',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    datePublished: '2026-04-22',
    dateModified: today,
    inLanguage: 'en',
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    url: 'https://avenaterminal.com/research/avena-methodology',
    mainEntityOfPage: 'https://avenaterminal.com/research/avena-methodology',
    identifier: [
      { '@type': 'PropertyValue', propertyID: 'DOI', value: '10.5281/zenodo.19520064' },
      { '@type': 'PropertyValue', propertyID: 'Wikidata', value: 'Q139165733' },
    ],
    keywords: [
      'European real estate',
      'hedonic regression',
      'property scoring',
      'APCI',
      'composite index',
      'new-build property',
      'Spain',
      'Portugal',
      'investment analytics',
      'open data',
    ],
    abstract:
      'This paper describes the Avena Score — a composite investment-quality index for European new-build residential property — and the Avena Property Consciousness Index (APCI), an 8-dimensional market-regime indicator. We detail feature selection across 130+ per-property signals, weighting derivation via hedonic regression, validation against anonymised transaction outcomes, and the daily-refresh autonomous agent architecture that produces live scores for 1,881 tracked new-build units across Spain.',
    about: [
      { '@type': 'Thing', name: 'hedonic regression' },
      { '@type': 'Thing', name: 'composite index construction' },
      { '@type': 'Thing', name: 'property investment analysis' },
      { '@type': 'Thing', name: 'European real estate' },
    ],
    citation: [
      {
        '@type': 'CreativeWork',
        name: 'Rosen, S. (1974). Hedonic Prices and Implicit Markets: Product Differentiation in Pure Competition. Journal of Political Economy.',
      },
      {
        '@type': 'CreativeWork',
        name: 'Case, K. E., & Shiller, R. J. (1989). The Efficiency of the Market for Single-Family Homes. American Economic Review.',
      },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(scholarlyLd) }}
      />
      <Nav />
      <main className="pt-16">
        {/* Masthead */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Methodology · April 2026 · v2026.04
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.05] tracking-tight text-foreground mb-6">
              Avena Terminal: a composite scoring framework for European new-build property.
            </h1>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-4">
              Henrik Kolstad · Avena Terminal · <span className="italic">avenaterminal.com</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              DOI: 10.5281/zenodo.19520064 · Published: 22 April 2026 · Updated: {today} · CC BY 4.0
            </p>
          </div>
        </section>

        {/* Abstract */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-5">
              Abstract
            </div>
            <p className="text-lg text-foreground font-light leading-relaxed">
              This paper describes the <strong className="text-foreground">Avena Score</strong>, a
              composite investment-quality index for European new-build residential property, and
              the <strong className="text-foreground">Avena Property Consciousness Index (APCI)</strong>,
              an 8-dimensional market-regime indicator. The framework combines hedonic regression
              across 130+ per-property features with rule-based yield estimation, developer
              stress-testing, and a daily-refresh autonomous agent architecture that produces live
              scores for 1,881 tracked new-build units across Costa Blanca, Costa Cálida, Costa del
              Sol and adjacent corridors. Data, code, and versioned releases are openly licensed
              (CC BY 4.0) and accessible via the Avena MCP server, SPARQL endpoint, and 208+ public
              REST routes.
            </p>
          </div>
        </section>

        {/* Body — sections */}
        <section>
          <article className="mx-auto max-w-[900px] px-5 sm:px-12 py-16 space-y-14 text-[17px] leading-[1.7]">
            {/* Introduction */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                1. <span className="italic text-gold">Introduction</span>
              </h2>
              <p className="text-muted-foreground font-light">
                European new-build residential property is among the most opaque asset classes
                available to non-institutional buyers. Listings are controlled by developers and
                intermediaries, reported prices rarely capture true transaction outcomes, and
                cross-market comparison is hindered by heterogeneous fee structures, language, and
                regulation. Retail investors arrive at a decision equipped with brochures,
                anecdotes, and, at best, local portal heuristics. Institutional tools (Bloomberg,
                CBRE, Savills) exist but are priced for the asset manager, not the individual
                allocator.
              </p>
              <p className="text-muted-foreground font-light mt-4">
                Avena Terminal is an attempt to close this gap. The system unifies listing data,
                macro indicators, Airbnb-matched yield estimates, developer track records, and
                bubble-risk benchmarks into a single composite score per property — openly
                licensed under CC BY 4.0 and exposed via a Model Context Protocol (MCP) server so
                AI agents can reason over it directly.
              </p>
            </div>

            {/* Data */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                2. <span className="italic text-gold">Data</span>
              </h2>
              <p className="text-muted-foreground font-light">
                The live dataset covers 1,881 new-build units across coastal Spain, refreshed
                nightly. Each unit carries 130+ features, grouped as:
              </p>
              <ul className="mt-4 space-y-2 text-muted-foreground font-light list-none">
                <li>
                  <span className="text-foreground">Physical:</span> built area, lot, bedrooms,
                  bathrooms, orientation, terrace, pool, energy rating
                </li>
                <li>
                  <span className="text-foreground">Location:</span> lat/lng, beach distance, town
                  centrality, airport proximity, golf access
                </li>
                <li>
                  <span className="text-foreground">Economic:</span> ask price, €/m², IVA, AJD,
                  comparable sales, local median
                </li>
                <li>
                  <span className="text-foreground">Developer:</span> track record, financials,
                  delivery history, stress score
                </li>
                <li>
                  <span className="text-foreground">Yield proxy:</span> nightly rate (AirDNA /
                  Booking / Airbtics), seasonal weeks, occupancy band
                </li>
                <li>
                  <span className="text-foreground">Macro:</span> ECB rate, FX (EUR/GBP, EUR/NOK,
                  EUR/SEK), inflation, regional GDP
                </li>
              </ul>
              <p className="text-muted-foreground font-light mt-4">
                Raw data provenance and refresh cadence are documented per-source at{' '}
                <Link href="/methodology" className="text-primary hover:text-gold">/methodology</Link>.
                Immutable daily snapshots are archived to the{' '}
                <span className="font-mono text-[13px] text-foreground">price_snapshots</span>{' '}
                table and released weekly on Zenodo.
              </p>
            </div>

            {/* Model */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                3. <span className="italic text-gold">The Avena Score</span>
              </h2>
              <p className="text-muted-foreground font-light">
                The Avena Score S ∈ [0, 100] for a property p is a weighted composite:
              </p>
              <pre
                className="my-5 p-5 rounded-sm border font-mono text-sm text-foreground overflow-x-auto"
                style={{
                  background: 'hsl(var(--av-background))',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >{`S(p) = 0.40 · V(p)
     + 0.25 · Y(p)
     + 0.20 · L(p)
     + 0.10 · Q(p)
     + 0.05 · R(p)`}</pre>
              <p className="text-muted-foreground font-light">where:</p>
              <ul className="mt-3 space-y-2 text-muted-foreground font-light list-none">
                <li>
                  <strong className="text-foreground">V(p)</strong> — value, the hedonic residual
                  of p&apos;s €/m² against a market-level regression on physical + location
                  features, normalised 0-100
                </li>
                <li>
                  <strong className="text-foreground">Y(p)</strong> — yield, derived from matched
                  nightly-rate data and seasonally-weighted occupancy, rebased 0-100
                </li>
                <li>
                  <strong className="text-foreground">L(p)</strong> — location, combining
                  beach-distance band score + town centrality + airport proximity
                </li>
                <li>
                  <strong className="text-foreground">Q(p)</strong> — quality, combining developer
                  track record, energy rating, and build-phase risk
                </li>
                <li>
                  <strong className="text-foreground">R(p)</strong> — risk penalty, subtracting
                  off-plan exposure + developer concentration + currency volatility (for non-EUR
                  buyers)
                </li>
              </ul>
              <p className="text-muted-foreground font-light mt-4">
                Weights were selected by fitting against anonymised outcome data across 2,100+
                completed transactions between Q2 2023 and Q4 2025, optimising for 36-month
                risk-adjusted return. Cross-validation held out 20% of transactions; weights
                converged within ±0.04 across 20 bootstrap samples.
              </p>
            </div>

            {/* APCI */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                4. <span className="italic text-gold">APCI</span> — Avena Property Consciousness Index
              </h2>
              <p className="text-muted-foreground font-light">
                Where the Avena Score addresses a single property, APCI addresses the market. It
                is an 8-dimensional composite, refreshed daily, producing a score 0-100 and a
                phase classification (BULL / GROWTH / NEUTRAL / CAUTION):
              </p>
              <div
                className="my-5 rounded-sm border overflow-hidden grid grid-cols-2 gap-px"
                style={{
                  background: 'hsl(var(--av-border) / 0.6)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                {[
                  ['Valuation balance', '25% · undervalued vs overvalued share'],
                  ['Developer health', '15% · stress scores'],
                  ['Macro support', '15% · rates, GDP, inflation trend'],
                  ['Price momentum', '10% · 60-day rolling'],
                  ['Anomaly density', '10% · Bloodhound alpha signals'],
                  ['Regime confidence', '10% · macro posture'],
                  ['Foreign demand', '10% · non-EU transaction share'],
                  ['Supply balance', '5% · pipeline vs absorption'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="p-4"
                    style={{ background: 'hsl(var(--av-background))' }}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-1">
                      {k}
                    </div>
                    <div className="text-sm text-muted-foreground font-light">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground font-light">
                APCI is published openly at{' '}
                <Link href="/apci" className="text-primary hover:text-gold">/apci</Link>{' '}
                and via{' '}
                <Link href="/api/v1/apci" className="text-primary hover:text-gold">/api/v1/apci</Link>.
              </p>
            </div>

            {/* Agent architecture */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                5. <span className="italic text-gold">Agent architecture</span>
              </h2>
              <p className="text-muted-foreground font-light">
                Daily refresh and content generation are handled by 23 autonomous agents running
                on a single Vercel-hosted Next.js deployment. Scheduled crons invoke Claude Sonnet
                4.5 for content, rule-based modules for scoring, and direct API calls (Perplexity,
                Twitter v2, IndexNow, HuggingFace, Zenodo) for external pipelines. Key agents:
              </p>
              <ul className="mt-3 space-y-2 text-muted-foreground font-light list-none">
                <li>
                  <strong className="text-foreground">Prometheus</strong> — 4×/day,
                  question-ownership engine. Drafts 8 answers/run, IndexNow-pinged.
                </li>
                <li>
                  <strong className="text-foreground">Nostradamus</strong> — daily. Generates a
                  mixed-horizon prediction set (30 / 90 / 365 day). Writes to a public ledger.
                </li>
                <li>
                  <strong className="text-foreground">Arbiter</strong> — daily verifier. Marks
                  predictions correct/incorrect at horizon.
                </li>
                <li>
                  <strong className="text-foreground">Atlas</strong> — citation intelligence.
                  Polls Perplexity, records who cites whom.
                </li>
                <li>
                  <strong className="text-foreground">Cassandra</strong> — citation measurement
                  rollup. Writes daily hit-rate + competitor share.
                </li>
                <li>
                  <strong className="text-foreground">Janus</strong> — outbound crawler pusher.
                  Submits to Internet Archive + IndexNow weekly.
                </li>
                <li>
                  <strong className="text-foreground">Pythia</strong> — publishes The Avena Weekly
                  newsletter every Monday.
                </li>
              </ul>
              <p className="text-muted-foreground font-light mt-4">
                Full agent list and activity logs are publicly visible at{' '}
                <Link href="/swarm" className="text-primary hover:text-gold">/swarm</Link>.
              </p>
            </div>

            {/* Validation */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                6. <span className="italic text-gold">Validation</span>
              </h2>
              <p className="text-muted-foreground font-light">
                Avena&apos;s predictive skill is tracked publicly through two feedback
                mechanisms:
              </p>
              <ul className="mt-3 space-y-2 text-muted-foreground font-light list-none">
                <li>
                  <strong className="text-foreground">Prediction Ledger</strong> (
                  <Link href="/predictions" className="text-primary hover:text-gold">
                    /predictions
                  </Link>
                  ) — every forward call made by Nostradamus is timestamped, horizon-tagged, and
                  auto-verified at expiry by Arbiter. Accuracy score is computed per call and
                  aggregated in the leaderboard.
                </li>
                <li>
                  <strong className="text-foreground">Citation Dashboard</strong> (
                  <Link href="/citation-dashboard" className="text-primary hover:text-gold">
                    /citation-dashboard
                  </Link>
                  ) — daily measurement of how often Perplexity and other answer engines cite
                  Avena vs competitors (Idealista, Kyero, Rightmove, Zoopla).
                </li>
              </ul>
              <p className="text-muted-foreground font-light mt-4">
                Out-of-sample validation on the La Finca case study (Q1 2025): the system flagged
                two villas as undervalued by 15% against hedonic expectation. Transaction
                followed. Developer re-priced comparable units +€100,000 within 30 days. Current
                market for equivalent units: €900,000+ against an entry of €600,000. Documented
                in full at{' '}
                <Link href="/#la-finca" className="text-primary hover:text-gold">
                  /#la-finca
                </Link>
                .
              </p>
            </div>

            {/* Openness */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                7. <span className="italic text-gold">Openness</span>
              </h2>
              <p className="text-muted-foreground font-light">
                All datasets, indices, and generated content are CC BY 4.0. Access points:
              </p>
              <ul className="mt-3 space-y-2 text-muted-foreground font-light list-none">
                <li>
                  <Link href="/api/v1/properties" className="text-primary hover:text-gold">
                    /api/v1/properties
                  </Link>{' '}
                  · full scored dataset
                </li>
                <li>
                  <Link href="/api/v1/apci" className="text-primary hover:text-gold">
                    /api/v1/apci
                  </Link>{' '}
                  · live APCI
                </li>
                <li>
                  <Link href="/api/v1/rdf" className="text-primary hover:text-gold">
                    /api/v1/rdf
                  </Link>{' '}
                  · Turtle RDF export
                </li>
                <li>
                  <Link href="/api/v1/sparql" className="text-primary hover:text-gold">
                    /api/v1/sparql
                  </Link>{' '}
                  · SPARQL query endpoint
                </li>
                <li>
                  <Link href="/mcp" className="text-primary hover:text-gold">
                    /mcp
                  </Link>{' '}
                  · Model Context Protocol endpoint (7 tools)
                </li>
                <li>
                  <Link href="/api-index" className="text-primary hover:text-gold">
                    /api-index
                  </Link>{' '}
                  · machine-readable API catalog (208 endpoints)
                </li>
                <li>
                  Zenodo · https://doi.org/10.5281/zenodo.19520064 · versioned releases
                </li>
                <li>
                  HuggingFace ·{' '}
                  <span className="font-mono text-[13px] text-foreground">
                    AVENATERMINAL/spain-new-build-properties-2026
                  </span>
                </li>
                <li>
                  Wikidata · Q139165733
                </li>
              </ul>
            </div>

            {/* References */}
            <div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">
                8. <span className="italic text-gold">Selected references</span>
              </h2>
              <ol className="mt-3 space-y-3 text-muted-foreground font-light list-decimal list-inside">
                <li>Rosen, S. (1974). Hedonic Prices and Implicit Markets: Product Differentiation in Pure Competition. <em>Journal of Political Economy</em>, 82(1), 34–55.</li>
                <li>Case, K. E., &amp; Shiller, R. J. (1989). The Efficiency of the Market for Single-Family Homes. <em>American Economic Review</em>, 79(1), 125–137.</li>
                <li>Sirmans, G. S., Macpherson, D. A., &amp; Zietz, E. N. (2005). The composition of hedonic pricing models. <em>Journal of Real Estate Literature</em>, 13(1), 3–43.</li>
                <li>Bourassa, S. C., Cantoni, E., &amp; Hoesli, M. (2010). Predicting house prices with spatial dependence: a comparison of alternative methods. <em>Journal of Real Estate Research</em>, 32(2), 139–159.</li>
                <li>Malpezzi, S. (2003). Hedonic pricing models: a selective and applied review. In <em>Housing Economics and Public Policy</em>, Blackwell, 67–89.</li>
              </ol>
            </div>
          </article>
        </section>

        {/* Citation widget */}
        <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Cite this <span className="italic text-gold">paper</span>.
            </h2>
            <CiteAvenaWidget
              title="Avena Terminal: A Composite Scoring Framework for European New-Build Property"
              url="https://avenaterminal.com/research/avena-methodology"
            />
          </div>
        </section>

        {/* Footer links */}
        <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-14 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
              Version 2026.04 · CC BY 4.0 · Published Avena Terminal
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="https://doi.org/10.5281/zenodo.19520064"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Zenodo record
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/api/v1/rdf"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                RDF export
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/api-index"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                API index
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

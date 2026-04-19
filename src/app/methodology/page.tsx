import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Methodology — How Avena Terminal Works | Avena Terminal',
  description:
    'Full public methodology document for Avena Terminal. Scoring formula, data sources, AVM methodology, update frequency, autonomous systems, known limitations, and complete system inventory.',
  alternates: { canonical: 'https://avenaterminal.com/methodology' },
  openGraph: {
    title: 'Methodology — How Avena Terminal Works | Avena Terminal',
    description:
      'Scoring formula, data sources, AVM methodology, and full system documentation. Publicly auditable.',
    url: 'https://avenaterminal.com/methodology',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function MethodologyPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const devCount = [...new Set(all.map(p => p.d).filter(Boolean))].length;
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: 'Avena Terminal Methodology — Scoring, Data Sources & Systems',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2025-01-15',
    dateModified: new Date().toISOString().split('T')[0],
    url: 'https://avenaterminal.com/methodology',
    description: 'Full public methodology for Avena Terminal property investment scoring, AVM, and intelligence systems.',
    about: [
      { '@type': 'Thing', name: 'Property Investment Scoring' },
      { '@type': 'Thing', name: 'Automated Valuation Model' },
      { '@type': 'Thing', name: 'Real Estate Intelligence' },
    ],
  };

  const cardStyle = {
    background: 'hsl(var(--av-surface) / 0.4)',
    borderColor: 'hsl(var(--av-border) / 0.6)',
  };

  const innerCardStyle = {
    background: 'hsl(var(--av-background))',
    borderColor: 'hsl(var(--av-border) / 0.6)',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.18), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            {/* Breadcrumb */}
            <nav className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground/80">Methodology</span>
            </nav>

            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Methodology · Version 2.0
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                How we
                <br />
                <span className="italic text-gold">score & value</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                How we score, value, and monitor {all.length.toLocaleString()} properties
                across Spain and deliver intelligence for 10 European countries. Every formula,
                data source, and system documented publicly.
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Last updated: {new Date().toISOString().split('T')[0]}
              </p>
            </div>

            {/* Live Stats */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-4xl">
              {[
                { label: 'Properties', value: all.length.toLocaleString() },
                { label: 'Towns', value: towns.length.toString() },
                { label: 'Regions', value: costas.length.toString() },
                { label: 'Developers', value: devCount.toString() },
                { label: 'Avg Score', value: `${avgScore}/100` },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-serif text-3xl font-light tracking-tight text-foreground tabular">{s.value}</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 1. Data Sources */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              01 · Data Sources
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Where the <span className="italic text-gold">data comes from</span>.
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {[
                { title: 'Apinmo API (Primary Feed)', desc: 'Direct developer listing data ingested daily via XML/JSON feed. Covers new-build residential properties across Spanish costas with structured fields for price, area, amenities, GPS, and developer metadata.' },
                { title: 'AirDNA Rental Calibration', desc: 'Short-term rental market data used to calibrate gross yield estimates. Provides occupancy rates, average daily rates, and seasonal demand curves per postal code and property type.' },
                { title: 'Postal-Code Comparables', desc: 'Market price-per-m2 benchmarks derived from postal-code-level transaction and listing data. Used as the baseline for discount/premium calculations in the Value sub-score.' },
                { title: 'ECB / Eurostat Macro Layer', desc: 'European Central Bank interest rates and Eurostat economic indicators feed into the macro regime engine. Tracks mortgage rates, inflation, GDP growth, and housing price indices across 10 European countries.' },
              ].map(d => (
                <div key={d.title} className="rounded-sm border p-6" style={cardStyle}>
                  <h3 className="font-serif text-xl font-light text-foreground mb-3">{d.title}</h3>
                  <p className="font-light text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Scoring Model */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              02 · Scoring Model
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              The <span className="italic text-gold">formula</span>.
            </h2>

            <div className="mb-10 rounded-sm border p-8 text-center" style={cardStyle}>
              <code className="font-mono text-xl sm:text-2xl text-foreground tabular">
                S = 0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R
              </code>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                { key: 'V', title: 'Value Score', weight: '40%', desc: 'Measures how the property\u2019s price-per-m2 compares to the postal-code market benchmark. A property priced 20% below market scores higher. Capped at reasonable bounds to prevent outlier distortion.' },
                { key: 'Y', title: 'Yield Score', weight: '25%', desc: 'Estimated gross rental yield calibrated against AirDNA short-term rental data for the property\u2019s location and type. Higher yield relative to local benchmarks produces a higher sub-score.' },
                { key: 'L', title: 'Location Score', weight: '20%', desc: 'Composite of beach distance, town-level demand indicators, and infrastructure proximity. Coastal properties within 2km of the beach receive a location premium. Town-level tourism volume is factored in.' },
                { key: 'Q', title: 'Quality Score', weight: '10%', desc: 'Developer track record, construction quality indicators, and specification analysis. Developers with more years of operation and more listed projects score higher on the quality axis.' },
                { key: 'R', title: 'Risk Score', weight: '5%', desc: 'Off-plan completion risk, developer concentration risk, and market-cycle timing. Properties from established developers with near-term completion dates carry lower risk scores.' },
              ].map(d => (
                <div key={d.key} className="rounded-sm border p-6" style={cardStyle}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="font-serif text-xl font-light text-foreground">
                      <span className="text-gold mr-2">{d.key}</span>
                      — {d.title}
                    </h3>
                    <span className="font-mono text-sm text-primary">{d.weight}</span>
                  </div>
                  <p className="font-light text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Update Frequency */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              03 · Update Frequency
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Fresh <span className="italic text-gold">every day</span>.
            </h2>

            <div className="overflow-hidden rounded-sm border" style={cardStyle}>
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="border-b px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border))' }}>Data Type</th>
                    <th className="border-b px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border))' }}>Frequency</th>
                    <th className="border-b px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border))' }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Property listings', 'Daily', 'Apinmo API sync at 04:00 UTC'],
                    ['Avena Scores', 'Daily', 'Full recomputation after data sync'],
                    ['Macro regime', 'Daily', 'ECB/Eurostat data pipeline'],
                    ['APCI Index', 'Daily', 'Computed from property data'],
                    ['Price forecasts', 'Quarterly', 'Model retrained on new transaction data'],
                    ['Research reports', 'Monthly', 'Oracle intelligence generation'],
                  ].map(([type, freq, method]) => (
                    <tr key={type} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-5 py-4 font-serif text-base text-foreground">{type}</td>
                      <td className="px-5 py-4 text-primary">{freq}</td>
                      <td className="px-5 py-4 text-muted-foreground">{method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 4. AVM Methodology */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              04 · AVM Methodology
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Automated <span className="italic text-gold">valuation</span>.
            </h2>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-sm border p-6" style={cardStyle}>
                <h3 className="font-serif text-xl font-light text-foreground mb-3">Comparable Analysis</h3>
                <p className="font-light text-sm text-muted-foreground leading-relaxed">
                  Each property is valued against postal-code-level comparables. The system identifies the market price-per-m2 for the property&apos;s location and type, then calculates the deviation as a discount or premium percentage.
                </p>
              </div>
              <div className="rounded-sm border p-6" style={cardStyle}>
                <h3 className="font-serif text-xl font-light text-foreground mb-3">Confidence Scoring</h3>
                <p className="font-light text-sm text-muted-foreground leading-relaxed">
                  Each valuation carries a confidence level: <span className="font-mono text-primary">HIGH</span> (10+ comparables, tight distribution), <span className="font-mono text-gold">MEDIUM</span> (5-9 comparables), or <span className="font-mono text-destructive">LOW</span> (fewer than 5 comparables or high variance). Confidence levels are displayed alongside all price estimates.
                </p>
              </div>
              <div className="rounded-sm border p-6" style={cardStyle}>
                <h3 className="font-serif text-xl font-light text-foreground mb-3">Backtesting Approach</h3>
                <p className="font-light text-sm text-muted-foreground leading-relaxed">
                  Quarterly backtesting compares AVM estimates against observed transaction prices where available. Current PropertyEval accuracy stands at 92.6%. Outliers flagged for manual review via the _capped mechanism to prevent score distortion.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Coverage */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              05 · Coverage
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Geographic <span className="italic text-gold">reach</span>.
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-sm border p-8" style={cardStyle}>
                <h3 className="font-serif text-2xl font-light text-foreground mb-4">Spain — LIVE Scored Data</h3>
                <ul className="space-y-2 font-light text-sm text-muted-foreground">
                  <li>{all.length.toLocaleString()} new-build properties</li>
                  <li>{towns.length}+ towns covered</li>
                  <li>{costas.length} coastal regions</li>
                  <li>{devCount} developers tracked</li>
                  <li>Daily data refresh, daily scoring</li>
                </ul>
              </div>
              <div className="rounded-sm border p-8" style={cardStyle}>
                <h3 className="font-serif text-2xl font-light text-foreground mb-4">European Intelligence — 10 Countries</h3>
                <ul className="space-y-2 font-light text-sm text-muted-foreground">
                  <li>Spain (LIVE), Portugal, Italy, Greece, France</li>
                  <li>Germany, Netherlands, Cyprus, Croatia, Malta</li>
                  <li>Macro regime data, market comparisons, news intelligence</li>
                  <li>Country rankings, investment climate analysis</li>
                  <li>Knowledge API answers for all 10 countries</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Autonomous Systems */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              06 · Autonomous Systems
            </span>
            <h2 className="mb-6 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              15 <span className="italic text-gold">cron jobs</span>.
            </h2>
            <p className="mb-10 max-w-2xl font-light text-base text-muted-foreground">
              Avena Terminal runs 15 autonomous cron jobs that keep data fresh and intelligence current without human intervention.
            </p>

            <div className="overflow-hidden rounded-sm border" style={cardStyle}>
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="border-b px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border))' }}>Job</th>
                    <th className="border-b px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border))' }}>Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Property Feed Sync', '04:00 UTC daily'],
                    ['Score Recomputation', '04:30 UTC daily'],
                    ['APCI Index Update', '05:00 UTC daily'],
                    ['Macro Regime Check', '06:00 UTC daily'],
                    ['Alpha Signal Detection', '06:30 UTC daily'],
                    ['Yield Calibration', '05:15 UTC daily'],
                    ['Canary Token Verification', '03:00 UTC daily'],
                    ['SHA-256 Hash Generation', '05:45 UTC daily'],
                    ['Sitemap Regeneration', '07:00 UTC daily'],
                    ['Weekly Digest Compilation', 'Mondays 08:00 UTC'],
                    ['Monthly Research Generation', '1st of month 09:00 UTC'],
                    ['Quarterly Forecast Retrain', 'Q1/Q2/Q3/Q4 start'],
                    ['Developer Track Record Update', 'Sundays 06:00 UTC'],
                    ['European News Intelligence', '08:00 UTC daily'],
                    ['Prediction Ledger Audit', 'Fridays 10:00 UTC'],
                  ].map(([job, schedule]) => (
                    <tr key={job} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-5 py-3 font-serif text-base text-foreground">{job}</td>
                      <td className="px-5 py-3 text-muted-foreground">{schedule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 7. Known Limitations */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              07 · Known Limitations
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              What we <span className="italic text-gold">don&apos;t claim</span>.
            </h2>

            <div className="space-y-4">
              {[
                { n: '1', t: 'Listing prices, not transaction prices.', b: 'All prices reflect developer asking prices. Actual transaction prices may differ by 3-8% depending on negotiation and market conditions.' },
                { n: '2', t: 'Yield estimates, not observed yields.', b: 'Gross rental yields are modeled from AirDNA calibration data and local market benchmarks. They are not based on actual observed rental income for specific properties.' },
                { n: '3', t: 'Spanish coverage is live; European coverage is estimated.', b: 'Only Spain has live scored property data. The other 9 European countries are covered through intelligence, macro data, and estimated market statistics.' },
                { n: '4', t: 'New-build focus.', b: 'The property database covers new-build developments only. Resale properties are not included in scoring or listings.' },
                { n: '5', t: 'Coverage is expanding.', b: 'Town and regional coverage grows as new developer feeds are onboarded. Not all Spanish coastal towns are represented yet.' },
                { n: '6', t: 'Market benchmark variance.', b: 'Postal-code-level market benchmarks have varying sample sizes. Low-sample areas produce MEDIUM or LOW confidence valuations.' },
              ].map(l => (
                <div key={l.n} className="rounded-sm border p-6 flex gap-5" style={cardStyle}>
                  <span className="font-serif text-3xl font-light text-gold tabular">{l.n}</span>
                  <div>
                    <h3 className="font-serif text-lg font-light text-foreground mb-1">{l.t}</h3>
                    <p className="font-light text-sm text-muted-foreground leading-relaxed">{l.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Full System List */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              08 · Full System Inventory
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              50 key <span className="italic text-gold">features</span>.
            </h2>

            <div className="rounded-sm border p-8" style={cardStyle}>
              <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {[
                  ['Avena Score Engine', 'Composite 0-100 investment score for every property'],
                  ['PropertyEval AVM', 'Automated valuation model with confidence levels'],
                  ['Yield Calculator', 'Gross and net rental yield estimates per property'],
                  ['APCI Index', 'Avena Property Confidence Index tracking market sentiment'],
                  ['Macro Regime Engine', 'ECB/Eurostat data driving market cycle classification'],
                  ['Alpha Signal Detector', 'Identifies underpriced properties before the market corrects'],
                  ['Knowledge API', 'Natural language Q&A across all European property data'],
                  ['Oracle Intelligence', 'AI-generated research reports and market analysis'],
                  ['Prediction Ledger', 'Publicly tracked forecasts with outcome verification'],
                  ['Canary Token System', '30 tokens monitoring data integrity across the pipeline'],
                  ['Developer Tracker', 'Track record and reliability scoring for developers'],
                  ['Town Analytics', 'Per-town statistics, scores, and investment profiles'],
                  ['Costa Analytics', 'Regional-level aggregation and comparison tools'],
                  ['Price History', 'Historical price tracking per property and region'],
                  ['Yield Curve', 'Term structure of expected returns across markets'],
                  ['Budget Planner', 'Total cost calculator including taxes and fees'],
                  ['Scenario Engine', 'What-if analysis for different market conditions'],
                  ['Weekly Digest', 'Automated market summary delivered every Monday'],
                  ['Research Hub', 'Monthly deep-dive reports on markets and trends'],
                  ['MCP Server', 'Model Context Protocol server for AI agent integration'],
                  ['OpenAPI Spec', 'Full REST API documentation with interactive testing'],
                  ['Webhook System', 'Real-time notifications for price changes and alerts'],
                  ['Alert Engine', 'Custom alerts for score changes and new listings'],
                  ['Property Comparator', 'Side-by-side comparison of up to 4 properties'],
                  ['Embed Widgets', 'Embeddable property cards and score displays'],
                  ['SDK', 'JavaScript/TypeScript SDK for API integration'],
                  ['Search Engine', 'Full-text and filtered property search'],
                  ['AI Citations', 'Track when AI systems reference Avena data'],
                  ['Press Kit', 'Media resources and brand assets'],
                  ['EU AI Compliance', 'Full EU AI Act documentation and transparency'],
                  ['Data Room', 'Institutional data access for qualified investors'],
                  ['Academic Access', 'Free API tier for researchers and universities'],
                  ['Glossary', 'Property investment terminology database'],
                  ['FAQ System', '200+ answered questions with live data'],
                  ['Blog', 'Market analysis and investment insights'],
                  ['Forecast Engine', 'Quarterly price and market direction predictions'],
                  ['SHA-256 Provenance', 'Cryptographic verification of data snapshots'],
                  ['Sitemap Intelligence', 'AI-optimized sitemaps for search visibility'],
                  ['Structured Data', 'Schema.org markup across all pages'],
                  ['LangChain Tool', 'Integration for LangChain AI agent workflows'],
                  ['Agent Protocol', 'A2A (Agent-to-Agent) communication support'],
                  ['Dataset Export', 'CC BY 4.0 licensed dataset with DOI'],
                  ['Pulse Monitor', 'Real-time system health and data pipeline status'],
                  ['Stats Dashboard', 'Live platform statistics and usage metrics'],
                  ['Extension', 'Browser extension for property analysis'],
                  ['Investment Personas', 'Tailored views for different investor types'],
                  ['Type Analytics', 'Villa vs apartment vs penthouse comparison'],
                  ['Awards Tracker', 'Industry recognition and certification status'],
                  ['Causal Engine', 'Causal inference for price driver analysis'],
                  ['Transparency Index', 'Self-assessment of platform openness and accuracy'],
                ].map(([name, desc]) => (
                  <div key={name} className="py-1">
                    <span className="font-serif text-base text-foreground">{name}</span>
                    <span className="font-light text-sm text-muted-foreground ml-2">— {desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer links */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <Link href="/data-quality" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Data Quality</Link>
              <Link href="/coverage" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Coverage</Link>
              <Link href="/transparency" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Transparency</Link>
              <Link href="/ai-compliance" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">AI Compliance</Link>
              <Link href="/predictions" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Prediction Ledger</Link>
              <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">Back to Terminal</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

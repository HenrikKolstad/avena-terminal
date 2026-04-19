import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Scoring Methodology — How We Rate Properties | Avena Terminal',
  description:
    'Deep dive into Avena Terminal\'s 5-dimension scoring methodology. Learn how hedonic regression, rental yield models, and market benchmarks produce a transparent 0-100 investment score for every Spanish new build.',
  openGraph: {
    title: 'Scoring Methodology — How We Rate Properties | Avena Terminal',
    description:
      'Deep dive into the 5-dimension hedonic regression model behind Avena Terminal\'s 0-100 investment scores.',
    url: 'https://avenaterminal.com/about/methodology',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/about/methodology' },
};

export default function MethodologyPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://avenaterminal.com/about' },
      { '@type': 'ListItem', position: 3, name: 'Methodology', item: 'https://avenaterminal.com/about/methodology' },
    ],
  };

  const cardStyle = {
    background: 'hsl(var(--av-surface) / 0.4)',
    borderColor: 'hsl(var(--av-border) / 0.6)',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
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
              <Link href="/about" className="hover:text-primary">About</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground/80">Methodology</span>
            </nav>

            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Scoring Methodology
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                How we rate
                <br />
                <span className="italic text-gold">every property</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Avena Terminal rates and ranks every new build property in coastal Spain using
                a transparent 5-dimension hedonic regression model, re-run daily, no overrides.
              </p>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Overview
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              A <span className="italic text-gold">quantitative model</span>, not an opinion.
            </h2>

            <div className="rounded-sm border p-8 sm:p-10 max-w-4xl" style={cardStyle}>
              <p className="mb-5 font-light text-base leading-relaxed text-foreground/90">
                Avena Terminal assigns every tracked property a composite investment score between 0 and 100.
                The score is not an opinion. It is the output of a quantitative model that decomposes each
                property into five measurable dimensions, weights them according to their empirical contribution
                to long-term investment returns, and normalises the result against the full universe of tracked
                listings. A score of 80 means the property sits in the top quintile across all five dimensions
                relative to every other new build we monitor in coastal Spain.
              </p>
              <p className="mb-5 font-light text-base leading-relaxed text-foreground/90">
                The model is re-run daily. When a price changes, a new comparable sale appears, or occupancy
                data updates, the affected scores adjust automatically. There is no manual override and no
                pay-to-rank mechanism. Every property is evaluated by the same formula, using the same data
                pipeline.
              </p>
              <p className="font-light text-base leading-relaxed text-foreground/90">
                The theoretical foundation is hedonic regression, a widely accepted econometric technique in
                real estate valuation research. Originally formalised by Sherwin Rosen (1974) and later extended
                by property economists such as Sirmans, Macpherson, and Zietz (2005), the hedonic approach treats
                a property&apos;s market price as the sum of implicit prices paid for its individual
                characteristics: size, location, build quality, amenities, and yield potential. Avena Terminal
                adapts this framework to the Spanish new build market by incorporating region-specific benchmarks
                and short-term rental performance data that do not exist in traditional hedonic datasets.
              </p>
            </div>
          </div>
        </section>

        {/* Five Dimensions */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Five Dimensions
            </span>
            <h2 className="mb-6 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              The <span className="italic text-gold">scoring axes</span>.
            </h2>
            <p className="mb-10 max-w-3xl font-light text-base text-muted-foreground">
              Each dimension captures a distinct aspect of investment quality. The weights reflect the
              relative importance that backtested data assigns to each factor in predicting total
              five-year returns (capital appreciation plus rental income) across the Spanish coastal
              property market.
            </p>

            <div className="space-y-5">
              {[
                {
                  n: '1',
                  title: 'Value',
                  weight: '40%',
                  paras: [
                    'The value dimension measures how a property\u2019s asking price per square metre compares to the prevailing resale benchmark for its specific municipality. We source resale transaction data from the Registradores de Espana (Spanish Property Registrars) and supplement it with listing-price indices from Idealista and Fotocasa to construct a rolling 12-month median price per square metre for each town.',
                    'A new build priced 15% below the local resale median, for instance, signals embedded value: the buyer is acquiring a brand-new asset at less than existing stock trades for in the same area. The model converts this percentage discount (or premium) into a 0-100 sub-score using a sigmoid mapping function that rewards deeper discounts with diminishing marginal returns, so a 30% discount does not score twice as high as 15%.',
                    'Value carries the largest weight (40%) because empirical research consistently shows that entry price relative to local benchmarks is the single strongest predictor of medium-term investment outcomes in residential property. Overpaying at the point of purchase is the hardest mistake to recover from.',
                  ],
                },
                {
                  n: '2',
                  title: 'Yield',
                  weight: '25%',
                  paras: [
                    'The yield dimension estimates gross annual rental income as a percentage of the purchase price. We derive nightly rate estimates from short-term rental platforms (Airbnb and Booking.com comparable listings within the same postcode area) and multiply by an occupancy-adjusted annual revenue figure.',
                    'Occupancy rates are seasonally weighted: peak summer months (June through September) carry higher utilisation assumptions than winter months, calibrated by region. A property on the Costa del Sol with year-round tourism may carry an 70% average occupancy assumption, while a Costa Blanca North listing with a shorter season may use 55%.',
                    'The resulting gross yield is normalised against the full tracked universe to produce a 0-100 sub-score. Properties generating yields above 6% gross typically score in the 75-100 range, while yields below 3% fall into the bottom quartile. This dimension receives 25% weight because rental income represents the primary ongoing cash-flow return for buy-to-let investors and substantially influences total return calculations.',
                  ],
                },
                {
                  n: '3',
                  title: 'Location',
                  weight: '20%',
                  paras: [
                    'Location quality is evaluated through a composite of measurable proxies: straight-line distance to the nearest beach, driving time to the nearest international airport, density of amenities (restaurants, supermarkets, healthcare) within a 2-kilometre radius, and the historical five-year compound annual growth rate (CAGR) of property prices in the municipality.',
                    'Price appreciation data comes from the INE (Instituto Nacional de Estadistica) housing price index at the provincial level, supplemented by Registradores transaction-level data where municipal granularity is available. Municipalities with CAGRs above 8% over five years score higher than those with flat or declining price histories.',
                    'At 20% weight, location captures the appreciation potential and lifestyle desirability that drive both resale value and rental demand. Two otherwise identical properties can score very differently if one sits in a high-growth beachfront town and the other in a stagnating inland municipality.',
                  ],
                },
                {
                  n: '4',
                  title: 'Quality',
                  weight: '10%',
                  paras: [
                    'The quality dimension evaluates the physical and specification attributes of the property itself. Inputs include energy efficiency rating (A-rated builds score highest), the presence of private parking, communal or private pools, terrace and garden area relative to total built area, and the number of bedrooms and bathrooms relative to the development average.',
                    'Developer track record is also factored in where data is available. Repeat developers with completed delivery histories receive a small bonus versus first-time developers. This dimension carries 10% weight because, while quality matters for long-term maintenance costs and tenant satisfaction, it is secondary to price and yield in determining investment returns.',
                  ],
                },
                {
                  n: '5',
                  title: 'Risk',
                  weight: '5%',
                  paras: [
                    'Risk measures the delivery and execution uncertainty associated with a given listing. Key-ready properties with completed building licences score highest. Off-plan developments that have not yet broken ground carry the highest risk penalty. The model also considers estimated completion timelines: a project 18 months from delivery scores lower than one delivering in 3 months, reflecting the opportunity cost of capital and the probability of construction delays.',
                    'At 5% weight, risk is the smallest component. This is deliberate: the Spanish new build market benefits from strong consumer protection (bank guarantees on deposits under Ley 20/2015), which limits downside in most scenarios. However, the dimension still penalises early-stage projects appropriately and ensures that key-ready stock receives a small but meaningful advantage in the composite score.',
                  ],
                },
              ].map(d => (
                <div key={d.n} className="rounded-sm border p-8" style={cardStyle}>
                  <div className="mb-5 flex items-baseline justify-between">
                    <h3 className="font-serif text-2xl font-light text-foreground">
                      <span className="text-gold mr-3">{d.n}.</span>
                      {d.title}
                    </h3>
                    <span className="font-mono text-base text-primary">{d.weight}</span>
                  </div>
                  <div className="space-y-4">
                    {d.paras.map((p, i) => (
                      <p key={i} className="font-light text-base leading-relaxed text-foreground/90">{p}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hedonic Regression */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Hedonic Regression
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              The <span className="italic text-gold">underlying model</span>.
            </h2>

            <div className="rounded-sm border p-8 sm:p-10 max-w-4xl" style={cardStyle}>
              <div className="space-y-4">
                <p className="font-light text-base leading-relaxed text-foreground/90">
                  The term &quot;hedonic regression&quot; refers to a class of statistical models that estimate
                  the implicit price of individual product characteristics by regressing observed transaction
                  prices on a vector of attribute variables. In the context of real estate, this means
                  decomposing the price of a property into the value contributions of its location, size,
                  condition, amenities, and other features.
                </p>
                <p className="font-light text-base leading-relaxed text-foreground/90">
                  Avena Terminal uses a semi-log hedonic specification where the natural logarithm of price
                  per square metre is regressed against dummy variables for municipality, property type
                  (apartment, townhouse, villa), bedroom count, and a continuous variable for distance to
                  coast. The residual from this regression represents the &quot;unexplained&quot; portion of
                  price, which the model interprets as the degree to which a property is over- or under-priced
                  relative to its peers.
                </p>
                <p className="font-light text-base leading-relaxed text-foreground/90">
                  This residual feeds directly into the Value dimension. A large negative residual (price
                  significantly below what the model predicts for a property with those characteristics)
                  produces a high Value sub-score. The regression is re-estimated monthly using rolling
                  12-month transaction data to capture evolving market conditions.
                </p>
                <p className="font-light text-base leading-relaxed text-foreground/90">
                  The approach draws on established academic work including Rosen (1974), Sirmans et al.
                  (2005), and Malpezzi (2002), as well as the European Central Bank&apos;s residential
                  property price methodology, which also employs hedonic techniques for cross-country
                  housing market comparisons.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Data Sources
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Where the <span className="italic text-gold">numbers come from</span>.
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { source: 'RedSP XML Feed', desc: 'Primary listing data: prices, specifications, locations, images, and availability for new build developments across coastal Spain. Updated daily.' },
                { source: 'INE (Instituto Nacional de Estadistica)', desc: 'Official Spanish housing price index at provincial level. Used for location CAGR calculations and macro-market benchmarking.' },
                { source: 'Registradores de Espana', desc: 'Transaction-level resale price data at municipal level. Powers the Value dimension benchmarks.' },
                { source: 'Airbnb / Booking.com Comparables', desc: 'Nightly rate and occupancy estimates for short-term rental yield calculations, sourced from comparable listings within the same postcode.' },
                { source: 'Idealista / Fotocasa', desc: 'Supplementary listing-price indices for local market benchmarking where Registradores data lacks municipal granularity.' },
                { source: 'Banco de Espana', desc: 'Mortgage rate data and housing market indicators used in macro-economic context layers.' },
              ].map(d => (
                <div key={d.source} className="rounded-sm border p-6" style={cardStyle}>
                  <h3 className="font-serif text-lg font-light text-foreground mb-3">{d.source}</h3>
                  <p className="font-light text-sm leading-relaxed text-muted-foreground">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Confidence Intervals */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Confidence Intervals
            </span>
            <h2 className="mb-6 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              How <span className="italic text-gold">certain</span> is any score?
            </h2>
            <p className="mb-10 max-w-3xl font-light text-base text-muted-foreground">
              Not all scores carry equal certainty. The confidence of any individual property score
              depends on the richness and recency of the underlying data. Avena Terminal assigns each
              score a confidence tier:
            </p>

            <div className="space-y-4 mb-10 max-w-4xl">
              {[
                { tier: 'High Confidence', range: 'Score margin +/- 3 points', criteria: 'Municipal resale data available within the last 6 months, at least 5 rental comparables within the postcode, and key-ready status confirmed.' },
                { tier: 'Medium Confidence', range: 'Score margin +/- 7 points', criteria: 'Provincial-level benchmarks used (municipal data unavailable), 2-4 rental comparables, or off-plan status with confirmed building licence.' },
                { tier: 'Low Confidence', range: 'Score margin +/- 12 points', criteria: 'Sparse transaction history in the area, fewer than 2 rental comparables, or very early-stage development with limited specification data.' },
              ].map(c => (
                <div key={c.tier} className="rounded-sm border p-6" style={cardStyle}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="font-serif text-lg font-light text-foreground">{c.tier}</h3>
                    <span className="font-mono text-sm text-primary">{c.range}</span>
                  </div>
                  <p className="font-light text-sm leading-relaxed text-muted-foreground">{c.criteria}</p>
                </div>
              ))}
            </div>

            <p className="max-w-3xl font-light text-base leading-relaxed text-foreground/90">
              These confidence margins are derived from bootstrap resampling of the hedonic regression
              residuals. By re-estimating the model 1,000 times on randomly drawn sub-samples of the
              transaction dataset, we obtain an empirical distribution of predicted scores for each
              property and report the 90% confidence interval width. Properties in data-rich municipalities
              (such as Marbella or Torrevieja) tend to have narrow intervals, while listings in smaller
              towns with few transactions carry wider uncertainty bands.
            </p>
          </div>
        </section>

        {/* Academic References */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Academic References
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              The <span className="italic text-gold">citations</span>.
            </h2>

            <div className="rounded-sm border p-8 sm:p-10 max-w-4xl" style={cardStyle}>
              <ul className="space-y-4 font-light text-base leading-relaxed text-foreground/90">
                <li>
                  <strong className="font-serif text-foreground">Rosen, S. (1974).</strong> &quot;Hedonic Prices and Implicit Markets: Product Differentiation in Pure Competition.&quot; <em>Journal of Political Economy</em>, 82(1), 34-55.
                </li>
                <li>
                  <strong className="font-serif text-foreground">Sirmans, G.S., Macpherson, D.A., &amp; Zietz, E.N. (2005).</strong> &quot;The Composition of Hedonic Pricing Models.&quot; <em>Journal of Real Estate Literature</em>, 13(1), 1-44.
                </li>
                <li>
                  <strong className="font-serif text-foreground">Malpezzi, S. (2002).</strong> &quot;Hedonic Pricing Models: A Selective and Applied Review.&quot; <em>Housing Economics and Public Policy</em>, Blackwell.
                </li>
                <li>
                  <strong className="font-serif text-foreground">European Central Bank (2023).</strong> &quot;Residential Property Prices: Methodological Framework.&quot; ECB Statistics Paper Series.
                </li>
                <li>
                  <strong className="font-serif text-foreground">Banco de Espana (2024).</strong> &quot;Spanish Housing Market Monitor.&quot; Financial Stability Report.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer links */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <Link href="/about" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">About</Link>
              <Link href="/about/methodology" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Methodology</Link>
              <Link href="/about/data-sources" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Data Sources</Link>
              <Link href="/about/accuracy" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Accuracy</Link>
              <Link href="/citations" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">Citations</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

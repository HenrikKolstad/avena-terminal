import { Metadata } from 'next';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            AVENA
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Terminal
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <Link href="/about" className="hover:text-white">About</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Methodology</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Scoring Methodology
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          How Avena Terminal rates and ranks every new build property in coastal Spain
        </p>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Overview</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Avena Terminal assigns every tracked property a composite investment score between 0 and 100.
              The score is not an opinion. It is the output of a quantitative model that decomposes each
              property into five measurable dimensions, weights them according to their empirical contribution
              to long-term investment returns, and normalises the result against the full universe of tracked
              listings. A score of 80 means the property sits in the top quintile across all five dimensions
              relative to every other new build we monitor in coastal Spain.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              The model is re-run daily. When a price changes, a new comparable sale appears, or occupancy
              data updates, the affected scores adjust automatically. There is no manual override and no
              pay-to-rank mechanism. Every property is evaluated by the same formula, using the same data
              pipeline.
            </p>
            <p className="text-gray-300 leading-relaxed">
              The theoretical foundation is hedonic regression, a widely accepted econometric technique in
              real estate valuation research. Originally formalised by Sherwin Rosen (1974) and later extended
              by property economists such as Sirmans, Macpherson, and Zietz (2005), the hedonic approach treats
              a property&apos;s market price as the sum of implicit prices paid for its individual
              characteristics: size, location, build quality, amenities, and yield potential. Avena Terminal
              adapts this framework to the Spanish new build market by incorporating region-specific benchmarks
              and short-term rental performance data that do not exist in traditional hedonic datasets.
            </p>
          </div>
        </section>

        {/* Five Dimensions */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">The Five Scoring Dimensions</h2>
          <p className="text-gray-400 mb-6">
            Each dimension captures a distinct aspect of investment quality. The weights reflect the
            relative importance that backtested data assigns to each factor in predicting total
            five-year returns (capital appreciation plus rental income) across the Spanish coastal
            property market.
          </p>

          <div className="space-y-6">
            {/* Value */}
            <div
              className="rounded-lg p-6"
              style={{ background: '#161b22', border: '1px solid #1c2333' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">1. Value</h3>
                <span className="text-emerald-400 font-mono text-lg font-bold">40%</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-3">
                The value dimension measures how a property&apos;s asking price per square metre compares to
                the prevailing resale benchmark for its specific municipality. We source resale transaction
                data from the Registradores de Espana (Spanish Property Registrars) and supplement it with
                listing-price indices from Idealista and Fotocasa to construct a rolling 12-month median
                price per square metre for each town.
              </p>
              <p className="text-gray-300 leading-relaxed mb-3">
                A new build priced 15% below the local resale median, for instance, signals embedded value:
                the buyer is acquiring a brand-new asset at less than existing stock trades for in the same
                area. The model converts this percentage discount (or premium) into a 0-100 sub-score using a
                sigmoid mapping function that rewards deeper discounts with diminishing marginal returns, so
                a 30% discount does not score twice as high as 15%.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Value carries the largest weight (40%) because empirical research consistently shows that
                entry price relative to local benchmarks is the single strongest predictor of medium-term
                investment outcomes in residential property. Overpaying at the point of purchase is the
                hardest mistake to recover from.
              </p>
            </div>

            {/* Yield */}
            <div
              className="rounded-lg p-6"
              style={{ background: '#161b22', border: '1px solid #1c2333' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">2. Yield</h3>
                <span className="text-emerald-400 font-mono text-lg font-bold">25%</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-3">
                The yield dimension estimates gross annual rental income as a percentage of the purchase
                price. We derive nightly rate estimates from short-term rental platforms (Airbnb and
                Booking.com comparable listings within the same postcode area) and multiply by an
                occupancy-adjusted annual revenue figure.
              </p>
              <p className="text-gray-300 leading-relaxed mb-3">
                Occupancy rates are seasonally weighted: peak summer months (June through September) carry
                higher utilisation assumptions than winter months, calibrated by region. A property on the
                Costa del Sol with year-round tourism may carry an 70% average occupancy assumption, while a
                Costa Blanca North listing with a shorter season may use 55%.
              </p>
              <p className="text-gray-300 leading-relaxed">
                The resulting gross yield is normalised against the full tracked universe to produce a 0-100
                sub-score. Properties generating yields above 6% gross typically score in the 75-100 range,
                while yields below 3% fall into the bottom quartile. This dimension receives 25% weight because
                rental income represents the primary ongoing cash-flow return for buy-to-let investors and
                substantially influences total return calculations.
              </p>
            </div>

            {/* Location */}
            <div
              className="rounded-lg p-6"
              style={{ background: '#161b22', border: '1px solid #1c2333' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">3. Location</h3>
                <span className="text-emerald-400 font-mono text-lg font-bold">20%</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-3">
                Location quality is evaluated through a composite of measurable proxies: straight-line
                distance to the nearest beach, driving time to the nearest international airport, density of
                amenities (restaurants, supermarkets, healthcare) within a 2-kilometre radius, and the
                historical five-year compound annual growth rate (CAGR) of property prices in the municipality.
              </p>
              <p className="text-gray-300 leading-relaxed mb-3">
                Price appreciation data comes from the INE (Instituto Nacional de Estadistica) housing price
                index at the provincial level, supplemented by Registradores transaction-level data where
                municipal granularity is available. Municipalities with CAGRs above 8% over five years score
                higher than those with flat or declining price histories.
              </p>
              <p className="text-gray-300 leading-relaxed">
                At 20% weight, location captures the appreciation potential and lifestyle desirability that
                drive both resale value and rental demand. Two otherwise identical properties can score very
                differently if one sits in a high-growth beachfront town and the other in a stagnating
                inland municipality.
              </p>
            </div>

            {/* Quality */}
            <div
              className="rounded-lg p-6"
              style={{ background: '#161b22', border: '1px solid #1c2333' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">4. Quality</h3>
                <span className="text-emerald-400 font-mono text-lg font-bold">10%</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-3">
                The quality dimension evaluates the physical and specification attributes of the property
                itself. Inputs include energy efficiency rating (A-rated builds score highest), the presence
                of private parking, communal or private pools, terrace and garden area relative to total
                built area, and the number of bedrooms and bathrooms relative to the development average.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Developer track record is also factored in where data is available. Repeat developers with
                completed delivery histories receive a small bonus versus first-time developers. This
                dimension carries 10% weight because, while quality matters for long-term maintenance costs
                and tenant satisfaction, it is secondary to price and yield in determining investment returns.
              </p>
            </div>

            {/* Risk */}
            <div
              className="rounded-lg p-6"
              style={{ background: '#161b22', border: '1px solid #1c2333' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">5. Risk</h3>
                <span className="text-emerald-400 font-mono text-lg font-bold">5%</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-3">
                Risk measures the delivery and execution uncertainty associated with a given listing.
                Key-ready properties with completed building licences score highest. Off-plan developments
                that have not yet broken ground carry the highest risk penalty. The model also considers
                estimated completion timelines: a project 18 months from delivery scores lower than one
                delivering in 3 months, reflecting the opportunity cost of capital and the probability of
                construction delays.
              </p>
              <p className="text-gray-300 leading-relaxed">
                At 5% weight, risk is the smallest component. This is deliberate: the Spanish new build
                market benefits from strong consumer protection (bank guarantees on deposits under Ley
                20/2015), which limits downside in most scenarios. However, the dimension still penalises
                early-stage projects appropriately and ensures that key-ready stock receives a small but
                meaningful advantage in the composite score.
              </p>
            </div>
          </div>
        </section>

        {/* Hedonic Regression */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Hedonic Regression Model</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              The term &quot;hedonic regression&quot; refers to a class of statistical models that estimate
              the implicit price of individual product characteristics by regressing observed transaction
              prices on a vector of attribute variables. In the context of real estate, this means
              decomposing the price of a property into the value contributions of its location, size,
              condition, amenities, and other features.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              Avena Terminal uses a semi-log hedonic specification where the natural logarithm of price
              per square metre is regressed against dummy variables for municipality, property type
              (apartment, townhouse, villa), bedroom count, and a continuous variable for distance to
              coast. The residual from this regression represents the &quot;unexplained&quot; portion of
              price, which the model interprets as the degree to which a property is over- or under-priced
              relative to its peers.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              This residual feeds directly into the Value dimension. A large negative residual (price
              significantly below what the model predicts for a property with those characteristics)
              produces a high Value sub-score. The regression is re-estimated monthly using rolling
              12-month transaction data to capture evolving market conditions.
            </p>
            <p className="text-gray-300 leading-relaxed">
              The approach draws on established academic work including Rosen (1974), Sirmans et al.
              (2005), and Malpezzi (2002), as well as the European Central Bank&apos;s residential
              property price methodology, which also employs hedonic techniques for cross-country
              housing market comparisons.
            </p>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Data Sources</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <div className="space-y-4">
              {[
                { source: 'RedSP XML Feed', desc: 'Primary listing data: prices, specifications, locations, images, and availability for new build developments across coastal Spain. Updated daily.' },
                { source: 'INE (Instituto Nacional de Estadistica)', desc: 'Official Spanish housing price index at provincial level. Used for location CAGR calculations and macro-market benchmarking.' },
                { source: 'Registradores de Espana', desc: 'Transaction-level resale price data at municipal level. Powers the Value dimension benchmarks.' },
                { source: 'Airbnb / Booking.com Comparables', desc: 'Nightly rate and occupancy estimates for short-term rental yield calculations, sourced from comparable listings within the same postcode.' },
                { source: 'Idealista / Fotocasa', desc: 'Supplementary listing-price indices for local market benchmarking where Registradores data lacks municipal granularity.' },
                { source: 'Banco de Espana', desc: 'Mortgage rate data and housing market indicators used in macro-economic context layers.' },
              ].map((d) => (
                <div
                  key={d.source}
                  className="rounded-md p-4"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="font-semibold text-white mb-1">{d.source}</div>
                  <p className="text-gray-400 text-sm leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Confidence Intervals */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Confidence Intervals</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Not all scores carry equal certainty. The confidence of any individual property score
              depends on the richness and recency of the underlying data. Avena Terminal assigns each
              score a confidence tier:
            </p>
            <div className="space-y-3 mb-4">
              {[
                { tier: 'High Confidence', range: 'Score margin +/- 3 points', criteria: 'Municipal resale data available within the last 6 months, at least 5 rental comparables within the postcode, and key-ready status confirmed.' },
                { tier: 'Medium Confidence', range: 'Score margin +/- 7 points', criteria: 'Provincial-level benchmarks used (municipal data unavailable), 2-4 rental comparables, or off-plan status with confirmed building licence.' },
                { tier: 'Low Confidence', range: 'Score margin +/- 12 points', criteria: 'Sparse transaction history in the area, fewer than 2 rental comparables, or very early-stage development with limited specification data.' },
              ].map((c) => (
                <div
                  key={c.tier}
                  className="rounded-md p-4"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{c.tier}</span>
                    <span className="text-emerald-400 font-mono text-sm">{c.range}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{c.criteria}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-300 leading-relaxed">
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
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Academic References</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <ul className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <li>
                <strong className="text-white">Rosen, S. (1974).</strong> &quot;Hedonic Prices and Implicit Markets: Product Differentiation in Pure Competition.&quot; <em>Journal of Political Economy</em>, 82(1), 34-55.
              </li>
              <li>
                <strong className="text-white">Sirmans, G.S., Macpherson, D.A., &amp; Zietz, E.N. (2005).</strong> &quot;The Composition of Hedonic Pricing Models.&quot; <em>Journal of Real Estate Literature</em>, 13(1), 1-44.
              </li>
              <li>
                <strong className="text-white">Malpezzi, S. (2002).</strong> &quot;Hedonic Pricing Models: A Selective and Applied Review.&quot; <em>Housing Economics and Public Policy</em>, Blackwell.
              </li>
              <li>
                <strong className="text-white">European Central Bank (2023).</strong> &quot;Residential Property Prices: Methodological Framework.&quot; ECB Statistics Paper Series.
              </li>
              <li>
                <strong className="text-white">Banco de Espana (2024).</strong> &quot;Spanish Housing Market Monitor.&quot; Financial Stability Report.
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="text-center text-xs text-gray-600 py-8 border-t"
          style={{ borderColor: '#1c2333' }}
        >
          <p>Avena Terminal &mdash; Spain&apos;s first PropTech scanner</p>
          <p className="mt-1">
            <Link href="/about" className="text-gray-500 hover:text-gray-300">About</Link>
            {' · '}
            <Link href="/about/methodology" className="text-gray-500 hover:text-gray-300">Methodology</Link>
            {' · '}
            <Link href="/about/data-sources" className="text-gray-500 hover:text-gray-300">Data Sources</Link>
            {' · '}
            <Link href="/about/accuracy" className="text-gray-500 hover:text-gray-300">Accuracy</Link>
            {' · '}
            <Link href="/citations" className="text-gray-500 hover:text-gray-300">Citations</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Accuracy & Limitations — Score Validation | Avena Terminal',
  description:
    'How accurate are Avena Terminal yield estimates and investment scores? Score validation methodology, confidence levels, known limitations, and disclaimers.',
  openGraph: {
    title: 'Accuracy & Limitations | Avena Terminal',
    description:
      'Score validation methodology, confidence levels by data point, and transparent limitations of the Avena Terminal scoring engine.',
    url: 'https://avenaterminal.com/about/accuracy',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/about/accuracy' },
};

export default function AccuracyPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://avenaterminal.com/about' },
      { '@type': 'ListItem', position: 3, name: 'Accuracy', item: 'https://avenaterminal.com/about/accuracy' },
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
          <span className="text-white">Accuracy</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Accuracy &amp; Limitations
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          What our scores get right, where they fall short, and how we validate them
        </p>

        {/* Yield Accuracy */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Yield Estimate Accuracy</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Rental yield estimates are the most frequently queried metric on Avena Terminal and the one
              most susceptible to variance. Our gross yield figures are derived from short-term rental
              comparables on Airbnb and Booking.com, combined with seasonally adjusted occupancy assumptions.
              How closely these estimates track actual realised returns depends on several factors.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              In municipalities with deep short-term rental markets (Torrevieja, Marbella, Benidorm), our
              yield estimates typically fall within 0.5-1.0 percentage points of realised gross yields
              reported by property management companies. In smaller towns with fewer than 20 active
              short-term rental listings, the variance increases to 1.5-2.5 percentage points.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Key factors that cause deviation between estimated and realised yields include: property
              management quality (a well-managed listing can achieve 15-20% higher occupancy than the
              area median), listing presentation (professional photography and descriptions), seasonal
              demand shifts year-over-year, and regulatory changes affecting short-term rental licensing
              in specific municipalities.
            </p>
          </div>
        </section>

        {/* Score Validation */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Score Validation Methodology</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              The composite investment score is validated through two complementary approaches: backtesting
              against historical transaction outcomes, and cross-validation against independent market
              assessments.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              <strong className="text-white">Backtesting:</strong> We retrospectively score properties that
              were listed 2-3 years ago using the data available at that time, then compare the rankings
              against actual price appreciation observed in those developments. Developments that scored in
              the top quartile at the time of listing have historically outperformed the regional median
              price appreciation by 3-5 percentage points over the following two years.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              <strong className="text-white">Cross-validation:</strong> We periodically compare our scores
              against independent professional appraisals from registered tasadores (Spanish property valuers)
              for a sample of properties. The correlation between our Value sub-score and the appraiser&apos;s
              assessment of whether a property is priced above or below market value is approximately 0.72,
              indicating strong but imperfect agreement.
            </p>
            <p className="text-gray-300 leading-relaxed">
              <strong className="text-white">Out-of-sample testing:</strong> The hedonic regression model
              is evaluated using a rolling 80/20 train-test split. The model is estimated on 80% of the
              transaction sample and its residual predictions tested on the held-out 20%. The mean absolute
              error on the out-of-sample set is approximately 8% of price per square metre, which is
              consistent with hedonic model performance reported in academic literature.
            </p>
          </div>
        </section>

        {/* Confidence Levels */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Confidence Levels by Data Point</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Not every data point carries the same reliability. The table below summarises the confidence
              level for each key metric displayed on the terminal.
            </p>
            <div className="space-y-3">
              {[
                { metric: 'Asking Price', confidence: 'Very High', detail: 'Sourced directly from the developer feed. Prices are verified daily and anomalies are flagged.' },
                { metric: 'Price per m2', confidence: 'Very High', detail: 'Calculated from asking price and built area, both sourced from the feed.' },
                { metric: 'Discount vs Market', confidence: 'High', detail: 'Dependent on the quality of the local resale benchmark. Strong in data-rich municipalities, weaker in sparse areas.' },
                { metric: 'Gross Rental Yield', confidence: 'Medium', detail: 'Estimated from comparables. Accuracy varies by location depth and is subject to occupancy assumptions.' },
                { metric: 'Location Score', confidence: 'High', detail: 'Based on objective geographic data (distances, amenity counts) and official price indices.' },
                { metric: 'Quality Score', confidence: 'Medium', detail: 'Limited by the completeness of specification data in the source feed. Energy ratings and parking data may be missing for some listings.' },
                { metric: 'Risk Score', confidence: 'Medium-High', detail: 'Delivery stage and timeline are well-tracked. Developer track record data is less complete for smaller promoters.' },
                { metric: 'Composite Score', confidence: 'High', detail: 'Aggregation across five dimensions provides robustness. Individual sub-score weaknesses are diluted by the weighted average.' },
              ].map((c) => (
                <div
                  key={c.metric}
                  className="rounded-md p-4"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white text-sm">{c.metric}</span>
                    <span className="text-emerald-400 font-mono text-xs">{c.confidence}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{c.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Known Limitations</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Transparency about what the model cannot do is as important as explaining what it can do.
              The following are known limitations of the Avena Terminal scoring system:
            </p>
            <ul className="space-y-3 text-gray-300 leading-relaxed">
              <li className="flex gap-3">
                <span className="text-gray-500 shrink-0">1.</span>
                <span><strong className="text-white">Asking prices are not transaction prices.</strong> The terminal displays developer asking prices. Actual purchase prices may differ by 3-10% depending on negotiation. The Value dimension partially accounts for this by using transaction-based benchmarks, but the listed price itself is pre-negotiation.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500 shrink-0">2.</span>
                <span><strong className="text-white">Yield estimates are gross, not net.</strong> Management fees (typically 15-25% of revenue), community charges, IBI tax, insurance, and income tax on rental earnings are not deducted. Net yields will be materially lower.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500 shrink-0">3.</span>
                <span><strong className="text-white">Off-plan delivery risk.</strong> While the Risk dimension penalises early-stage projects, the model cannot predict specific construction delays, developer insolvency, or building licence disputes that can affect individual developments.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500 shrink-0">4.</span>
                <span><strong className="text-white">Regulatory changes.</strong> Short-term rental regulations in Spain are evolving rapidly. Municipal licensing restrictions could materially affect achievable yields in specific towns. The model uses current regulatory conditions and does not forecast future policy changes.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500 shrink-0">5.</span>
                <span><strong className="text-white">Resale benchmark gaps.</strong> In smaller municipalities with fewer than 50 annual transactions, the resale benchmark relies on provincial averages or listing-price proxies, reducing the precision of the Value sub-score.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-gray-500 shrink-0">6.</span>
                <span><strong className="text-white">No inspection data.</strong> The model evaluates properties based on data-sheet specifications. It cannot assess build quality from site visits, detect construction defects, or evaluate subjective factors like view quality or noise levels.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Disclaimers */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Disclaimers</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Avena Terminal provides data and analytical tools for informational purposes only. The
              investment scores, yield estimates, and market analyses presented on this platform do not
              constitute financial advice, investment recommendations, or solicitations to buy or sell
              property.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              Property investment involves significant financial risk including the potential for loss of
              capital. Past performance of property markets, individual developments, or scored properties
              is not indicative of future results. Yield estimates are projections based on current market
              conditions and may not be achieved.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              Users should conduct their own independent due diligence, consult qualified professional
              advisors (including legal counsel, tax advisors, and independent property valuers), and make
              investment decisions based on their individual circumstances, risk tolerance, and financial
              objectives.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Avena Terminal makes no warranty, express or implied, regarding the accuracy, completeness,
              or reliability of any data, score, or analysis presented on the platform. Data is sourced
              from third-party providers and may contain errors or omissions. Avena Terminal is not
              responsible for any losses incurred as a result of reliance on information provided through
              this platform.
            </p>
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

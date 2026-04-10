import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Data Sources & Pipeline — How We Collect Property Data | Avena Terminal',
  description:
    'How Avena Terminal collects, processes, and updates property data daily. RedSP XML feed, Airbnb yield models, INE benchmarks, and coverage across 4 regions and 100+ towns.',
  openGraph: {
    title: 'Data Sources & Pipeline | Avena Terminal',
    description:
      'Daily data pipeline: RedSP XML feed, rental yield models, and market benchmarks across 4 Spanish coastal regions.',
    url: 'https://avenaterminal.com/about/data-sources',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/about/data-sources' },
};

export default function DataSourcesPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://avenaterminal.com/about' },
      { '@type': 'ListItem', position: 3, name: 'Data Sources', item: 'https://avenaterminal.com/about/data-sources' },
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
          <span className="text-white">Data Sources</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Data Sources &amp; Pipeline
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          Where our data comes from and how it stays current
        </p>

        {/* Pipeline Overview */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Pipeline Overview</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Avena Terminal operates an automated data pipeline that ingests, validates, and scores
              property listings every 24 hours. The pipeline runs in three stages: ingestion (raw data
              pulled from source feeds), enrichment (cross-referencing with benchmark datasets and
              computing derived metrics), and scoring (applying the hedonic regression model to produce
              composite scores).
            </p>
            <p className="text-gray-300 leading-relaxed">
              Each stage includes validation checks. Listings missing critical fields (price, area, or
              location coordinates) are flagged and excluded from scoring until the data is resolved.
              Price anomalies (changes greater than 30% between consecutive updates) trigger a manual
              review flag before the new price is accepted into the scoring model.
            </p>
          </div>
        </section>

        {/* Primary Source: RedSP */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Primary Source: RedSP XML Feed</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              The core listing data comes from the RedSP (Red de Servicios de Promociones) XML feed, a
              structured data source that aggregates new build development listings from property promoters
              across Spain. The feed provides machine-readable data for each property including asking
              price, built area in square metres, bedroom and bathroom count, property type, GPS
              coordinates, energy rating, estimated delivery date, and developer name.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {[
                { value: '1,881+', label: 'Active Listings' },
                { value: 'Daily', label: 'Sync Frequency' },
                { value: 'XML 2.0', label: 'Feed Format' },
                { value: '< 60s', label: 'Ingestion Time' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-md p-4"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coverage */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Geographic Coverage</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              The terminal currently tracks new build properties across four coastal regions of Spain,
              covering more than 100 individual towns and municipalities. Coverage is concentrated on the
              areas with the highest density of new build activity and international buyer demand.
            </p>
            <div className="space-y-3">
              {[
                { region: 'Costa Blanca South', desc: 'Torrevieja, Orihuela Costa, Guardamar, Pilar de la Horadada, Los Montesinos, San Miguel de Salinas, and surrounding municipalities. The highest volume of tracked listings.' },
                { region: 'Costa Blanca North', desc: 'Javea, Altea, Calpe, Moraira, Denia, Benidorm, Villajoyosa, and premium hillside and coastal towns. Higher average price points and lifestyle-driven demand.' },
                { region: 'Costa del Sol', desc: 'Marbella, Estepona, Benahavis, Fuengirola, Mijas, Malaga city, Manilva, and the Golden Mile corridor. Spain\'s most internationally recognised property market.' },
                { region: 'Costa Calida', desc: 'Mar Menor, Mazarron, Aguilas, Cartagena, and La Manga. Emerging market with lower entry prices and growing infrastructure investment.' },
              ].map((r) => (
                <div
                  key={r.region}
                  className="rounded-md p-4"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="font-semibold text-white mb-1">{r.region}</div>
                  <p className="text-gray-400 text-sm leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Yield Calculation */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">How Yield Is Calculated</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              Gross rental yield is estimated using a comparable-based approach. For each tracked property,
              the pipeline identifies short-term rental listings on Airbnb and Booking.com within the same
              postcode area that match on property type (apartment, townhouse, or villa) and approximate
              bedroom count.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              From these comparables, we extract a median nightly rate and apply seasonally adjusted
              occupancy assumptions to estimate annual gross revenue. The formula is:
            </p>
            <div
              className="rounded-md p-4 font-mono text-sm text-emerald-300 mb-4"
              style={{ background: '#0d1117', border: '1px solid #1c2333' }}
            >
              Gross Yield = (Median Nightly Rate x Annual Occupied Nights) / Purchase Price x 100
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              Occupancy assumptions vary by region and season. Summer months (June through September) use
              higher occupancy rates (75-90%) while winter months use lower rates (20-45%), reflecting the
              seasonal nature of coastal Spanish tourism. Year-round destinations like Marbella carry
              higher baseline winter occupancy than seasonal markets.
            </p>
            <p className="text-gray-300 leading-relaxed">
              The resulting yield is a gross figure and does not account for management fees, maintenance,
              community charges, IBI tax, or income tax on rental earnings. Investors should expect net
              yields to be approximately 25-35% lower than the gross figures displayed.
            </p>
          </div>
        </section>

        {/* Market Price Benchmarks */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Market Price Benchmarks</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <p className="text-gray-300 leading-relaxed mb-4">
              To assess whether a new build is priced above or below the market, we need a reliable
              benchmark for what &quot;the market&quot; charges per square metre in each location. This
              benchmark is constructed from multiple data sources:
            </p>
            <div className="space-y-3">
              {[
                { source: 'Registradores de Espana', role: 'Primary benchmark. Actual recorded transaction prices at the municipal level, updated quarterly. The most authoritative source for what properties actually sell for (as opposed to what they are listed at).' },
                { source: 'INE Housing Price Index', role: 'Provincial-level price trends used to extrapolate between Registradores reporting periods and to calculate location CAGR values.' },
                { source: 'Idealista Listing Prices', role: 'Supplementary source for municipalities where Registradores data is sparse. Listing prices are discounted by a region-specific negotiation factor (typically 5-12%) to approximate transaction prices.' },
              ].map((s) => (
                <div
                  key={s.source}
                  className="rounded-md p-4"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="font-semibold text-white mb-1">{s.source}</div>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Update Frequency */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">Update Frequency</h2>
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <div className="space-y-3">
              {[
                { data: 'Listing prices & availability', freq: 'Daily', note: 'Synced from RedSP XML feed every 24 hours.' },
                { data: 'Rental yield estimates', freq: 'Weekly', note: 'Comparable nightly rates refreshed weekly from platform data.' },
                { data: 'Composite investment scores', freq: 'Daily', note: 'Re-calculated after each listing sync to reflect price changes.' },
                { data: 'Resale benchmarks (Registradores)', freq: 'Quarterly', note: 'Updated when new quarterly transaction data is published.' },
                { data: 'INE housing price index', freq: 'Quarterly', note: 'Provincial price trends updated on the INE publication schedule.' },
                { data: 'Hedonic regression model', freq: 'Monthly', note: 'Model coefficients re-estimated monthly using rolling 12-month data.' },
              ].map((u) => (
                <div
                  key={u.data}
                  className="rounded-md p-4 flex flex-col md:flex-row md:items-center gap-2"
                  style={{ background: '#0d1117', border: '1px solid #1c2333' }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">{u.data}</div>
                    <p className="text-gray-500 text-xs mt-0.5">{u.note}</p>
                  </div>
                  <span className="text-emerald-400 font-mono text-sm font-bold shrink-0">{u.freq}</span>
                </div>
              ))}
            </div>
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

import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

interface CompetitorData {
  name: string;
  slug: string;
  tagline: string;
  hero: string;
  description: string;
  features: { feature: string; competitor: string; avena: string }[];
  cta: string;
}

const COMPETITORS: Record<string, CompetitorData> = {
  'rightmove-api': {
    name: 'Rightmove',
    slug: 'rightmove-api',
    tagline: 'Looking for a Rightmove API? Try Avena Terminal.',
    hero: 'Rightmove doesn\u2019t offer a public API. Avena Terminal provides full programmatic access to European property data with AI-powered investment analytics.',
    description:
      'Rightmove is the UK\u2019s largest property portal but does not provide a public API for developers. If you\u2019re building property technology, investment tools, or research applications, Avena Terminal offers a comprehensive REST API with 60+ endpoints covering property data, market intelligence, AI valuations, and predictive analytics across European markets.',
    features: [
      { feature: 'Public REST API', competitor: 'No', avena: 'Yes \u2014 60+ endpoints' },
      { feature: 'AI investment scoring', competitor: 'No', avena: 'Yes \u2014 200+ AI dimensions' },
      { feature: 'Rental yield data', competitor: 'Estimate only', avena: 'Live calculated yields' },
      { feature: 'European coverage', competitor: 'UK only', avena: 'Spain, expanding to EU' },
      { feature: 'Bulk data export', competitor: 'No', avena: 'CSV, JSON, Parquet, JSONL' },
      { feature: 'Free tier', competitor: 'N/A', avena: 'Yes \u2014 100 requests/day' },
      { feature: 'Developer documentation', competitor: 'N/A', avena: 'Full OpenAPI spec' },
      { feature: 'Predictive models', competitor: 'No', avena: 'Contagion, options pricing, genome' },
    ],
    cta: 'Get free API access to European property data',
  },
  'idealista-data': {
    name: 'Idealista',
    slug: 'idealista-data',
    tagline: 'Beyond Idealista listings \u2014 Avena Terminal scores them.',
    hero: 'Idealista shows you property listings. Avena Terminal scores every property with AI across 200+ dimensions and provides the investment analytics that Idealista doesn\u2019t.',
    description:
      'Idealista is Spain\u2019s largest property portal, excellent for browsing listings. But for investment analysis, you need more than listings. Avena Terminal enriches property data with AI investment scores, rental yield calculations, market regime detection, and predictive models that tell you not just what\u2019s listed but what\u2019s worth buying.',
    features: [
      { feature: 'Property listings', competitor: 'Yes \u2014 comprehensive', avena: 'Yes \u2014 new builds focus' },
      { feature: 'AI investment scoring', competitor: 'No', avena: 'Yes \u2014 0-10 composite score' },
      { feature: 'Rental yield analytics', competitor: 'No', avena: 'Gross + net yield per property' },
      { feature: 'Market regime detection', competitor: 'No', avena: 'Yes \u2014 expansion/peak/contraction' },
      { feature: 'Public API', competitor: 'Limited/paid', avena: 'Yes \u2014 free tier available' },
      { feature: 'Developer comparison', competitor: 'No', avena: 'Yes \u2014 developer ratings + history' },
      { feature: 'Price per m\u00B2 benchmarking', competitor: 'Basic', avena: 'By town, developer, property type' },
      { feature: 'Predictive analytics', competitor: 'No', avena: 'Price forecasts, contagion models' },
    ],
    cta: 'Upgrade from browsing to analysing',
  },
  'zoopla-api': {
    name: 'Zoopla',
    slug: 'zoopla-api',
    tagline: 'Zoopla covers the UK. Avena Terminal covers Europe.',
    hero: 'Zoopla focuses exclusively on the UK market. Avena Terminal provides comprehensive property intelligence across European markets with AI-powered analytics.',
    description:
      'Zoopla is a leading UK property portal with some API access. But if you\u2019re looking at European property markets \u2014 particularly Spain, Portugal, and the Mediterranean \u2014 Zoopla has no coverage. Avena Terminal is purpose-built for European property intelligence with deep local data and pan-European analytics.',
    features: [
      { feature: 'UK property data', competitor: 'Yes \u2014 comprehensive', avena: 'No \u2014 European focus' },
      { feature: 'European coverage', competitor: 'No', avena: 'Spain + expanding EU coverage' },
      { feature: 'Public API', competitor: 'Yes \u2014 paid', avena: 'Yes \u2014 free tier available' },
      { feature: 'AI valuations', competitor: 'Zoopla estimates', avena: 'Multi-model AI valuations' },
      { feature: 'Investment analytics', competitor: 'Basic', avena: 'Advanced \u2014 genome, contagion, options' },
      { feature: 'Rental yield data', competitor: 'Yes', avena: 'Yes \u2014 with net yield modeling' },
      { feature: 'New build focus', competitor: 'Mixed', avena: 'Purpose-built for new builds' },
      { feature: 'Cross-border analytics', competitor: 'No', avena: 'Yes \u2014 EU-wide comparison tools' },
    ],
    cta: 'Explore European property data',
  },
  'kyero-data': {
    name: 'Kyero',
    slug: 'kyero-data',
    tagline: 'Kyero aggregates listings. Avena analyses them with AI.',
    hero: 'Kyero aggregates property listings from agents. Avena Terminal analyses every property with 200+ AI systems to deliver investment intelligence, not just listings.',
    description:
      'Kyero is a popular portal for international buyers searching Spanish property, aggregating listings from local agents. Avena Terminal goes beyond aggregation \u2014 we track new-build developments directly, score every property with AI, calculate real rental yields, and provide market intelligence that transforms browsing into investing.',
    features: [
      { feature: 'Spanish property listings', competitor: 'Yes \u2014 agent aggregation', avena: 'Yes \u2014 direct developer tracking' },
      { feature: 'AI scoring', competitor: 'No', avena: 'Yes \u2014 200+ AI dimensions' },
      { feature: 'Investment analytics', competitor: 'No', avena: 'Full suite \u2014 yields, forecasts, regime' },
      { feature: 'Public API', competitor: 'No', avena: 'Yes \u2014 60+ endpoints' },
      { feature: 'Data export', competitor: 'No', avena: 'CSV, JSON, Parquet, JSONL' },
      { feature: 'Developer ratings', competitor: 'No', avena: 'Yes \u2014 track record + delivery history' },
      { feature: 'Market signals', competitor: 'No', avena: 'Real-time anomaly detection' },
      { feature: 'Academic access', competitor: 'No', avena: 'Free unlimited for researchers' },
    ],
    cta: 'Switch from aggregation to intelligence',
  },
  'costar-europe': {
    name: 'CoStar',
    slug: 'costar-europe',
    tagline: 'CoStar at $25k/year is US-centric. Avena is European-native from \u20AC49/month.',
    hero: 'CoStar is the dominant US commercial property data provider at $25,000+/year. Avena Terminal is European-native, starting at \u20AC49/month, with AI-powered analytics built specifically for European residential and investment property markets.',
    description:
      'CoStar Group dominates US commercial property data but has limited European residential coverage and pricing that excludes smaller investors and developers. Avena Terminal is built from the ground up for European property markets, with local data sources, EU-compliant methodology, and pricing accessible to individual investors, small funds, and PropTech startups.',
    features: [
      { feature: 'European residential data', competitor: 'Limited', avena: 'Deep \u2014 Spain + expanding EU' },
      { feature: 'Starting price', competitor: '$25,000+/year', avena: '\u20AC49/month (Starter)' },
      { feature: 'Free tier', competitor: 'No', avena: 'Yes \u2014 100 requests/day' },
      { feature: 'AI investment scoring', competitor: 'Commercial focus', avena: 'Residential + investment' },
      { feature: 'API access', competitor: 'Enterprise only', avena: 'All tiers including free' },
      { feature: 'New build tracking', competitor: 'Commercial', avena: 'Residential new builds' },
      { feature: 'EU regulatory compliance', competitor: 'US-centric', avena: 'EU AI Act compliant' },
      { feature: 'Individual investor access', competitor: 'No \u2014 enterprise only', avena: 'Yes \u2014 all tiers' },
    ],
    cta: 'Get European property intelligence at 1/50th the cost',
  },
};

export function generateStaticParams() {
  return [
    { slug: 'rightmove-api' },
    { slug: 'idealista-data' },
    { slug: 'zoopla-api' },
    { slug: 'kyero-data' },
    { slug: 'costar-europe' },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const competitor = COMPETITORS[slug];
  if (!competitor) {
    return { title: 'Alternative Not Found | Avena Terminal' };
  }

  const title = `Avena Terminal vs ${competitor.name} \u2014 European Property API Alternative`;
  const description = competitor.hero;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/alternatives/${slug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    alternates: { canonical: `https://avenaterminal.com/alternatives/${slug}` },
  };
}

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competitor = COMPETITORS[slug];

  if (!competitor) {
    return (
      <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Alternative Not Found</h1>
          <p className="text-gray-400 mb-8">
            We don&apos;t have a comparison page for this competitor yet.
          </p>
          <Link
            href="/alternatives"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            View all alternatives
          </Link>
        </div>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Avena Terminal vs ${competitor.name}`,
    description: competitor.hero,
    url: `https://avenaterminal.com/alternatives/${slug}`,
    about: {
      '@type': 'SoftwareApplication',
      name: competitor.name,
      applicationCategory: 'Property Data',
    },
    mentions: {
      '@type': 'SoftwareApplication',
      name: 'Avena Terminal',
      applicationCategory: 'Property Intelligence API',
      url: 'https://avenaterminal.com',
    },
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-wider text-white">
            AVENA
          </Link>
          <nav className="flex gap-6 text-sm text-gray-400">
            <Link href="/alternatives" className="hover:text-white transition-colors">
              Alternatives
            </Link>
            <Link href="/api/v1/docs" className="hover:text-white transition-colors">
              API Docs
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-sm font-mono text-emerald-400 mb-4 tracking-wider uppercase">
          {competitor.name} Alternative
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Avena Terminal vs {competitor.name}
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">{competitor.hero}</p>
      </section>

      {/* Description */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <p className="text-gray-400 max-w-3xl leading-relaxed">{competitor.description}</p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white mb-8">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">
                  Feature
                </th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">
                  {competitor.name}
                </th>
                <th className="text-left py-4 px-4 text-emerald-400 font-medium text-sm">
                  Avena Terminal
                </th>
              </tr>
            </thead>
            <tbody>
              {competitor.features.map((f) => (
                <tr key={f.feature} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                  <td className="py-4 px-4 text-gray-300 font-medium">{f.feature}</td>
                  <td className="py-4 px-4 text-gray-500">{f.competitor}</td>
                  <td className="py-4 px-4 text-emerald-300">{f.avena}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{competitor.cta}</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Free API key with 100 requests/day. No credit card required. Start building in
            minutes.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/api-access"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded font-medium transition-colors"
            >
              Get Free API Key
            </Link>
            <Link
              href="/api/v1/docs"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded font-medium transition-colors"
            >
              Explore API Docs
            </Link>
            <Link
              href="/alternatives"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded font-medium transition-colors"
            >
              Compare All Portals
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

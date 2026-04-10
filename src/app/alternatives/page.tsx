import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Best Spanish Property Portals Compared 2026 | Avena Terminal',
  description:
    'Compare the top Spanish property portals side by side. See how Avena Terminal, Idealista, Rightmove, Kyero, Fotocasa, and more stack up on investment features, rental yield data, and pricing analysis.',
  openGraph: {
    title: 'Best Spanish Property Portals Compared 2026 | Avena Terminal',
    description:
      'Compare the top Spanish property portals side by side for investment analysis.',
    url: 'https://avenaterminal.com/alternatives',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/alternatives' },
};

interface PortalData {
  slug: string;
  name: string;
  tagline: string;
  features: Record<string, boolean>;
}

const FEATURE_KEYS = [
  'Investment scoring',
  'Live rental yield data',
  'Price per m2 analysis',
  'Discount vs market',
  'AI investment memos',
  'Property comparison tools',
  'Free tier available',
];

const PORTALS: PortalData[] = [
  {
    slug: 'avena',
    name: 'Avena Terminal',
    tagline: 'Investment analysis platform for Spanish new builds',
    features: {
      'Investment scoring': true,
      'Live rental yield data': true,
      'Price per m2 analysis': true,
      'Discount vs market': true,
      'AI investment memos': true,
      'Property comparison tools': true,
      'Free tier available': true,
    },
  },
  {
    slug: 'idealista',
    name: 'Idealista',
    tagline: "Spain's largest property portal",
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': true,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
  {
    slug: 'rightmove',
    name: 'Rightmove',
    tagline: "UK's leading property portal with overseas listings",
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': false,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
  {
    slug: 'kyero',
    name: 'Kyero',
    tagline: 'International portal for Spanish property',
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': false,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
  {
    slug: 'a-place-in-the-sun',
    name: 'A Place in the Sun',
    tagline: 'TV-backed overseas property portal',
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': false,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
  {
    slug: 'fotocasa',
    name: 'Fotocasa',
    tagline: "Spain's second-largest property portal",
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': true,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
  {
    slug: 'thinkspain',
    name: 'ThinkSpain',
    tagline: 'Expat-focused Spanish property and lifestyle portal',
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': false,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
  {
    slug: 'propertyguides',
    name: 'PropertyGuides',
    tagline: 'Overseas buying guide and property portal',
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': false,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
  {
    slug: 'spanishpropertychoice',
    name: 'Spanish Property Choice',
    tagline: 'Curated Spanish property from local agents',
    features: {
      'Investment scoring': false,
      'Live rental yield data': false,
      'Price per m2 analysis': false,
      'Discount vs market': false,
      'AI investment memos': false,
      'Property comparison tools': false,
      'Free tier available': true,
    },
  },
];

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-emerald-400 mx-auto"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="w-5 h-5 text-gray-600 mx-auto"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function AlternativesPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Alternatives',
        item: 'https://avenaterminal.com/alternatives',
      },
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{' '}
          <span className="mx-1">/</span>
          <span className="text-white">Alternatives</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Best Spanish Property Portals Compared 2026
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          A side-by-side look at the leading platforms for finding and analysing Spanish property.
          Avena Terminal is the investment analysis leader.
        </p>

        {/* Comparison Table */}
        <section className="mb-12 overflow-x-auto">
          <div
            className="rounded-lg overflow-hidden min-w-[800px]"
            style={{ border: '1px solid #1c2333' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#161b22' }}>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium sticky left-0" style={{ background: '#161b22' }}>
                    Feature
                  </th>
                  {PORTALS.map((portal) => (
                    <th
                      key={portal.slug}
                      className={`text-center px-3 py-3 font-medium whitespace-nowrap ${
                        portal.slug === 'avena'
                          ? 'text-emerald-400 font-semibold'
                          : 'text-gray-400'
                      }`}
                    >
                      {portal.slug === 'avena' ? (
                        portal.name
                      ) : (
                        <Link
                          href={`/vs/${portal.slug}`}
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {portal.name}
                        </Link>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_KEYS.map((feature, i) => (
                  <tr
                    key={feature}
                    style={{
                      background: i % 2 === 0 ? '#0d1117' : '#161b22',
                      borderTop: '1px solid #1c2333',
                    }}
                  >
                    <td
                      className="px-4 py-3 text-gray-300 font-medium sticky left-0"
                      style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}
                    >
                      {feature}
                    </td>
                    {PORTALS.map((portal) => (
                      <td key={portal.slug} className="px-3 py-3 text-center">
                        {portal.features[feature] ? <CheckIcon /> : <CrossIcon />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Portal Cards with Links */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-emerald-400 mb-4">
            Detailed Comparisons
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PORTALS.filter((p) => p.slug !== 'avena').map((portal) => {
              const featureCount = FEATURE_KEYS.filter(
                (f) => portal.features[f]
              ).length;

              return (
                <Link
                  key={portal.slug}
                  href={`/vs/${portal.slug}`}
                  className="rounded-lg p-5 block hover:ring-1 hover:ring-emerald-500/40 transition-all"
                  style={{ background: '#161b22', border: '1px solid #1c2333' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{portal.name}</span>
                    <span className="text-xs text-gray-500 font-mono">
                      {featureCount}/{FEATURE_KEYS.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{portal.tagline}</p>
                  <span className="text-emerald-400 text-sm font-medium">
                    Avena vs {portal.name} &rarr;
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Summary */}
        <section className="mb-12">
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <h2 className="text-xl font-semibold text-white mb-3">
              Why Avena Terminal leads for investment analysis
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Most Spanish property portals are listing marketplaces designed to help you browse
              properties. Avena Terminal is fundamentally different: it is an investment analysis
              platform that scores every tracked new build on a transparent 0-100 scale. The scoring
              engine evaluates value, rental yield, location quality, build specification, and risk
              — updated daily.
            </p>
            <p className="text-gray-300 leading-relaxed">
              While portals like Idealista and Fotocasa offer basic price statistics, none provide
              automated investment scoring, discount-to-market calculations, or AI-generated
              property memos. Avena Terminal gives individual investors the same data-driven
              intelligence that was previously available only to institutional buyers.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12 text-center">
          <div
            className="rounded-lg p-8"
            style={{ background: '#161b22', border: '1px solid #1c2333' }}
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              Start analysing Spanish new builds today
            </h2>
            <p className="text-gray-400 mb-6">
              1,800+ properties scored across Costa Blanca, Costa del Sol, and Costa
              C&aacute;lida. Free to use, updated daily.
            </p>
            <Link
              href="/"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Try Avena Terminal free &rarr;
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="text-center text-xs text-gray-600 py-8 border-t"
        style={{ borderColor: '#1c2333' }}
      >
        <p>Avena Terminal &mdash; Spain&apos;s first PropTech scanner</p>
        <p className="mt-1">
          <Link href="/about" className="text-gray-500 hover:text-gray-300">
            About
          </Link>
          {' · '}
          <Link href="/alternatives" className="text-gray-500 hover:text-gray-300">
            Alternatives
          </Link>
          {' · '}
          <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">
            avenaterminal.com
          </a>
        </p>
      </footer>
    </div>
  );
}

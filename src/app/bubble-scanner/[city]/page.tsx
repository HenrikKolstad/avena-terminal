import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

/* ────────────────────────────────────────────────────────── */
/*  City data — identical to main /bubble-scanner page       */
/* ────────────────────────────────────────────────────────── */

interface City {
  name: string;
  slug: string;
  country: string;
  flag: string;
  pricePerM2: number;
  yoyChange: number;
  bubbleScore: number;
  affordability: number;
  priceToIncome: number;
  status: 'bubble' | 'overheating' | 'warming' | 'healthy';
  lat: number;
  lng: number;
}

const CITIES: City[] = [
  { name: 'Munich', slug: 'munich', country: 'Germany', flag: '🇩🇪', pricePerM2: 9800, yoyChange: 4.2, bubbleScore: 89, affordability: 22, priceToIncome: 16.2, status: 'bubble', lat: 48.1351, lng: 11.582 },
  { name: 'Frankfurt', slug: 'frankfurt', country: 'Germany', flag: '🇩🇪', pricePerM2: 7200, yoyChange: 3.1, bubbleScore: 78, affordability: 31, priceToIncome: 12.8, status: 'overheating', lat: 50.1109, lng: 8.6821 },
  { name: 'Amsterdam', slug: 'amsterdam', country: 'Netherlands', flag: '🇳🇱', pricePerM2: 7500, yoyChange: 5.8, bubbleScore: 85, affordability: 24, priceToIncome: 14.9, status: 'bubble', lat: 52.3676, lng: 4.9041 },
  { name: 'Paris', slug: 'paris', country: 'France', flag: '🇫🇷', pricePerM2: 11200, yoyChange: 1.2, bubbleScore: 82, affordability: 19, priceToIncome: 18.5, status: 'bubble', lat: 48.8566, lng: 2.3522 },
  { name: 'Luxembourg', slug: 'luxembourg', country: 'Luxembourg', flag: '🇱🇺', pricePerM2: 12500, yoyChange: -1.4, bubbleScore: 91, affordability: 15, priceToIncome: 19.8, status: 'bubble', lat: 49.6117, lng: 6.1319 },
  { name: 'Zurich', slug: 'zurich', country: 'Switzerland', flag: '🇨🇭', pricePerM2: 14200, yoyChange: 2.8, bubbleScore: 88, affordability: 28, priceToIncome: 11.3, status: 'bubble', lat: 47.3769, lng: 8.5417 },
  { name: 'Vienna', slug: 'vienna', country: 'Austria', flag: '🇦🇹', pricePerM2: 6100, yoyChange: -2.1, bubbleScore: 72, affordability: 35, priceToIncome: 11.5, status: 'overheating', lat: 48.2082, lng: 16.3738 },
  { name: 'Stockholm', slug: 'stockholm', country: 'Sweden', flag: '🇸🇪', pricePerM2: 7800, yoyChange: -3.5, bubbleScore: 68, affordability: 33, priceToIncome: 12.1, status: 'overheating', lat: 59.3293, lng: 18.0686 },
  { name: 'Copenhagen', slug: 'copenhagen', country: 'Denmark', flag: '🇩🇰', pricePerM2: 6900, yoyChange: 2.4, bubbleScore: 65, affordability: 37, priceToIncome: 10.8, status: 'overheating', lat: 55.6761, lng: 12.5683 },
  { name: 'Milan', slug: 'milan', country: 'Italy', flag: '🇮🇹', pricePerM2: 5200, yoyChange: 6.3, bubbleScore: 61, affordability: 40, priceToIncome: 10.2, status: 'warming', lat: 45.4642, lng: 9.1900 },
  { name: 'Rome', slug: 'rome', country: 'Italy', flag: '🇮🇹', pricePerM2: 4100, yoyChange: 2.1, bubbleScore: 42, affordability: 48, priceToIncome: 8.9, status: 'healthy', lat: 41.9028, lng: 12.4964 },
  { name: 'Barcelona', slug: 'barcelona', country: 'Spain', flag: '🇪🇸', pricePerM2: 4800, yoyChange: 7.9, bubbleScore: 58, affordability: 38, priceToIncome: 10.5, status: 'warming', lat: 41.3874, lng: 2.1686 },
  { name: 'Madrid', slug: 'madrid', country: 'Spain', flag: '🇪🇸', pricePerM2: 4200, yoyChange: 6.1, bubbleScore: 52, affordability: 42, priceToIncome: 9.3, status: 'warming', lat: 40.4168, lng: -3.7038 },
  { name: 'Lisbon', slug: 'lisbon', country: 'Portugal', flag: '🇵🇹', pricePerM2: 5100, yoyChange: 5.4, bubbleScore: 63, affordability: 30, priceToIncome: 13.1, status: 'overheating', lat: 38.7223, lng: -9.1393 },
  { name: 'Porto', slug: 'porto', country: 'Portugal', flag: '🇵🇹', pricePerM2: 3800, yoyChange: 4.8, bubbleScore: 55, affordability: 35, priceToIncome: 11.2, status: 'warming', lat: 41.1579, lng: -8.6291 },
  { name: 'Dublin', slug: 'dublin', country: 'Ireland', flag: '🇮🇪', pricePerM2: 5900, yoyChange: 3.7, bubbleScore: 71, affordability: 29, priceToIncome: 12.4, status: 'overheating', lat: 53.3498, lng: -6.2603 },
  { name: 'Brussels', slug: 'brussels', country: 'Belgium', flag: '🇧🇪', pricePerM2: 3900, yoyChange: 1.8, bubbleScore: 44, affordability: 52, priceToIncome: 7.6, status: 'healthy', lat: 50.8503, lng: 4.3517 },
  { name: 'Helsinki', slug: 'helsinki', country: 'Finland', flag: '🇫🇮', pricePerM2: 5400, yoyChange: -4.2, bubbleScore: 48, affordability: 41, priceToIncome: 9.1, status: 'healthy', lat: 60.1699, lng: 24.9384 },
  { name: 'Warsaw', slug: 'warsaw', country: 'Poland', flag: '🇵🇱', pricePerM2: 3200, yoyChange: 9.1, bubbleScore: 56, affordability: 44, priceToIncome: 8.8, status: 'warming', lat: 52.2297, lng: 21.0122 },
  { name: 'Prague', slug: 'prague', country: 'Czech Republic', flag: '🇨🇿', pricePerM2: 4600, yoyChange: 5.2, bubbleScore: 67, affordability: 32, priceToIncome: 13.5, status: 'overheating', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest', slug: 'budapest', country: 'Hungary', flag: '🇭🇺', pricePerM2: 2800, yoyChange: 8.4, bubbleScore: 49, affordability: 46, priceToIncome: 8.2, status: 'healthy', lat: 47.4979, lng: 19.0402 },
  { name: 'Bucharest', slug: 'bucharest', country: 'Romania', flag: '🇷🇴', pricePerM2: 2100, yoyChange: 7.6, bubbleScore: 38, affordability: 55, priceToIncome: 6.9, status: 'healthy', lat: 44.4268, lng: 26.1025 },
  { name: 'Athens', slug: 'athens', country: 'Greece', flag: '🇬🇷', pricePerM2: 2600, yoyChange: 11.2, bubbleScore: 45, affordability: 43, priceToIncome: 9.4, status: 'healthy', lat: 37.9838, lng: 23.7275 },
  { name: 'Berlin', slug: 'berlin', country: 'Germany', flag: '🇩🇪', pricePerM2: 5800, yoyChange: -1.8, bubbleScore: 64, affordability: 36, priceToIncome: 11.7, status: 'overheating', lat: 52.5200, lng: 13.4050 },
  { name: 'Hamburg', slug: 'hamburg', country: 'Germany', flag: '🇩🇪', pricePerM2: 6500, yoyChange: 1.5, bubbleScore: 69, affordability: 34, priceToIncome: 11.9, status: 'overheating', lat: 53.5511, lng: 9.9937 },
  { name: 'Lyon', slug: 'lyon', country: 'France', flag: '🇫🇷', pricePerM2: 5100, yoyChange: -0.6, bubbleScore: 51, affordability: 39, priceToIncome: 9.8, status: 'warming', lat: 45.7640, lng: 4.8357 },
  { name: 'Malaga', slug: 'malaga', country: 'Spain', flag: '🇪🇸', pricePerM2: 3100, yoyChange: 12.5, bubbleScore: 54, affordability: 41, priceToIncome: 9.6, status: 'warming', lat: 36.7213, lng: -4.4214 },
  { name: 'Valencia', slug: 'valencia', country: 'Spain', flag: '🇪🇸', pricePerM2: 2400, yoyChange: 10.8, bubbleScore: 41, affordability: 54, priceToIncome: 7.1, status: 'healthy', lat: 39.4699, lng: -0.3763 },
  { name: 'Tallinn', slug: 'tallinn', country: 'Estonia', flag: '🇪🇪', pricePerM2: 3500, yoyChange: 3.9, bubbleScore: 47, affordability: 43, priceToIncome: 8.7, status: 'healthy', lat: 59.4370, lng: 24.7536 },
  { name: 'Vilnius', slug: 'vilnius', country: 'Lithuania', flag: '🇱🇹', pricePerM2: 2900, yoyChange: 6.7, bubbleScore: 43, affordability: 49, priceToIncome: 7.8, status: 'healthy', lat: 54.6872, lng: 25.2797 },
];

/* ────────────────────────────────────────────────────────── */
/*  Metadata                                                 */
/* ────────────────────────────────────────────────────────── */

export async function generateStaticParams() {
  return CITIES.map(c => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const c = CITIES.find(x => x.slug === city);
  if (!c) return { title: 'City Not Found | Avena Terminal' };
  const statusLabel = c.status === 'bubble' ? 'BUBBLE TERRITORY' : c.status === 'overheating' ? 'OVERHEATING' : c.status === 'warming' ? 'WARMING' : 'HEALTHY';
  return {
    title: `${c.name} Property Bubble Score: ${c.bubbleScore}/100 (${statusLabel}) | Avena Terminal`,
    description: `${c.name}, ${c.country}: \u20AC${c.pricePerM2.toLocaleString()}/m\u00B2, ${c.yoyChange > 0 ? '+' : ''}${c.yoyChange}% YoY, bubble risk ${c.bubbleScore}/100. Full European bubble scanner.`,
    alternates: { canonical: `https://avenaterminal.com/bubble-scanner/${city}` },
    openGraph: {
      title: `${c.name}: ${statusLabel} \u2014 \u20AC${c.pricePerM2.toLocaleString()}/m\u00B2`,
      description: `Bubble score ${c.bubbleScore}/100. ${c.yoyChange > 0 ? '+' : ''}${c.yoyChange}% year-on-year. Price-to-income: ${c.priceToIncome}x.`,
      url: `https://avenaterminal.com/bubble-scanner/${city}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${c.flag} ${c.name}: ${statusLabel} \u2014 Bubble Score ${c.bubbleScore}/100`,
    },
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                  */
/* ────────────────────────────────────────────────────────── */

function statusColor(s: City['status']) {
  switch (s) {
    case 'bubble': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'overheating': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'warming': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'healthy': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  }
}

function statusLabel(s: City['status']) {
  switch (s) {
    case 'bubble': return 'BUBBLE TERRITORY';
    case 'overheating': return 'OVERHEATING';
    case 'warming': return 'WARMING';
    case 'healthy': return 'HEALTHY';
  }
}

function statusExplanation(c: City) {
  switch (c.status) {
    case 'bubble':
      return `${c.name} shows significant signs of a property bubble with a score of ${c.bubbleScore}/100. Price-to-income ratio of ${c.priceToIncome}x is well above sustainable levels, suggesting significant overvaluation risk.`;
    case 'overheating':
      return `${c.name} is showing overheating signals with a bubble score of ${c.bubbleScore}/100. While not yet in bubble territory, the price-to-income ratio of ${c.priceToIncome}x warrants caution for buyers and investors.`;
    case 'warming':
      return `${c.name} has a warming market with a bubble score of ${c.bubbleScore}/100. Prices are rising but remain within a range that could be supported by fundamentals. The price-to-income ratio of ${c.priceToIncome}x is elevated but manageable.`;
    case 'healthy':
      return `${c.name} currently shows a healthy market with a bubble score of ${c.bubbleScore}/100. The price-to-income ratio of ${c.priceToIncome}x suggests prices are broadly aligned with local incomes and economic fundamentals.`;
  }
}

function getNearbyMarkets(current: City): City[] {
  const sameCountry = CITIES.filter(c => c.country === current.country && c.slug !== current.slug);
  if (sameCountry.length >= 3) return sameCountry.slice(0, 4);

  const nearby = CITIES.filter(c => c.slug !== current.slug)
    .map(c => ({
      ...c,
      dist: Math.abs(c.lat - current.lat) + Math.abs(c.lng - current.lng),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4);

  return nearby;
}

/* ────────────────────────────────────────────────────────── */
/*  Page                                                     */
/* ────────────────────────────────────────────────────────── */

export default async function CityBubbleScannerPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = CITIES.find(c => c.slug === slug);

  if (!city) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">City Not Found</h1>
          <p className="text-zinc-400 mb-8">The city you are looking for is not in our bubble scanner.</p>
          <Link href="/bubble-scanner" className="text-blue-400 hover:underline">Back to Bubble Scanner</Link>
        </div>
      </main>
    );
  }

  const nearby = getNearbyMarkets(city);
  const label = statusLabel(city.status);
  const shareText = `${city.flag} ${city.name} bubble score: ${city.bubbleScore}/100 (${label}) \u2014 \u20AC${city.pricePerM2.toLocaleString()}/m\u00B2, ${city.yoyChange > 0 ? '+' : ''}${city.yoyChange}% YoY. See all 30 EU cities: avenaterminal.com/bubble-scanner`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Place',
        name: city.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: city.name,
          addressCountry: city.country,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: city.lat,
          longitude: city.lng,
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Is ${city.name} in a property bubble?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: statusExplanation(city),
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">

          {/* ── Breadcrumb ── */}
          <nav className="text-sm text-zinc-500 mb-8 flex items-center gap-2">
            <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/bubble-scanner" className="hover:text-zinc-300 transition-colors">Bubble Scanner</Link>
            <span>/</span>
            <span className="text-zinc-300">{city.name}</span>
          </nav>

          {/* ── Hero ── */}
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                {city.flag} {city.name}
              </h1>
              <span className={`px-3 py-1 text-xs font-mono font-semibold rounded border ${statusColor(city.status)}`}>
                {label}
              </span>
            </div>
            <p className="text-zinc-400 text-lg">{city.country}</p>
          </header>

          {/* ── Key Metrics Grid ── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {/* Price/m2 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">Price / m&sup2;</p>
              <p className="text-2xl font-bold">&euro;{city.pricePerM2.toLocaleString()}</p>
            </div>

            {/* YoY Change */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">YoY Change</p>
              <p className={`text-2xl font-bold ${city.yoyChange > 0 ? 'text-red-400' : city.yoyChange < 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {city.yoyChange > 0 ? '+' : ''}{city.yoyChange}%
              </p>
            </div>

            {/* Bubble Score */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">Bubble Score</p>
              <p className="text-2xl font-bold mb-2">{city.bubbleScore}<span className="text-sm text-zinc-500">/100</span></p>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${city.bubbleScore >= 75 ? 'bg-red-500' : city.bubbleScore >= 60 ? 'bg-orange-500' : city.bubbleScore >= 45 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                  style={{ width: `${city.bubbleScore}%` }}
                />
              </div>
            </div>

            {/* Affordability */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">Affordability</p>
              <p className="text-2xl font-bold">{city.affordability}<span className="text-sm text-zinc-500">/100</span></p>
            </div>
          </section>

          {/* ── Risk Assessment ── */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 tracking-tight">Risk Assessment</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
              <div>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Price-to-Income Ratio</p>
                <p className="text-3xl font-bold">{city.priceToIncome}<span className="text-sm text-zinc-500">x</span></p>
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-zinc-300 leading-relaxed">{statusExplanation(city)}</p>
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mb-2">What the Bubble Score Means</p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  The bubble score (0&ndash;100) aggregates price-to-income ratio, year-on-year price changes,
                  affordability metrics, and macroeconomic indicators. Scores above 75 indicate bubble territory,
                  60&ndash;74 overheating, 45&ndash;59 warming, and below 45 a healthy market.
                </p>
              </div>
            </div>
          </section>

          {/* ── Nearby Markets ── */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 tracking-tight">Nearby Markets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearby.map(n => (
                <Link
                  key={n.slug}
                  href={`/bubble-scanner/${n.slug}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 transition-colors"
                >
                  <p className="font-semibold mb-1">{n.flag} {n.name}</p>
                  <p className="text-sm text-zinc-400">&euro;{n.pricePerM2.toLocaleString()}/m&sup2;</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${statusColor(n.status)}`}>
                      {n.bubbleScore}/100
                    </span>
                    <span className={`text-xs ${n.yoyChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {n.yoyChange > 0 ? '+' : ''}{n.yoyChange}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Share This ── */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6 tracking-tight">Share This</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
              <p className="text-sm text-zinc-400 font-mono break-all">{shareText}</p>
              <div className="flex gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded transition-colors"
                >
                  Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://avenaterminal.com/bubble-scanner/${city.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded transition-colors"
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>
          </section>

          {/* ── Back link ── */}
          <div className="text-center">
            <Link
              href="/bubble-scanner"
              className="inline-block px-6 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm hover:border-zinc-500 transition-colors"
            >
              &larr; View All 30 Cities
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}

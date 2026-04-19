import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Alternatives</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Portal comparison · 2026
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Spanish property portals
                <br />
                <span className="italic text-gold">compared</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                A side-by-side look at the leading platforms for finding and analysing Spanish property. Avena Terminal is the investment analysis leader.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 overflow-x-auto">
            <div
              className="rounded-sm border overflow-hidden min-w-[900px]"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="text-left px-5 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Feature</th>
                    {PORTALS.map((portal) => (
                      <th
                        key={portal.slug}
                        className="text-center px-4 py-4 font-mono text-[10px] uppercase tracking-[0.22em] whitespace-nowrap"
                        style={{ color: portal.slug === 'avena' ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}
                      >
                        {portal.slug === 'avena' ? (
                          portal.name
                        ) : (
                          <Link
                            href={`/vs/${portal.slug}`}
                            className="hover:text-gold transition-colors"
                          >
                            {portal.name}
                          </Link>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_KEYS.map((feature) => (
                    <tr
                      key={feature}
                      className="border-t"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <td className="px-5 py-4 text-muted-foreground">{feature}</td>
                      {PORTALS.map((portal) => (
                        <td key={portal.slug} className="px-4 py-4 text-center">
                          {portal.features[feature] ? (
                            <span className="text-gold">✓</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Portal Cards with Links */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Detailed Comparisons</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PORTALS.filter((p) => p.slug !== 'avena').map((portal) => {
                const featureCount = FEATURE_KEYS.filter(
                  (f) => portal.features[f]
                ).length;

                return (
                  <Link
                    key={portal.slug}
                    href={`/vs/${portal.slug}`}
                    className="group rounded-sm border p-6 block transition-all hover:-translate-y-0.5"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-serif text-lg text-foreground group-hover:text-gold transition-colors">{portal.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {featureCount}/{FEATURE_KEYS.length}
                      </span>
                    </div>
                    <p className="text-sm font-light leading-relaxed text-muted-foreground mb-4">{portal.tagline}</p>
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
                      Avena vs {portal.name} →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-8 max-w-4xl space-y-5"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground">
                Why Avena Terminal leads for <span className="italic text-gold">investment analysis</span>
              </h2>
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                Most Spanish property portals are listing marketplaces designed to help you browse
                properties. Avena Terminal is fundamentally different: it is an investment analysis
                platform that scores every tracked new build on a transparent 0-100 scale. The scoring
                engine evaluates value, rental yield, location quality, build specification, and risk
                — updated daily.
              </p>
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                While portals like Idealista and Fotocasa offer basic price statistics, none provide
                automated investment scoring, discount-to-market calculations, or AI-generated
                property memos. Avena Terminal gives individual investors the same data-driven
                intelligence that was previously available only to institutional buyers.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-10 text-center"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">
                Start analysing <span className="italic text-gold">Spanish new builds</span>
              </h2>
              <p className="font-light text-muted-foreground mb-8 max-w-xl mx-auto">
                1,800+ properties scored across Costa Blanca, Costa del Sol, and Costa Cálida. Free to use, updated daily.
              </p>
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Try Avena Terminal free →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

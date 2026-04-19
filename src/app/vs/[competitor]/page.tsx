import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

const COMPETITORS: Record<
  string,
  {
    name: string;
    tagline: string;
    strengths: string;
    analysis: string;
    features: Record<string, boolean>;
  }
> = {
  idealista: {
    name: 'Idealista',
    tagline: "Spain's largest property portal",
    strengths:
      'Idealista is the dominant property portal in Spain with millions of listings covering resale, rental, and new build segments. Its sheer volume and brand recognition make it the default starting point for most property searches. The platform excels at broad market coverage and offers useful neighbourhood-level price statistics.',
    analysis:
      'However, Idealista is a listings marketplace, not an investment tool. It does not score properties on investment merit, calculate rental yields automatically, or benchmark price per square metre against local comparables. Avena Terminal fills this gap by treating every new build as an investment opportunity, assigning a transparent 0-100 score based on value, yield, location quality, build specification, and risk. Where Idealista helps you find properties, Avena Terminal helps you decide which ones are actually worth buying.',
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
  rightmove: {
    name: 'Rightmove',
    tagline: "UK's leading property portal with overseas listings",
    strengths:
      'Rightmove is the most visited property website in the United Kingdom and serves as a trusted gateway for British buyers exploring Spanish property. Its overseas section aggregates listings from local agents, making it convenient for UK-based investors who already know the platform.',
    analysis:
      'Rightmove Overseas offers limited analytical depth for the Spanish market. Listings lack standardised investment metrics, and there is no scoring or yield estimation. The data often lags behind local portals, and price per square metre benchmarks are absent. Avena Terminal is purpose-built for Spanish new builds, delivering daily-updated investment scores, rental yield projections, and municipality-level price benchmarks that Rightmove simply does not provide.',
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
  kyero: {
    name: 'Kyero',
    tagline: 'International portal for Spanish property',
    strengths:
      'Kyero is a well-established international portal focused on Spanish and Portuguese property. It provides a clean, English-language interface and partners with thousands of local estate agents. The platform is particularly popular with British, Scandinavian, and Dutch buyers looking for holiday homes or retirement properties in Spain.',
    analysis:
      'Kyero positions itself as a discovery portal rather than an investment analysis platform. It does not offer automated scoring, yield calculations, or price benchmarking against local market averages. Avena Terminal complements Kyero by adding the analytical layer that serious investors need: every tracked property receives a daily-updated investment score, AI-generated memos, and transparent price per square metre comparisons against municipal benchmarks.',
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
  'a-place-in-the-sun': {
    name: 'A Place in the Sun',
    tagline: 'TV-backed overseas property portal',
    strengths:
      'A Place in the Sun benefits from enormous brand awareness through its long-running Channel 4 television programme. The portal attracts lifestyle buyers who are inspired by the show and want to explore Spanish property options. It provides editorial content, buying guides, and a curated selection of properties from partner agents.',
    analysis:
      'The platform is editorially driven rather than data-driven. It lacks investment scoring, automated yield analysis, and price per square metre benchmarking. Properties are presented in a lifestyle context without the quantitative rigour that investors require. Avena Terminal takes a fundamentally different approach, treating each property as a financial asset and providing the metrics needed to make informed investment decisions.',
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
  fotocasa: {
    name: 'Fotocasa',
    tagline: "Spain's second-largest property portal",
    strengths:
      'Fotocasa is one of the largest property portals in Spain, second only to Idealista in traffic and listings volume. It offers a comprehensive view of the Spanish market including resale, new build, and rental segments. The platform provides useful area-level statistics and has strong coverage across all Spanish regions.',
    analysis:
      'Like Idealista, Fotocasa is a marketplace rather than an investment analysis platform. It does not assign investment scores, calculate rental yields, or benchmark individual properties against local price averages. Its strength is breadth of listings, not depth of analysis. Avena Terminal narrows the focus to new builds and adds the investment intelligence layer: automated scoring, yield projections, discount-to-market calculations, and AI-generated property memos.',
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
  thinkspain: {
    name: 'ThinkSpain',
    tagline: 'Expat-focused Spanish property and lifestyle portal',
    strengths:
      'ThinkSpain combines property listings with a rich library of editorial content about living in Spain. It serves the expat community with news, guides, and practical advice alongside its property search. The portal is well-regarded for its community focus and practical relocation information.',
    analysis:
      'ThinkSpain excels as an information resource but does not offer investment-grade property analysis. There are no scoring algorithms, yield calculators, or market benchmarking tools. The property search is basic and lacks the quantitative depth that investors need. Avena Terminal provides the missing analytical layer with daily-updated investment scores, municipality-level price per square metre benchmarks, and AI-powered property memos.',
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
  propertyguides: {
    name: 'PropertyGuides',
    tagline: 'Overseas buying guide and property portal',
    strengths:
      'PropertyGuides provides comprehensive buying guides for overseas property markets, including Spain. The platform pairs its listings with detailed editorial content covering legal processes, tax implications, and practical tips for buying abroad. It is a strong educational resource for first-time overseas buyers.',
    analysis:
      'PropertyGuides is content-first, with property search as a secondary feature. It does not offer investment scoring, automated yield analysis, or price benchmarking against local market data. The educational content is valuable but does not substitute for the quantitative analysis that investors need. Avena Terminal provides this with its scoring engine, which evaluates every new build on value, yield, location, quality, and risk dimensions.',
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
  spanishpropertychoice: {
    name: 'Spanish Property Choice',
    tagline: 'Curated Spanish property from local agents',
    strengths:
      'Spanish Property Choice offers a curated selection of Spanish properties sourced directly from vetted local agents. The platform emphasises personal service and agent quality, making it a good option for buyers who want a more guided purchasing experience. The focus is primarily on the Costa Blanca and Costa del Sol regions.',
    analysis:
      'The platform functions as an agent-curated listing service rather than a data-driven investment tool. It lacks automated scoring, yield projections, and price per square metre benchmarking. Selection is limited to partner agents, which means coverage is narrower than larger portals. Avena Terminal provides comprehensive new build coverage with transparent, data-driven scoring that is independent of any agent relationship.',
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
};

const AVENA_FEATURES: Record<string, boolean> = {
  'Investment scoring': true,
  'Live rental yield data': true,
  'Price per m2 analysis': true,
  'Discount vs market': true,
  'AI investment memos': true,
  'Property comparison tools': true,
  'Free tier available': true,
};

const FEATURE_KEYS = [
  'Investment scoring',
  'Live rental yield data',
  'Price per m2 analysis',
  'Discount vs market',
  'AI investment memos',
  'Property comparison tools',
  'Free tier available',
];

export async function generateStaticParams() {
  return [
    { competitor: 'idealista' },
    { competitor: 'rightmove' },
    { competitor: 'kyero' },
    { competitor: 'a-place-in-the-sun' },
    { competitor: 'fotocasa' },
    { competitor: 'thinkspain' },
    { competitor: 'propertyguides' },
    { competitor: 'spanishpropertychoice' },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const data = COMPETITORS[competitor];
  const name = data?.name ?? competitor;

  return {
    title: `Avena Terminal vs ${name} — Why Investors Choose Avena`,
    description: `Compare Avena Terminal and ${name} side by side. Investment scoring, rental yield data, price per m2 analysis and more. See why investors choose Avena Terminal for Spanish new build property.`,
    openGraph: {
      title: `Avena Terminal vs ${name} — Why Investors Choose Avena`,
      description: `Side-by-side comparison of Avena Terminal and ${name} for Spanish property investment.`,
      url: `https://avenaterminal.com/vs/${competitor}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    alternates: { canonical: `https://avenaterminal.com/vs/${competitor}` },
  };
}

export default async function VsCompetitorPage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const data = COMPETITORS[competitor];

  if (!data) {
    return (
      <div className="avena-v2 min-h-screen">
        <Nav />
        <main className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-light text-foreground mb-4">Competitor not found</h1>
            <Link href="/alternatives" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:text-gold transition-colors">
              View all comparisons →
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the difference between Avena Terminal and ${data.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${data.name} is a property listing portal, while Avena Terminal is an investment analysis platform. Avena Terminal scores every new build property on a 0-100 scale using rental yield, price per m2, and location data to help investors identify undervalued opportunities.`,
        },
      },
      {
        '@type': 'Question',
        name: `Is Avena Terminal better than ${data.name} for property investment?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `For investment analysis, Avena Terminal provides features that ${data.name} does not offer, including automated investment scoring, live rental yield estimates, discount-to-market calculations, and AI-generated investment memos. ${data.name} may be better for broad property browsing, while Avena Terminal is purpose-built for investment decision-making.`,
        },
      },
    ],
  };

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
      {
        '@type': 'ListItem',
        position: 3,
        name: `vs ${data.name}`,
        item: `https://avenaterminal.com/vs/${competitor}`,
      },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
              <Link href="/alternatives" className="hover:text-primary transition-colors">Alternatives</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">vs {data.name}</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Competitor comparison
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Avena Terminal
                <br />
                <span className="italic text-gold">vs {data.name}</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                {data.tagline} — how does it compare for property investment?
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Feature Comparison</div>
            <div
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="px-5 py-4 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Feature</th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Avena Terminal</th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">{data.name}</th>
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
                      <td className="px-5 py-4 text-center">
                        {AVENA_FEATURES[feature] ? (
                          <span className="text-gold">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {data.features[feature] ? (
                          <span className="text-gold">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Analysis */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Honest Analysis</div>
            <div
              className="rounded-sm border p-8 space-y-6 max-w-4xl"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div>
                <h3 className="font-serif text-xl font-light text-foreground mb-3">What {data.name} does well</h3>
                <p className="text-sm font-light leading-relaxed text-muted-foreground">{data.strengths}</p>
              </div>
              <div className="border-t pt-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <h3 className="font-serif text-xl font-light text-foreground mb-3">Where Avena Terminal goes further</h3>
                <p className="text-sm font-light leading-relaxed text-muted-foreground">{data.analysis}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-10 text-center"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">
                Ready to invest <span className="italic text-gold">smarter</span>?
              </h2>
              <p className="font-light text-muted-foreground mb-8 max-w-xl mx-auto">
                Avena Terminal scores 1,800+ new build properties across Spain&apos;s coastal regions.
                Investment scoring, rental yields, and AI memos — all free.
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

        {/* More Comparisons */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">More Comparisons</div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(COMPETITORS)
                .filter(([slug]) => slug !== competitor)
                .map(([slug, c]) => (
                  <Link
                    key={slug}
                    href={`/vs/${slug}`}
                    className="group rounded-sm border p-5 transition-all hover:-translate-y-0.5"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="font-serif text-base text-foreground group-hover:text-gold transition-colors">vs {c.name}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.tagline}</div>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

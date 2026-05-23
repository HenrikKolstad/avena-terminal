import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'About Avena Terminal — Spain\'s First PropTech Scanner',
  description:
    'The story behind Avena Terminal: how a Norwegian founder built an institutional-grade scoring engine to democratize Spanish property investment intelligence.',
  openGraph: {
    title: 'About Avena Terminal — Spain\'s First PropTech Scanner',
    description:
      'How a Norwegian founder built an institutional-grade scoring engine for Spanish property investment.',
    url: 'https://avenaterminal.com/about',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://avenaterminal.com/about' },
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
              <span className="text-foreground/80">About</span>
            </nav>

            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                About
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Spain&apos;s first
                <br />
                <span className="italic text-gold">PropTech scanner</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Institutional-grade scoring for new-build property investment, built from
                the ground up to democratize data that was once locked behind expensive
                advisory firms.
              </p>
            </div>
          </div>
        </section>

        {/* Founder Story */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Founder Story
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Built from <span className="italic text-gold">conviction</span>.
            </h2>
            <div className="rounded-sm border p-8 sm:p-10 max-w-4xl" style={cardStyle}>
              <p className="mb-5 font-light text-base leading-relaxed text-foreground/90">
                Avena Terminal was founded by <span className="text-gold font-medium">Henrik Kolstad</span>,
                a Norwegian developer who recognized a fundamental inefficiency in the Spanish
                property market: buyers had no reliable way to compare new build developments on
                objective, data-driven criteria.
              </p>
              <p className="mb-5 font-light text-base leading-relaxed text-foreground/90">
                Pricing was opaque, yield estimates were guesswork, and institutional-grade analysis
                was locked behind expensive advisory firms. Individual investors were left navigating
                one of Europe&apos;s largest coastal property markets with little more than brochures
                and gut feeling.
              </p>
              <p className="font-light text-base leading-relaxed text-foreground/90">
                Henrik built the scoring engine from scratch — combining hedonic regression
                modelling, real-time data feeds, and municipality-level benchmarks — to create
                a tool that surfaces undervalued opportunities and ranks every tracked property on a
                transparent 0-100 scale.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Mission
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Democratize <span className="italic text-gold">investment intelligence</span>.
            </h2>
            <div className="rounded-sm border p-8 sm:p-10 max-w-4xl" style={cardStyle}>
              <p className="font-light text-base leading-relaxed text-foreground/90">
                Avena Terminal makes the same data and scoring methodology available to a first-time
                buyer in Oslo as to a property fund in London. The platform is free, publicly
                accessible, and updated daily — because better data leads to better decisions.
              </p>
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Technology
            </span>
            <h2 className="mb-6 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              A <span className="italic text-gold">hedonic regression</span> model.
            </h2>
            <p className="mb-10 max-w-3xl font-light text-base text-muted-foreground">
              The terminal decomposes property value into measurable investment dimensions.
              Every property receives a composite score from 0 to 100, updated daily.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { dim: 'Value', weight: '40%', desc: 'Price per m2 versus the local market benchmark, measuring discount or premium against comparable resale properties.' },
                { dim: 'Yield', weight: '25%', desc: 'Estimated gross rental yield derived from short-term rental comps, adjusted for seasonal occupancy.' },
                { dim: 'Location', weight: '20%', desc: 'Beach proximity, airport access, amenity density, and historical price appreciation of the micro-area.' },
                { dim: 'Quality', weight: '10%', desc: 'Build specification signals including energy rating, parking, pool, terrace area, and developer track record.' },
                { dim: 'Risk', weight: '5%', desc: 'Completion timeline, developer experience, and off-plan versus key-ready status.' },
              ].map(d => (
                <div key={d.dim} className="rounded-sm border p-6" style={cardStyle}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="font-serif text-xl font-light text-foreground">{d.dim}</h3>
                    <span className="font-mono text-sm text-primary">{d.weight}</span>
                  </div>
                  <p className="font-light text-sm leading-relaxed text-muted-foreground">{d.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
              {[
                { value: '58,000+', label: 'Properties Indexed' },
                { value: '27', label: 'EU Markets' },
                { value: 'APIP v1', label: 'Open Standard' },
                { value: 'Daily', label: 'Update Frequency' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="font-serif text-3xl font-light tracking-tight text-foreground tabular">{stat.value}</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Timeline
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              The <span className="italic text-gold">journey</span>.
            </h2>

            <div className="space-y-4 max-w-4xl">
              <div className="rounded-sm border p-6 flex gap-6" style={cardStyle}>
                <span className="font-serif text-3xl font-light text-gold tabular shrink-0">2025</span>
                <div>
                  <h3 className="font-serif text-xl font-light text-foreground mb-2">Founded</h3>
                  <p className="font-light text-sm leading-relaxed text-muted-foreground">
                    Henrik Kolstad begins building the scoring engine and data pipeline, sourcing
                    listings from the RedSP XML feed and benchmarking against Idealista and INE
                    municipal data.
                  </p>
                </div>
              </div>
              <div className="rounded-sm border p-6 flex gap-6" style={cardStyle}>
                <span className="font-serif text-3xl font-light text-gold tabular shrink-0">2026</span>
                <div>
                  <h3 className="font-serif text-xl font-light text-foreground mb-2">Terminal Launch + Crypto Experiment</h3>
                  <p className="font-light text-sm leading-relaxed text-muted-foreground">
                    Public launch of the Avena Terminal web interface with full property scoring,
                    town-level analytics, and regional dashboards. Alongside the terminal, an
                    experimental crypto integration explores tokenized access and on-chain property
                    data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
              <Link
                href="/about/press"
                className="group rounded-sm border p-6 transition-colors hover:border-primary/50"
                style={cardStyle}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl font-light text-foreground mb-2">Press &amp; Media</h3>
                    <p className="font-light text-sm text-muted-foreground">
                      Media kit, press contact, and data partnerships
                    </p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
              <Link
                href="/data/spain-property-index"
                className="group rounded-sm border p-6 transition-colors hover:border-primary/50"
                style={cardStyle}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl font-light text-foreground mb-2">Data &amp; Methodology</h3>
                    <p className="font-light text-sm text-muted-foreground">
                      Full scoring methodology and live coverage statistics
                    </p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

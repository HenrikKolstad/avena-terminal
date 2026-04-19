import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'European Property Market Comparisons | Avena Terminal',
  description:
    'Side-by-side comparisons of European property markets. Spain vs Portugal, Cyprus, Italy, France, and regional coast-to-coast analysis.',
  openGraph: {
    title: 'European Property Market Comparisons | Avena Terminal',
    description:
      'Side-by-side comparisons of European property markets for international investors.',
    url: 'https://avenaterminal.com/compare',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

const COMPARISONS = [
  {
    slug: 'es-vs-pt',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1F5}\u{1F1F9}',
    labelA: 'Spain',
    labelB: 'Portugal',
    description:
      'The two Iberian neighbours compared: tax regimes, Golden Visa status, coastal property prices, and residency pathways.',
  },
  {
    slug: 'es-vs-cy',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1E8}\u{1F1FE}',
    labelA: 'Spain',
    labelB: 'Cyprus',
    description:
      'Mediterranean rivals: Spain\'s mature market versus Cyprus\' low-tax regime and EU fast-track citizenship appeal.',
  },
  {
    slug: 'es-vs-it',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1EE}\u{1F1F9}',
    labelA: 'Spain',
    labelB: 'Italy',
    description:
      'Europe\'s two largest southern property markets compared on price, yield, lifestyle, and bureaucratic complexity.',
  },
  {
    slug: 'es-vs-fr',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1EB}\u{1F1F7}',
    labelA: 'Spain',
    labelB: 'France',
    description:
      'Costa living versus the C\u00F4te d\'Azur: price-per-square-metre, inheritance tax, rental regulations, and market maturity.',
  },
  {
    slug: 'cb-vs-cds',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1EA}\u{1F1F8}',
    labelA: 'Costa Blanca',
    labelB: 'Costa del Sol',
    description:
      'Spain\'s two most popular expat coasts head-to-head: new-build pricing, rental yields, flight access, and lifestyle differences.',
  },
  {
    slug: 'cb-vs-algarve',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1F5}\u{1F1F9}',
    labelA: 'Costa Blanca',
    labelB: 'Algarve',
    description:
      'The cross-border coastal comparison: Spain\'s Costa Blanca versus Portugal\'s Algarve on sun, golf, prices, and investment returns.',
  },
];

export default function CompareLandingPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Compare</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Market comparisons
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                European property
                <br />
                <span className="italic text-gold">markets, compared</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Data-driven side-by-side analysis of Europe&apos;s most popular property investment destinations. Taxes, prices, yields, and lifestyle factors — all in one place.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison cards */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid gap-5 md:grid-cols-2">
              {COMPARISONS.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="group rounded-sm border p-8 transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{c.flagA}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">vs</span>
                    <span className="text-2xl">{c.flagB}</span>
                  </div>
                  <h2 className="font-serif text-2xl font-light leading-tight text-foreground mb-3 group-hover:text-gold transition-colors">
                    {c.labelA} vs {c.labelB}
                  </h2>
                  <p className="text-sm font-light leading-relaxed text-muted-foreground">{c.description}</p>
                  <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
                    View comparison →
                  </div>
                </Link>
              ))}
            </div>

            {/* Cross-link */}
            <div className="mt-16 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                Looking for town-level comparisons within Spain?
              </p>
              <Link
                href="/towns"
                className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Browse all Spanish towns →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Media Kit — Journalist Fact Pack | Avena Terminal',
  description:
    'Ready-to-copy facts, quotes, story angles, and visuals for journalists covering Avena Terminal. Free to use under CC BY 4.0 with attribution.',
  alternates: { canonical: 'https://avenaterminal.com/press/kit' },
  openGraph: {
    title: 'Media Kit — Journalist Fact Pack',
    description: 'Ready-to-copy facts, quotes, story angles, and visuals for journalists.',
    url: 'https://avenaterminal.com/press/kit',
    siteName: 'Avena Terminal',
  },
};

const BOILERPLATE_SHORT =
  'Avena Terminal is an open-data European property intelligence platform. It scores 1,881 Spanish new-builds daily, tracks 10 EU markets with 60+ macro indicators, and publishes an open canonical identifier standard (AVN_PROP_ID). Everything is CC BY 4.0. Based in Trøndelag, Norway, founded 2026 by Henrik Kolstad.';

const BOILERPLATE_LONG =
  'Avena Terminal is the Bloomberg-style terminal for European property data. Depth: 1,881 Spanish new-build properties scored daily via hedonic regression and 130+ features per property. Breadth: 10 EU markets, 30 cities in a live bubble-risk index, 60+ macro indicators from ECB, Eurostat, OECD, and national banks. Products include a public Prediction Ledger, five composite indices (APCI/APYI/APLI/APRI/APSI), a 7-tool Model Context Protocol server for AI agents, a SPARQL endpoint, and an open canonical identifier standard (AVN_PROP_ID v1.0). All data and methodology are openly licensed (CC BY 4.0, DOI 10.5281/zenodo.19520064) and published to Zenodo, Wikidata (Q139165733), and Hugging Face. Founded 2026 by Norwegian carpenter and tech founder Henrik Kolstad, based in Trøndelag. Expansion roadmap: Portugal Q3 2026, Italy Q4 2026, France 2027, Scandinavia 2027.';

const FACTS = [
  { label: 'Founded', value: 'April 2026' },
  { label: 'Founder', value: 'Henrik Kolstad (solo founder)' },
  { label: 'Headquarters', value: 'Trøndelag, Norway' },
  { label: 'Team size', value: '1 human + 24 autonomous AI agents' },
  { label: 'Scored properties', value: '1,881 Spanish new-builds' },
  { label: 'EU markets tracked', value: '10 countries, 30 cities' },
  { label: 'Macro indicators', value: '60+ (ECB, Eurostat, OECD, national banks)' },
  { label: 'Composite indices', value: 'APCI, APYI, APLI, APRI, APSI' },
  { label: 'Public API endpoints', value: '208+' },
  { label: 'MCP server tools', value: '7 (search, score, yield, comp, ROI, alternatives, timing)' },
  { label: 'DOI', value: '10.5281/zenodo.19520064' },
  { label: 'Wikidata entity', value: 'Q139165733' },
  { label: 'License', value: 'CC BY 4.0 (everything open)' },
  { label: 'Cited by', value: 'Perplexity, ChatGPT, Claude (verified April 2026)' },
];

const QUOTES = [
  {
    quote:
      'I built Avena because when I help clients buy property in Spain, I kept wishing for a tool that didn\u2019t exist. Nobody was going to build it, so I did — evenings and weekends, for a year.',
    attribution: 'Henrik Kolstad, founder, Avena Terminal',
    context: 'On why the platform exists',
  },
  {
    quote:
      'Avena doesn\u2019t replace ChatGPT or Perplexity. It replaces their stale knowledge of one specific vertical — European property — with live, scored, verifiable data. The best answer for a Spanish property question is your general AI calling Avena as a tool.',
    attribution: 'Henrik Kolstad, founder, Avena Terminal',
    context: 'On positioning vs general AI',
  },
  {
    quote:
      'Most property data is stale noise. We expand one market at a time, fully verified, because the alternative is the same noisy-unreliable experience everyone already has with portal data. We\u2019d rather be right in one country than wrong in twenty.',
    attribution: 'Henrik Kolstad, founder, Avena Terminal',
    context: 'On expansion strategy',
  },
  {
    quote:
      'An AI agent on our platform polls Perplexity every morning to see whether we\u2019re cited. If we\u2019re not, another agent drafts a page that answers the missing question. By the next week, we are cited. It\u2019s a closed-loop feedback system.',
    attribution: 'Henrik Kolstad, founder, Avena Terminal',
    context: 'On the citation-moat feedback loop',
  },
];

const ANGLES = [
  {
    headline: 'The carpenter who built a Bloomberg Terminal for property',
    pitch:
      'Solo Norwegian founder, working as a carpenter by day, built one of Europe\u2019s most technical property data platforms from his kitchen in Trøndelag. 24 autonomous AI agents, 208 public API endpoints, no funding, no team.',
    angle: 'Founder-hero, distrikts-story, tech against all odds',
  },
  {
    headline: 'Norwegian-built AI platform is being cited by ChatGPT and Perplexity',
    pitch:
      'As of April 2026, multiple major AI systems cite Avena Terminal when answering European property questions. Verified by publicly-viewable AI responses. The platform\u2019s open-data positioning is working — it\u2019s becoming the source, not a competitor.',
    angle: 'Tech / AI, emerging Norwegian tech win, international recognition',
  },
  {
    headline: 'The open-data play that wants to be the ISBN of property',
    pitch:
      'Avena\u2019s AVN_PROP_ID is a canonical identifier system for European property — like ISBNs for books or tickers for stocks. Published as an open CC BY 4.0 standard with a 10-year resolvability commitment. If it gets adopted, it becomes foundational infrastructure.',
    angle: 'Tech / standards / public infrastructure',
  },
  {
    headline: 'How a Norwegian is helping Nordic buyers avoid millions in bad Spanish property deals',
    pitch:
      'Real case study: Avena flagged two La Finca villas as undervalued by 15%. A Norwegian buyer acted. One month later the developer re-priced comparables up by €100k each. Unrealised gain: ~€300k per unit. The platform was built to prevent the inverse — buyers overpaying in Spain.',
    angle: 'Consumer / practical / local-reader value',
  },
  {
    headline: 'Bipolar, carpenter, and tech founder — meet the neurodivergent builder behind Avena',
    pitch:
      'Henrik Kolstad is open about managing bipolar 2 while building at a pace that would exhaust most neurotypical founders. The story of Avena is partly the story of how hypomanic build bursts became a competitive advantage — 24 AI agents shipped in six weeks of evenings.',
    angle: 'Human interest / mental health / founder psychology',
    note: 'Only run this angle with founder\u2019s explicit OK for each outlet.',
  },
];

const BRAND = [
  { asset: 'Wordmark (SVG)', url: '/brand/avena-wordmark.svg' },
  { asset: 'Monogram A (SVG)', url: '/brand/avena-monogram.svg' },
  { asset: 'OpenGraph image', url: '/opengraph-image' },
  { asset: 'Color palette (HSL)', url: '/brand/palette.txt' },
  { asset: 'Full brand doc', url: '/brand' },
];

export default function MediaKitPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MediaObject',
    name: 'Avena Terminal Media Kit',
    description: 'Journalist-ready fact pack, quotes, story angles, and visuals.',
    url: 'https://avenaterminal.com/press/kit',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    contentUrl: 'https://avenaterminal.com/press/kit',
    creator: { '@type': 'Organization', name: 'Avena Terminal' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Media kit · For journalists · CC BY 4.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Everything a journalist
              <br />
              needs, in <span className="italic text-gold">one page</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light leading-relaxed">
              Boilerplate copy, facts, founder quotes, story angles, and brand
              assets. Free to use with attribution. Copy any block and paste.
              For interview requests or photo sessions, contact{' '}
              <a
                href="mailto:henrik@xaviaestate.com?subject=Press%20inquiry%20%E2%80%94%20Avena%20Terminal"
                className="text-primary hover:text-gold"
              >
                henrik@xaviaestate.com
              </a>
              .
            </p>
          </div>
        </section>

        {/* Boilerplate */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              <span className="italic text-gold">Boilerplate</span>.
            </h2>
            <div className="space-y-4">
              <div
                className="rounded-sm border p-5"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  Short (50 words)
                </div>
                <p className="text-muted-foreground font-light leading-relaxed">{BOILERPLATE_SHORT}</p>
              </div>
              <div
                className="rounded-sm border p-5"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  Long (150 words)
                </div>
                <p className="text-muted-foreground font-light leading-relaxed">{BOILERPLATE_LONG}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Facts */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              <span className="italic text-gold">Facts</span>.
            </h2>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-px overflow-hidden rounded-sm border"
              style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {FACTS.map((f) => (
                <div
                  key={f.label}
                  className="p-4 flex items-baseline justify-between gap-4"
                  style={{ background: 'hsl(var(--av-background))' }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {f.label}
                  </span>
                  <span className="font-mono text-sm tabular text-foreground text-right">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quotes */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Pre-approved <span className="italic text-gold">quotes</span>.
            </h2>
            <div className="space-y-4">
              {QUOTES.map((q, i) => (
                <div
                  key={i}
                  className="rounded-sm border p-6"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                    {q.context}
                  </div>
                  <blockquote className="font-serif text-xl text-foreground italic leading-relaxed mb-3">
                    &ldquo;{q.quote}&rdquo;
                  </blockquote>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    — {q.attribution}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story angles */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Five story <span className="italic text-gold">angles</span>.
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed mb-6 max-w-3xl">
              Angles ready to pitch to your editor. Each has been pre-vetted for factual
              accuracy and is supported by the data + quotes above.
            </p>
            <div className="space-y-3">
              {ANGLES.map((a) => (
                <div
                  key={a.headline}
                  className="rounded-sm border p-5"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h3 className="font-serif text-xl text-foreground">{a.headline}</h3>
                    <span className="flex-shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-primary rounded-sm border px-2 py-0.5" style={{ borderColor: 'hsl(var(--av-primary) / 0.3)', background: 'hsl(var(--av-primary) / 0.08)' }}>
                      {a.angle}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{a.pitch}</p>
                  {a.note && (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-warning" style={{ color: 'hsl(var(--av-warning))' }}>
                      ⚠ {a.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brand assets */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Brand <span className="italic text-gold">assets</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BRAND.map((b) => (
                <Link
                  key={b.asset}
                  href={b.url}
                  className="group rounded-sm border p-5 flex items-center justify-between transition-colors hover:border-primary"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div>
                    <div className="font-serif text-base text-foreground mb-1">{b.asset}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {b.url}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              All brand assets free to use under CC BY 4.0. Preserve monogram proportions
              and minimum clear-space (1× monogram width).
            </p>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 text-center">
            <h2 className="font-serif text-4xl font-light tracking-tight text-foreground mb-4">
              Want an <span className="italic text-gold">interview</span>?
            </h2>
            <p className="text-muted-foreground font-light mb-8 max-w-lg mx-auto">
              Henrik answers press email within 4 hours (Norwegian business hours, 24h worst-case). Video interviews, in-person in Trøndelag or Spain, quotes on deadline.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="mailto:henrik@xaviaestate.com?subject=Press%20interview%20request%20%E2%80%94%20Avena%20Terminal"
                className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Email Henrik
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <Link
                href="/press"
                className="inline-flex items-center gap-2 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Press API access
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

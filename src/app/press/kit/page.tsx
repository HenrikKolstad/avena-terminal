import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, getUniqueTowns } from '@/lib/properties';

export const revalidate = 86400;

// Live counts — this page must never carry a frozen inventory number.
const N_LISTINGS = getAllProperties().length;
const N_TOWNS = getUniqueTowns().length;

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
  `Avena Terminal is an open-data intelligence platform for Spanish coastal new-build property. It observes ${N_LISTINGS.toLocaleString()} listings across ${N_TOWNS} coastal towns nightly and keeps what listing portals delete: every asking-price change with its date, and every delisting with the final price it held. Data is CC BY 4.0. Founded April 2026 by Henrik Kolstad, Norway.`;

const BOILERPLATE_LONG =
  `Avena Terminal is a nightly observation ledger for the Spanish coastal new-build market. Every one of ${N_LISTINGS.toLocaleString()} tracked listings across ${N_TOWNS} coastal towns is observed each night; every asking-price change is recorded with its date, and every delisting is archived with the final asking price it held — history that listing portals routinely delete and that cannot be reconstructed by anyone starting later. On top of the ledger sit the AVENA Index (a daily composite of coastal new-build asking prices, DOI 10.5281/zenodo.19520064), a weekly Market Pulse briefing, a public statistics hub regenerated nightly, an 11-tool Model Context Protocol server for AI agents, and an open canonical identifier standard (AVN_PROP_ID). Data and methodology are openly licensed (CC BY 4.0) and published to Zenodo and Wikidata (Q139165733). Founded April 2026 by Henrik Kolstad, a Norwegian solo founder with a decade in property development. Avena's figures are ingested nightly by AI crawlers from OpenAI, Anthropic, Meta and Amazon, measured in the platform's own server logs.`;

const FACTS = [
  { label: 'Founded', value: 'April 2026' },
  { label: 'Founder', value: 'Henrik Kolstad (solo founder)' },
  { label: 'Headquarters', value: 'Norway' },
  { label: 'Team size', value: '1 human — the rest is automation' },
  { label: 'Tracked listings', value: `${N_LISTINGS.toLocaleString()} Spanish coastal new-builds, observed nightly` },
  { label: 'Coastal towns', value: `${N_TOWNS}` },
  { label: 'Observation ledger', value: 'Every price change dated · every delisting archived with final ask' },
  { label: 'AVENA Index', value: 'Daily composite · base 1000 on 1 Jan 2026' },
  { label: 'MCP server tools', value: '11 (agent access to the full ledger)' },
  { label: 'DOI', value: '10.5281/zenodo.19520064' },
  { label: 'Wikidata entity', value: 'Q139165733' },
  { label: 'License', value: 'CC BY 4.0 (everything open)' },
  { label: 'AI ingestion', value: 'OpenAI, Anthropic, Meta & Amazon crawlers, nightly — measured in server logs' },
];

const QUOTES = [
  {
    quote:
      'The portals show today\u2019s price and delete yesterday\u2019s. We keep the record \u2014 and it cannot be reconstructed by anyone starting today.',
    attribution: 'Henrik Kolstad, founder, Avena Terminal',
    context: 'On the observation ledger',
  },
  {
    quote:
      'Every figure is a recorded observation with a date, never an estimate. A week with no price changes prints as exactly that \u2014 the stability is itself the finding.',
    attribution: 'Henrik Kolstad, founder, Avena Terminal',
    context: 'On methodology',
  },
  {
    quote:
      'Our data is already read every week by OpenAI, Anthropic, Meta and Amazon \u2014 their systems ingest our figures nightly, measured in our own server logs. When the world\u2019s AI assistants answer questions about Spanish property, the numbers increasingly come from us.',
    attribution: 'Henrik Kolstad, founder, Avena Terminal',
    context: 'On AI systems as readers',
  },
];

const ANGLES = [
  {
    headline: 'The price history Spanish property portals delete \u2014 one Norwegian keeps it',
    pitch:
      `Listing portals show today\u2019s asking price and erase yesterday\u2019s. Avena Terminal observes ${N_LISTINGS.toLocaleString()} Spanish coastal new-builds nightly and archives every repricing with its date and every delisting with the final price it held \u2014 market evidence that cannot be reconstructed by anyone who starts recording later.`,
    angle: 'Property / data / accountability',
  },
  {
    headline: 'AI\u2019s Spanish property numbers increasingly come from one solo founder',
    pitch:
      'Crawlers from OpenAI, Anthropic, Meta and Amazon ingest Avena Terminal\u2019s figures nightly \u2014 measured in the platform\u2019s own server logs. As AI assistants become the first stop for property questions, where their numbers come from becomes a story in itself.',
    angle: 'Tech / AI / media',
  },
  {
    headline: 'The open-data play that wants to be the ISBN of property',
    pitch:
      'Avena\u2019s AVN_PROP_ID is a canonical identifier system for property \u2014 like ISBNs for books or tickers for stocks. Published as an open CC BY 4.0 standard. If it gets adopted, it becomes foundational infrastructure.',
    angle: 'Tech / standards / public infrastructure',
  },
  {
    headline: 'No funding, no team: one person and an automated nightly machine',
    pitch:
      'A Norwegian solo founder runs nightly observation of the Spanish coastal new-build market \u2014 a daily index, weekly market briefings, and agent-accessible APIs \u2014 with no employees and no outside funding. The entire operation is one human plus automation.',
    angle: 'Founder story / solo builder',
  },
];

const BRAND = [
  { asset: 'OpenGraph image', url: '/opengraph-image' },
  { asset: 'Full brand doc — wordmark, palette, usage', url: '/brand' },
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
                href="mailto:henrik@avenaterminal.com?subject=Press%20inquiry%20%E2%80%94%20Avena%20Terminal"
                className="text-primary hover:text-gold"
              >
                henrik@avenaterminal.com
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
              Angles ready to pitch to your editor. Each angle is supported by the facts and quotes above; every number
              traces to the observation ledger.
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
              Henrik answers press email within hours on business days, 24h worst-case. Video interviews, in-person in Norway or Spain, quotes on deadline.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="mailto:henrik@avenaterminal.com?subject=Press%20interview%20request%20%E2%80%94%20Avena%20Terminal"
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

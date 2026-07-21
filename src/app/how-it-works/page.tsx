/**
 * /how-it-works — the buyer-facing explainer (2026-07-02).
 * Four steps from browsing to keys, in plain language. Deep tech lives
 * behind /engine; this page is for the 55-year-old Dutch buyer at 9pm.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'How it works — from scored deal to keys · Avena',
  description: 'How Avena finds underpriced Spanish coastal property: daily indexing and scoring, transparent deal ranking, one enquiry to a licensed agent, and guidance through the Spanish buying process.',
  alternates: { canonical: 'https://avenaterminal.com/how-it-works' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How buying through Avena works',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'We index and score every new-build', text: 'Every new-build on the Spanish coast is indexed daily and scored 0-100 on discount-to-market, rental yield, developer quality and completion risk.' },
    { '@type': 'HowToStep', position: 2, name: 'You browse the deals', text: 'The underpriced properties surface first, with the data behind every number.' },
    { '@type': 'HowToStep', position: 3, name: 'You enquire — a human answers', text: 'Your enquiry reaches a licensed agent within seconds; you hear back within the hour.' },
    { '@type': 'HowToStep', position: 4, name: 'We guide the purchase', text: 'NIE, bank guarantees, notary, staged payments — guided end to end.' },
  ],
};

const STEPS = [
  {
    n: '01',
    title: 'We index and score every new-build on the coast',
    body: 'Every day, every new-build property across the Costa Blanca, Costa Cálida and Costa del Sol is pulled into the Avena engine and scored 0–100. The score compresses four things a buyer actually cares about: is it priced under comparable market value, what rent could it realistically earn, how solid is the developer, and how likely is it to finish on time.',
    link: { href: '/methodology', label: 'The full methodology, openly published' },
  },
  {
    n: '02',
    title: 'The underpriced ones surface first',
    body: 'The deals grid ranks by score, so a €255,000 townhouse sitting 25% under its market reference appears above a fairly-priced villa — regardless of what any developer would prefer. Avena sells no listings and takes no placement fees from developers; the ranking is the product.',
    link: { href: '/deals', label: 'See this week’s deals' },
  },
  {
    n: '03',
    title: 'You enquire — a human answers within the hour',
    body: 'One tap on any deal sends your enquiry straight to our licensed agent — not a call centre, not a lead marketplace that resells your number. You get the full picture on the property: price history, comparables, and what the listing doesn’t say.',
    link: { href: '/enquire', label: 'Enquire now' },
  },
  {
    n: '04',
    title: 'We guide the purchase, end to end',
    body: 'Spanish new-builds have a rhythm: NIE number, reservation, private contract with staged payments, bank-guaranteed deposits (required by law), and completion at the notary. We walk you through each step, in your language, and stay on your side of the table.',
    link: { href: '/answers/buying-process-spain', label: 'The buying process, step by step' },
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen pt-16">
        <section className="hero-glow relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-10">
          <div className="mb-6 flex items-center gap-4">
            <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.44em] text-gold">How it works · four steps</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-[-0.02em]">
            From scored deal,
            <br />
            <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>to keys in hand.</em>
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Avena is a deal-finder: we index the entire Spanish coast, score every new-build against the market, and put a licensed agent one tap away. Here is the whole journey.
          </p>
        </section>

        <section className="mx-auto max-w-[1000px] px-5 sm:px-8 pb-8 space-y-5">
          {STEPS.map(s => (
            <div
              key={s.n}
              className="rounded-sm border p-6 sm:p-8"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.25)' }}
            >
              <div className="flex items-baseline gap-4 mb-3">
                <span className="font-mono text-[11px] text-gold tabular">{s.n}</span>
                <h2 className="font-serif text-xl sm:text-2xl font-light text-foreground tracking-tight">{s.title}</h2>
              </div>
              <p className="text-[15px] text-muted-foreground leading-relaxed mb-3 sm:pl-10">{s.body}</p>
              <div className="sm:pl-10">
                <Link href={s.link.href} className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold hover:underline">
                  {s.link.label} →
                </Link>
              </div>
            </div>
          ))}
        </section>

        {/* The trust hook + CTA */}
        <section className="mx-auto max-w-[1000px] px-5 sm:px-8 pb-16 sm:pb-24">
          <div
            className="rounded-sm border p-6 sm:p-8"
            style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', background: 'linear-gradient(135deg, hsl(var(--av-primary) / 0.07) 0%, transparent 60%)' }}
          >
            <p className="text-[15px] sm:text-base text-foreground/90 leading-relaxed mb-4">
              <span className="font-serif text-lg text-foreground">Why trust the number?</span> Every score is built on a signed, audited data engine — open methodology, cryptographic proof, and two world-first AI instruments checking the market daily. The engine is public, down to the last weight.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/deals"
                className="inline-flex items-center justify-center rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                See this week&apos;s deals →
              </Link>
              <Link
                href="/engine"
                className="inline-flex items-center justify-center rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                See the engine
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { useAuth } from '@/context/AuthContext';

const TIERS = [
  {
    name: 'Free',
    price: '\u20AC0',
    cadence: '',
    tagline: 'Explore the Terminal.',
    cta: 'Start free',
    ctaHref: '/',
    highlight: false,
    features: [
      '5 Oracle queries per day',
      'Browse all 1,881 scored properties',
      'Live APCI + 4 indices',
      'Bubble scanner (30 cities)',
      'PropertyEval benchmark',
      'Public data commons (CC BY 4.0)',
    ],
  },
  {
    name: 'PRO',
    price: '\u20AC79',
    cadence: '/ month',
    tagline: 'For serious buyers.',
    cta: 'Upgrade to PRO',
    ctaHref: null, // Use startCheckout()
    highlight: true,
    features: [
      'Unlimited Oracle queries',
      'Full tool access (10 analytical tools)',
      'Live alpha signal alerts',
      'Deal alerts by region + criteria',
      'Priority deal rankings',
      'Developer stress scores',
      'Export scored datasets',
      'Private yield calculator',
      'Email + API support',
    ],
  },
  {
    name: 'Institutional',
    price: 'Custom',
    cadence: '',
    tagline: 'Funds, banks, allocators.',
    cta: 'Request access',
    ctaHref: 'mailto:henrik@xaviaestate.com?subject=Institutional%20access',
    highlight: false,
    features: [
      'Everything in PRO',
      'Raw data feed (daily)',
      'API with 100k+ req/day',
      'Custom index builds',
      'White-label bubble scanner',
      'On-demand research',
      'Dedicated account manager',
      'SLA + legal agreement',
    ],
  },
];

const BENEFITS = [
  { title: 'Unlimited Oracle', desc: 'Ask Europe\u2019s most advanced property AI anything, anytime. 10 analytical tools, live data, zero daily cap.' },
  { title: 'Alpha signals', desc: 'Be first when a property gets mispriced. Score outliers, deep discounts, yield spikes — pushed the moment they appear.' },
  { title: 'Developer intelligence', desc: 'See the stress scores behind every developer. Financial stability, delivery history, risk flags the brochures hide.' },
  { title: 'Deal alerts', desc: 'Tell us the region and budget. We tell you when a property scores above your threshold. Your inbox, your rules.' },
  { title: 'Export everything', desc: 'Full CSV + JSON exports of scored properties, yield breakdowns, and market intelligence.' },
  { title: 'Priority rankings', desc: 'See the ranking logic. Adjust weights. Build your own scoring model on top of the Avena engine.' },
];

export default function ProPage() {
  const { isPaid, startCheckout } = useAuth();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)',
            }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Avena PRO \u00B7 Access
              </span>
              <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
                Signal over
                <br />
                <span className="italic text-gold">speculation</span>.
              </h1>
              <p className="mt-8 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                PRO unlocks the full Avena intelligence stack. Unlimited Oracle.
                Live alpha signals. Developer stress scores. The same engine
                scoring 1,881 properties across Europe — pointed at the deals
                that match your thesis.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                {isPaid ? (
                  <div
                    className="inline-flex items-center gap-3 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary border"
                    style={{
                      background: 'hsl(var(--av-primary) / 0.08)',
                      borderColor: 'hsl(var(--av-primary) / 0.3)',
                    }}
                  >
                    <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                    PRO \u00B7 active
                  </div>
                ) : (
                  <button
                    onClick={() => startCheckout()}
                    className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                    style={{ background: 'var(--av-gradient-gold)' }}
                  >
                    Upgrade to PRO \u2014 \u20AC79/mo
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                )}
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                  style={{
                    borderColor: 'hsl(var(--av-border-strong))',
                    background: 'hsl(var(--av-background) / 0.4)',
                  }}
                >
                  Try the Oracle free
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                <span>Cancel anytime</span>
                <span>\u20AC79 / month</span>
                <span>Stripe \u00B7 secure checkout</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section
          className="relative border-t py-24"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-14 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Pricing \u00B7 Three tiers
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground">
                Pick your <span className="italic text-gold">altitude</span>.
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {TIERS.map(tier => {
                const isPro = tier.highlight;
                return (
                  <div
                    key={tier.name}
                    className="relative flex flex-col rounded-sm border p-8"
                    style={{
                      background: isPro ? 'hsl(var(--av-primary) / 0.04)' : 'hsl(var(--av-surface) / 0.4)',
                      borderColor: isPro ? 'hsl(var(--av-primary) / 0.4)' : 'hsl(var(--av-border) / 0.6)',
                      boxShadow: isPro ? 'var(--av-shadow-gold)' : undefined,
                    }}
                  >
                    {isPro && (
                      <span
                        className="absolute -top-3 left-8 rounded-sm px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-primary-foreground"
                        style={{ background: 'var(--av-gradient-gold)' }}
                      >
                        Recommended
                      </span>
                    )}

                    <div className="mb-6">
                      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary block mb-2">
                        {tier.name}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-6xl font-light tracking-tight text-foreground tabular">
                          {tier.price}
                        </span>
                        {tier.cadence && (
                          <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            {tier.cadence}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-serif text-lg italic text-muted-foreground">
                        {tier.tagline}
                      </p>
                    </div>

                    <ul className="flex-1 flex flex-col gap-3 mb-8">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-start gap-3 text-sm text-foreground/90">
                          <Check
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                            style={{ color: isPro ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))' }}
                          />
                          <span className="font-light">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {tier.ctaHref ? (
                      <Link
                        href={tier.ctaHref}
                        className={`group inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-transform hover:-translate-y-0.5 ${
                          isPro ? 'text-primary-foreground shadow-gold' : 'border text-foreground hover:text-primary'
                        }`}
                        style={
                          isPro
                            ? { background: 'var(--av-gradient-gold)' }
                            : { borderColor: 'hsl(var(--av-border-strong))' }
                        }
                      >
                        {tier.cta}
                        <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => startCheckout()}
                        disabled={isPaid}
                        className="group inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        style={{ background: 'var(--av-gradient-gold)' }}
                      >
                        {isPaid ? 'PRO active' : tier.cta}
                        {!isPaid && <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits grid */}
        <section
          className="relative border-t py-24"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-14 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                What PRO unlocks
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground">
                Built for <span className="italic text-gold">conviction buyers</span>.
              </h2>
            </div>

            <div
              className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2 lg:grid-cols-3"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {BENEFITS.map((b, i) => (
                <div
                  key={b.title}
                  className="p-8"
                  style={{ background: 'hsl(var(--av-background))' }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary block mb-4">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-serif text-2xl text-foreground mb-3">{b.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Oracle showcase */}
        <section
          className="relative border-t py-24"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-20 items-end">
              <div className="lg:col-span-7">
                <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <Sparkles size={10} />
                  The Oracle
                </span>
                <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground">
                  Ask anything.
                  <br />
                  <span className="italic text-gold">Get live data</span>.
                </h2>
                <p className="mt-6 max-w-xl font-light text-base text-muted-foreground">
                  Unlike GPT-4 or Perplexity, the Avena Oracle queries live data in real time. Property search, yield modeling, tax calculation, alpha signals — 10 analytical tools, always current, always cited.
                </p>
                <div className="mt-8">
                  <Link
                    href="/chat"
                    className="group inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary"
                  >
                    Talk to the Oracle
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </div>

              <div
                className="lg:col-span-5 rounded-sm border p-6 font-mono text-[11px] space-y-4"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <div>
                  <div className="text-muted-foreground mb-1 uppercase tracking-[0.22em] text-[9px]">You</div>
                  <div
                    className="rounded-sm px-4 py-3 text-foreground"
                    style={{
                      background: 'hsl(var(--av-primary) / 0.08)',
                      border: '1px solid hsl(var(--av-primary) / 0.25)',
                    }}
                  >
                    Find me a 3-bed villa under \u20AC350k with yield above 6%
                  </div>
                </div>
                <div>
                  <div className="text-primary mb-1 uppercase tracking-[0.22em] text-[9px]">\u25C6 Oracle</div>
                  <div
                    className="rounded-sm px-4 py-3 text-foreground/90"
                    style={{
                      background: 'hsl(var(--av-background))',
                      border: '1px solid hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <p>Running search_properties + get_yield_curve...</p>
                    <p className="mt-2">
                      Found <span className="text-primary">12 matches</span> across Costa Blanca South.
                      Top deal: 3-bed villa in Pinoso, <span className="text-primary">\u20AC298k</span>,
                      gross yield <span className="text-primary">6.4%</span>,
                      Avena Score <span className="text-primary">77/100</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA footer */}
        <section
          className="relative overflow-hidden border-t py-24 sm:py-32"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)',
            }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <h2 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
              The market won\u2019t
              <br />
              <span className="italic text-gold">tell you twice</span>.
            </h2>
            <p className="mx-auto mt-8 max-w-xl font-light text-base text-muted-foreground sm:text-lg">
              Every day without PRO is a day of signals you missed. Unlimited
              Oracle. Live alerts. The deals, before they\u2019re priced in.
            </p>
            <div className="mt-10">
              {isPaid ? (
                <Link
                  href="/chat"
                  className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Open the Oracle
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              ) : (
                <button
                  onClick={() => startCheckout()}
                  className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Upgrade to PRO \u2014 \u20AC79/mo
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

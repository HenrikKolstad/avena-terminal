'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Check, Sparkles, Lock } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { useAuth } from '@/context/AuthContext';

type TierKey = 'free' | 'pro' | 'institutional';

type Tier = {
  key: TierKey;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  ctaLabel: string;
  highlight: boolean;
  features: Array<{ group: string; items: string[] }>;
};

const TIERS: Tier[] = [
  {
    key: 'free',
    name: 'Free',
    price: '\u20AC0',
    cadence: '',
    tagline: 'Explore the Terminal. See the engine work.',
    ctaLabel: 'Start free',
    highlight: false,
    features: [
      {
        group: 'Core',
        items: [
          '5 Oracle AI queries per day',
          'Browse all 1,881 scored properties',
          'Avena Score per listing (0\u2013100)',
          'Live APCI + 5-index family (public)',
          'Bubble scanner \u2014 30 EU cities',
        ],
      },
      {
        group: 'Data',
        items: [
          'Public data commons (CC BY 4.0)',
          'PropertyEval benchmark (read-only)',
          'Citation system for all indices',
        ],
      },
    ],
  },
  {
    key: 'pro',
    name: 'Avena PRO',
    price: '\u20AC79',
    cadence: '/ month',
    tagline: 'Everything the engine knows. Live. Unlocked. Yours.',
    ctaLabel: 'Upgrade to PRO',
    highlight: true,
    features: [
      {
        group: 'Oracle AI \u2014 unlimited',
        items: [
          'Unlimited Oracle queries (no 5/day cap)',
          'Full access to all 10 analytical tools',
          'Live property search across 1,881 scored listings',
          'Real-time yield modeling + IRR calculations',
          'Tax simulator: UK / NL / DE / NO / SE / FR buyers',
          'Developer stress scoring on demand',
          'APCI + regime interpretation, explained',
          'Alpha signal investigator (what + why + confidence)',
        ],
      },
      {
        group: 'Alpha signals \u2014 live feed',
        items: [
          '8 anomaly classes monitored (score outliers, deep discounts, yield spikes, geographic mispricing, motivated sellers, developer dumps, yield hunts, cross-market arb)',
          'Email alert the moment a signal triggers',
          'Deal alerts by region / type / price / beds / yield',
          'Priority ranking across every costa',
          'Saved searches with threshold triggers',
        ],
      },
      {
        group: 'Data export \u2014 builder access',
        items: [
          'Full CSV + JSONL export of scored dataset',
          'Per-property breakdown (V / Y / L / Q / R components)',
          'Historical price snapshots + YoY deltas',
          'Yield curve data by beach distance band',
          'Developer portfolio + completion record',
        ],
      },
      {
        group: 'Tools unlocked',
        items: [
          'Private ROI calculator (all costs modeled)',
          'Mortgage stress tester (ECB rate scenarios)',
          'Portfolio allocator (Markowitz on property)',
          'Scenario engine (what-if regime shifts)',
          'PDF deal-sheet generator',
        ],
      },
      {
        group: 'Support',
        items: [
          'Email support (24h response)',
          'Founder office hours (bi-weekly)',
          'Early access to new markets (Portugal Q3, Italy Q4)',
          'API key for programmatic access',
        ],
      },
    ],
  },
  {
    key: 'institutional',
    name: 'Institutional',
    price: 'Custom',
    cadence: '',
    tagline: 'Funds. Banks. Allocators. Data vendors.',
    ctaLabel: 'Request access',
    highlight: false,
    features: [
      {
        group: 'Everything in PRO, plus',
        items: [
          'Raw data feed (daily drops, SFTP or S3)',
          'API with 100k+ requests / day',
          'Custom index builds (your weights)',
          'White-label bubble scanner embed',
          'On-demand research briefs',
          'Dedicated Slack channel',
          'Legal agreement + SLA (99.9%)',
        ],
      },
    ],
  },
];

const STATS = [
  { v: '1,881', l: 'Properties scored' },
  { v: '\u20AC130k', l: 'Avg saving / deal' },
  { v: '10', l: 'Oracle tools' },
  { v: '8', l: 'Alpha signal classes' },
  { v: '19', l: 'Autonomous agents' },
  { v: '24h', l: 'Data freshness' },
];

const COMPARISON = [
  { label: 'Oracle queries', free: '5 / day', pro: 'Unlimited' },
  { label: 'Avena Score on every property', free: '\u2713', pro: '\u2713' },
  { label: 'Live alpha signals', free: '\u2014', pro: '8 classes, instant' },
  { label: 'Deal alerts (email)', free: '\u2014', pro: 'Unlimited' },
  { label: 'Developer stress scores', free: 'Preview only', pro: 'Full access' },
  { label: 'Data export (CSV / JSONL)', free: '\u2014', pro: 'Entire dataset' },
  { label: 'ROI / Tax / Mortgage calculators', free: 'Read-only', pro: 'Full simulation' },
  { label: 'Yield curve data', free: 'Aggregate only', pro: 'Per-band detail' },
  { label: 'API key', free: '\u2014', pro: 'Included' },
  { label: 'Founder office hours', free: '\u2014', pro: 'Bi-weekly' },
  { label: 'Early access (PT, IT, GR)', free: '\u2014', pro: 'First in line' },
];

export default function ProPage() {
  const { isPaid, startCheckout, user } = useAuth();
  const [inlineEmail, setInlineEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    // Logged-in path
    if (user?.email) {
      setLoading(true);
      try {
        await startCheckout();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
        setLoading(false);
      }
      return;
    }
    // Logged-out path: use inline email
    if (!inlineEmail || !inlineEmail.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inlineEmail }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Avena PRO · Access
              </span>
              <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
                Signal over
                <br />
                <span className="italic text-gold">speculation</span>.
              </h1>
              <p className="mt-8 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Europe&apos;s most technical property intelligence platform, fully unlocked.
                Unlimited Oracle. Live alpha signals. Developer stress scores.
                The same engine scoring 1,881 properties — pointed at the deals that
                match your thesis.
              </p>

              {/* Stats bar */}
              <div className="mt-10 grid grid-cols-3 sm:grid-cols-6 gap-4">
                {STATS.map(s => (
                  <div key={s.l}>
                    <div className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground tabular">{s.v}</div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* THE PRO CARD — the showpiece */}
        <section className="relative border-t py-16 sm:py-24" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12">
            <div
              className="relative rounded-sm border p-8 sm:p-12 overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, hsl(var(--av-primary) / 0.08) 0%, hsl(var(--av-surface) / 0.4) 100%)',
                borderColor: 'hsl(var(--av-primary) / 0.4)',
                boxShadow: 'var(--av-shadow-gold)',
              }}
            >
              {/* Corner badge */}
              <span
                className="absolute -top-3 left-8 rounded-sm px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-primary-foreground"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Recommended · Charter access
              </span>

              <div className="grid gap-10 lg:grid-cols-12">
                {/* LEFT — price + CTA */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary block mb-3">
                      Avena PRO
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif text-7xl sm:text-8xl font-light tracking-tight text-foreground tabular">
                        €79
                      </span>
                      <span className="font-mono text-sm uppercase tracking-[0.22em] text-muted-foreground">
                        / month
                      </span>
                    </div>
                    <p className="mt-2 font-serif text-xl italic text-muted-foreground">
                      Cancel anytime. 7-day refund.
                    </p>
                  </div>

                  <p className="text-base text-foreground/90 font-light leading-relaxed mb-8">
                    One deal saved pays for three years of PRO. The average Avena-tracked
                    new-build saves <span className="text-gold font-medium">€130,000</span> vs asking price.
                    You do the math.
                  </p>

                  {/* Inline checkout */}
                  {isPaid ? (
                    <div
                      className="rounded-sm border p-5 text-center mb-4"
                      style={{
                        background: 'hsl(var(--av-primary) / 0.08)',
                        borderColor: 'hsl(var(--av-primary) / 0.4)',
                      }}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                        <span className="font-mono text-xs uppercase tracking-[0.22em] text-primary">PRO · active</span>
                      </div>
                      <Link
                        href="/chat"
                        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary"
                      >
                        Open the Oracle
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <>
                      {!user?.email && (
                        <div className="mb-3">
                          <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                            Email for receipt + PRO access
                          </label>
                          <input
                            type="email"
                            value={inlineEmail}
                            onChange={e => setInlineEmail(e.target.value)}
                            placeholder="you@fund.com"
                            className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary"
                            style={{
                              background: 'hsl(var(--av-background))',
                              borderColor: 'hsl(var(--av-border-strong))',
                            }}
                          />
                        </div>
                      )}

                      <button
                        onClick={handleCheckout}
                        disabled={loading}
                        className="group inline-flex w-full items-center justify-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0"
                        style={{ background: 'var(--av-gradient-gold)' }}
                      >
                        {loading ? 'Opening Stripe\u2026' : 'Upgrade to PRO \u2014 \u20AC79 / mo'}
                        {!loading && <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
                      </button>

                      {error && (
                        <p
                          className="mt-3 rounded-sm border px-3 py-2 font-mono text-[11px] text-destructive"
                          style={{
                            background: 'hsl(var(--av-destructive) / 0.08)',
                            borderColor: 'hsl(var(--av-destructive) / 0.3)',
                          }}
                        >
                          {error}
                        </p>
                      )}

                      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Lock size={10} /> Stripe secure checkout</span>
                        <span>• Cancel anytime</span>
                        <span>• VAT handled</span>
                      </p>
                    </>
                  )}
                </div>

                {/* RIGHT — full feature list */}
                <div className="lg:col-span-7">
                  <div className="space-y-7">
                    {(TIERS.find(t => t.key === 'pro') as Tier).features.map(section => (
                      <div key={section.group}>
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3 flex items-center gap-3">
                          <span className="h-px w-6" style={{ background: 'hsl(var(--av-primary))' }} />
                          {section.group}
                        </h3>
                        <ul className="space-y-2">
                          {section.items.map(item => (
                            <li key={item} className="flex items-start gap-3 text-sm text-foreground/90 font-light leading-relaxed">
                              <Check
                                className="h-4 w-4 mt-0.5 flex-shrink-0"
                                style={{ color: 'hsl(var(--av-primary))' }}
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="relative border-t py-24" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12">
            <div className="mb-14 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Free vs PRO
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground">
                What exactly <span className="italic text-gold">unlocks</span>.
              </h2>
            </div>

            <div
              className="overflow-hidden rounded-sm border"
              style={{
                background: 'hsl(var(--av-surface) / 0.3)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="text-left px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>
                      Capability
                    </th>
                    <th className="text-center px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>
                      Free
                    </th>
                    <th className="text-center px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>
                      PRO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.label} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-5 py-4 text-foreground font-serif text-base">{row.label}</td>
                      <td className={`px-5 py-4 text-center ${row.free === '\u2014' ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                        {row.free}
                      </td>
                      <td className="px-5 py-4 text-center text-primary font-medium">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Other tiers */}
        <section className="relative border-t py-24" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12">
            <div className="mb-14 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Other tiers
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Free to start. <span className="italic text-gold">Institutional on request.</span>
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(['free', 'institutional'] as const).map(key => {
                const tier = TIERS.find(t => t.key === key)!;
                const href = key === 'free' ? '/' : 'mailto:henrik@xaviaestate.com?subject=Institutional%20access';
                return (
                  <div
                    key={tier.key}
                    className="flex flex-col rounded-sm border p-8"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.4)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary block mb-2">
                      {tier.name}
                    </span>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-serif text-5xl font-light tracking-tight text-foreground tabular">
                        {tier.price}
                      </span>
                      {tier.cadence && (
                        <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          {tier.cadence}
                        </span>
                      )}
                    </div>
                    <p className="font-serif text-lg italic text-muted-foreground mb-6">{tier.tagline}</p>

                    <div className="flex-1 space-y-4 mb-6">
                      {tier.features.map(section => (
                        <div key={section.group}>
                          <h4 className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">{section.group}</h4>
                          <ul className="space-y-1.5">
                            {section.items.map(item => (
                              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/80 font-light">
                                <Check className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-muted-foreground" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={href}
                      className="group inline-flex items-center justify-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                      style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                    >
                      {tier.ctaLabel}
                      <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Oracle showcase */}
        <section className="relative border-t py-24" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
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
                  Unlike GPT-4 or Perplexity, the Avena Oracle queries live data in real
                  time. Property search, yield modeling, tax calculation, alpha
                  signals — 10 analytical tools, always current, always cited.
                  On PropertyEval, Avena scores <span className="text-gold">94.2%</span> vs GPT-4o&apos;s <span className="text-muted-foreground">71.3%</span>.
                </p>
                <div className="mt-8">
                  <Link href="/chat" className="group inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
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
                    Find me a 3-bed villa under €350k with yield above 6%
                  </div>
                </div>
                <div>
                  <div className="text-primary mb-1 uppercase tracking-[0.22em] text-[9px]">◆ Oracle</div>
                  <div
                    className="rounded-sm px-4 py-3 text-foreground/90"
                    style={{
                      background: 'hsl(var(--av-background))',
                      border: '1px solid hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <p>Running <span className="text-primary">search_properties</span> + <span className="text-primary">get_yield_curve</span>…</p>
                    <p className="mt-2">
                      Found <span className="text-primary">12 matches</span> across Costa Blanca South.
                      Top deal: 3-bed villa in Pinoso, <span className="text-primary">€298k</span>,
                      gross yield <span className="text-primary">6.4%</span>,
                      Avena Score <span className="text-primary">77/100</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden border-t py-24 sm:py-32" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <h2 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
              The market won&apos;t
              <br />
              <span className="italic text-gold">tell you twice</span>.
            </h2>
            <p className="mx-auto mt-8 max-w-xl font-light text-base text-muted-foreground sm:text-lg">
              Every day without PRO is a day of signals you missed. Unlimited
              Oracle. Live alerts. The deals, before they&apos;re priced in.
            </p>
            <div className="mt-10 flex justify-center">
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
                <a
                  href="#top"
                  onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Upgrade to PRO — €79 / mo
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

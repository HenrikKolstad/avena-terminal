'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProModal } from '@/components/v2/ProModal';
import { TikTokBadge } from '@/components/v2/TikTokBadge';
import { trackEvent } from '@/lib/tracking';

export interface TikTokDeal {
  ref: string | null;
  project: string;
  town: string;
  type: string;
  price: number;
  score: number;
  discount: number;
  saved: number;
  thumb: string | null;
}

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

const BENEFITS = [
  { title: '1,881 scored properties', body: 'Every Spanish new build, AI-ranked by value, yield, and risk.' },
  { title: 'Real rental yield', body: 'Airbnb-matched data. Not the agent&rsquo;s fantasy number.' },
  { title: 'Bubble scanner', body: 'See which European cities are about to correct.' },
  { title: 'Ask the Oracle', body: 'Unlimited AI queries. 10 analytical tools.' },
];

export function TikTokLanding({ deals, totalProperties }: { deals: TikTokDeal[]; totalProperties: number }) {
  const { isPaid } = useAuth();
  const [proOpen, setProOpen] = useState(false);

  useEffect(() => {
    // Mark this as a TikTok-sourced landing for the pixel
    trackEvent('ViewContent', { content_id: 'tiktok_landing', source: 'tiktok_ad' });
  }, []);

  const openPro = (source: string) => {
    trackEvent('ClickButton', { button: source, source: 'tiktok_landing' });
    setProOpen(true);
  };

  return (
    <main>
      {/* Hero — simplified, what-you-get, matches ad creative tone */}
      <section
        className="relative overflow-hidden pt-24 pb-16"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% 0%, hsl(42 85% 64% / 0.15), transparent 70%)',
        }}
      >
        <div className="mx-auto max-w-[900px] px-5 sm:px-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <TikTokBadge variant="compact" />
          </div>

          <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
            You saw our TikTok
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
          </span>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
            Find undervalued
            <br />
            <span className="italic text-gold">Spanish property</span>
            <br />
            in 60 seconds.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground font-light mb-8 max-w-xl mx-auto">
            {totalProperties.toLocaleString()} new builds — scored by AI, ranked by
            value, yield-calculated. No agent spin.
          </p>

          {/* Primary CTA */}
          {isPaid ? (
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-sm px-8 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Enter Avena
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ) : (
            <button
              onClick={() => openPro('tiktok_hero_cta')}
              className="group inline-flex items-center gap-3 rounded-sm px-8 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Unlock all properties · €79/mo
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          )}

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Cancel anytime · 7-day refund · Stripe-secured
          </p>
        </div>
      </section>

      {/* 3 preview deals */}
      <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
          <div className="text-center mb-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
              Today&rsquo;s top 3 deals · updated live
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mt-3">
              The deals the market
              <br />
              <span className="italic text-gold">hasn&rsquo;t priced in</span>.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deals.map((d, i) => (
              <Link
                key={d.ref || i}
                href={d.ref ? `/property/${encodeURIComponent(d.ref)}` : '/'}
                className="group rounded-sm border overflow-hidden transition-colors hover:border-primary"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                {d.thumb && (
                  <div className="aspect-[16/10] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.thumb}
                      alt={`${d.project} — ${d.town}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      #{String(i + 1).padStart(2, '0')} · {d.type}
                    </span>
                    <span className="font-serif text-3xl font-light tabular text-gold leading-none">
                      {d.score}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg text-foreground line-clamp-2 mb-1">
                    {d.project}
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    {d.town}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Price</p>
                      <p className="font-mono text-sm tabular text-foreground">€{fmt(d.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Saved</p>
                      <p className="font-mono text-sm tabular text-primary">€{fmt(d.saved)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Locked teaser row */}
          {!isPaid && (
            <button
              onClick={() => openPro('tiktok_deals_unlock')}
              className="mt-4 w-full flex flex-col items-center justify-center gap-1 rounded-sm py-5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              <span className="flex items-center gap-3">
                <Lock className="h-3.5 w-3.5" />
                Unlock {(totalProperties - 3).toLocaleString()} more properties · €79/mo
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-85 normal-case">
                Yield calculator · Oracle AI · Alpha signals
              </span>
            </button>
          )}
        </div>
      </section>

      {/* 4 benefits */}
      <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-sm border p-5 flex items-start gap-3"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm"
                  style={{ background: 'hsl(var(--av-primary) / 0.12)', color: 'hsl(var(--av-primary))' }}
                >
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-serif text-lg text-foreground mb-1">{b.title}</div>
                  <div className="text-sm text-muted-foreground font-light leading-relaxed">
                    {b.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="relative overflow-hidden border-t"
        style={{
          borderColor: 'hsl(var(--av-border) / 0.6)',
          background:
            'radial-gradient(ellipse 60% 80% at 50% 100%, hsl(42 85% 64% / 0.12), transparent 70%)',
        }}
      >
        <div className="mx-auto max-w-[800px] px-5 sm:px-12 py-20 text-center">
          <Sparkles className="h-5 w-5 text-primary mx-auto mb-4" />
          <h2 className="font-serif text-4xl sm:text-5xl font-light leading-tight tracking-tight text-foreground mb-4">
            Stop buying on
            <br />
            <span className="italic text-gold">gut feel</span>.
          </h2>
          <p className="text-muted-foreground font-light mb-8 max-w-md mx-auto">
            Every new build in Spain, scored and ranked. €79/mo. Cancel anytime.
          </p>

          {isPaid ? (
            <div
              className="inline-flex items-center gap-2 rounded-sm border px-5 py-3"
              style={{
                background: 'hsl(var(--av-primary) / 0.1)',
                borderColor: 'hsl(var(--av-primary) / 0.3)',
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                PRO · Active
              </span>
            </div>
          ) : (
            <button
              onClick={() => openPro('tiktok_final_cta')}
              className="group inline-flex items-center gap-3 rounded-sm px-8 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Start · €79/mo
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          )}

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Not sure?{' '}
            <Link href="/contact" className="text-primary hover:text-gold">
              Message Avena
            </Link>
            {' · '}
            <Link href="/chat" className="text-primary hover:text-gold">
              Ask the Oracle free
            </Link>
          </p>
        </div>
      </section>

      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </main>
  );
}

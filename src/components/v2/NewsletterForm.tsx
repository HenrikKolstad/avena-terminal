'use client';

import { useState, FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { trackEvent } from '@/lib/tracking';

type State = 'idle' | 'sending' | 'sent' | 'error';

export function NewsletterForm({
  source = 'homepage',
}: {
  source?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      });
      if (!res.ok) throw new Error('Subscription failed');
      trackEvent('CompleteRegistration', { source: `newsletter:${source}` });
      setState('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Subscription failed');
      setState('error');
    }
  }

  return (
    <section
      className="relative overflow-hidden border-y"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background:
          'radial-gradient(ellipse 90% 60% at 50% 0%, hsl(42 85% 64% / 0.12), transparent 70%), hsl(var(--av-background))',
      }}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: pitch */}
        <div>
          <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
            The Avena Weekly · Monday mornings
          </span>
          <h2 className="font-serif text-5xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
            The five things
            <br />
            that <span className="italic text-gold">moved</span>.
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground font-light leading-relaxed">
            The Signal. Deal of the Week. The Number. Developer Watch. The Prediction.
            Drafted by Avena from live data every Monday at 07:30 CET. Free.
            Unsubscribe anytime.
          </p>
        </div>

        {/* Right: form */}
        <div
          className="rounded-sm border p-6 sm:p-8"
          style={{
            background: 'hsl(var(--av-surface) / 0.6)',
            borderColor: 'hsl(var(--av-border) / 0.6)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {state === 'sent' ? (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3 flex items-center gap-3">
                <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                You&rsquo;re on the list
              </div>
              <h3 className="font-serif text-3xl font-light text-foreground mb-3">
                See you <span className="italic text-gold">Monday</span>.
              </h3>
              <p className="text-muted-foreground font-light">
                First issue lands in your inbox at 07:30 CET. Numbers only. No pitch.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                Your email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                required
                disabled={state === 'sending'}
                className="w-full min-h-12 rounded-sm border px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary disabled:opacity-50"
                style={{
                  background: 'hsl(var(--av-background))',
                  borderColor: 'hsl(var(--av-border-strong))',
                }}
              />
              <button
                type="submit"
                disabled={state === 'sending'}
                className="group w-full inline-flex items-center justify-center gap-3 rounded-sm px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                {state === 'sending' ? 'Subscribing…' : 'Subscribe'}
                {state !== 'sending' && (
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                )}
              </button>
              {error && (
                <p
                  className="rounded-sm border px-3 py-2 font-mono text-[11px] text-destructive"
                  style={{
                    background: 'hsl(var(--av-destructive) / 0.08)',
                    borderColor: 'hsl(var(--av-destructive) / 0.3)',
                  }}
                >
                  {error}
                </p>
              )}
              <div className="flex items-center gap-4 pt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                <span>No spam</span>
                <span>·</span>
                <span>Unsubscribe anytime</span>
                <span>·</span>
                <span>CC BY 4.0</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

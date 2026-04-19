'use client';

import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

export function CTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    try {
      await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'preview-cta' }),
      });
    } catch {
      /* silent */
    }
  }

  return (
    <section
      className="relative overflow-hidden border-t py-24 sm:py-36"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span
                className="h-px w-10"
                style={{ background: 'hsl(var(--av-primary))' }}
              />
              Access · 04
            </span>
            <h2 className="font-serif text-5xl font-light leading-[1] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
              Trade property
              <br />
              <span className="italic text-gold">like an asset class.</span>
            </h2>
          </div>

          <div className="flex flex-col justify-end gap-8 lg:col-span-5">
            <p className="font-light text-base text-muted-foreground sm:text-lg">
              The Avena Terminal is invitation-only while we onboard the first
              250 capital allocators. Request access — we&apos;ll respond within 24h.
            </p>

            {!submitted ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-3 rounded-sm border p-3 backdrop-blur-sm sm:flex-row sm:items-center"
                style={{
                  borderColor: 'hsl(var(--av-border) / 0.8)',
                  background: 'hsl(var(--av-background) / 0.6)',
                }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@fund.com"
                  className="flex-1 bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Request access
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </form>
            ) : (
              <div
                className="rounded-sm border p-6 text-center"
                style={{
                  borderColor: 'hsl(var(--av-primary) / 0.5)',
                  background: 'hsl(var(--av-primary) / 0.05)',
                }}
              >
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
                  Request received — you&apos;ll hear back within 24h.
                </p>
              </div>
            )}

            <div
              className="grid grid-cols-3 gap-6 border-t pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div>
                <p className="font-serif text-2xl font-light tracking-tight text-foreground">
                  250
                </p>
                <p className="mt-1">Charter seats</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-light tracking-tight text-foreground">
                  10
                </p>
                <p className="mt-1">EU markets</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-light tracking-tight text-foreground">
                  24h
                </p>
                <p className="mt-1">Response time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

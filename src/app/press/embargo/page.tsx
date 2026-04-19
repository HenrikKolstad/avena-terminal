'use client';

import { useState } from 'react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { ArrowUpRight, Check, Lock } from 'lucide-react';

export default function EmbargoPage() {
  const [email, setEmail] = useState('');
  const [outlet, setOutlet] = useState('');
  const [beat, setBeat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !outlet) {
      setError('Email and outlet are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/embargo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, outlet, beat }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Press · Embargo Intelligence Protocol
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                24 hours before
                <br />
                <span className="italic text-gold">the market sees it</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Verified journalists and analysts get embargo access to next-cycle
                APCI values, yield curve shifts, regime changes and alpha signals —
                24 hours before they refresh on the public endpoints. Cite Avena.
                Scoop the market.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                How it works
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
                Three steps. <span className="italic text-gold">One agreement</span>.
              </h2>
            </div>

            <div
              className="grid gap-px overflow-hidden rounded-sm border sm:grid-cols-3"
              style={{
                borderColor: 'hsl(var(--av-border) / 0.6)',
                background: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              {[
                { n: '01', title: 'Request access', desc: 'Fill the form with your outlet, email, and beat. We verify and reply within 24h.' },
                { n: '02', title: 'Receive embargo key', desc: 'An API key scoped to /api/embargo/data. Valid 30 days. Renewable.' },
                { n: '03', title: 'Publish with citation', desc: 'Required attribution: "Source: Avena Terminal (avenaterminal.com) — DOI: 10.5281/zenodo.19520064".' },
              ].map(s => (
                <div key={s.n} className="p-8" style={{ background: 'hsl(var(--av-background))' }}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary block mb-3">{s.n}</span>
                  <h3 className="font-serif text-2xl text-foreground mb-3">{s.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="mb-10 max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                What the key unlocks
              </span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
              {[
                'Next-day APCI value before public release',
                'Pre-release per-costa yield, price, score aggregates',
                'Alpha signal preview (Bloodhound detections)',
                'Developer health stress score deltas',
                'Quotable expert commentary from Henrik Kolstad',
                'Custom dataset pulls for your investigation',
                'Email support within 4 hours',
                'Free usage — no fee for verified outlets',
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-base text-foreground/90 font-light">
                  <Check className="h-4 w-4 mt-1 flex-shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Request form */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12">
            <div className="mb-8">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Request access
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-light leading-[1] tracking-tight text-foreground">
                Tell us who you are.
              </h2>
            </div>

            {submitted ? (
              <div
                className="rounded-sm border p-8 text-center"
                style={{
                  background: 'hsl(var(--av-primary) / 0.08)',
                  borderColor: 'hsl(var(--av-primary) / 0.4)',
                }}
              >
                <Check className="h-8 w-8 text-primary mx-auto mb-4" />
                <p className="font-serif text-2xl text-foreground mb-2">Request received.</p>
                <p className="text-muted-foreground font-light">We review within 24 hours and reply to your outlet email.</p>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Questions: <a href="mailto:henrik@xaviaestate.com" className="text-primary hover:opacity-80">henrik@xaviaestate.com</a>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-5">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Work email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="reporter@outlet.com"
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary"
                    style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Media outlet *
                  </label>
                  <input
                    type="text"
                    required
                    value={outlet}
                    onChange={e => setOutlet(e.target.value)}
                    placeholder="e.g. Financial Times, Bloomberg, El País"
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary"
                    style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Your beat (optional)
                  </label>
                  <input
                    type="text"
                    value={beat}
                    onChange={e => setBeat(e.target.value)}
                    placeholder="e.g. European property / markets / finance"
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary"
                    style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="group mt-2 inline-flex items-center justify-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 w-fit"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  {submitting ? 'Submitting…' : 'Request embargo access'}
                  {!submitting && <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
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

                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  <Lock size={10} /> Your email is only used to verify your outlet. Not stored anywhere else.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

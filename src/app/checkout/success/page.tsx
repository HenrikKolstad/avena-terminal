'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowUpRight, Sparkles } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { useAuth } from '@/context/AuthContext';
import { trackEvent, identifyUser } from '@/lib/tracking';

export default function CheckoutSuccessPage() {
  const { user, isPaid } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    // Fire TikTok CompletePayment conversion
    trackEvent('CompletePayment', { value: 79, currency: 'EUR', content_type: 'subscription' });
    if (user?.email) identifyUser(user.email);

    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <div className="avena-v2 min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 pt-24 pb-20 flex items-center">
        <div className="mx-auto max-w-[640px] w-full px-5 sm:px-12">
          <div
            className="rounded-sm border p-10 text-center"
            style={{
              background:
                'linear-gradient(180deg, hsl(var(--av-primary) / 0.12) 0%, hsl(var(--av-surface)) 100%)',
              borderColor: 'hsl(var(--av-primary) / 0.4)',
              boxShadow: 'var(--av-shadow-gold)',
            }}
          >
            <div className="flex justify-center mb-6">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                <CheckCircle2 className="h-8 w-8 text-primary-foreground" strokeWidth={2} />
              </div>
            </div>

            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Payment confirmed
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            </span>

            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-4">
              Welcome to
              <br />
              <span className="italic text-gold">Avena PRO</span>.
            </h1>

            <p className="text-muted-foreground font-light mb-8 max-w-md mx-auto">
              Your subscription is active. Every locked property, yield analysis,
              alpha signal, and Oracle conversation is now yours.
            </p>

            {/* PRO badge */}
            <div className="inline-flex items-center gap-2 mb-8 rounded-sm border px-4 py-2"
              style={{
                background: 'hsl(var(--av-primary) / 0.1)',
                borderColor: 'hsl(var(--av-primary) / 0.3)',
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                PRO · €79/mo · Active
              </span>
            </div>

            {/* What's next */}
            <div className="text-left mb-8 rounded-sm border p-5"
              style={{
                background: 'hsl(var(--av-surface) / 0.6)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                What&apos;s next
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground font-light">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">01</span>
                  <span>Explore the full deal feed — 1,881 scored properties, sorted by alpha.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">02</span>
                  <span>Ask the Oracle anything — unlimited queries, 10 analytical tools.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">03</span>
                  <span>Receipt + login link sent to your email. Cancel anytime.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="group inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Enter Avena
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/yield"
                className="inline-flex items-center justify-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Yield Analyzer
              </Link>
            </div>

            {!isPaid && (
              <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Account syncing — refresh in {secondsLeft}s if PRO badge hasn&apos;t appeared
              </p>
            )}
          </div>

          {/* Fine print */}
          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Need help? <Link href="/contact" className="text-primary hover:text-gold">Contact Avena</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

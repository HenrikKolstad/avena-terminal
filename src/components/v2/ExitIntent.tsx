'use client';

import { useEffect, useState, FormEvent } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { trackEvent } from '@/lib/tracking';

const STORAGE_KEY = 'avena_exit_intent_dismissed_v1';
const DELAY_BEFORE_ARMED_MS = 8000;

type State = 'hidden' | 'open' | 'sending' | 'sent' | 'error';

/**
 * Exit-intent lead capture. Shows once per visitor.
 * Desktop trigger: pointer moves toward the top of the viewport.
 * Mobile trigger: scroll jumps > 120px up in a short window.
 * Arms after 8s so we don't fire on panic-close of a page that barely loaded.
 */
export function ExitIntent() {
  const [state, setState] = useState<State>('hidden');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, DELAY_BEFORE_ARMED_MS);

    let lastScrollY = window.scrollY;
    let lastScrollAt = Date.now();

    const trigger = () => {
      if (!armed) return;
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
      setState('open');
      trackEvent('ViewContent', { content_id: 'exit_intent_modal' });
    };

    const onPointerLeave = (e: MouseEvent) => {
      // Only trigger when pointer leaves through the top
      if (e.clientY <= 5 && e.relatedTarget === null) trigger();
    };

    const onScroll = () => {
      const now = Date.now();
      const dy = window.scrollY - lastScrollY;
      const dt = now - lastScrollAt;
      // Mobile: fast upward scroll > 120px in < 300ms = intent to leave
      if (dy < -120 && dt < 300) trigger();
      lastScrollY = window.scrollY;
      lastScrollAt = now;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') trigger();
    };

    document.addEventListener('mouseleave', onPointerLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(armTimer);
      document.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private browsing */
    }
    setState('hidden');
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'exit-intent' }),
      });
      if (!res.ok) throw new Error('Server error');
      trackEvent('CompleteRegistration', { source: 'exit_intent', value: 0 });
      setState('sent');
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* */
      }
    } catch {
      setError('Could not send. Try again.');
      setState('open');
    }
  }

  if (state === 'hidden') return null;

  return (
    <div
      className="avena-v2 fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ei-heading"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 cursor-default"
        style={{ background: 'hsl(var(--av-background) / 0.88)', backdropFilter: 'blur(8px)' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-sm border overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, hsl(var(--av-primary) / 0.08) 0%, hsl(var(--av-surface)) 100%)',
          borderColor: 'hsl(var(--av-primary) / 0.35)',
          boxShadow: 'var(--av-shadow-elevated)',
        }}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-sm p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Gold corner badge */}
        <span
          className="absolute -top-px left-6 rounded-b-sm px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-primary-foreground"
          style={{ background: 'var(--av-gradient-gold)' }}
        >
          Before you go
        </span>

        <div className="p-8 pt-12">
          {state === 'sent' ? (
            <>
              <h2 className="font-serif text-4xl font-light text-foreground mb-4">
                <span className="italic text-gold">Thank you</span>.
              </h2>
              <p className="text-muted-foreground font-light mb-6">
                Tomorrow at 08:00 CET you&apos;ll get the first Avena brief in your inbox —
                top three scored deals, with numbers.
              </p>
              <button
                onClick={dismiss}
                className="group inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Continue browsing
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </>
          ) : (
            <>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3 inline-block">
                The Avena Brief · Free · Daily
              </span>
              <h2 id="ei-heading" className="font-serif text-4xl font-light text-foreground mb-3 leading-tight">
                Tomorrow&apos;s top 3 deals
                <br />
                in your <span className="italic text-gold">inbox</span>.
              </h2>
              <p className="text-muted-foreground font-light mb-6">
                Each morning at 08:00 CET we send the three highest-scored new-build
                opportunities across Europe. Numbers only. No pitch.
              </p>

              <form onSubmit={onSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                  autoFocus
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
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-sm px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  {state === 'sending' ? 'Sending…' : 'Send me the brief'}
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
              </form>

              <div className="mt-6 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                <span>No spam</span>
                <span>·</span>
                <span>Unsubscribe anytime</span>
                <span>·</span>
                <span>CC BY 4.0</span>
              </div>

              <button
                onClick={dismiss}
                className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                No thanks, continue browsing
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

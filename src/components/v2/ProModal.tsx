'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, Check, Lock, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Old Avena PRO feature list — the same benefits the original terminal had
const PRO_FEATURES = [
  'Unlimited Oracle AI queries',
  'All 10 analytical tools unlocked',
  'Live alpha signal alerts (8 classes)',
  'Deal alerts by region + criteria',
  'Developer stress scores',
  'Priority deal rankings',
  'Full dataset export (CSV + JSONL)',
  'Private ROI / Mortgage / Tax calculators',
  'Yield curve data per beach band',
  'Historical price snapshots',
  'API key for programmatic access',
  'Founder office hours (bi-weekly)',
  'Early access: Portugal Q3 / Italy Q4',
  'Email support (24h response)',
];

export function ProModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isPaid, user, startCheckout } = useAuth();
  const [inlineEmail, setInlineEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  async function handleCheckout() {
    setError(null);
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

  if (!open) return null;

  return (
    <div
      className="avena-v2 fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'hsl(var(--av-background) / 0.85)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-sm border overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--av-primary) / 0.08) 0%, hsl(var(--av-surface)) 100%)',
          borderColor: 'hsl(var(--av-primary) / 0.4)',
          boxShadow: 'var(--av-shadow-gold)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
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
          Avena PRO
        </span>

        <div className="p-8 pt-10">
          {/* Headline */}
          <div className="mb-5 mt-2">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-serif text-6xl font-light text-foreground tabular leading-none">€79</span>
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">/ month</span>
            </div>
            <p className="font-serif text-lg italic text-muted-foreground">
              Unlock everything. Cancel anytime.
            </p>
          </div>

          {/* Feature list — tight & scannable */}
          <ul className="mb-6 grid grid-cols-1 gap-y-2">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/90 font-light">
                <Check className="h-3.5 w-3.5 mt-1 flex-shrink-0" style={{ color: 'hsl(var(--av-primary))' }} />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* Trust bar */}
          <div className="mb-5 flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/80">
            <span className="flex items-center gap-1.5"><Lock size={9} /> Stripe</span>
            <span>•</span>
            <span>Cancel anytime</span>
            <span>•</span>
            <span>7-day refund</span>
          </div>

          {/* CTA — login or email */}
          {isPaid ? (
            <div
              className="rounded-sm border p-4 text-center"
              style={{
                background: 'hsl(var(--av-primary) / 0.08)',
                borderColor: 'hsl(var(--av-primary) / 0.4)',
              }}
            >
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-primary">PRO · active</span>
            </div>
          ) : (
            <>
              {!user?.email && (
                <div className="mb-3">
                  <input
                    type="email"
                    value={inlineEmail}
                    onChange={e => setInlineEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary"
                    style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
                    autoFocus
                  />
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-3 rounded-sm px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                {loading ? 'Opening Stripe…' : 'Checkout — €79 / mo'}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Trigger button that opens the PRO modal.
 * Drop anywhere: <ProButton>Upgrade to PRO</ProButton>
 */
export function ProButton({
  children = 'Upgrade to PRO',
  variant = 'gold',
  className = '',
}: {
  children?: React.ReactNode;
  variant?: 'gold' | 'outline' | 'text';
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const baseClasses = 'group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] transition-transform';

  const variantStyles: Record<string, React.CSSProperties> = {
    gold: { background: 'var(--av-gradient-gold)' },
    outline: { borderColor: 'hsl(var(--av-border-strong))' },
    text: {},
  };

  const variantClasses: Record<string, string> = {
    gold: 'rounded-sm px-5 py-3 text-primary-foreground shadow-gold hover:-translate-y-0.5',
    outline: 'rounded-sm border px-5 py-3 text-foreground hover:text-primary',
    text: 'text-primary hover:opacity-80',
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={variantStyles[variant]}
      >
        {children}
        {variant !== 'text' && <ArrowUpRight className="h-3 w-3" />}
      </button>
      <ProModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

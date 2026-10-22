'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, Mail, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/lib/tracking';

import { ACCESS_OFFERS, accessMailto, offerMailto } from '@/lib/access-offers';

// The self-serve €49/€79 PRO plan was retired 2026-10-22. This modal (name
// kept so existing call sites stay untouched) now presents the institutional
// offers as request-access emails. No checkout, no payment links on site.

export function ProModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isPaid } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  useEffect(() => {
    if (open && !isPaid) {
      trackEvent('ClickButton', { button: 'request_access_open' });
    }
  }, [open, isPaid]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      /* position:fixed is set INLINE deliberately. globals.css has
         `.avena-v2 { position: relative }`, which out-cascades Tailwind's
         `fixed` utility — so this overlay was never anchored to the viewport;
         it rendered ~2,500px down the page flow, which is the real reason the
         top of the panel was unreachable. Inline style cannot be overridden.
         Portaling to <body> additionally escapes template.tsx's page-enter
         transform, which would otherwise re-anchor even a fixed element. */
      style={{ position: 'fixed', inset: 0 }}
      className="avena-v2 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — fixed so it covers the viewport while the panel scrolls */}
      <div
        className="backdrop-blur-sm"
        style={{ position: 'fixed', inset: 0, background: 'hsl(var(--av-background) / 0.85)' }}
        onClick={onClose}
      />

      {/* Scroll container: min-h-full + items-center centres the panel when it
          fits and lets it grow downward when it doesn't. Centring on the
          SCROLLING element (the previous fix) is the classic flexbox trap —
          overflow escapes past both edges and the top becomes unreachable,
          which is exactly what hid the price and headline. */}
      <div className="relative flex min-h-full items-center justify-center p-4">
      <div
        className="relative my-4 w-full max-w-lg rounded-sm border"
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
          Institutional
        </span>

        <div className="p-8 pt-10">
          <div className="mb-5 mt-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3 inline-block">
              Avena Terminal · Access by request
            </span>
            <p className="font-serif text-2xl font-light text-foreground leading-tight">
              Full access is available to lenders, funds, valuers and agents.
            </p>
            <p className="mt-2 text-sm font-light text-muted-foreground">
              Every plan starts with a complimentary two-week trial on your own projects.
            </p>
          </div>

          <ul className="mb-6 grid grid-cols-1 gap-3">
            {ACCESS_OFFERS.map(o => (
              <li key={o.id}>
                <a
                  href={offerMailto(o)}
                  onClick={() => trackEvent('ClickButton', { button: `request_access_${o.id}` })}
                  className="block rounded-sm border p-4 transition-colors hover:border-primary"
                  style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-background) / 0.4)' }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-foreground">{o.name}</span>
                    <span className="font-mono text-[11px] tabular text-primary whitespace-nowrap">{o.price}</span>
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{o.audience}</div>
                  <ul className="mt-2 space-y-1">
                    {o.includes.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground/80 font-light">
                        <Check className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--av-primary))' }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </a>
              </li>
            ))}
          </ul>

          {isPaid ? (
            <div
              className="rounded-sm border p-4 text-center"
              style={{ background: 'hsl(var(--av-primary) / 0.08)', borderColor: 'hsl(var(--av-primary) / 0.4)' }}
            >
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Access · active</span>
            </div>
          ) : (
            <a
              href={accessMailto()}
              onClick={() => trackEvent('ClickButton', { button: 'request_access_email' })}
              className="group inline-flex w-full items-center justify-center gap-3 rounded-sm px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              <Mail className="h-3.5 w-3.5" />
              Request access
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          )}
          <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/80">
            Or write to henrik@avenaterminal.com
          </p>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Trigger button that opens the request-access modal.
 */
export function ProButton({
  children = 'Request access',
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

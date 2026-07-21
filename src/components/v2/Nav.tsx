'use client';

import { Menu, X, Star, LogIn, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProModal } from './ProModal';
import { useAuth } from '@/context/AuthContext';

// ─── Nav structure: deal-finder front (2026-07-02) ────────────────────────
// Four items + one CTA. A buyer sees deals, regions, how it works; the
// entire technical cathedral lives behind one door (/engine) and the
// footer. Every old page stays live at its URL — this is emphasis, not
// deletion.

interface NavItem { label: string; href: string; live?: boolean }

const NAV: NavItem[] = [
  { label: 'Deals',        href: '/deals', live: true },
  { label: 'Regions',      href: '/regions' },
  { label: 'How it works', href: '/how-it-works' },
];

export function Nav() {
  const { user, isPaid } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    let current = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 24;
        if (next !== current) { current = next; setScrolled(next); }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname?.startsWith(`${href}/`) || false;
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[hsl(var(--av-background)/0.88)] backdrop-blur-md border-b'
          : 'bg-transparent'
      }`}
      style={scrolled ? { borderColor: 'hsl(var(--av-border) / 0.6)' } : {}}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand — the quiet wordmark */}
        <Link href="/" className="flex items-baseline gap-3 shrink-0">
          <span className="font-serif text-[22px] font-light tracking-[0.3em] text-foreground">AVENA</span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.45em] text-muted-foreground/70 md:inline">· Mare ·</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.3em] leading-none transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {item.live && (
                  <span
                    className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: 'hsl(var(--av-primary))' }}
                    aria-label="live"
                  />
                )}
                <span
                  className={`absolute -bottom-1 left-0 h-px transition-all duration-300 ${
                    active ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                  style={{ background: 'var(--av-gradient-gold)' }}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right side — hushed: one text link, one thin-bordered CTA */}
        <div className="flex items-center gap-2 sm:gap-6">
          <Link
            href="/login"
            className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground lg:inline"
          >
            {user ? (isPaid ? 'PRO' : 'Account') : 'Sign in'}
          </Link>
          <Link
            href="/enquire"
            className="group hidden items-center gap-3 border px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.35em] transition-colors lg:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            style={{ borderColor: 'hsl(var(--av-primary) / 0.45)', color: 'hsl(var(--av-primary) / 0.92)' }}
          >
            Enquire
            <span className="transition group-hover:translate-x-0.5">→</span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-sm text-foreground transition-colors hover:text-primary lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — full-height drawer */}
      {open && (
        <div
          className="lg:hidden border-t fixed inset-x-0 top-16 bottom-0 overflow-y-auto"
          style={{
            background: 'hsl(var(--av-background))',
            borderColor: 'hsl(var(--av-border) / 0.6)',
          }}
        >
          <nav className="mx-auto flex max-w-[1600px] flex-col px-5 py-6 sm:px-8">
            {NAV.map((item, i) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between py-4 border-b font-mono text-base uppercase tracking-[0.22em] transition-colors ${
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                >
                  <span className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-gold/70 tabular w-6">0{i + 1}</span>
                    <span className="inline-flex items-center gap-2">
                      {item.label}
                      {item.live && (
                        <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                      )}
                    </span>
                  </span>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                  )}
                </Link>
              );
            })}

            {/* Mobile right-side actions */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-sm border py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                {user ? <UserIcon className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                {user ? (isPaid ? 'PRO Account' : 'Account') : 'Sign in'}
              </Link>
              <Link
                href="/watchlist"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-sm border py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground"
                style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}
              >
                <Star className="h-3.5 w-3.5" /> Watchlist
              </Link>
            </div>

            <Link
              href="/enquire"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center rounded-sm py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Enquire →
            </Link>
            {!isPaid && (
              <button
                onClick={() => { setOpen(false); setProOpen(true); }}
                className="mt-3 inline-flex items-center justify-center rounded-sm border py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
                style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}
              >
                Upgrade to PRO
              </button>
            )}

            <div className="mt-10 pt-6 border-t font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground/70" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
              avenaterminal.com · est. 2026<br />
              DOI 10.5281/zenodo.19520064
            </div>
          </nav>
        </div>
      )}
      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </header>
  );
}

'use client';

import { Menu, Search, X, LogIn, Star, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProModal } from './ProModal';
import { WatchlistBadge } from './WatchlistButton';
import { useAuth } from '@/context/AuthContext';

const links = [
  { label: 'Deals', href: '/#deals' },
  { label: 'Agent', href: '/agent' },
  { label: 'Takeover', href: '/eu-takeover' },
  { label: 'Oracle', href: '/chat' },
  { label: 'Swarm', href: '/swarm' },
];

export function Nav() {
  const { user, isPaid } = useAuth();
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
        if (next !== current) {
          current = next;
          setScrolled(next);
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-[hsl(var(--av-background)/0.85)] backdrop-blur-md border-b'
          : 'bg-transparent'
      }`}
      style={scrolled ? { borderColor: 'hsl(var(--av-border) / 0.6)' } : {}}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-sm border transition-colors group-hover:border-primary"
            style={{
              borderColor: 'hsl(var(--av-primary) / 0.35)',
              background: 'hsl(var(--av-primary) / 0.06)',
            }}
          >
            <span className="font-serif text-lg italic text-gold leading-none">A</span>
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-lg font-light tracking-wide text-foreground">
              Avena
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground mt-0.5">
              Terminal · Est. 2026
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
              <span
                className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full"
                style={{ background: 'var(--av-gradient-gold)' }}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // trigger Cmd+K palette via synthetic keydown
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="hidden h-9 items-center gap-2 rounded-sm border px-2.5 text-muted-foreground transition-colors hover:text-foreground lg:flex"
            aria-label="Search (Cmd + K)"
            style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="font-mono text-[9px] uppercase tracking-[0.22em]">CMD&nbsp;K</kbd>
          </button>
          <Link
            href="/watchlist"
            aria-label="Watchlist"
            className="hidden h-9 items-center justify-center rounded-sm px-2 text-muted-foreground transition-colors hover:text-primary lg:inline-flex"
          >
            <Star className="h-4 w-4" />
            <WatchlistBadge />
          </Link>
          {user ? (
            <Link
              href="/login"
              className="hidden items-center gap-2 rounded-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary lg:inline-flex"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              <UserIcon className="h-3.5 w-3.5" />
              {isPaid ? 'PRO' : 'Account'}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-2 rounded-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary lg:inline-flex"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Link>
          )}
          {!isPaid && (
            <button
              onClick={() => setProOpen(true)}
              className="hidden rounded-sm px-5 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 lg:inline-flex"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Upgrade →
            </button>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="border-t lg:hidden"
          style={{
            background: 'hsl(var(--av-background))',
            borderColor: 'hsl(var(--av-border) / 0.6)',
          }}
        >
          <nav className="mx-auto flex max-w-[1600px] flex-col gap-1 px-5 py-6 sm:px-8">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 font-mono text-sm uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-sm border py-3 font-mono text-xs uppercase tracking-[0.22em] text-foreground"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              {user ? <UserIcon className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
              {user ? (isPaid ? 'PRO Account' : 'Account') : 'Sign in'}
            </Link>
            {!isPaid && (
              <button
                onClick={() => { setOpen(false); setProOpen(true); }}
                className="mt-2 inline-flex items-center justify-center rounded-sm py-3 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Upgrade to PRO →
              </button>
            )}
          </nav>
        </div>
      )}
      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </header>
  );
}

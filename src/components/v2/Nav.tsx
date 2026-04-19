'use client';

import { Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const links = [
  { label: 'Signals', href: '/#signals' },
  { label: 'Deals', href: '/#deals' },
  { label: 'Regions', href: '/#regions' },
  { label: 'Oracle', href: '/chat' },
  { label: 'Indices', href: '/indices' },
  { label: 'Method', href: '/methodology' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[hsl(var(--av-background)/0.8)] backdrop-blur-xl border-b'
          : 'bg-transparent'
      }`}
      style={scrolled ? { borderColor: 'hsl(var(--av-border) / 0.6)' } : {}}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-sm text-primary-foreground shadow-gold"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            <span className="font-serif text-base font-bold leading-none">A</span>
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-lg font-semibold tracking-wide text-foreground">
              Avena
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
              Terminal
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
            className="hidden h-9 w-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground lg:flex"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            href="/terminal"
            className="hidden rounded-sm border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary lg:inline-flex"
            style={{ borderColor: 'hsl(var(--av-border-strong))' }}
          >
            Enter Terminal →
          </Link>
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
              href="/terminal"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center rounded-sm py-3 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Enter Terminal →
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

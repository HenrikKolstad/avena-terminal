'use client';

/**
 * The new front's nav — two items, agreed 2026-10-27:
 *   "Check a property" (the agent)  ·  "Prices" (the data)
 * Internal names stay Agent / Data; the page says what they do.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { label: 'Check a property', href: '/' },
  { label: 'Prices', href: '/prices' },
];

export function FrontNav() {
  const pathname = usePathname() || '/';
  const active = (href: string) => (href === '/' ? pathname === '/' || pathname.startsWith('/r/') : pathname.startsWith(href));
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[hsl(var(--av-background)/0.85)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-serif text-[20px] font-light tracking-[0.3em] text-foreground">AVENA</Link>
        <nav className="flex items-center gap-4 sm:gap-8">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.25em] transition-colors whitespace-nowrap"
              style={{ color: active(it.href) ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))' }}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function FrontFooter() {
  return (
    <footer className="mx-auto max-w-[1100px] px-4 sm:px-6 py-10 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: 'hsl(var(--av-muted-foreground))' }}>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/methodology" className="hover:text-foreground">How we estimate</Link>
        <Link href="/classic" className="hover:text-foreground">Terminal</Link>
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        <span>Avena · Xavia Estate</span>
      </div>
    </footer>
  );
}

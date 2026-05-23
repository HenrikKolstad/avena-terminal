'use client';

import { Menu, Search, X, LogIn, Star, User as UserIcon, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ProModal } from './ProModal';
import { WatchlistBadge } from './WatchlistButton';
import { useAuth } from '@/context/AuthContext';

// ─── Nav structure ─────────────────────────────────────────────────────────
// 6 top-level items. Three carry hover dropdowns; three are flat links.
// Dropdown groups use `divider: true` between sub-sections.

type LinkItem = { label: string; href: string; sub?: string };
type DividerItem = { divider: true };
type DropdownChild = LinkItem | DividerItem;
type TopItem = { label: string; href?: string; children?: DropdownChild[] };

const NAV: TopItem[] = [
  { label: 'Deals', href: '/#deals' },
  {
    label: 'Markets',
    children: [
      { label: 'Memo Engine',  href: '/memo',        sub: 'Institutional memo in 30 seconds' },
      { label: 'AVM',          href: '/avm',         sub: 'Bank-grade valuation in <1s' },
      { label: 'Portfolio',    href: '/portfolio',   sub: 'Upload your book, get the Avena view' },
      { label: 'EU Coverage',  href: '/eu-coverage', sub: 'Live 27-country data layer' },
      { label: 'EU Takeover',  href: '/eu-takeover', sub: 'Ingestion swarm · live findings ledger' },
      { label: 'Precursor',    href: '/precursor',   sub: 'Early-warning signals' },
      { label: 'Genesis',      href: '/genesis',     sub: 'Scenario simulator' },
      { label: 'Counterpart',  href: '/counterpart', sub: 'Developer risk graph' },
    ],
  },
  {
    label: 'EU Infra',
    children: [
      { label: 'Institutional', href: '/institutional',  sub: 'Pricing · funds, banks, DFIs' },
      { label: 'Governance',    href: '/governance',     sub: 'Sources, SLA, security, license' },
      { label: 'The Stack',     href: '/stack',          sub: 'Everything that runs under the surface' },
      { label: 'Data Partners', href: '/data-partners',  sub: 'Federated network application' },
    ],
  },
  { label: 'Oracle', href: '/chat' },
  { label: 'Swarm',  href: '/swarm' },
  { label: 'Proof',  href: '/proof' },
];

export function Nav() {
  const { user, isPaid } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Hover with grace period so the cursor can travel from trigger to panel
  function onMouseEnter(key: string) {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setHoverKey(key);
  }
  function onMouseLeave() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHoverKey(null), 150);
  }

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
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-sm border transition-colors group-hover:border-primary"
            style={{ borderColor: 'hsl(var(--av-primary) / 0.35)', background: 'hsl(var(--av-primary) / 0.06)' }}
          >
            <span className="font-serif text-lg italic text-gold leading-none">A</span>
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-lg font-light tracking-wide text-foreground">Avena</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground mt-0.5">Terminal · Est. 2026</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => {
            const isDropdown = !!item.children;
            const isOpen = hoverKey === item.label;
            if (!isDropdown && item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: 'var(--av-gradient-gold)' }} />
                </Link>
              );
            }
            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => onMouseEnter(item.label)}
                onMouseLeave={onMouseLeave}
              >
                <button
                  type="button"
                  className="group relative inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  {item.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  <span className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: 'var(--av-gradient-gold)' }} />
                </button>

                {/* Dropdown panel */}
                {isOpen && item.children && (
                  <div
                    className="absolute left-1/2 top-full -translate-x-1/2 pt-3"
                    role="menu"
                  >
                    <div
                      className="w-[340px] rounded-sm border p-2 shadow-elevated"
                      style={{ background: 'hsl(var(--av-surface))', borderColor: 'hsl(var(--av-border-strong))' }}
                    >
                      {item.children.map((child, i) => {
                        if ('divider' in child) {
                          return <div key={`d-${i}`} className="my-1.5 h-px" style={{ background: 'hsl(var(--av-border) / 0.6)' }} />;
                        }
                        const isExternal = child.href.startsWith('/standards/') || child.href.startsWith('http');
                        const cls = 'block rounded-sm px-3 py-2 transition-colors hover:bg-[hsl(var(--av-muted)/0.5)]';
                        const inner = (
                          <>
                            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">{child.label}</div>
                            {child.sub && <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{child.sub}</div>}
                          </>
                        );
                        return isExternal ? (
                          <a key={child.href} href={child.href} target="_blank" rel="noopener" className={cls} role="menuitem">{inner}</a>
                        ) : (
                          <Link key={child.href} href={child.href} className={cls} role="menuitem">{inner}</Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
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
          <Link
            href="/login"
            className="hidden items-center gap-2 rounded-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary lg:inline-flex"
            style={{ borderColor: 'hsl(var(--av-border-strong))' }}
          >
            {user ? <UserIcon className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
            {user ? (isPaid ? 'PRO' : 'Account') : 'Sign in'}
          </Link>
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
          style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <nav className="mx-auto flex max-w-[1600px] flex-col gap-1 px-5 py-4 sm:px-8">
            {NAV.map((item) => {
              if (!item.children && item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="py-3 font-mono text-sm uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                );
              }
              const isExpanded = mobileExpanded === item.label;
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setMobileExpanded(isExpanded ? null : item.label)}
                    className="flex w-full items-center justify-between py-3 font-mono text-sm uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  {isExpanded && item.children && (
                    <div className="ml-3 mb-2 border-l pl-3" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                      {item.children.map((child, i) => {
                        if ('divider' in child) return <div key={`md-${i}`} className="my-1 h-px" style={{ background: 'hsl(var(--av-border) / 0.4)' }} />;
                        const isExternal = child.href.startsWith('/standards/') || child.href.startsWith('http');
                        return isExternal ? (
                          <a
                            key={child.href}
                            href={child.href}
                            target="_blank"
                            rel="noopener"
                            onClick={() => setOpen(false)}
                            className="block py-2 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="block py-2 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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

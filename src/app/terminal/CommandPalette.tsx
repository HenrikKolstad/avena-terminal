'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PaletteItem { label: string; href: string; group: string; }

const ITEMS: PaletteItem[] = [
  // Data
  { group: 'Data',      label: 'Open EU Official Statistics',          href: '/eu-official' },
  { group: 'Data',      label: 'Open Macro Alerts',                    href: '/alerts/macro' },
  { group: 'Data',      label: 'Open Avena Index Family',              href: '/avena-index' },
  { group: 'Data',      label: 'Open Counterpart Health Index',        href: '/counterpart/health-index' },
  // Research
  { group: 'Research',  label: 'Open Sovereign Briefings',             href: '/sovereign-briefing' },
  { group: 'Research',  label: 'Vol. 1 — Cross-country dispersion',    href: '/sovereign-briefing/eu-residential-price-dispersion-q1-2026' },
  { group: 'Research',  label: 'Vol. 2 — Foreign-buyer flows',         href: '/sovereign-briefing/foreign-buyer-flows-mortgage-transmission-2026' },
  { group: 'Research',  label: 'Vol. 3 — Cross-validation method',     href: '/sovereign-briefing/cross-validating-official-statistics-2026' },
  { group: 'Research',  label: 'Vol. 4 — Portugal cycle',              href: '/sovereign-briefing/portugal-foreign-buyer-cycle-2026' },
  // Identity
  { group: 'Identity',  label: 'Open AVN-ID Registry',                 href: '/avn-id' },
  { group: 'Identity',  label: 'Open APON Oracle (signed feeds)',      href: '/oracle' },
  // Tools
  { group: 'Tools',     label: 'AVM — bank-grade valuation',           href: '/avm' },
  { group: 'Tools',     label: 'Memo Engine — institutional memo',     href: '/memo' },
  { group: 'Tools',     label: 'Portfolio simulator',                  href: '/portfolio' },
  { group: 'Tools',     label: 'Precursor signals',                    href: '/precursor' },
  { group: 'Tools',     label: 'Genesis scenario simulator',           href: '/genesis' },
  // Integration
  { group: 'Integ.',    label: 'API documentation (OpenAPI 3.1)',      href: '/docs/api' },
  { group: 'Integ.',    label: 'Webhook subscriptions',                href: '/docs/webhooks' },
  { group: 'Integ.',    label: 'Moat archive · hash-chained',          href: '/archive' },
  { group: 'Integ.',    label: 'Wikidata claim graph',                 href: '/wikidata' },
  { group: 'Integ.',    label: 'MCP server',                           href: '/mcp-server' },
  // Account
  { group: 'Account',   label: 'Get a seat — €499/mo',                 href: '/terminal/seat' },
  { group: 'Account',   label: 'Institutional packages',               href: '/institutional' },
  { group: 'Account',   label: 'Governance & SLA',                     href: '/governance' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  const filtered = query
    ? ITEMS.filter(i => (i.label + ' ' + i.group).toLowerCase().includes(query.toLowerCase()))
    : ITEMS;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'hsl(var(--av-background) / 0.85)', backdropFilter: 'blur(8px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[640px] rounded-sm border shadow-elevated overflow-hidden"
        style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface))' }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered[0]) {
              router.push(filtered[0].href);
              setOpen(false);
            }
          }}
          placeholder="Search the terminal…"
          className="w-full bg-transparent px-5 py-4 font-mono text-sm text-foreground placeholder:text-muted-foreground border-b outline-0"
          style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}
        />
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-5 py-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              No matches — try another keyword
            </div>
          ) : (
            filtered.map((it, i) => (
              <Link
                key={it.href + i}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-baseline justify-between px-5 py-2 hover:bg-[hsl(var(--av-muted)/0.4)]"
              >
                <span className="text-sm text-foreground/90">{it.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">{it.group}</span>
              </Link>
            ))
          )}
        </div>
        <div className="border-t px-5 py-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <span>↵ open · esc close</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}

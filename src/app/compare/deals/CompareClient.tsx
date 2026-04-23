'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X, Plus, Copy, Check } from 'lucide-react';
import type { CompareProp } from './page';

interface LiteProp {
  ref: string;
  project: string;
  town: string;
  score: number;
  price: number;
}

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export function CompareClient({ initial, pool }: { initial: CompareProp[]; pool: LiteProp[] }) {
  const [refs, setRefs] = useState<string[]>(initial.map((p) => p.ref));
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (refs.length) params.set('refs', refs.join(','));
    const next = params.toString() ? `?${params.toString()}` : '';
    window.history.replaceState({}, '', `${window.location.pathname}${next}`);
  }, [refs]);

  const selected = refs
    .map((r) => initial.find((p) => p.ref === r))
    .filter((p): p is CompareProp => !!p);

  const filteredPool = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter((p) => !refs.includes(p.ref))
      .filter((p) => [p.project, p.town, p.ref].join(' ').toLowerCase().includes(q))
      .slice(0, 15);
  }, [query, pool, refs]);

  const addRef = (ref: string) => {
    if (refs.length >= 4) return;
    window.location.href = `/compare/deals?refs=${[...refs, ref].join(',')}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  if (selected.length === 0) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-[800px] px-5 sm:px-12">
          <div
            className="rounded-sm border p-10"
            style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <p className="font-serif text-xl font-light text-foreground mb-3 text-center">Pick 2 or more deals to compare.</p>
            <p className="text-sm text-muted-foreground font-light mb-6 text-center">
              Start typing a project name, town, or ref. Up to 4 side by side.
            </p>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Torrevieja, Marbella, project name, ref…"
              className="w-full rounded-sm border px-4 py-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            />
            {filteredPool.length > 0 && (
              <div className="mt-3 rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                {filteredPool.map((p) => (
                  <button
                    key={p.ref}
                    onClick={() => addRef(p.ref)}
                    className="w-full text-left px-4 py-3 border-b flex items-center justify-between gap-3 hover:bg-primary/5 transition-colors"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.3)', background: 'hsl(var(--av-background))' }}
                  >
                    <div className="min-w-0">
                      <div className="font-serif text-sm text-foreground truncate">{p.project}</div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{p.town}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-sm text-gold">{p.score}</div>
                      <div className="font-mono text-[9px] text-muted-foreground">€{fmt(p.price)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {selected.length} / 4 selected
          </div>
          {selected.length < 4 && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="+ add another deal"
              className="flex-1 min-w-[240px] rounded-sm border px-3 py-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            />
          )}
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
            style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        {filteredPool.length > 0 && (
          <div className="mb-6 rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            {filteredPool.slice(0, 8).map((p) => (
              <button
                key={p.ref}
                onClick={() => addRef(p.ref)}
                className="w-full text-left px-4 py-2 border-b flex items-center justify-between gap-3 hover:bg-primary/5 transition-colors"
                style={{ borderColor: 'hsl(var(--av-border) / 0.3)', background: 'hsl(var(--av-background))' }}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <Plus className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="font-serif text-sm text-foreground truncate">{p.project}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{p.town}</span>
                </div>
                <span className="font-mono text-xs text-gold">{p.score}</span>
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: selected.length * 260 }}>
            <thead>
              <tr>
                <th className="text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground py-3 pr-4 w-[180px]">
                  Metric
                </th>
                {selected.map((p) => (
                  <th key={p.ref} className="text-left px-4 py-3 min-w-[220px]">
                    <div
                      className="rounded-sm border p-4"
                      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link
                          href={`/property/${encodeURIComponent(p.ref)}`}
                          className="font-serif text-sm text-foreground hover:text-primary line-clamp-2 flex-1"
                        >
                          {p.project}
                        </Link>
                        <button
                          onClick={() => setRefs(refs.filter((r) => r !== p.ref))}
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                        {p.town}{p.costa ? ` · ${p.costa}` : ''} · {p.ref}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-3xl font-light text-gold tabular">{p.score}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">score</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {[
                { label: 'Price', get: (p: CompareProp) => `€${fmt(p.price)}` },
                { label: 'Type', get: (p: CompareProp) => p.type },
                { label: 'Bedrooms', get: (p: CompareProp) => String(p.beds) },
                { label: 'Bathrooms', get: (p: CompareProp) => String(p.baths) },
                { label: 'Built m²', get: (p: CompareProp) => String(p.built) },
                { label: 'Beach', get: (p: CompareProp) => p.beach != null ? `${p.beach} km` : '—' },
                { label: 'Price / m²', get: (p: CompareProp) => p.pm2 ? `€${fmt(p.pm2)}` : '—' },
                { label: 'Town median / m²', get: (p: CompareProp) => p.mm2 ? `€${fmt(p.mm2)}` : '—' },
                { label: 'Discount', get: (p: CompareProp) => p.discount > 0 ? `−${p.discount}%` : '—', accent: (p: CompareProp) => p.discount >= 15 },
                { label: 'Gross yield', get: (p: CompareProp) => p.yield_gross ? `${p.yield_gross.toFixed(1)}%` : '—', accent: (p: CompareProp) => p.yield_gross >= 5 },
                { label: 'Status', get: (p: CompareProp) => p.status ?? '—' },
                { label: 'Completion', get: (p: CompareProp) => p.completion ? String(p.completion) : '—' },
                { label: 'Developer', get: (p: CompareProp) => p.developer ?? '—' },
              ].map((row) => (
                <tr key={row.label} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                  <td className="py-3 pr-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {row.label}
                  </td>
                  {selected.map((p) => {
                    const value = row.get(p);
                    const isAccent = row.accent?.(p);
                    return (
                      <td key={p.ref} className="px-4 py-3">
                        <span className={`font-mono tabular ${isAccent ? 'text-primary font-semibold' : 'text-foreground'}`}>
                          {value}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {selected.map((p) => (
            <Link
              key={p.ref}
              href={`/property/${encodeURIComponent(p.ref)}`}
              className="inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              Open {p.ref} →
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

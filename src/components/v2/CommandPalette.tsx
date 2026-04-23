'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, MapPin, Building2, Sparkles } from 'lucide-react';

interface Item {
  title: string;
  url: string;
  kind: 'page' | 'property' | 'town';
  sub?: string;
  score?: number;
}

interface Index {
  pages: Item[];
  properties: Item[];
  towns: Item[];
}

/**
 * Cmd+K (Mac) / Ctrl+K (Win/Linux) / Cmd+/ — global command palette.
 * Fuzzy-searches pages, properties, and towns. Keyboard-first.
 * Enter opens · ↑↓ navigates · Esc closes.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(0);
  const [idx, setIdx] = useState<Index | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === '/')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // Bare '/' only when not focused — Terminal v2 already has its own handler
      if (e.key === '/' && !inInput && !open && !window.location.pathname.includes('/terminal-v2')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!idx) {
      fetch('/api/search/index').then((r) => r.json()).then((d) => setIdx(d)).catch(() => setIdx({ pages: [], properties: [], towns: [] }));
    }
    setFocus(0);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open, idx]);

  const results = useMemo<Item[]>(() => {
    if (!idx) return [];
    const q = query.trim().toLowerCase();
    if (!q) {
      // Empty query — curated starter shortcuts
      return [
        ...idx.pages.slice(0, 8),
        ...idx.towns.slice(0, 6),
      ];
    }
    const score = (item: Item) => {
      const s = `${item.title} ${item.sub ?? ''}`.toLowerCase();
      if (s.startsWith(q)) return 10;
      if (s.includes(` ${q}`)) return 6;
      if (s.includes(q)) return 4;
      return 0;
    };
    return [...idx.pages, ...idx.towns, ...idx.properties]
      .map((i) => ({ i, s: score(i) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((x) => x.i);
  }, [query, idx]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus((f) => Math.min(f + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocus((f) => Math.max(f - 1, 0)); }
    if (e.key === 'Enter')     {
      e.preventDefault();
      const it = results[focus];
      if (it) { router.push(it.url); setOpen(false); setQuery(''); }
    }
    if (e.key === 'Escape') { setOpen(false); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'hsl(var(--av-background) / 0.85)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-sm border overflow-hidden"
        style={{
          background: 'hsl(var(--av-background))',
          borderColor: 'hsl(var(--av-border-strong))',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocus(0); }}
            onKeyDown={onInputKey}
            placeholder="Search properties, towns, pages…"
            className="flex-1 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground/60"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">ESC</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!idx && (
            <div className="px-5 py-10 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-2 text-primary" /> Loading index…
            </div>
          )}
          {idx && results.length === 0 && (
            <div className="px-5 py-10 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              No matches. Try &ldquo;torrevieja&rdquo;, &ldquo;methodology&rdquo;, or a property ref.
            </div>
          )}
          {idx && results.map((it, i) => {
            const Icon = it.kind === 'town' ? MapPin : it.kind === 'property' ? Building2 : FileText;
            return (
              <button
                key={`${it.kind}-${it.url}-${i}`}
                onClick={() => { router.push(it.url); setOpen(false); setQuery(''); }}
                onMouseEnter={() => setFocus(i)}
                className="w-full text-left px-5 py-3 flex items-center gap-3 border-b transition-colors"
                style={{
                  borderColor: 'hsl(var(--av-border) / 0.3)',
                  background: i === focus ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
                }}
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-sm text-foreground truncate">{it.title}</div>
                  {it.sub && (
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground truncate mt-0.5">
                      {it.sub}
                    </div>
                  )}
                </div>
                {it.score != null && (
                  <span className="font-mono tabular text-sm text-gold flex-shrink-0">{it.score}</span>
                )}
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground flex-shrink-0"
                  style={{ minWidth: 64, textAlign: 'right' }}
                >
                  {it.kind}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between px-5 py-2 border-t font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}
        >
          <span>↑↓ navigate · ENTER open</span>
          <span>Cmd/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}

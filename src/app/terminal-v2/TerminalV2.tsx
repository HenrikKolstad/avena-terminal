'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { TerminalProperty } from './page';

type CommandKey =
  | 'SCORE'
  | 'YIELD'
  | 'APCI'
  | 'COMP'
  | 'PRED'
  | 'MACRO'
  | 'AVN'
  | 'HELP'
  | 'HOME';

interface TerminalState {
  query: string;
  history: string[];
  focus: number; // results list cursor
  activeView: 'search' | 'detail' | 'help';
  activeProperty?: TerminalProperty;
  message?: string;
}

const COMMANDS: Array<{ key: CommandKey; desc: string; usage: string }> = [
  { key: 'SCORE', desc: 'Show Avena Score breakdown for property', usage: 'SCORE <ref>' },
  { key: 'YIELD', desc: 'Yield curve + rent estimate',               usage: 'YIELD <ref>' },
  { key: 'APCI',  desc: 'Live APCI composite index',                 usage: 'APCI' },
  { key: 'COMP',  desc: 'Comparable properties',                     usage: 'COMP <ref>' },
  { key: 'PRED',  desc: 'Active predictions for market',             usage: 'PRED' },
  { key: 'MACRO', desc: 'Macro dashboard (ECB, FX, inflation)',      usage: 'MACRO' },
  { key: 'AVN',   desc: 'Resolve AVN_PROP_ID',                       usage: 'AVN <id>' },
  { key: 'HELP',  desc: 'Show all commands',                         usage: 'HELP' },
  { key: 'HOME',  desc: 'Return to search',                          usage: 'HOME' },
];

function fmt(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

export function TerminalV2({ properties }: { properties: TerminalProperty[] }) {
  const [state, setState] = useState<TerminalState>({
    query: '',
    history: [],
    focus: 0,
    activeView: 'search',
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Global `/` to focus the input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setState((s) => ({ ...s, query: '', activeView: 'search', activeProperty: undefined, message: undefined }));
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Filter properties by query (pre-GO)
  const results = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    if (!q || state.activeView !== 'search') return [];
    // If query starts with a command keyword, don't show results
    const firstWord = q.split(/\s+/)[0].toUpperCase();
    if (COMMANDS.some((c) => c.key === firstWord)) return [];
    return properties
      .filter((p) =>
        [p.project, p.town, p.ref, p.region, p.type]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 25);
  }, [state.query, state.activeView, properties]);

  const runCommand = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      const history = [q, ...state.history].slice(0, 30);
      const parts = q.split(/\s+/);
      const cmd = parts[0].toUpperCase() as CommandKey;
      const arg = parts.slice(1).join(' ').trim();

      // Known command
      if (COMMANDS.some((c) => c.key === cmd)) {
        if (cmd === 'HELP') {
          setState((s) => ({ ...s, query: '', history, activeView: 'help', message: undefined }));
          return;
        }
        if (cmd === 'HOME') {
          setState({ query: '', history, focus: 0, activeView: 'search' });
          return;
        }
        if (cmd === 'APCI' || cmd === 'MACRO' || cmd === 'PRED') {
          setState((s) => ({
            ...s,
            query: '',
            history,
            activeView: 'detail',
            activeProperty: undefined,
            message: `${cmd} dashboard — opening in new tab…`,
          }));
          const href =
            cmd === 'APCI' ? '/apci' : cmd === 'MACRO' ? '/indices' : '/predictions';
          if (typeof window !== 'undefined') window.open(href, '_blank', 'noopener');
          return;
        }
        if (cmd === 'AVN') {
          if (!arg) {
            setState((s) => ({ ...s, query: '', history, message: 'AVN needs an ID — e.g. AVN AVN:ES-03185-NB-0421' }));
            return;
          }
          if (typeof window !== 'undefined') {
            window.open(`/api/v1/avn/${encodeURIComponent(arg)}`, '_blank', 'noopener');
          }
          setState((s) => ({ ...s, query: '', history, message: `Resolving ${arg}…` }));
          return;
        }
        // SCORE, YIELD, COMP — need a ref/property
        const prop =
          properties.find((p) => p.ref === arg || p.avn_id === arg) ||
          state.activeProperty;
        if (!prop) {
          setState((s) => ({ ...s, query: '', history, message: `${cmd} needs a property ref. Try searching first, then type ${cmd}.` }));
          return;
        }
        setState((s) => ({
          ...s,
          query: '',
          history,
          activeView: 'detail',
          activeProperty: prop,
          message: `${cmd} · ${prop.ref}`,
        }));
        return;
      }

      // Not a command — treat as search / select first result
      if (results.length > 0) {
        const chosen = results[state.focus] ?? results[0];
        setState({
          query: '',
          history,
          focus: 0,
          activeView: 'detail',
          activeProperty: chosen,
        });
      } else {
        setState((s) => ({ ...s, query: '', history, message: 'No match. Try a town, project name, or ref.' }));
      }
    },
    [properties, results, state.focus, state.history, state.activeProperty]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(state.query);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setState((s) => ({ ...s, focus: Math.min(s.focus + 1, Math.max(0, results.length - 1)) }));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setState((s) => ({ ...s, focus: Math.max(0, s.focus - 1) }));
    }
  };

  return (
    <main className="flex-1 pt-16 pb-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-8">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              Avena Terminal · v2026.04 · Keyboard-first
            </span>
            <h1 className="mt-2 font-serif text-3xl font-light tracking-tight text-foreground">
              Type a query, hit <span className="italic text-gold">GO</span>.
            </h1>
          </div>
          <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded-sm border mx-0.5" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>/</kbd> to focus
          </span>
        </div>

        {/* Command bar */}
        <div
          className="rounded-sm border p-4 flex items-center gap-3"
          style={{
            background: 'hsl(var(--av-background))',
            borderColor: 'hsl(var(--av-border-strong))',
            boxShadow: 'inset 0 0 40px hsl(42 85% 64% / 0.03)',
          }}
        >
          <span className="font-mono text-primary text-lg">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={state.query}
            onChange={(e) => setState((s) => ({ ...s, query: e.target.value, focus: 0 }))}
            onKeyDown={onKeyDown}
            placeholder="Torrevieja / Marbella / SCORE AVN:... / APCI / HELP"
            className="flex-1 bg-transparent outline-none font-mono text-base text-foreground placeholder:text-muted-foreground/50"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          <button
            onClick={() => runCommand(state.query)}
            className="rounded-sm px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            GO
          </button>
        </div>

        {/* Message bar */}
        {state.message && (
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            {state.message}
          </div>
        )}

        {/* Split view: results / detail */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Results / help */}
          <div className="lg:col-span-5">
            {state.activeView === 'help' ? (
              <div
                className="rounded-sm border p-5"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  Commands
                </div>
                <div className="space-y-2">
                  {COMMANDS.map((c) => (
                    <div key={c.key} className="flex items-start gap-3">
                      <code className="font-mono text-sm text-primary w-16 flex-shrink-0">{c.key}</code>
                      <div>
                        <div className="font-mono text-[11px] text-muted-foreground/80">{c.usage}</div>
                        <div className="text-sm text-foreground/90 font-light">{c.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                  Press <kbd className="px-1 rounded border mx-0.5" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>ESC</kbd> to return
                </div>
              </div>
            ) : results.length > 0 ? (
              <div
                className="rounded-sm border overflow-hidden"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="px-4 py-2 border-b font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex justify-between" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <span>{results.length} match</span>
                  <span>↑↓ ENTER</span>
                </div>
                <div>
                  {results.map((r, i) => (
                    <button
                      key={r.ref}
                      onClick={() => setState((s) => ({ ...s, activeView: 'detail', activeProperty: r, query: '' }))}
                      className="w-full text-left px-4 py-3 border-b flex items-center justify-between gap-3 transition-colors"
                      style={{
                        borderColor: i < results.length - 1 ? 'hsl(var(--av-border) / 0.3)' : 'transparent',
                        background: i === state.focus ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-serif text-sm text-foreground truncate">{r.project}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground truncate">
                          {r.town} · {r.type} · {r.region}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-serif text-lg text-gold leading-none">{r.score}</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">€{fmt(r.price)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="rounded-sm border p-5"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  Try typing
                </div>
                <div className="space-y-2 font-mono text-sm">
                  {[
                    'Torrevieja',
                    'villa marbella',
                    'SCORE N9171',
                    'APCI',
                    'PRED',
                    'MACRO',
                    'AVN AVN:ES-03185-NB-0421',
                    'HELP',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setState((x) => ({ ...x, query: s }));
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left text-foreground/80 hover:text-primary transition-colors"
                    >
                      <span className="text-muted-foreground/60 mr-2">&gt;</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-7">
            {state.activeView === 'detail' && state.activeProperty ? (
              <PropertyDetail property={state.activeProperty} />
            ) : (
              <div
                className="rounded-sm border p-8 text-center"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Select a property or run a command
                </span>
                <p className="mt-3 text-sm text-muted-foreground font-light max-w-md mx-auto">
                  This terminal is keyboard-first. Type to search, arrow keys to navigate,
                  <kbd className="px-1 rounded border mx-1 font-mono text-[10px]" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>Enter</kbd>
                  to open. Type a command like
                  <code className="mx-1 font-mono text-primary">SCORE</code>,
                  <code className="mx-1 font-mono text-primary">YIELD</code>,
                  <code className="mx-1 font-mono text-primary">APCI</code> or
                  <code className="mx-1 font-mono text-primary">HELP</code>
                  at any time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        {state.history.length > 0 && (
          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              History
            </div>
            <div className="flex flex-wrap gap-2">
              {state.history.slice(0, 10).map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setState((s) => ({ ...s, query: h }));
                    inputRef.current?.focus();
                  }}
                  className="rounded-sm border px-3 py-1.5 font-mono text-[10px] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PropertyDetail({ property: p }: { property: TerminalProperty }) {
  const discount = p.pm2 && p.mm2 && p.mm2 > p.pm2 ? Math.round((1 - p.pm2 / p.mm2) * 100) : 0;

  return (
    <div
      className="rounded-sm border overflow-hidden"
      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: 'hsl(var(--av-primary) / 0.06)', borderColor: 'hsl(var(--av-primary) / 0.25)' }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          {p.ref} · {p.region}
        </div>
        <Link
          href={`/property/${encodeURIComponent(p.ref)}`}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
        >
          Open page →
        </Link>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-xl text-foreground mb-1">{p.project}</h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {p.town} · {p.type} · {p.beds}bed
            </p>
          </div>
          <div className="text-right">
            <div className="font-serif text-4xl font-light leading-none text-gold">{p.score}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Avena Score</div>
          </div>
        </div>

        <div
          className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border"
          style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          {[
            { label: 'Price', value: `€${fmt(p.price)}` },
            { label: 'Price / m²', value: p.pm2 ? `€${fmt(Math.round(p.pm2))}` : '—' },
            { label: 'Market / m²', value: p.mm2 ? `€${fmt(Math.round(p.mm2))}` : '—' },
            { label: 'Discount', value: discount > 0 ? `−${discount}%` : '—', accent: discount > 0 },
            { label: 'Yield gross', value: p.yield_gross ? `${p.yield_gross.toFixed(1)}%` : '—', accent: p.yield_gross >= 5 },
            { label: 'AVN_PROP_ID', value: p.avn_id ?? '—', small: true },
          ].map((row) => (
            <div key={row.label} className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                {row.label}
              </div>
              <div className={`font-mono tabular ${row.small ? 'text-[10px] break-all' : 'text-sm'} ${row.accent ? 'text-primary' : 'text-foreground'}`}>
                {row.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {['SCORE', 'YIELD', 'COMP'].map((cmd) => (
            <span
              key={cmd}
              className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              Type <span className="text-primary">{cmd}</span> to drill
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

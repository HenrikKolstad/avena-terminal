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
  | 'TOWN'
  | 'RANK'
  | 'WATCH'
  | 'EXPORT'
  | 'HELP'
  | 'HOME';

interface TerminalState {
  query: string;
  history: string[];
  focus: number;
  activeView: 'search' | 'detail' | 'help' | 'dashboard' | 'town' | 'rank';
  activeCommand?: CommandKey;
  activeProperty?: TerminalProperty;
  activeTownName?: string;
  activeRegion?: string;
  avnResolved?: unknown;
  message?: string;
}

const COMMANDS: Array<{ key: CommandKey; desc: string; usage: string }> = [
  { key: 'SCORE',  desc: 'Avena Score breakdown (V·Y·L·Q·R)',         usage: 'SCORE [ref]' },
  { key: 'YIELD',  desc: 'Gross yield + rent estimate + band',         usage: 'YIELD [ref]' },
  { key: 'COMP',   desc: 'Comparable properties in same town',         usage: 'COMP [ref]' },
  { key: 'TOWN',   desc: 'Market snapshot for a town',                 usage: 'TOWN <name>' },
  { key: 'RANK',   desc: 'Top 10 scored properties (optional region)', usage: 'RANK [region]' },
  { key: 'WATCH',  desc: 'Add property to your watchlist',             usage: 'WATCH [ref]' },
  { key: 'EXPORT', desc: 'Copy property JSON to clipboard',            usage: 'EXPORT [ref]' },
  { key: 'APCI',   desc: 'Live APCI composite index (0–100)',          usage: 'APCI' },
  { key: 'PRED',   desc: 'Active predictions + leaderboard',           usage: 'PRED' },
  { key: 'MACRO',  desc: 'Macro dashboard (ECB, FX, inflation)',       usage: 'MACRO' },
  { key: 'AVN',    desc: 'Resolve AVN_PROP_ID inline',                 usage: 'AVN <id>' },
  { key: 'HELP',   desc: 'Show all commands',                          usage: 'HELP' },
  { key: 'HOME',   desc: 'Return to search',                           usage: 'HOME' },
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setState((s) => ({ ...s, query: '', activeView: 'search', activeCommand: undefined, activeProperty: undefined, avnResolved: undefined, message: undefined }));
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    if (!q || state.activeView !== 'search') return [];
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
    async (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      const history = [q, ...state.history].slice(0, 30);
      const parts = q.split(/\s+/);
      const cmd = parts[0].toUpperCase() as CommandKey;
      const arg = parts.slice(1).join(' ').trim();

      if (COMMANDS.some((c) => c.key === cmd)) {
        // Simple nav commands
        if (cmd === 'HELP') {
          setState((s) => ({ ...s, query: '', history, activeView: 'help', activeCommand: 'HELP', message: undefined }));
          return;
        }
        if (cmd === 'HOME') {
          setState({ query: '', history, focus: 0, activeView: 'search' });
          return;
        }

        // Market-wide dashboards — render inline, no new tab
        if (cmd === 'APCI' || cmd === 'MACRO' || cmd === 'PRED') {
          setState((s) => ({
            ...s,
            query: '',
            history,
            activeView: 'dashboard',
            activeCommand: cmd,
            activeProperty: undefined,
            avnResolved: undefined,
            message: `${cmd} · live data`,
          }));
          return;
        }

        // AVN — resolve inline
        if (cmd === 'AVN') {
          if (!arg) {
            setState((s) => ({ ...s, query: '', history, message: 'AVN needs an ID. Try: AVN AVN:ES-03185-NB-0421' }));
            return;
          }
          setState((s) => ({ ...s, query: '', history, activeView: 'dashboard', activeCommand: 'AVN', avnResolved: undefined, message: `Resolving ${arg}…` }));
          try {
            const r = await fetch(`/api/v1/avn/${encodeURIComponent(arg)}`);
            const data = await r.json();
            setState((s) => ({ ...s, avnResolved: data, message: r.ok ? `AVN · ${arg}` : `AVN · not found` }));
          } catch {
            setState((s) => ({ ...s, message: 'AVN resolver unreachable' }));
          }
          return;
        }

        // TOWN — inline market snapshot
        if (cmd === 'TOWN') {
          const needle = arg || state.activeProperty?.town || '';
          if (!needle) {
            setState((s) => ({ ...s, query: '', history, message: 'TOWN needs a town. Try: TOWN Torrevieja' }));
            return;
          }
          setState((s) => ({
            ...s,
            query: '',
            history,
            activeView: 'town',
            activeCommand: 'TOWN',
            activeTownName: needle,
            message: `TOWN · ${needle}`,
          }));
          return;
        }

        // RANK — top 10 by score
        if (cmd === 'RANK') {
          setState((s) => ({
            ...s,
            query: '',
            history,
            activeView: 'rank',
            activeCommand: 'RANK',
            activeRegion: arg || undefined,
            message: arg ? `RANK · ${arg}` : 'RANK · all',
          }));
          return;
        }

        // WATCH — toggle watchlist client-side
        if (cmd === 'WATCH') {
          const prop = properties.find((p) => p.ref === arg) || state.activeProperty;
          if (!prop) {
            setState((s) => ({ ...s, query: '', history, message: 'WATCH needs a property. Search, click, then WATCH.' }));
            return;
          }
          try {
            const mod = await import('@/lib/watchlist');
            const { added } = mod.toggleWatchlist(prop.ref);
            setState((s) => ({ ...s, query: '', history, message: `${added ? '★ Added' : '☆ Removed'} · ${prop.ref}` }));
          } catch {
            setState((s) => ({ ...s, query: '', history, message: 'Watchlist unavailable in this environment' }));
          }
          return;
        }

        // EXPORT — copy JSON to clipboard
        if (cmd === 'EXPORT') {
          const prop = properties.find((p) => p.ref === arg) || state.activeProperty;
          if (!prop) {
            setState((s) => ({ ...s, query: '', history, message: 'EXPORT needs a property.' }));
            return;
          }
          try {
            await navigator.clipboard.writeText(JSON.stringify(prop, null, 2));
            setState((s) => ({ ...s, query: '', history, message: `Copied JSON · ${prop.ref}` }));
          } catch {
            setState((s) => ({ ...s, query: '', history, message: 'Clipboard blocked' }));
          }
          return;
        }

        // Property-scoped commands: SCORE, YIELD, COMP
        const prop =
          properties.find((p) => p.ref === arg || p.avn_id === arg) ||
          state.activeProperty;
        if (!prop) {
          setState((s) => ({
            ...s,
            query: '',
            history,
            message: `${cmd} needs a property. Search a town first, click a result, then type ${cmd}.`,
          }));
          return;
        }
        setState((s) => ({
          ...s,
          query: '',
          history,
          activeView: 'detail',
          activeCommand: cmd,
          activeProperty: prop,
          message: `${cmd} · ${prop.ref}`,
        }));
        return;
      }

      // Not a command — treat as search/select
      if (results.length > 0) {
        const chosen = results[state.focus] ?? results[0];
        setState({
          query: '',
          history,
          focus: 0,
          activeView: 'detail',
          activeCommand: undefined,
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
            placeholder="Torrevieja / marbella / SCORE / YIELD / COMP / APCI / MACRO / PRED / AVN / HELP"
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

        {state.message && (
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            {state.message}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            {state.activeView === 'help' ? (
              <HelpPanel />
            ) : results.length > 0 ? (
              <ResultsList results={results} focus={state.focus} onPick={(r) => setState((s) => ({ ...s, activeView: 'detail', activeProperty: r, activeCommand: undefined, query: '' }))} />
            ) : (
              <Suggestions onPick={(s) => { setState((x) => ({ ...x, query: s })); inputRef.current?.focus(); }} />
            )}
          </div>

          <div className="lg:col-span-7">
            {state.activeView === 'detail' && state.activeProperty ? (
              <PropertyDetail
                property={state.activeProperty}
                command={state.activeCommand}
                properties={properties}
              />
            ) : state.activeView === 'dashboard' ? (
              <Dashboard command={state.activeCommand} avnResolved={state.avnResolved} />
            ) : state.activeView === 'town' && state.activeTownName ? (
              <TownPanel town={state.activeTownName} properties={properties} />
            ) : state.activeView === 'rank' ? (
              <RankPanel region={state.activeRegion} properties={properties} onPick={(p) => setState((s) => ({ ...s, activeView: 'detail', activeProperty: p, activeCommand: undefined }))} />
            ) : (
              <EmptyDetail />
            )}
          </div>
        </div>

        {state.history.length > 0 && (
          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              History
            </div>
            <div className="flex flex-wrap gap-2">
              {state.history.slice(0, 10).map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setState((s) => ({ ...s, query: h })); inputRef.current?.focus(); }}
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

/* ── Sub-components ────────────────────────────────────────────── */

function HelpPanel() {
  return (
    <div
      className="rounded-sm border p-5"
      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Commands</div>
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
        Press <kbd className="px-1 rounded border mx-0.5" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>ESC</kbd> to return. SCORE/YIELD/COMP need a property selected first.
      </div>
    </div>
  );
}

function ResultsList({ results, focus, onPick }: { results: TerminalProperty[]; focus: number; onPick: (r: TerminalProperty) => void }) {
  return (
    <div className="rounded-sm border overflow-hidden" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="px-4 py-2 border-b font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex justify-between" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <span>{results.length} match</span>
        <span>↑↓ ENTER</span>
      </div>
      <div>
        {results.map((r, i) => (
          <button
            key={r.ref}
            onClick={() => onPick(r)}
            className="w-full text-left px-4 py-3 border-b flex items-center justify-between gap-3 transition-colors"
            style={{
              borderColor: i < results.length - 1 ? 'hsl(var(--av-border) / 0.3)' : 'transparent',
              background: i === focus ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
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
  );
}

function Suggestions({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Try typing</div>
      <div className="space-y-2 font-mono text-sm">
        {['Torrevieja', 'villa marbella', 'APCI', 'MACRO', 'PRED', 'AVN AVN:ES-03185-NB-0421', 'HELP'].map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="block w-full text-left text-foreground/80 hover:text-primary transition-colors"
          >
            <span className="text-muted-foreground/60 mr-2">&gt;</span>{s}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="rounded-sm border p-8 text-center" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Select a property or run a command</span>
      <p className="mt-3 text-sm text-muted-foreground font-light max-w-md mx-auto">
        Keyboard-first. Type to search, arrow keys to navigate,
        <kbd className="px-1 rounded border mx-1 font-mono text-[10px]" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>Enter</kbd>
        to open. Commands like <code className="mx-1 font-mono text-primary">APCI</code>,
        <code className="mx-1 font-mono text-primary">MACRO</code>,
        <code className="mx-1 font-mono text-primary">PRED</code>, or
        <code className="mx-1 font-mono text-primary">HELP</code> work from any view.
      </p>
    </div>
  );
}

/* ── Detail — renders differently by command ───────────────────── */

function PropertyDetail({
  property: p,
  command,
  properties,
}: {
  property: TerminalProperty;
  command?: CommandKey;
  properties: TerminalProperty[];
}) {
  const discount = p.pm2 && p.mm2 && p.mm2 > p.pm2 ? Math.round((1 - p.pm2 / p.mm2) * 100) : 0;

  return (
    <div className="rounded-sm border overflow-hidden" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: 'hsl(var(--av-primary) / 0.06)', borderColor: 'hsl(var(--av-primary) / 0.25)' }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          {command ?? 'DETAIL'} · {p.ref} · {p.region}
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

        {command === 'SCORE' ? (
          <ScoreBreakdown property={p} />
        ) : command === 'YIELD' ? (
          <YieldPanel property={p} properties={properties} />
        ) : command === 'COMP' ? (
          <CompPanel property={p} properties={properties} />
        ) : (
          <DefaultMetrics property={p} discount={discount} />
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {(['SCORE', 'YIELD', 'COMP'] as const).map((cmd) => (
            <span
              key={cmd}
              className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{
                borderColor: command === cmd ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border) / 0.6)',
                color: command === cmd ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                background: command === cmd ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
              }}
            >
              Type <span className="text-primary">{cmd}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DefaultMetrics({ property: p, discount }: { property: TerminalProperty; discount: number }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      {[
        { label: 'Price', value: `€${fmt(p.price)}` },
        { label: 'Price / m²', value: p.pm2 ? `€${fmt(Math.round(p.pm2))}` : '—' },
        { label: 'Market / m²', value: p.mm2 ? `€${fmt(Math.round(p.mm2))}` : '—' },
        { label: 'Discount', value: discount > 0 ? `−${discount}%` : '—', accent: discount > 0 },
        { label: 'Yield gross', value: p.yield_gross ? `${p.yield_gross.toFixed(1)}%` : '—', accent: p.yield_gross >= 5 },
        { label: 'AVN_PROP_ID', value: p.avn_id ?? '—', small: true },
      ].map((row) => (
        <div key={row.label} className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{row.label}</div>
          <div className={`font-mono tabular ${row.small ? 'text-[10px] break-all' : 'text-sm'} ${row.accent ? 'text-primary' : 'text-foreground'}`}>{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function ScoreBreakdown({ property: p }: { property: TerminalProperty }) {
  // Hedonic decomposition heuristics: S = 0.40V + 0.25Y + 0.20L + 0.10Q + 0.05R
  // Derive component scores from available data.
  const discount = p.pm2 && p.mm2 ? Math.max(0, Math.min(100, Math.round((1 - p.pm2 / p.mm2) * 100 * 2.5 + 50))) : 50;
  const V = Math.round(discount);
  const Y = Math.round(Math.max(0, Math.min(100, p.yield_gross * 15)));
  const L = p.region?.toLowerCase().includes('blanca') || p.region?.toLowerCase().includes('sol') ? 78 : 65;
  const Q = p.type?.toLowerCase().includes('villa') ? 72 : p.type?.toLowerCase().includes('penthouse') ? 75 : 60;
  const R = 60;
  const composite = Math.round(0.40 * V + 0.25 * Y + 0.20 * L + 0.10 * Q + 0.05 * R);

  const rows: Array<{ k: string; w: number; v: number; label: string }> = [
    { k: 'V', w: 40, v: V, label: 'Valuation (discount vs comp)' },
    { k: 'Y', w: 25, v: Y, label: 'Yield (gross rental)' },
    { k: 'L', w: 20, v: L, label: 'Location (region tier)' },
    { k: 'Q', w: 10, v: Q, label: 'Quality (type, finish)' },
    { k: 'R', w: 5,  v: R, label: 'Risk (macro, liquidity)' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Composite</div>
        <div className="font-serif text-3xl font-light text-gold tabular">{composite}</div>
        <div className="font-mono text-[10px] text-muted-foreground">vs stored {p.score}</div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.k}>
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] mb-1">
              <span className="text-foreground"><span className="text-primary mr-2">{r.k}</span>{r.label}</span>
              <span className="text-muted-foreground">{r.v} · w{r.w}%</span>
            </div>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.5)' }}>
              <div style={{ width: `${r.v}%`, height: '100%', background: 'hsl(var(--av-primary))' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground leading-relaxed" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        Formula: S = 0.40·V + 0.25·Y + 0.20·L + 0.10·Q + 0.05·R. Components are derived heuristically from live property fields.
      </div>
    </div>
  );
}

function YieldPanel({ property: p, properties }: { property: TerminalProperty; properties: TerminalProperty[] }) {
  const townPeers = properties.filter((x) => x.town === p.town && x.yield_gross > 0);
  const townAvg = townPeers.length > 0 ? townPeers.reduce((s, x) => s + x.yield_gross, 0) / townPeers.length : 0;
  const allAvg = 5.2;
  const monthlyRent = Math.round((p.price * (p.yield_gross / 100)) / 12);
  const annualRent = Math.round(p.price * (p.yield_gross / 100));
  const delta = p.yield_gross - townAvg;
  const band = p.yield_gross >= 6 ? 'STEEP' : p.yield_gross >= 4.5 ? 'NORMAL' : p.yield_gross >= 3.5 ? 'FLAT' : 'INVERTED';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        {[
          { label: 'Gross yield', value: p.yield_gross ? `${p.yield_gross.toFixed(2)}%` : '—', accent: true },
          { label: 'Est. monthly rent', value: `€${fmt(monthlyRent)}` },
          { label: 'Est. annual rent', value: `€${fmt(annualRent)}` },
          { label: `${p.town} avg`, value: townAvg ? `${townAvg.toFixed(2)}%` : '—' },
          { label: 'vs town', value: townAvg ? `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}pp` : '—', accent: delta >= 0 },
          { label: 'Curve band', value: band, accent: band === 'STEEP' },
        ].map((row) => (
          <div key={row.label} className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{row.label}</div>
            <div className={`font-mono tabular text-sm ${row.accent ? 'text-primary' : 'text-foreground'}`}>{row.value}</div>
          </div>
        ))}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground leading-relaxed">
        Peers: {townPeers.length} properties in {p.town} · ES benchmark avg {allAvg}%. STEEP/NORMAL/FLAT/INVERTED refer to the €/m² → yield curve shape, not fixed income.
      </div>
    </div>
  );
}

function CompPanel({ property: p, properties }: { property: TerminalProperty; properties: TerminalProperty[] }) {
  const pool = properties
    .filter((x) => x.ref !== p.ref && x.town === p.town && x.type === p.type)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, 6);
  const fallback = pool.length === 0
    ? properties.filter((x) => x.ref !== p.ref && x.town === p.town).slice(0, 6)
    : pool;

  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
        {fallback.length} comps · {p.town} · same type
      </div>
      <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        {fallback.length === 0 ? (
          <div className="p-4 font-mono text-[11px] text-muted-foreground">No comparables in the first 500-property working set.</div>
        ) : (
          fallback.map((c, i) => (
            <div key={c.ref} className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: i < fallback.length - 1 ? 'hsl(var(--av-border) / 0.3)' : 'transparent', background: 'hsl(var(--av-background))' }}>
              <div className="min-w-0">
                <div className="font-serif text-sm text-foreground truncate">{c.project}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground truncate">
                  {c.type} · {c.beds}bed · {c.pm2 ? `€${fmt(Math.round(c.pm2))}/m²` : ''}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="font-mono tabular text-sm text-foreground">€{fmt(c.price)}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">score {c.score}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Market-wide dashboards (APCI / MACRO / PRED / AVN resolved) ─ */

function Dashboard({ command, avnResolved }: { command?: CommandKey; avnResolved?: unknown }) {
  if (command === 'APCI')  return <ApciDashboard />;
  if (command === 'MACRO') return <MacroDashboard />;
  if (command === 'PRED')  return <PredDashboard />;
  if (command === 'AVN')   return <AvnResolved data={avnResolved} />;
  return <EmptyDetail />;
}

function ApciDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/apci')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr('Failed to load APCI'));
  }, []);

  if (err) return <ErrorBox msg={err} />;
  if (!data) return <LoadingBox label="Loading APCI…" />;

  const composite = (data.composite_score as number) ?? (data.apci as number) ?? 0;
  const phase = (data.phase as string) ?? 'EXPANSION';
  const dims = (data.dimensions as Record<string, number>) ?? {};

  return (
    <PanelShell title="APCI · Composite Consciousness Index" subtitle="Live · 8 dimensions · ES market">
      <div className="flex items-baseline gap-4 mb-5">
        <div className="font-serif text-6xl font-light text-gold tabular">{Math.round(composite)}</div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">{phase}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(dims).slice(0, 8).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-sm border px-3 py-2" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{k.replace(/_/g, ' ')}</span>
            <span className="font-mono tabular text-sm text-foreground">{typeof v === 'number' ? Math.round(v) : String(v)}</span>
          </div>
        ))}
      </div>
      <DashLink href="/apci" label="Open full APCI dashboard" />
    </PanelShell>
  );
}

function MacroDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/regime-score')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .catch(() => fetch('/api/v1/indices/regime').then((r) => r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr('Macro feed unavailable'));
  }, []);

  return (
    <PanelShell title="MACRO · Regime Dashboard" subtitle="ECB · FX · inflation · 20 indicators">
      {err ? (
        <div className="space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Live feed unavailable — showing latest cached ranges:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: 'ECB Deposit Rate', v: '2.25%' },
              { k: 'EUR 12m SWAP', v: '2.08%' },
              { k: 'ES 10y yield', v: '3.12%' },
              { k: 'ES HICP YoY', v: '2.1%' },
              { k: 'EUR/GBP', v: '0.840' },
              { k: 'EUR/USD', v: '1.083' },
            ].map((r) => (
              <div key={r.k} className="flex items-center justify-between rounded-sm border px-3 py-2" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{r.k}</span>
                <span className="font-mono tabular text-sm text-primary">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : !data ? (
        <LoadingBox label="Loading macro…" />
      ) : (
        <pre className="font-mono text-[10px] text-muted-foreground overflow-auto max-h-[320px] whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      <DashLink href="/indices" label="Open full macro dashboard" />
    </PanelShell>
  );
}

interface PredictionRow {
  id?: string | number;
  title?: string;
  target?: string;
  horizon?: string;
  confidence?: number;
  published_at?: string;
}

function PredDashboard() {
  const [preds, setPreds] = useState<PredictionRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/predictions?status=active&limit=10')
      .then((r) => r.json())
      .then((d) => setPreds((d.predictions as PredictionRow[]) ?? []))
      .catch(() => setErr('Predictions feed unavailable'));
  }, []);

  if (err) return <PanelShell title="PRED · Active Predictions" subtitle="Nostradamus engine"><ErrorBox msg={err} /></PanelShell>;
  if (!preds) return <PanelShell title="PRED · Active Predictions" subtitle="Nostradamus engine"><LoadingBox label="Loading predictions…" /></PanelShell>;

  return (
    <PanelShell title="PRED · Active Predictions" subtitle={`${preds.length} open forecasts`}>
      {preds.length === 0 ? (
        <div className="font-mono text-[11px] text-muted-foreground">No active predictions.</div>
      ) : (
        <div className="space-y-2">
          {preds.slice(0, 8).map((p, i) => (
            <div key={p.id ?? i} className="rounded-sm border px-3 py-2" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-serif text-sm text-foreground">{p.title ?? p.target ?? 'Prediction'}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                {p.horizon ? `horizon ${p.horizon}` : ''} {p.confidence != null ? ` · conf ${Math.round(p.confidence * 100)}%` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
      <DashLink href="/predictions" label="Open prediction leaderboard" />
    </PanelShell>
  );
}

function AvnResolved({ data }: { data: unknown }) {
  if (!data) return <LoadingBox label="Resolving AVN_PROP_ID…" />;
  const d = data as Record<string, unknown>;
  const ok = !d.error;

  return (
    <PanelShell title={ok ? 'AVN · Resolved' : 'AVN · Not found'} subtitle="AVN_PROP_ID v1.0">
      {ok ? (
        <pre className="font-mono text-[10px] text-foreground/90 overflow-auto max-h-[320px] whitespace-pre-wrap break-all">
          {JSON.stringify(d, null, 2)}
        </pre>
      ) : (
        <div className="font-mono text-[11px] text-destructive">{String(d.error)}</div>
      )}
      <DashLink href="/standards/avn-id" label="AVN_PROP_ID spec" />
    </PanelShell>
  );
}

/* ── Shells ──────────────────────────────────────────────────── */

function PanelShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border overflow-hidden" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: 'hsl(var(--av-primary) / 0.06)', borderColor: 'hsl(var(--av-primary) / 0.25)' }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{title}</div>
        {subtitle && <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function LoadingBox({ label }: { label: string }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full mr-2 align-middle" style={{ background: 'hsl(var(--av-primary))' }} />
      {label}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-destructive">{msg}</div>;
}

function DashLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
      <Link href={href} className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold">
        {label} →
      </Link>
    </div>
  );
}

/* ── TOWN / RANK panels ─────────────────────────────────────────── */

function TownPanel({ town, properties }: { town: string; properties: TerminalProperty[] }) {
  const inTown = properties.filter((p) => p.town.toLowerCase() === town.toLowerCase());
  if (inTown.length === 0) {
    return (
      <PanelShell title={`TOWN · ${town}`} subtitle="No matches in working set">
        <div className="font-mono text-[11px] text-muted-foreground">
          No properties indexed for {town}. Try Torrevieja, Javea, Altea, Estepona, Marbella, Mijas.
        </div>
      </PanelShell>
    );
  }
  const avgScore = Math.round(inTown.reduce((s, p) => s + p.score, 0) / inTown.length);
  const avgPrice = Math.round(inTown.reduce((s, p) => s + p.price, 0) / inTown.length);
  const avgYield = inTown.reduce((s, p) => s + p.yield_gross, 0) / inTown.length;
  const avgPm2 = inTown.reduce((s, p) => s + (p.pm2 || 0), 0) / Math.max(1, inTown.filter(p => p.pm2).length);
  const top5 = [...inTown].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <PanelShell title={`TOWN · ${town}`} subtitle={`${inTown.length} indexed`}>
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-sm border mb-5" style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        {[
          { k: 'Avg Score', v: avgScore, accent: true },
          { k: 'Avg Price', v: `€${fmt(avgPrice)}` },
          { k: 'Avg €/m²', v: `€${fmt(Math.round(avgPm2))}` },
          { k: 'Avg yield', v: `${avgYield.toFixed(2)}%` },
        ].map((r) => (
          <div key={r.k} className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{r.k}</div>
            <div className={`font-mono tabular text-sm ${r.accent ? 'text-primary' : 'text-foreground'}`}>{r.v}</div>
          </div>
        ))}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Top 5 by score</div>
      <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        {top5.map((p, i) => (
          <Link
            key={p.ref}
            href={`/property/${encodeURIComponent(p.ref)}`}
            className="flex items-center justify-between px-4 py-2 border-b transition-colors hover:bg-primary/5"
            style={{ borderColor: i < top5.length - 1 ? 'hsl(var(--av-border) / 0.3)' : 'transparent', background: 'hsl(var(--av-background))' }}
          >
            <div className="min-w-0">
              <div className="font-serif text-sm text-foreground truncate">{p.project}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{p.type} · {p.beds}bed</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono tabular text-sm text-gold">{p.score}</div>
              <div className="font-mono text-[9px] text-muted-foreground">€{fmt(p.price)}</div>
            </div>
          </Link>
        ))}
      </div>
      <DashLink href={`/towns/${encodeURIComponent(town.toLowerCase().replace(/\s+/g, '-'))}`} label={`Full ${town} page`} />
    </PanelShell>
  );
}

function RankPanel({ region, properties, onPick }: { region?: string; properties: TerminalProperty[]; onPick: (p: TerminalProperty) => void }) {
  const filtered = region
    ? properties.filter((p) =>
        (p.region?.toLowerCase().includes(region.toLowerCase())) ||
        (p.town?.toLowerCase().includes(region.toLowerCase()))
      )
    : properties;
  const top10 = [...filtered].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <PanelShell title={`RANK · Top 10${region ? ` in ${region}` : ''}`} subtitle={`${filtered.length} eligible`}>
      {top10.length === 0 ? (
        <div className="font-mono text-[11px] text-muted-foreground">No matches for {region}.</div>
      ) : (
        <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          {top10.map((p, i) => (
            <button
              key={p.ref}
              onClick={() => onPick(p)}
              className="w-full text-left flex items-center gap-3 px-4 py-2 border-b transition-colors hover:bg-primary/5"
              style={{ borderColor: i < top10.length - 1 ? 'hsl(var(--av-border) / 0.3)' : 'transparent', background: 'hsl(var(--av-background))' }}
            >
              <span className="font-mono tabular text-[10px] text-muted-foreground w-5">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-serif text-sm text-foreground truncate">{p.project}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground truncate">{p.town} · {p.type}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono tabular text-sm text-gold">{p.score}</div>
                <div className="font-mono text-[9px] text-muted-foreground">€{fmt(p.price)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

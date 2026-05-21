'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Activity, Zap, Settings2, ChevronDown, Check, Loader2 } from 'lucide-react';

interface PrebuiltScenario {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  inputs: Record<string, unknown>;
}

interface GenesisOutput {
  market: string;
  horizon_months: number;
  price_change_pct_bear: number;
  price_change_pct_base: number;
  price_change_pct_bull: number;
  price_change_probability_bear: number;
  price_change_probability_base: number;
  price_change_probability_bull: number;
  yield_change_bps_base: number;
  liquidity_score_base: number;
  liquidity_score_low: number;
  liquidity_score_high: number;
  regime_base: string;
  regime_probability_buyer_opportunity: number;
  regime_probability_balanced: number;
  regime_probability_seller_premium: number;
  regime_probability_correction: number;
  top_causal_factors: Array<{ factor: string; contribution_pct: number }> | null;
  confidence_overall: number;
  claude_interpretation: string;
}

interface RunResponse {
  ok: boolean;
  scenario_id?: string;
  outputs?: GenesisOutput[];
  engine?: string;
  error?: string;
  note?: string;
}

const MARKETS = [
  'Costa Blanca', 'Costa del Sol', 'Costa Cálida', 'Mallorca',
  'Madrid', 'Algarve', 'Lisbon', 'French Riviera', 'Italian Riviera',
];

const CATEGORY_META: Record<string, { color: string; label: string; bg: string }> = {
  rate_shock:   { color: 'hsl(var(--av-destructive))', bg: 'hsl(var(--av-destructive) / 0.1)', label: 'Rate shock' },
  regulatory:   { color: 'hsl(var(--av-warning))',     bg: 'hsl(var(--av-warning) / 0.1)',     label: 'Regulatory' },
  demographic:  { color: 'hsl(var(--av-primary))',     bg: 'hsl(var(--av-primary) / 0.1)',     label: 'Demographic' },
  geopolitical: { color: 'hsl(var(--av-warning))',     bg: 'hsl(var(--av-warning) / 0.1)',     label: 'Geopolitical' },
  black_swan:   { color: 'hsl(var(--av-destructive))', bg: 'hsl(var(--av-destructive) / 0.1)', label: 'Black swan' },
};

const REGIME_LABELS: Record<string, string> = {
  buyer_opportunity: 'Buyer opportunity',
  balanced: 'Balanced',
  seller_premium: 'Seller premium',
  correction: 'Correction',
};

export function GenesisRunner({ prebuilt }: { prebuilt: PrebuiltScenario[] }) {
  const [mode, setMode] = useState<'prebuilt' | 'custom'>('prebuilt');
  const [selectedPrebuiltId, setSelectedPrebuiltId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Inputs
  const [ecbRate, setEcbRate] = useState(0);
  const [germanMig, setGermanMig] = useState(0);
  const [ukBuyer, setUkBuyer] = useState(0);
  const [construction, setConstruction] = useState(0);
  const [remoteWork, setRemoteWork] = useState(0);
  const [gdp, setGdp] = useState(2.1);
  const [inflation, setInflation] = useState(0);
  const [markets, setMarkets] = useState<string[]>(['Costa Blanca', 'Costa del Sol']);
  const [horizon, setHorizon] = useState(24);

  // Execution state
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  const toggleMarket = (m: string) =>
    setMarkets((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const loadPrebuilt = (p: PrebuiltScenario) => {
    const inp = p.inputs as Record<string, unknown>;
    setEcbRate(Number(inp.ecb_rate_change_bps ?? 0));
    setGermanMig(Number(inp.german_migration_delta_pct ?? 0));
    setUkBuyer(Number(inp.uk_buyer_delta_pct ?? 0));
    setConstruction(Number(inp.construction_supply_delta_pct ?? 0));
    setRemoteWork(Number(inp.remote_work_adoption_delta_pct ?? 0));
    setGdp(Number(inp.eu_gdp_growth_pct ?? 2.1));
    setInflation(Number(inp.inflation_delta_pct ?? 0));
    setMarkets((inp.target_markets as string[]) ?? ['Costa Blanca']);
    setHorizon(Number(inp.horizon_months ?? 24));
    setSelectedPrebuiltId(p.id);
  };

  const runPrebuilt = async (p: PrebuiltScenario) => {
    loadPrebuilt(p);
    // Run immediately with the loaded params
    setRunning(true);
    setResults(null);
    const inp = p.inputs as Record<string, unknown>;
    try {
      const r = await fetch('/api/v1/genesis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title,
          description: p.description,
          ecb_rate_change_bps: Number(inp.ecb_rate_change_bps ?? 0),
          spain_regulatory_change: inp.spain_regulatory_change ?? null,
          german_migration_delta_pct: Number(inp.german_migration_delta_pct ?? 0),
          uk_buyer_delta_pct: Number(inp.uk_buyer_delta_pct ?? 0),
          construction_supply_delta_pct: Number(inp.construction_supply_delta_pct ?? 0),
          remote_work_adoption_delta_pct: Number(inp.remote_work_adoption_delta_pct ?? 0),
          eu_gdp_growth_pct: Number(inp.eu_gdp_growth_pct ?? 2.1),
          inflation_delta_pct: Number(inp.inflation_delta_pct ?? 0),
          target_markets: (inp.target_markets as string[]) ?? ['Costa Blanca'],
          horizon_months: Number(inp.horizon_months ?? 24),
        }),
      });
      const data: RunResponse = await r.json();
      setResults(data);
    } catch (err) {
      setResults({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    setRunning(false);
  };

  const runCustom = async (e?: FormEvent) => {
    e?.preventDefault();
    setRunning(true);
    setResults(null);
    try {
      const r = await fetch('/api/v1/genesis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Custom scenario',
          ecb_rate_change_bps: ecbRate,
          german_migration_delta_pct: germanMig,
          uk_buyer_delta_pct: ukBuyer,
          construction_supply_delta_pct: construction,
          remote_work_adoption_delta_pct: remoteWork,
          eu_gdp_growth_pct: gdp,
          inflation_delta_pct: inflation,
          target_markets: markets,
          horizon_months: horizon,
        }),
      });
      const data: RunResponse = await r.json();
      setResults(data);
    } catch (err) {
      setResults({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    setRunning(false);
  };

  // Smooth-scroll to results when they arrive
  useEffect(() => {
    if (results?.ok && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  return (
    <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div ref={builderRef} className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12 min-w-0">

        {/* Mode tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('prebuilt')}
            className="font-mono text-[10px] uppercase tracking-[0.3em] px-4 py-2 rounded-sm border transition-colors"
            style={{
              borderColor: mode === 'prebuilt' ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.5)',
              background: mode === 'prebuilt' ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
              color: mode === 'prebuilt' ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
            }}
          >
            <Zap className="h-3 w-3 inline mr-1.5" />
            Quick start
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className="font-mono text-[10px] uppercase tracking-[0.3em] px-4 py-2 rounded-sm border transition-colors"
            style={{
              borderColor: mode === 'custom' ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.5)',
              background: mode === 'custom' ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
              color: mode === 'custom' ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
            }}
          >
            <Settings2 className="h-3 w-3 inline mr-1.5" />
            Build custom
          </button>
        </div>

        {/* PREBUILT mode */}
        {mode === 'prebuilt' && (
          <div>
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-2">
              Pick a <span className="italic text-gold">scenario</span>.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
              Click any card · Genesis runs immediately · results below
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prebuilt.map((p) => {
                const meta = CATEGORY_META[p.category ?? ''] ?? { color: 'hsl(var(--av-primary))', bg: 'hsl(var(--av-primary) / 0.1)', label: p.category ?? 'Scenario' };
                const isSelected = selectedPrebuiltId === p.id;
                const isRunning = isSelected && running;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => runPrebuilt(p)}
                    disabled={running}
                    className="text-left rounded-sm border p-5 flex flex-col transition-all hover:-translate-y-0.5 hover:border-primary disabled:opacity-50 disabled:cursor-wait"
                    style={{
                      background: isSelected ? 'hsl(var(--av-primary) / 0.06)' : 'hsl(var(--av-surface) / 0.4)',
                      borderColor: isSelected ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-sm" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                      {isRunning ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      ) : isSelected && results?.ok ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : null}
                    </div>
                    <h3 className="font-serif text-lg text-foreground font-light leading-snug mb-2 break-words" style={{ overflowWrap: 'anywhere' }}>
                      {p.title}
                    </h3>
                    {p.description && (
                      <p className="text-sm text-foreground/70 font-light leading-relaxed mb-3 flex-1">
                        {p.description}
                      </p>
                    )}
                    <span className="mt-auto font-mono text-[10px] uppercase tracking-[0.22em] text-primary inline-flex items-center gap-1">
                      {isRunning ? 'Running…' : 'Click to run →'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CUSTOM mode */}
        {mode === 'custom' && (
          <form onSubmit={runCustom}>
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-2">
              Build a <span className="italic text-gold">custom scenario</span>.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
              Dial in macro inputs · select markets · hit Run
            </p>

            <div className="rounded-sm border p-5 sm:p-7" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}>

              {/* Headline inputs (always visible) */}
              <div className="space-y-5">
                <SliderField label="ECB rate change" hint="bps · negative = cut" value={ecbRate} onChange={setEcbRate} min={-200} max={200} step={25} format={(v) => `${v >= 0 ? '+' : ''}${v} bps`} />
                <SliderField label="German buyer migration" hint="% change" value={germanMig} onChange={setGermanMig} min={-50} max={200} step={10} format={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                <SliderField label="UK buyer activity" hint="% change" value={ukBuyer} onChange={setUkBuyer} min={-50} max={300} step={10} format={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
              </div>

              {/* Advanced inputs (toggle) */}
              <button
                type="button"
                onClick={() => setShowAdvanced((p) => !p)}
                className="mt-6 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary"
              >
                <ChevronDown className="h-3 w-3 transition-transform" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)' }} />
                {showAdvanced ? 'Hide advanced inputs' : 'Show advanced inputs (4 more)'}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-5 pt-4 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                  <SliderField label="Construction supply" hint="% change · negative = crisis" value={construction} onChange={setConstruction} min={-50} max={50} step={5} format={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                  <SliderField label="Remote work adoption" hint="% change in EU knowledge workers" value={remoteWork} onChange={setRemoteWork} min={-30} max={60} step={5} format={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                  <SliderField label="EU GDP growth" hint="% · baseline 2.1%" value={gdp} onChange={setGdp} min={-4} max={5} step={0.1} format={(v) => `${v.toFixed(1)}%`} />
                  <SliderField label="Inflation delta" hint="percentage points vs baseline" value={inflation} onChange={setInflation} min={-3} max={6} step={0.1} format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`} />
                </div>
              )}

              {/* Markets */}
              <div className="mt-6 pt-5 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                <div className="flex items-baseline justify-between mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Target markets</div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{markets.length} selected</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MARKETS.map((m) => {
                    const on = markets.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMarket(m)}
                        className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                        style={{
                          borderColor: on ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                          background: on ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                          color: on ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horizon */}
              <div className="mt-5 flex items-baseline gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Horizon</div>
                <div className="flex gap-1.5">
                  {[12, 24, 36].map((h) => (
                    <button
                      type="button"
                      key={h}
                      onClick={() => setHorizon(h)}
                      className="rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                      style={{
                        borderColor: horizon === h ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                        background: horizon === h ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                        color: horizon === h ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                      }}
                    >
                      {h} months
                    </button>
                  ))}
                </div>
              </div>

              {/* Run button */}
              <div className="mt-7">
                <button
                  type="submit"
                  disabled={running || markets.length === 0}
                  className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-40"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  {running ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Genesis simulating…</> : <>Run Genesis →</>}
                </button>
                {markets.length === 0 && (
                  <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-warning))' }}>
                    Pick at least one market
                  </span>
                )}
              </div>
            </div>
          </form>
        )}

        {/* RESULTS */}
        {results && (
          <div ref={resultsRef} className="mt-10">
            {results.ok && results.outputs && results.outputs.length > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
                  <h3 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground">
                    Results at <span className="italic text-gold">{horizon}-month horizon</span>.
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm" style={{ background: results.engine === 'claude-sonnet-4-5' ? 'hsl(var(--av-primary) / 0.12)' : 'hsl(var(--av-muted-foreground) / 0.12)', color: results.engine === 'claude-sonnet-4-5' ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))' }}>
                    Engine: {results.engine === 'claude-sonnet-4-5' ? 'Claude Sonnet 4.5' : 'Mock simulator'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {results.outputs.map((o) => <ResultCard key={o.market} output={o} />)}
                </div>
              </>
            ) : (
              <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-destructive) / 0.08)', borderColor: 'hsl(var(--av-destructive) / 0.4)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-destructive))' }}>
                  Simulation failed: {results.error}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Visual slider with label, hint, and live value display. */
function SliderField({ label, hint, value, onChange, min, max, step, format }: {
  label: string; hint?: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step: number; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          {label}
          {hint && <span className="text-muted-foreground/70 normal-case ml-2 text-[10px]">· {hint}</span>}
        </label>
        <span className="font-mono tabular text-base text-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
        style={{
          background: `linear-gradient(to right, hsl(var(--av-primary)) 0%, hsl(var(--av-primary)) ${((value - min) / (max - min)) * 100}%, hsl(var(--av-border)) ${((value - min) / (max - min)) * 100}%, hsl(var(--av-border)) 100%)`,
        }}
      />
      <div className="flex justify-between mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

/** Pretty per-market result card with bars + regime breakdown + interpretation. */
function ResultCard({ output: o }: { output: GenesisOutput }) {
  // Compute bar widths — normalize bear+base+bull range to 0-100%
  const maxAbs = Math.max(Math.abs(o.price_change_pct_bear), Math.abs(o.price_change_pct_bull), 5);
  const barWidth = (v: number) => `${Math.min(100, (Math.abs(v) / maxAbs) * 50)}%`;

  const regimes = [
    { key: 'buyer_opportunity', label: REGIME_LABELS.buyer_opportunity, p: o.regime_probability_buyer_opportunity },
    { key: 'balanced', label: REGIME_LABELS.balanced, p: o.regime_probability_balanced },
    { key: 'seller_premium', label: REGIME_LABELS.seller_premium, p: o.regime_probability_seller_premium },
    { key: 'correction', label: REGIME_LABELS.correction, p: o.regime_probability_correction },
  ].sort((a, b) => b.p - a.p);

  return (
    <div className="rounded-sm border p-5 sm:p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="flex items-baseline justify-between gap-2 mb-4 flex-wrap">
        <h4 className="font-serif text-xl text-foreground">{o.market}</h4>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          Confidence {o.confidence_overall}%
        </span>
      </div>

      {/* Price distribution — horizontal bars showing bear/base/bull */}
      <div className="space-y-2 mb-4">
        <DistroBar label="Bear" value={o.price_change_pct_bear} prob={o.price_change_probability_bear} barWidth={barWidth(o.price_change_pct_bear)} color="hsl(var(--av-destructive))" />
        <DistroBar label="Base" value={o.price_change_pct_base} prob={o.price_change_probability_base} barWidth={barWidth(o.price_change_pct_base)} color="hsl(var(--av-primary))" accent />
        <DistroBar label="Bull" value={o.price_change_pct_bull} prob={o.price_change_probability_bull} barWidth={barWidth(o.price_change_pct_bull)} color="hsl(var(--av-primary))" />
      </div>

      {/* Yield + liquidity quick row */}
      <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        <Mini label="Yield Δ" value={`${o.yield_change_bps_base >= 0 ? '+' : ''}${o.yield_change_bps_base} bps`} />
        <Mini label="Regime" value={REGIME_LABELS[o.regime_base] ?? o.regime_base} />
        <Mini label="Liquidity" value={`${o.liquidity_score_low}–${o.liquidity_score_high}`} />
      </div>

      {/* Regime probability bars */}
      <div className="mb-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Regime probabilities</div>
        <div className="space-y-1.5">
          {regimes.map((r) => (
            <div key={r.key} className="flex items-center gap-2 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85 w-32 shrink-0 truncate">
                {r.label}
              </div>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.5)' }}>
                <div className="h-full" style={{ width: `${r.p * 100}%`, background: r.key === o.regime_base ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))', opacity: r.key === o.regime_base ? 1 : 0.55 }} />
              </div>
              <div className="font-mono tabular text-xs text-foreground/85 w-10 text-right shrink-0">{Math.round(r.p * 100)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Causal attribution */}
      {o.top_causal_factors && o.top_causal_factors.length > 0 && (
        <div className="mb-4 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Causal attribution</div>
          <div className="space-y-1">
            {o.top_causal_factors.map((f, i) => (
              <div key={i} className="flex items-center justify-between font-mono text-[11px] gap-2 min-w-0">
                <span className="text-foreground/85 truncate flex-1">{f.factor}</span>
                <span className="text-primary tabular shrink-0">{f.contribution_pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claude interpretation */}
      <div className="pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Interpretation</div>
        <p className="text-sm text-foreground/85 font-light leading-relaxed">
          {o.claude_interpretation}
        </p>
      </div>
    </div>
  );
}

function DistroBar({ label, value, prob, barWidth, color, accent }: {
  label: string; value: number; prob: number; barWidth: string; color: string; accent?: boolean;
}) {
  const isPositive = value >= 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Activity;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] w-12 shrink-0" style={{ color }}>{label}</div>
      <div className="flex-1 relative h-7 rounded-sm overflow-hidden flex" style={{ background: 'hsl(var(--av-border) / 0.25)' }}>
        {/* Center divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: 'hsl(var(--av-border-strong))' }} />
        {/* Bar */}
        <div
          className="absolute top-0 bottom-0 transition-all"
          style={{
            background: color,
            opacity: accent ? 1 : 0.7,
            width: barWidth,
            left: isPositive ? '50%' : `calc(50% - ${barWidth})`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-medium tabular" style={{ color: 'hsl(var(--av-foreground))' }}>
          <Icon className="h-3 w-3 mr-1" style={{ color }} />
          {value >= 0 ? '+' : ''}{value.toFixed(1)}%
        </div>
      </div>
      <div className="font-mono text-[10px] tabular text-muted-foreground w-12 text-right shrink-0">
        p={Math.round(prob * 100)}%
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-mono tabular text-sm text-foreground mt-0.5 truncate">{value}</div>
    </div>
  );
}

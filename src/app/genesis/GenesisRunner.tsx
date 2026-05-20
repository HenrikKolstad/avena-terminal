'use client';

import { useState, type FormEvent } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
  error?: string;
  note?: string;
}

const MARKETS = [
  'Costa Blanca', 'Costa del Sol', 'Costa Cálida', 'Mallorca',
  'Madrid', 'Algarve', 'Lisbon', 'French Riviera', 'Italian Riviera',
];

export function GenesisRunner({ prebuilt }: { prebuilt: PrebuiltScenario[] }) {
  const [ecbRate, setEcbRate] = useState(0);
  const [germanMig, setGermanMig] = useState(0);
  const [ukBuyer, setUkBuyer] = useState(0);
  const [construction, setConstruction] = useState(0);
  const [remoteWork, setRemoteWork] = useState(0);
  const [gdp, setGdp] = useState(2.1);
  const [inflation, setInflation] = useState(0);
  const [markets, setMarkets] = useState<string[]>(['Costa Blanca']);
  const [horizon, setHorizon] = useState(24);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResponse | null>(null);

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
  };

  const run = async (e?: FormEvent) => {
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

  const inputCls = 'w-full rounded-sm border px-3 py-2 text-sm bg-transparent text-foreground focus:outline-none focus:border-primary font-mono tabular';
  const inputStyle = { borderColor: 'hsl(var(--av-border) / 0.6)' };

  return (
    <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12 min-w-0">
        <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-2">
          Build a <span className="italic text-gold">custom scenario</span>.
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
          Set macro inputs · pick target markets · run Genesis
        </p>

        <form onSubmit={run} className="rounded-sm border p-5 sm:p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}>
          {prebuilt.length > 0 && (
            <div className="mb-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Or load a prebuilt scenario</div>
              <div className="flex flex-wrap gap-1.5">
                {prebuilt.slice(0, 8).map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => loadPrebuilt(p)}
                    className="rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary hover:border-primary"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="ECB rate Δ (bps)" value={ecbRate} onChange={setEcbRate} inputCls={inputCls} inputStyle={inputStyle} hint="−100 = cut" />
            <Field label="German migration Δ (%)" value={germanMig} onChange={setGermanMig} inputCls={inputCls} inputStyle={inputStyle} />
            <Field label="UK buyer Δ (%)" value={ukBuyer} onChange={setUkBuyer} inputCls={inputCls} inputStyle={inputStyle} />
            <Field label="Construction supply Δ (%)" value={construction} onChange={setConstruction} inputCls={inputCls} inputStyle={inputStyle} hint="−35 = crisis" />
            <Field label="Remote work Δ (%)" value={remoteWork} onChange={setRemoteWork} inputCls={inputCls} inputStyle={inputStyle} />
            <Field label="EU GDP growth (%)" value={gdp} onChange={setGdp} inputCls={inputCls} inputStyle={inputStyle} hint="2.1 = baseline" step={0.1} />
            <Field label="Inflation Δ (pp)" value={inflation} onChange={setInflation} inputCls={inputCls} inputStyle={inputStyle} step={0.1} />
            <label className="block">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Horizon (months)</div>
              <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className={inputCls} style={inputStyle}>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
                <option value={36}>36 months</option>
              </select>
            </label>
          </div>

          <div className="mt-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Target markets</div>
            <div className="flex flex-wrap gap-1.5">
              {MARKETS.map((m) => {
                const on = markets.includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggleMarket(m)}
                    className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
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

          <div className="mt-7">
            <button
              type="submit"
              disabled={running || markets.length === 0}
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-40"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              {running ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Genesis simulating…</> : <>Run Genesis →</>}
            </button>
          </div>
        </form>

        {results && results.ok && results.outputs && results.outputs.length > 0 && (
          <div className="mt-8">
            <h3 className="font-serif text-2xl font-light tracking-tight text-foreground mb-4">
              Results <span className="italic text-gold">at {horizon}-month horizon</span>.
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {results.outputs.map((o) => (
                <div key={o.market} className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <h4 className="font-serif text-lg text-foreground">{o.market}</h4>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Confidence {o.confidence_overall}%</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <DistroCell label="Bear" value={o.price_change_pct_bear} icon={TrendingDown} color="hsl(var(--av-destructive))" />
                    <DistroCell label="Base" value={o.price_change_pct_base} icon={Activity} color="hsl(var(--av-primary))" accent />
                    <DistroCell label="Bull" value={o.price_change_pct_bull} icon={TrendingUp} color="hsl(var(--av-primary))" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <div>Yield Δ: <span className="text-foreground">{o.yield_change_bps_base}bps</span></div>
                    <div>Regime: <span className="text-foreground">{o.regime_base}</span></div>
                    <div>Liquidity: <span className="text-foreground">{o.liquidity_score_low}–{o.liquidity_score_high}</span></div>
                  </div>

                  {o.top_causal_factors && o.top_causal_factors.length > 0 && (
                    <div className="border-t pt-3 mt-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Causal attribution</div>
                      <div className="space-y-1">
                        {o.top_causal_factors.map((f, i) => (
                          <div key={i} className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-foreground/85">{f.factor}</span>
                            <span className="text-primary tabular">{f.contribution_pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-foreground/70 font-light leading-relaxed">
                    {o.claude_interpretation}
                  </p>
                </div>
              ))}
            </div>
            {results.note && (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {results.note}
              </p>
            )}
          </div>
        )}

        {results && !results.ok && (
          <div className="mt-6 rounded-sm border p-5" style={{ background: 'hsl(var(--av-destructive) / 0.08)', borderColor: 'hsl(var(--av-destructive) / 0.4)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-destructive))' }}>
              Simulation failed: {results.error}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, value, onChange, inputCls, inputStyle, hint, step = 1 }: {
  label: string; value: number; onChange: (n: number) => void;
  inputCls: string; inputStyle: React.CSSProperties; hint?: string; step?: number;
}) {
  return (
    <label className="block">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
        {label}
        {hint && <span className="text-muted-foreground/60 normal-case ml-1">({hint})</span>}
      </div>
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} style={inputStyle} />
    </label>
  );
}

function DistroCell({ label, value, icon: Icon, color, accent }: { label: string; value: number; icon: typeof TrendingUp; color: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border p-2 text-center" style={{ borderColor: accent ? 'hsl(var(--av-primary) / 0.4)' : 'hsl(var(--av-border) / 0.4)' }}>
      <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground flex items-center justify-center gap-1">
        <Icon className="h-2.5 w-2.5" style={{ color }} /> {label}
      </div>
      <div className="font-serif text-xl tabular mt-1" style={{ color: accent ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}>
        {value >= 0 ? '+' : ''}{value}%
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ArrowUpRight, Sparkles, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { PortfolioReport, PortfolioFlag, ResolvedHolding } from '@/lib/portfolio-engine';

const SAMPLE_CSV = `ref,town,type,built_m2,bedrooms,beach_km,energy,pool,acquisition_cost_eur
,Marbella,Villa,280,4,0.4,A,private,1850000
,Torrevieja,Apartment,95,2,0.3,B,communal,185000
,Estepona,Penthouse,180,3,0.5,A,communal,720000
,Javea,Villa,320,5,1.2,B,private,1450000
,Orihuela Costa,Apartment,110,3,0.8,B,communal,235000
,Calpe,Penthouse,150,3,0.2,A,private,650000`;

export function PortfolioForm() {
  const [csv, setCsv] = useState('');
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/v1/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const json = await res.json();
      if (!json.ok) setError(json.error || 'Analysis failed');
      else setReport(json.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2 block">Your portfolio (CSV)</span>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={9}
            placeholder="Paste CSV with headers: ref, town, type, built_m2, bedrooms, beach_km, energy, pool, acquisition_cost_eur"
            disabled={submitting}
            className="w-full rounded-sm border px-4 py-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || csv.trim().length < 10}
            className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            {submitting ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Analysing…</> : <>Analyse portfolio <ArrowUpRight className="h-3.5 w-3.5" /></>}
          </button>
          <button
            type="button"
            onClick={() => setCsv(SAMPLE_CSV)}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-sm border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-50"
            style={{ borderColor: 'hsl(var(--av-border-strong))' }}
          >
            Try sample portfolio
          </button>
        </div>
        {error && (
          <div className="rounded-sm border p-3 text-sm" style={{ borderColor: 'hsl(var(--av-destructive) / 0.4)', background: 'hsl(var(--av-destructive) / 0.06)', color: 'hsl(var(--av-destructive))' }}>{error}</div>
        )}
      </form>

      {report && <Report report={report} />}
    </div>
  );
}

function Report({ report }: { report: PortfolioReport }) {
  const s = report.summary;
  return (
    <div className="space-y-6">
      {/* Headline NAV */}
      <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-primary) / 0.3)', background: 'linear-gradient(180deg, hsl(var(--av-primary) / 0.05) 0%, hsl(var(--av-surface) / 0.4) 100%)' }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Portfolio NAV (Avena view)</div>
        <div className="font-serif text-5xl sm:text-6xl font-light text-gold tabular leading-none">€{(s.total_nav_eur / 1_000_000).toFixed(2)}M</div>
        <div className="mt-3 font-mono text-xs text-muted-foreground tabular">
          {s.n_resolved} resolved / {s.n_unresolved} unresolved · weighted score {s.weighted_score} · weighted yield {s.weighted_yield_pct}% · confidence {s.weighted_confidence}%
        </div>
      </div>

      {/* Stress bands */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
        {[
          { label: 'Bull', v: s.weighted_bull_pct, color: 'text-success' },
          { label: 'Base', v: s.weighted_base_pct, color: 'text-foreground' },
          { label: 'Bear', v: s.weighted_bear_pct, color: 'text-destructive' },
        ].map((c) => (
          <div key={c.label} className="p-4" style={{ background: 'hsl(var(--av-background))' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{c.label} (12-mo)</div>
            <div className={`font-serif text-3xl font-light tabular ${c.color}`}>{c.v > 0 ? '+' : ''}{c.v.toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        VaR-95 (bear-case loss): <span className="text-destructive">€{Math.round(s.var_95_eur / 1000).toLocaleString()}k</span>
      </div>

      {/* Flags */}
      {report.flags.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Concentration & risk flags</div>
          <div className="space-y-2">
            {report.flags.map((f, i) => <Flag key={i} flag={f} />)}
          </div>
        </div>
      )}

      {/* Regime mix + Counterpart mix */}
      <div className="grid md:grid-cols-2 gap-4">
        <Distribution title="Regime mix" rows={report.regime_mix.map((r) => ({ key: r.regime, count: r.count, pct: r.pct, nav: r.nav_eur }))} />
        <Distribution title="Counterpart exposure" rows={report.counterpart_mix.map((r) => ({ key: r.grade, count: r.count, pct: r.pct, nav: r.nav_eur }))} />
      </div>

      {/* Holdings table */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Holdings ({report.holdings.length})</div>
        <div className="overflow-x-auto rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'hsl(var(--av-surface))' }}>
              <tr className="text-left">
                {['Town', 'Type', 'm²', 'Value', 'Score', 'Yield', 'Bull', 'Base', 'Bear', 'Source'].map((h) => (
                  <th key={h} className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.holdings.map((h, i) => <HoldingRow key={i} h={h} />)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground pt-2 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        Model {report.model_version} · {new Date(report.generated_at).toISOString().slice(0, 16).replace('T', ' ')} UTC · cite DOI 10.5281/zenodo.19520064
      </div>
    </div>
  );
}

function Flag({ flag }: { flag: PortfolioFlag }) {
  const Icons = { high: AlertCircle, medium: AlertTriangle, low: Info };
  const Icon = Icons[flag.severity];
  const colors: Record<PortfolioFlag['severity'], { bg: string; color: string }> = {
    high:   { bg: 'hsl(var(--av-destructive) / 0.1)', color: 'hsl(var(--av-destructive))' },
    medium: { bg: 'hsl(var(--av-warning) / 0.1)',     color: 'hsl(var(--av-warning))' },
    low:    { bg: 'hsl(var(--av-muted) / 0.4)',       color: 'hsl(var(--av-muted-foreground))' },
  };
  const c = colors[flag.severity];
  return (
    <div className="flex items-start gap-3 rounded-sm border p-3" style={{ borderColor: c.color + '50', background: c.bg }}>
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: c.color }} />
      <div className="flex-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] mb-1" style={{ color: c.color }}>{flag.severity} · {flag.category}</div>
        <p className="text-sm text-foreground/90">{flag.message}</p>
      </div>
    </div>
  );
}

function Distribution({ title, rows }: { title: string; rows: Array<{ key: string; count: number; pct: number; nav: number }> }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">{title}</div>
      <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
        {rows.map((r, i) => (
          <div key={r.key} className="px-4 py-2.5 border-b last:border-b-0 flex items-center justify-between gap-3" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground w-20">{r.key}</span>
              <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.4)' }}>
                <div className="h-full" style={{ width: `${r.pct}%`, background: i === 0 ? 'hsl(var(--av-primary))' : 'hsl(var(--av-primary) / 0.5)' }} />
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="font-mono text-xs tabular text-foreground">{r.pct}%</div>
              <div className="font-mono text-[9px] tabular text-muted-foreground">{r.count} · €{(r.nav / 1_000_000).toFixed(2)}M</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldingRow({ h }: { h: ResolvedHolding }) {
  if (!h.matched) {
    return (
      <tr className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
        <td colSpan={10} className="px-3 py-2 text-muted-foreground italic">Unresolved row: {JSON.stringify(h.input).slice(0, 120)}</td>
      </tr>
    );
  }
  return (
    <tr className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
      <td className="px-3 py-2 text-foreground">{h.town}</td>
      <td className="px-3 py-2 text-muted-foreground">{h.type}</td>
      <td className="px-3 py-2 font-mono tabular text-muted-foreground">{h.built_m2}</td>
      <td className="px-3 py-2 font-mono tabular text-foreground">€{Math.round(h.predicted_value_eur / 1000)}k</td>
      <td className="px-3 py-2 font-mono tabular text-gold">{h.avena_score}</td>
      <td className="px-3 py-2 font-mono tabular text-muted-foreground">{h.yield_gross != null ? `${h.yield_gross}%` : '—'}</td>
      <td className="px-3 py-2 font-mono tabular text-success">+{h.bull_pct}%</td>
      <td className="px-3 py-2 font-mono tabular text-foreground">+{h.base_pct}%</td>
      <td className="px-3 py-2 font-mono tabular text-destructive">{h.bear_pct}%</td>
      <td className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{h.match_source}</td>
    </tr>
  );
}

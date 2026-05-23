'use client';

import { useState } from 'react';
import type { AVMResult } from '@/lib/avm-engine';
import { ArrowUpRight, Sparkles, Check } from 'lucide-react';

interface AVMFormProps { towns: string[] }

type PropertyType = 'Villa' | 'Townhouse' | 'Bungalow' | 'Apartment' | 'Penthouse' | 'Studio';

export function AVMForm({ towns }: AVMFormProps) {
  const [town, setTown] = useState('Marbella');
  const [type, setType] = useState<PropertyType>('Villa');
  const [builtM2, setBuiltM2] = useState(220);
  const [bedrooms, setBedrooms] = useState(3);
  const [beachKm, setBeachKm] = useState(0.5);
  const [seaView, setSeaView] = useState(true);
  const [golf, setGolf] = useState(false);
  const [frontline, setFrontline] = useState(false);
  const [energy, setEnergy] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | ''>('A');
  const [pool, setPool] = useState<'private' | 'communal' | 'none'>('private');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AVMResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/avm/value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            town, type, built_m2: builtM2, bedrooms,
            beach_km: beachKm,
            sea_view: seaView, golf, frontline,
            energy: energy || null,
            pool,
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || 'Valuation failed');
      } else {
        setResult(json.avm);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = { background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border))' };
  const fieldLabel = 'font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5 block';

  return (
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2">
            <span className={fieldLabel}>Town</span>
            <input
              type="text"
              list="town-list"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              required
              className="w-full rounded-sm border px-3 py-2 text-sm"
              style={inputStyle}
            />
            <datalist id="town-list">
              {towns.slice(0, 200).map((t) => <option key={t} value={t} />)}
            </datalist>
          </label>
          <label className="block">
            <span className={fieldLabel}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as PropertyType)} className="w-full rounded-sm border px-3 py-2 text-sm" style={inputStyle}>
              {['Villa', 'Townhouse', 'Bungalow', 'Apartment', 'Penthouse', 'Studio'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>Bedrooms</span>
            <input type="number" min={0} max={20} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} className="w-full rounded-sm border px-3 py-2 text-sm" style={inputStyle} />
          </label>
          <label className="block">
            <span className={fieldLabel}>Built m²</span>
            <input type="number" min={20} max={5000} value={builtM2} onChange={(e) => setBuiltM2(Number(e.target.value))} className="w-full rounded-sm border px-3 py-2 text-sm" style={inputStyle} />
          </label>
          <label className="block">
            <span className={fieldLabel}>Beach distance (km)</span>
            <input type="number" min={0} max={50} step={0.1} value={beachKm} onChange={(e) => setBeachKm(Number(e.target.value))} className="w-full rounded-sm border px-3 py-2 text-sm" style={inputStyle} />
          </label>
          <label className="block">
            <span className={fieldLabel}>Energy rating</span>
            <select value={energy} onChange={(e) => setEnergy(e.target.value as typeof energy)} className="w-full rounded-sm border px-3 py-2 text-sm" style={inputStyle}>
              <option value="">—</option>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>Pool</span>
            <select value={pool} onChange={(e) => setPool(e.target.value as 'private' | 'communal' | 'none')} className="w-full rounded-sm border px-3 py-2 text-sm" style={inputStyle}>
              <option value="private">Private</option>
              <option value="communal">Communal</option>
              <option value="none">None</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          {[
            { val: seaView,   set: setSeaView,   label: 'Sea view' },
            { val: golf,      set: setGolf,      label: 'Golf' },
            { val: frontline, set: setFrontline, label: 'Frontline' },
          ].map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => c.set(!c.val)}
              className="inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-xs"
              style={{
                borderColor: c.val ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                background: c.val ? 'hsl(var(--av-primary) / 0.08)' : 'hsl(var(--av-surface) / 0.3)',
                color: c.val ? 'hsl(var(--av-foreground))' : 'hsl(var(--av-muted-foreground))',
              }}
            >
              <span className="flex h-3 w-3 items-center justify-center rounded-sm border" style={{ borderColor: c.val ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border-strong))', background: c.val ? 'hsl(var(--av-primary) / 0.2)' : 'transparent' }}>
                {c.val && <Check className="h-2.5 w-2.5 text-primary" />}
              </span>
              {c.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-sm border p-3 text-sm" style={{ borderColor: 'hsl(var(--av-destructive) / 0.4)', background: 'hsl(var(--av-destructive) / 0.06)', color: 'hsl(var(--av-destructive))' }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          style={{ background: 'var(--av-gradient-gold)' }}
        >
          {submitting ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Running model…</> : <>Run valuation <ArrowUpRight className="h-3.5 w-3.5" /></>}
        </button>
      </form>

      {/* Result */}
      <div>
        {!result ? (
          <div className="rounded-sm border p-8 text-center h-full flex flex-col items-center justify-center" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">No valuation yet</div>
            <p className="text-sm text-muted-foreground max-w-xs">Configure the property characteristics on the left and click Run valuation. Result lands in under a second.</p>
          </div>
        ) : (
          <ResultPanel result={result} />
        )}
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: AVMResult }) {
  return (
    <div className="rounded-sm border" style={{ borderColor: 'hsl(var(--av-primary) / 0.3)', background: 'linear-gradient(180deg, hsl(var(--av-primary) / 0.05) 0%, hsl(var(--av-surface) / 0.4) 100%)' }}>
      {/* Headline value */}
      <div className="p-6 border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Predicted fair value</div>
        <div className="font-serif text-5xl sm:text-6xl font-light text-gold tabular leading-none">
          €{result.predicted_value_eur.toLocaleString()}
        </div>
        <div className="mt-3 font-mono text-xs text-muted-foreground tabular">
          €{result.predicted_pm2.toLocaleString()}/m² · {result.confidence_pct}% confidence · band €{Math.round(result.confidence_band_low_eur / 1000)}k → €{Math.round(result.confidence_band_high_eur / 1000)}k
        </div>
      </div>

      {/* Adjustments */}
      <div className="p-5 border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Adjustments stack</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground">Base €/m² ({result.base_source.replace(/_/g, ' ')} · n={result.base_sample_n})</span>
            <span className="font-mono tabular text-foreground">€{result.base_pm2.toLocaleString()}</span>
          </div>
          {result.adjustments.map((a, i) => (
            <div key={i} className="flex justify-between items-baseline">
              <span className="text-foreground/85">{a.factor}<span className="text-muted-foreground text-xs ml-1">· {a.reason}</span></span>
              <span className={`font-mono tabular ${a.pct > 0 ? 'text-success' : 'text-destructive'}`}>{a.pct > 0 ? '+' : ''}{a.pct}%</span>
            </div>
          ))}
          {result.adjustments.length === 0 && <div className="text-xs text-muted-foreground italic">No location/quality premia applied.</div>}
        </div>
      </div>

      {/* Comps */}
      <div className="p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Nearest comparables ({result.comps.length})</div>
        {result.comps.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No direct comparables in the corpus for this town × type. Confidence reduced accordingly.</p>
        ) : (
          <div className="space-y-2">
            {result.comps.map((c) => (
              <a key={c.ref} href={c.url} target="_blank" rel="noopener" className="block rounded-sm border p-2.5 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-background) / 0.4)' }}>
                <div className="flex justify-between items-baseline gap-3">
                  <span className="text-xs text-foreground truncate">{c.name}</span>
                  <span className="font-mono text-xs tabular text-foreground flex-shrink-0">€{Math.round(c.price_eur / 1000)}k</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1">
                  {c.type} · {c.built_m2}m² · €{c.pm2 ?? '—'}/m² · {c.beach_km ?? '—'}km · score {c.score}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Citation */}
      <div className="p-4 border-t font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        Model {result.model_version} · {new Date(result.generated_at).toISOString().slice(0, 16).replace('T', ' ')} UTC · cite DOI 10.5281/zenodo.19520064
      </div>
    </div>
  );
}

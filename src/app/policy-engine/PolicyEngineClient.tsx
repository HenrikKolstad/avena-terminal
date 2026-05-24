'use client';

import { useState, useEffect, useMemo } from 'react';
import { Play, FileDown, Copy, ChevronRight, AlertCircle, Mail } from 'lucide-react';
import { Sparkline } from '../terminal/Sparkline';
import { TransmissionChart } from './TransmissionChart';

interface Lever { id: string; label: string; unit: string; description: string; magnitude_range: [number, number]; default_magnitude: number; citation: string; }
interface Country { code: string; label: string; calibration: string; note: string; }

interface ScenarioOutput {
  inputs: { lever: string; country: string; region?: string; fb_share_min?: number; magnitude: number; timeframe_m: number };
  cohort_size: number;
  cohort_postcodes_affected: number;
  price_impact_pct: number;
  price_impact_low_pct: number;
  price_impact_high_pct: number;
  npl_impact_bps: number;
  capital_rotation_eur: number;
  bank_stress: Array<{ bank: string; exposure_eur_bn: number; npl_today_pct: number; npl_stressed_pct: number; delta_bps: number }>;
  cohort_postcode_grid: Array<{ postcode: string; municipality: string; fb_share: number; cohort_size: number; price_delta_pct: number }>;
  forward_curve_pct: number[];
  methodology_citations: string[];
  signature: string;
  computed_at: string;
}

export function PolicyEngineClient({ levers, countries }: { levers: Lever[]; countries: Country[] }) {
  const [lever, setLever] = useState<Lever>(levers[0]);
  const [country, setCountry] = useState<Country>(countries[0]);
  const [region, setRegion] = useState<'coastal' | 'national' | 'urban'>('coastal');
  const [fbShareMin, setFbShareMin] = useState(0.25);
  const [magnitude, setMagnitude] = useState(lever.default_magnitude);
  const [timeframe, setTimeframe] = useState(18);
  const [output, setOutput] = useState<ScenarioOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInquire, setShowInquire] = useState(false);

  // When user changes lever, snap magnitude to its default
  useEffect(() => { setMagnitude(lever.default_magnitude); }, [lever]);

  // Display helpers — every number user sees is in %, internally we keep the
  // lever's native unit (bps for CCyB/RW/FB-levy, ppt for LTV/DSTI/Capital).
  // bps → % is /100 ; ppt → % is identity.
  const isBps = lever.unit === 'bps';
  const toDisplay = (v: number) => isBps ? v / 100 : v;
  const fromDisplay = (v: number) => isBps ? v * 100 : v;
  const displayStep = isBps ? 0.25 : 1;

  const magnitudeLabel = useMemo(() => {
    const v = toDisplay(magnitude);
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(displayStep < 1 ? 2 : 0)}%`;
  }, [magnitude, lever, isBps, displayStep]);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/v1/policy/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lever: lever.id, country: country.code, region, fb_share_min: fbShareMin, magnitude, timeframe_m: timeframe }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Simulation failed');
      setOutput(data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  // Auto-run on first paint with default inputs so visitors see results immediately
  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-4">
      {/* ─── INPUT PANEL ─────────────────────────────────────────── */}
      <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background) / 0.6)' }}>
        <div className="grid lg:grid-cols-[2fr_1fr] divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: 'hsl(var(--av-border))' }}>

          {/* Left: Lever + Magnitude + Timeframe */}
          <div className="p-5 sm:p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">01 · Policy lever</div>
            <div className="grid sm:grid-cols-3 gap-2 mb-7">
              {levers.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLever(l)}
                  className="text-left rounded-sm border px-3 py-2.5 transition-colors"
                  style={{
                    borderColor: lever.id === l.id ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border) / 0.5)',
                    background: lever.id === l.id ? 'hsl(var(--av-primary) / 0.08)' : 'hsl(var(--av-background) / 0.4)',
                  }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: lever.id === l.id ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}>{l.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{l.description.split(' ').slice(0, 5).join(' ')}…</div>
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">02 · Magnitude</div>
                  <div className="font-serif text-2xl font-light text-foreground tabular leading-none">{magnitudeLabel}</div>
                </div>
                <input
                  type="range"
                  min={toDisplay(lever.magnitude_range[0])} max={toDisplay(lever.magnitude_range[1])} step={displayStep}
                  value={toDisplay(magnitude)} onChange={e => setMagnitude(fromDisplay(parseFloat(e.target.value)))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between font-mono text-[9px] text-muted-foreground mt-1">
                  <span>{toDisplay(lever.magnitude_range[0]).toFixed(displayStep < 1 ? 2 : 0)}%</span>
                  <span className="text-foreground">0%</span>
                  <span>+{toDisplay(lever.magnitude_range[1]).toFixed(displayStep < 1 ? 2 : 0)}%</span>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">03 · Timeframe</div>
                  <div className="font-serif text-2xl font-light text-foreground tabular leading-none">{timeframe} mo</div>
                </div>
                <input
                  type="range"
                  min={3} max={36} step={3}
                  value={timeframe} onChange={e => setTimeframe(parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between font-mono text-[9px] text-muted-foreground mt-1">
                  <span>3 mo</span><span>18 mo</span><span>36 mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Cohort */}
          <div className="p-5 sm:p-7" style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">04 · Cohort filter</div>

            <Label>Country</Label>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {countries.map(c => (
                <button
                  key={c.code} onClick={() => setCountry(c)}
                  className="rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                  style={{
                    borderColor: country.code === c.code ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border) / 0.5)',
                    background: country.code === c.code ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
                    color: country.code === c.code ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))',
                  }}
                  title={c.note}
                >
                  {c.code}
                </button>
              ))}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] mb-5" style={{ color: country.calibration === 'full' ? 'hsl(var(--av-success))' : 'hsl(var(--av-warning))' }}>
              ● {country.calibration === 'full' ? 'fully calibrated' : 'directional'}
            </div>

            <Label>Region</Label>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {(['coastal', 'national', 'urban'] as const).map(r => (
                <button key={r} onClick={() => setRegion(r)} className="rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                  style={{
                    borderColor: region === r ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border) / 0.5)',
                    background: region === r ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
                    color: region === r ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <Label>Foreign-buyer share ≥ <span className="text-foreground font-serif text-sm">{(fbShareMin * 100).toFixed(0)}%</span></Label>
            <input type="range" min={0} max={0.45} step={0.05} value={fbShareMin} onChange={e => setFbShareMin(parseFloat(e.target.value))} className="w-full accent-primary mb-5" />
          </div>
        </div>

        {/* Run bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 sm:px-7 py-4" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="text-foreground">{lever.label}</span> <span className="text-primary">{magnitudeLabel}</span> · <span className="text-foreground">{country.code}</span> {region} · FB ≥ {(fbShareMin * 100).toFixed(0)}% · {timeframe} months
          </div>
          <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0" style={{ background: 'var(--av-gradient-gold)' }}>
            <Play className="h-3 w-3" /> {loading ? 'Computing…' : 'Run scenario'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-sm border px-4 py-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-destructive" style={{ borderColor: 'hsl(var(--av-destructive) / 0.4)', background: 'hsl(var(--av-destructive) / 0.08)' }}>
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {/* ─── OUTPUTS PANEL ────────────────────────────────────────── */}
      {output && (
        <>
          {/* Three giant headline numbers */}
          <div className="grid sm:grid-cols-3 gap-4 policy-fade-up">
            <Headline
              label="Price impact"
              value={`${output.price_impact_pct > 0 ? '+' : ''}${output.price_impact_pct.toFixed(2)}%`}
              sub={`95% CI: ${output.price_impact_low_pct.toFixed(2)}% to ${output.price_impact_high_pct.toFixed(2)}%`}
              positive={output.price_impact_pct >= 0}
              chart={<Sparkline values={output.forward_curve_pct} height={36} stroke="hsl(var(--av-primary))" fill="hsl(var(--av-primary))" />}
              caption={`In target cohort, ${output.cohort_size.toLocaleString()} properties across ${output.cohort_postcodes_affected} clusters`}
            />
            <Headline
              label="NPL impact"
              value={`${output.npl_impact_bps > 0 ? '+' : ''}${(output.npl_impact_bps / 100).toFixed(2)}%`}
              sub="Top-5 Spanish bank residential exposures"
              positive={output.npl_impact_bps <= 0}
              caption={output.npl_impact_bps > 0 ? 'Stress: capital pressure on cycle-vulnerable banks' : 'Relief: capital pressure eases'}
            />
            <Headline
              label="Capital rotation"
              value={`€${(Math.abs(output.capital_rotation_eur) / 1e9).toFixed(2)}B`}
              sub={output.capital_rotation_eur >= 0 ? 'Outflow to other EU markets' : 'Inflow from other EU markets'}
              positive={false}
              caption="Estimated 12-month rotation across EU residential markets"
            />
          </div>

          {/* Cohort postcode grid */}
          {output.cohort_postcode_grid.length > 0 && (
            <div className="policy-fade-up-d1"><Panel title="Cohort breakdown" subtitle={`${output.cohort_postcodes_affected} clusters affected · cohort size ${output.cohort_size.toLocaleString()}`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {output.cohort_postcode_grid.map((p, i) => {
                  const intensity = Math.min(1, Math.abs(p.price_delta_pct) / 8);
                  const col = p.price_delta_pct >= 0
                    ? `hsl(152 55% 55% / ${0.12 + intensity * 0.32})`
                    : `hsl(0 72% 60% / ${0.12 + intensity * 0.32})`;
                  const textCol = p.price_delta_pct >= 0 ? 'hsl(152 55% 70%)' : 'hsl(0 72% 75%)';
                  return (
                    <div
                      key={i}
                      className="rounded-sm border p-3 transition-transform hover:-translate-y-0.5"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: col }}
                      title={`${p.municipality} · ${p.cohort_size} properties · FB share ${(p.fb_share * 100).toFixed(1)}% · projected ${p.price_delta_pct >= 0 ? '+' : ''}${p.price_delta_pct.toFixed(2)}%`}
                    >
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/85 truncate">{p.municipality}</div>
                      <div className="font-serif text-xl tabular leading-none mt-1.5" style={{ color: textCol }}>
                        {p.price_delta_pct >= 0 ? '+' : ''}{p.price_delta_pct.toFixed(2)}%
                      </div>
                      <div className="flex items-baseline justify-between mt-1.5">
                        <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground">n={p.cohort_size}</span>
                        <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground">FB {(p.fb_share * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel></div>
          )}

          {/* Bank stress projection */}
          <div className="policy-fade-up-d2"><Panel title="Bank stress projection" subtitle="Top-5 Spanish bank residential exposures · NPL today → stressed">
            <div className="rounded-sm overflow-hidden border" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.5)' }}>
                  <tr>
                    {['Bank', 'Exposure', 'NPL today', 'NPL stressed', 'Δ %'].map((h, i) => (
                      <th key={h} className={`px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {output.bank_stress.map((b, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="px-3 py-2.5 text-sm text-foreground/95">{b.bank}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-foreground/85">€{b.exposure_eur_bn.toFixed(1)}B</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-muted-foreground">{b.npl_today_pct.toFixed(2)}%</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular text-foreground">{b.npl_stressed_pct.toFixed(2)}%</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular" style={{ color: b.delta_bps > 0 ? 'hsl(var(--av-destructive))' : b.delta_bps < 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-muted-foreground))' }}>
                        {b.delta_bps > 0 ? '+' : ''}{(b.delta_bps / 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel></div>

          {/* Forward transmission curve — proper chart with axes */}
          <div className="policy-fade-up-d3"><Panel title="Forward transmission curve" subtitle={`Cumulative % impact across ${timeframe} months · logistic transmission centred at m6`}>
            <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-background) / 0.4)' }}>
              <TransmissionChart values={output.forward_curve_pct} timeframe={timeframe} height={220} />
            </div>
          </Panel></div>

          {/* Provenance + Export */}
          <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
            <Panel title="Methodology citations" subtitle="Every coefficient sources a published reference">
              <ul className="space-y-2">
                {output.methodology_citations.map((c, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-xs text-foreground/85 leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground border-t pt-3" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
                Signature (HMAC-SHA256): <span className="text-foreground/85 break-all">{output.signature}</span>
              </div>
            </Panel>

            <Panel title="Export" subtitle="Print, share, request access">
              <div className="space-y-2">
                <ExportButton onClick={() => window.print()} icon={<FileDown className="h-3 w-3" />}>Save as PDF</ExportButton>
                <ExportButton onClick={() => { navigator.clipboard.writeText(JSON.stringify(output, null, 2)).catch(() => null); }} icon={<Copy className="h-3 w-3" />}>Copy JSON</ExportButton>
                <button onClick={() => setShowInquire(s => !s)} className="w-full inline-flex items-center justify-between rounded-sm px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5" style={{ background: 'var(--av-gradient-gold)' }}>
                  <span className="inline-flex items-center gap-2"><Mail className="h-3 w-3" /> Request institutional access</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </Panel>
          </div>

          {/* Inquiry form */}
          {showInquire && <InquiryForm scenarioId={null} country={country.code} onClose={() => setShowInquire(false)} />}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{children}</div>;
}

function Headline({ label, value, sub, positive, chart, caption }: { label: string; value: string; sub: string; positive: boolean; chart?: React.ReactNode; caption?: string }) {
  const accentColor = positive ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))';
  return (
    <div
      className="relative rounded-sm border overflow-hidden p-5 transition-transform hover:-translate-y-0.5"
      style={{
        borderColor: 'hsl(var(--av-border))',
        background: `linear-gradient(135deg, hsl(var(--av-surface) / 0.4), hsl(var(--av-surface) / 0.15))`,
      }}
    >
      {/* Gradient accent stripe with glow */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, ${accentColor}, ${accentColor.replace(')', ' / 0.3)')})`,
          boxShadow: `0 0 12px ${accentColor.replace(')', ' / 0.4)')}`,
        }}
      />
      {/* Subtle corner accent */}
      <div
        className="absolute top-0 right-0 h-12 w-12 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${accentColor.replace(')', ' / 0.08)')}, transparent 70%)` }}
      />
      <div className="relative pl-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] mb-2.5" style={{ color: accentColor }}>{label}</div>
        <div className="font-serif text-5xl sm:text-6xl font-light text-foreground tabular leading-none mb-2">{value}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{sub}</div>
        {chart && <div className="mt-4 opacity-90">{chart}</div>}
        {caption && <div className="mt-4 text-[11px] text-muted-foreground/90 leading-relaxed">{caption}</div>}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.25)' }}>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">{title}</div>
          {subtitle && <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ExportButton({ children, icon, onClick }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full inline-flex items-center justify-between rounded-sm border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <span className="inline-flex items-center gap-2">{icon} {children}</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

function InquiryForm({ scenarioId, country, onClose }: { scenarioId: string | null; country: string; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setErr(null);
    try {
      const res = await fetch('/api/v1/policy/inquire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_email: email, organisation: org, role, country, scenario_id: scenarioId, notes }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Inquiry failed');
      setDone(true);
    } catch (e) { setErr((e as Error).message); }
    finally { setSubmitting(false); }
  }

  if (done) {
    return (
      <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-success) / 0.4)', background: 'hsl(var(--av-success) / 0.05)' }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-success mb-2">Inquiry received</div>
        <p className="text-sm text-foreground/90 leading-relaxed">Avena Institutional will reply within 24h to <span className="font-mono text-foreground">{email}</span>. Reply will include the methodology dossier and a calendar link for the first 30-minute call.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div className="flex items-baseline justify-between mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">Institutional inquiry</div>
        <button type="button" onClick={onClose} className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">close</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Input placeholder="institutional@central-bank.eu" type="email" value={email} onChange={setEmail} required />
        <Input placeholder="Organisation (e.g. Banco de España, ESRB)" value={org} onChange={setOrg} />
        <Input placeholder="Role (e.g. Macroprudential Analyst)" value={role} onChange={setRole} />
        <Input placeholder="Country / region" value={country} onChange={() => {}} disabled />
      </div>
      <textarea placeholder="Optional: which scenarios or cohort definitions are highest priority?" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full rounded-sm border bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary mb-3 resize-none" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
      {err && <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive mb-3">{err}</div>}
      <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50" style={{ background: 'var(--av-gradient-gold)' }}>
        {submitting ? 'Sending…' : 'Request access →'}
      </button>
    </form>
  );
}

function Input({ placeholder, value, onChange, type = 'text', required, disabled }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; disabled?: boolean }) {
  return (
    <input
      type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required={required} disabled={disabled}
      className="rounded-sm border bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary disabled:opacity-60"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
    />
  );
}

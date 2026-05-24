import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { supabase } from '@/lib/supabase';
import { TerminalChat } from './TerminalChat';
import { CommandPalette } from './CommandPalette';
import { Sparkline } from './Sparkline';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Avena Terminal — institutional cockpit',
  description: 'The institutional workspace for European property analysts. Live indices, macro anomalies, cross-validation, AVM, briefings, counterpart stress — all in one screen, driven by the Avena Oracle.',
  alternates: { canonical: 'https://avenaterminal.com/terminal' },
};

// ─── Server-side data load ──────────────────────────────────────────────

interface AnomalyRow { country_code: string; source: string; indicator_name: string; period: string; value: number; z_score: number; severity: string; trend: string; source_url: string | null; }
interface ValidationRow { country_code: string; region: string; period: string; official_source: string; official_value: number; avena_value: number; delta_bps: number; avena_n_properties: number; note: string; }
interface BriefingRow { volume: number; slug: string; title: string; subtitle: string | null; publication_date: string; }
interface HealthRow { snapshot_date: string; index_level: number; developers_tracked: number; developers_distressed: number; alerts_active: number; }
interface IndexRow { snapshot_date: string; value: number; median_pm2: number | null; mean_score: number | null; count: number | null; value_index: number | null; score_index: number | null; }
interface StatRow { country_code: string; source: string; indicator_code: string; period: string; value: number; unit: string; }

async function loadTerminal() {
  const empty = { anomalies: [] as AnomalyRow[], validations: [] as ValidationRow[], briefings: [] as BriefingRow[], healthHistory: [] as HealthRow[], indexHistory: [] as IndexRow[], mirRows: [] as StatRow[], hpiRows: [] as StatRow[] };
  if (!supabase) return empty;
  try {
    const [a, v, b, h, idx, m, hpi] = await Promise.all([
      supabase.from('eu_anomalies').select('country_code, source, indicator_name, period, value, z_score, severity, trend, source_url').order('detected_at', { ascending: false }).limit(8),
      supabase.from('eu_validation_snapshots').select('country_code, region, period, official_source, official_value, avena_value, delta_bps, avena_n_properties, note').order('computed_at', { ascending: false }).limit(8),
      supabase.from('sovereign_briefings').select('volume, slug, title, subtitle, publication_date').eq('status', 'published').order('volume', { ascending: false }).limit(5),
      supabase.from('counterpart_health_history').select('*').order('snapshot_date', { ascending: false }).limit(30),
      supabase.from('avena_history').select('*').order('snapshot_date', { ascending: false }).limit(30),
      supabase.from('eu_official_stats').select('country_code, source, indicator_code, period, value, unit').eq('source', 'ecb_sdw').ilike('indicator_code', 'MIR%').order('period', { ascending: false }).limit(20),
      supabase.from('eu_official_stats').select('country_code, source, indicator_code, period, value, unit').eq('source', 'eurostat').ilike('indicator_code', '%RCH_A%').order('period', { ascending: false }).limit(20),
    ]);
    return {
      anomalies: (a.data ?? []) as AnomalyRow[],
      validations: (v.data ?? []) as ValidationRow[],
      briefings: (b.data ?? []) as BriefingRow[],
      healthHistory: (h.data ?? []) as HealthRow[],
      indexHistory: (idx.data ?? []) as IndexRow[],
      mirRows: (m.data ?? []) as StatRow[],
      hpiRows: (hpi.data ?? []) as StatRow[],
    };
  } catch { return empty; }
}

/** Cross-scale safe delta — uses % when values are comparable, otherwise shows '—' */
function pctDelta(curr: number | null | undefined, prev: number | null | undefined): { val: string; up: boolean | null } {
  if (curr == null || prev == null || prev === 0) return { val: '—', up: null };
  // If the two readings are on different magnitudes (>3x apart), suppress — likely methodology break
  const ratio = curr / prev;
  if (ratio > 3 || ratio < 0.33) return { val: '—', up: null };
  const pct = ((curr - prev) / prev) * 100;
  return { val: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, up: pct >= 0 };
}

export default async function TerminalPage() {
  const data = await loadTerminal();
  const indexLatest = data.indexHistory[0] ?? null;
  const indexPrev = data.indexHistory[1] ?? null;
  const indexDelta = pctDelta(indexLatest?.value, indexPrev?.value);
  const healthLatest = data.healthHistory[0] ?? null;
  const healthPrev = data.healthHistory[1] ?? null;
  const healthDelta = pctDelta(healthLatest?.index_level, healthPrev?.index_level);
  const eurEsMir = data.mirRows.find(r => r.country_code === 'ES');
  const eurAggMir = data.mirRows.find(r => r.country_code === 'EA20' || r.country_code === 'U2');

  // Sparkline series (oldest first)
  const indexSpark = [...data.indexHistory].reverse().map(r => Number(r.value)).filter(Number.isFinite);
  const healthSpark = [...data.healthHistory].reverse().map(r => Number(r.index_level)).filter(Number.isFinite);

  const criticalCount = data.anomalies.filter(a => a.severity === 'critical').length;

  return (
    <div className="avena-v2 min-h-screen flex flex-col" style={{ background: 'hsl(var(--av-background))' }}>
      <Nav />
      <CommandPalette />

      {/* ─── Top ticker: serif numbers, color-coded deltas ───────────── */}
      <div className="mt-16 border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'linear-gradient(180deg, hsl(var(--av-surface) / 0.6), hsl(var(--av-background)))' }}>
        <div className="mx-auto max-w-[1600px] px-5 py-4 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div className="flex items-center gap-2">
            <PulseDot />
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">Avena Terminal · live</span>
          </div>

          <Quote label="AVENA-CC" value={indexLatest?.value?.toFixed(2) ?? '—'} delta={indexDelta} highlight />
          <Quote label="Counterpart Health" value={healthLatest?.index_level?.toFixed(1) ?? '—'} delta={healthDelta} />
          <Quote label="Euribor 3M" value="2.85" suffix="%" />
          <Quote label="MIR ES" value={eurEsMir?.value?.toFixed(2) ?? '—'} suffix="%" />
          <Quote label="MIR EA20" value={eurAggMir?.value?.toFixed(2) ?? '—'} suffix="%" />
          <Quote label="Anomalies" value={data.anomalies.length.toString()} alert={criticalCount > 0} />
          <Quote label="Briefings" value={data.briefings.length.toString()} />

          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">⌘K palette · refresh 60s</span>
        </div>
      </div>

      {/* ─── Cockpit grid ─────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-5 grid gap-3 lg:grid-cols-[440px_1fr]">

        {/* ─ Left rail: 6 institutional widgets, denser ─ */}
        <div className="flex flex-col gap-3">

          {/* INDEX widget — featured */}
          <Widget accent="gold" title="AVENA-CC" subtitle="Coastal Composite · daily" href="/avena-index" status="● live">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-serif text-3xl font-light tabular text-foreground">{indexLatest?.value?.toFixed(2) ?? '—'}</span>
              <DeltaPill delta={indexDelta} />
            </div>
            {indexSpark.length >= 2 && <Sparkline values={indexSpark} height={28} stroke="hsl(var(--av-primary))" />}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Mini label="Median €/m²" value={indexLatest?.median_pm2 ? `€${Math.round(indexLatest.median_pm2).toLocaleString()}` : '—'} />
              <Mini label="Mean score" value={indexLatest?.mean_score ? indexLatest.mean_score.toFixed(1) : '—'} />
              <Mini label="N" value={indexLatest?.count?.toString() ?? '—'} />
            </div>
          </Widget>

          {/* ANOMALIES widget */}
          <Widget accent={criticalCount > 0 ? 'red' : 'amber'} title="Macro Anomalies" subtitle={`${data.anomalies.length} signals · z ≥ 2σ`} href="/alerts/macro" status={`${data.anomalies.length} live`}>
            {data.anomalies.length === 0 ? <Empty>No anomalies — first scan pending</Empty> : (
              <ul className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                {data.anomalies.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 py-1.5 first:pt-0">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] truncate text-foreground/85">{a.country_code} · {a.source.replace('_', ' ')}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] tabular shrink-0" style={{ color: a.severity === 'critical' ? 'hsl(var(--av-destructive))' : a.severity === 'alert' ? 'hsl(var(--av-accent))' : 'hsl(var(--av-warning))' }}>
                      <span>{a.trend === 'up' ? '▲' : '▼'}</span>
                      <span>z {a.z_score.toFixed(2)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          {/* CROSS-VALIDATION widget */}
          <Widget accent="blue" title="Cross-Validation" subtitle="Avena vs official · signed Δ bps" href="/eu-official" status="daily 05:30 UTC">
            {data.validations.length === 0 ? <Empty>Calibration phase</Empty> : (
              <ul className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                {data.validations.slice(0, 5).map((v, i) => {
                  const col = v.delta_bps === 0 ? 'hsl(var(--av-muted-foreground))' : v.delta_bps > 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))';
                  return (
                    <li key={i} className="flex items-baseline justify-between gap-2 py-1.5 first:pt-0">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85">{v.country_code}·{v.region}·{v.period}</span>
                      <span className="font-mono text-[10px] tabular" style={{ color: col }}>{v.delta_bps >= 0 ? '+' : ''}{v.delta_bps} bps</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Widget>

          {/* COUNTERPART HEALTH widget */}
          <Widget accent={healthLatest && healthLatest.developers_distressed > 0 ? 'amber' : 'green'} title="Counterpart Health" subtitle="Developer risk graph · daily" href="/counterpart/health-index" status="● healthy">
            {healthLatest ? (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-serif text-3xl font-light tabular text-foreground">{healthLatest.index_level.toFixed(1)}</span>
                  <DeltaPill delta={healthDelta} />
                </div>
                {healthSpark.length >= 2 && <Sparkline values={healthSpark} height={24} stroke="hsl(var(--av-success))" />}
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <Mini label="Tracked" value={healthLatest.developers_tracked.toString()} />
                  <Mini label="Distressed" value={healthLatest.developers_distressed.toString()} accent={healthLatest.developers_distressed > 0} />
                  <Mini label="Alerts" value={healthLatest.alerts_active.toString()} accent={healthLatest.alerts_active > 0} />
                </div>
              </>
            ) : <Empty>Health index not yet computed</Empty>}
          </Widget>

          {/* ECB MIR widget */}
          <Widget accent="purple" title="ECB Mortgage Rates" subtitle="Cost-of-borrowing · MIR" href="/eu-official" status="monthly">
            {data.mirRows.length === 0 ? <Empty>No ECB MIR data yet</Empty> : (
              <ul className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                {data.mirRows.slice(0, 6).map((r, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 py-1.5 first:pt-0">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85">{r.country_code} · {r.period}</span>
                    <span className="font-mono text-[10px] tabular text-foreground">{r.value.toFixed(2)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          {/* EU HPI widget */}
          <Widget accent="gold" title="EU HPI · YoY" subtitle="Eurostat residential" href="/eu-official" status="quarterly">
            {data.hpiRows.length === 0 ? <Empty>No Eurostat HPI rows</Empty> : (
              <ul className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                {data.hpiRows.slice(0, 6).map((r, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 py-1.5 first:pt-0">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85">{r.country_code} · {r.period}</span>
                    <span className="font-mono text-[10px] tabular" style={{ color: r.value >= 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>
                      {r.value >= 0 ? '+' : ''}{r.value.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          {/* BRIEFINGS widget */}
          <Widget accent="gold" title="Sovereign Briefings" subtitle={`Vol 1-${data.briefings[0]?.volume ?? 0} published`} href="/sovereign-briefing" status="research desk">
            {data.briefings.length === 0 ? <Empty>No briefings yet</Empty> : (
              <ul className="space-y-2">
                {data.briefings.slice(0, 4).map(b => (
                  <li key={b.slug}>
                    <Link href={`/sovereign-briefing/${b.slug}`} className="block hover:bg-[hsl(var(--av-muted)/0.4)] -mx-2 px-2 py-1.5 rounded-sm transition-colors group">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">Vol. {b.volume}</span>
                        <span className="font-mono text-[9px] tabular text-muted-foreground">{b.publication_date}</span>
                      </div>
                      <div className="text-[11px] text-foreground/90 leading-snug line-clamp-2 group-hover:text-foreground">{b.title}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Widget>
        </div>

        {/* ─ Right rail: Oracle ─ */}
        <TerminalChat
          contextPreamble={`AVENA-CC ${indexLatest?.value?.toFixed(2) ?? '—'} (${indexDelta.val}). Health ${healthLatest?.index_level?.toFixed(1) ?? '—'} (${healthDelta.val}). ${data.anomalies.length} anomalies live. Sovereign Briefings Vol 1-${data.briefings[0]?.volume ?? 0} published. Euribor 3M 2.85%.`}
        />
      </main>

      {/* ─── Status strip ─────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}>
        <div className="mx-auto max-w-[1600px] px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-success"><PulseDot small /> online · FRA1</span>
          <Link href="/status" className="hover:text-foreground transition-colors">System status</Link>
          <Link href="/governance" className="hover:text-foreground transition-colors">Governance</Link>
          <Link href="/docs/api" className="hover:text-foreground transition-colors">API</Link>
          <Link href="/docs/webhooks" className="hover:text-foreground transition-colors">Webhooks</Link>
          <Link href="/archive" className="hover:text-foreground transition-colors">Moat archive</Link>
          <Link href="/wikidata" className="hover:text-foreground transition-colors">Wikidata</Link>
          <Link href="/terminal/seat" className="ml-auto inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-primary hover:text-foreground transition-colors" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)' }}>
            Get a seat · €499/mo →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function PulseDot({ small }: { small?: boolean }) {
  const sz = small ? 'h-1.5 w-1.5' : 'h-2 w-2';
  return <span className={`pulse-dot relative inline-block ${sz} rounded-full`} style={{ background: 'hsl(var(--av-primary))' }} />;
}

function Quote({ label, value, delta, suffix, alert, highlight }: { label: string; value: string; delta?: { val: string; up: boolean | null }; suffix?: string; alert?: boolean; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-fit">
      <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={`tabular ${highlight ? 'font-serif text-2xl font-light' : 'font-mono text-base'}`} style={{ color: alert ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-foreground))' }}>
          {value}{suffix ?? ''}
        </span>
        {delta && delta.up !== null && (
          <span className="font-mono text-[10px] tabular" style={{ color: delta.up ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>
            {delta.up ? '▲' : '▼'} {delta.val}
          </span>
        )}
      </div>
    </div>
  );
}

const ACCENT_COLORS: Record<string, string> = {
  gold:   'hsl(var(--av-primary))',
  amber:  'hsl(var(--av-warning))',
  green:  'hsl(var(--av-success))',
  red:    'hsl(var(--av-destructive))',
  blue:   '#5b8def',
  purple: '#a26bdb',
};

function Widget({ title, subtitle, href, children, accent = 'gold', status }: { title: string; subtitle: string; href?: string; children: React.ReactNode; accent?: keyof typeof ACCENT_COLORS; status?: string }) {
  const accentColor = ACCENT_COLORS[accent];
  return (
    <div className="relative rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.35)' }}>
      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: accentColor, opacity: 0.7 }} />
      <div className="pl-3.5 pr-3 py-3">
        <div className="flex items-baseline justify-between mb-2.5">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.32em]" style={{ color: accentColor }}>{title}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">{subtitle}</div>
          </div>
          <div className="flex items-baseline gap-2">
            {status && <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground">{status}</span>}
            {href && <Link href={href} className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors">open →</Link>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: { val: string; up: boolean | null } }) {
  if (delta.up === null) return <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">—</span>;
  const col = delta.up ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))';
  return (
    <span className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tabular" style={{ color: col, background: `${col}1a`, border: `1px solid ${col}33` }}>
      <span>{delta.up ? '▲' : '▼'}</span>
      <span>{delta.val}</span>
    </span>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border px-2 py-1.5" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-background) / 0.5)' }}>
      <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-mono text-[11px] tabular truncate" style={{ color: accent ? 'hsl(var(--av-warning))' : 'hsl(var(--av-foreground))' }}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 py-3 italic">{children}</div>;
}

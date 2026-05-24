import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { supabase } from '@/lib/supabase';
import { TerminalChat } from './TerminalChat';
import { CommandPalette } from './CommandPalette';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Avena Terminal — institutional cockpit',
  description: 'The institutional workspace for European property analysts. Live indices, macro anomalies, cross-validation, AVM, briefings, counterpart stress — all in one screen, driven by the Avena Oracle.',
  alternates: { canonical: 'https://avenaterminal.com/terminal' },
};

// ─── Server-side data load (single round-trip) ──────────────────────────

interface AnomalyRow { country_code: string; source: string; indicator_name: string; period: string; value: number; z_score: number; severity: string; trend: string; source_url: string | null; }
interface ValidationRow { country_code: string; region: string; period: string; official_source: string; official_value: number; avena_value: number; delta_bps: number; avena_n_properties: number; note: string; }
interface BriefingRow { volume: number; slug: string; title: string; subtitle: string | null; publication_date: string; }
interface HealthRow { snapshot_date: string; index_level: number; developers_tracked: number; developers_distressed: number; alerts_active: number; }
interface IndexRow { snapshot_date: string; value: number; median_pm2: number | null; mean_score: number | null; count: number | null; value_index: number | null; score_index: number | null; }
interface StatRow { country_code: string; source: string; indicator_code: string; period: string; value: number; unit: string; }

async function loadTerminal() {
  const empty = { anomalies: [] as AnomalyRow[], validations: [] as ValidationRow[], briefings: [] as BriefingRow[], healthLatest: null as HealthRow | null, healthPrev: null as HealthRow | null, indexLatest: null as IndexRow | null, indexPrev: null as IndexRow | null, mirRows: [] as StatRow[], hpiRows: [] as StatRow[] };
  if (!supabase) return empty;
  try {
    const [a, v, b, h, idx, stats] = await Promise.all([
      supabase.from('eu_anomalies').select('country_code, source, indicator_name, period, value, z_score, severity, trend, source_url').order('detected_at', { ascending: false }).limit(8),
      supabase.from('eu_validation_snapshots').select('country_code, region, period, official_source, official_value, avena_value, delta_bps, avena_n_properties, note').order('computed_at', { ascending: false }).limit(8),
      supabase.from('sovereign_briefings').select('volume, slug, title, subtitle, publication_date').eq('status', 'published').order('volume', { ascending: false }).limit(5),
      supabase.from('counterpart_health_history').select('*').order('snapshot_date', { ascending: false }).limit(2),
      supabase.from('avena_history').select('*').order('snapshot_date', { ascending: false }).limit(2),
      supabase.from('eu_official_stats').select('country_code, source, indicator_code, period, value, unit').or('source.eq.ecb_sdw,indicator_code.ilike.%RCH_A%').order('period', { ascending: false }).limit(40),
    ]);
    const healthArr = (h.data ?? []) as HealthRow[];
    const idxArr = (idx.data ?? []) as IndexRow[];
    const statRows = (stats.data ?? []) as StatRow[];
    return {
      anomalies: (a.data ?? []) as AnomalyRow[],
      validations: (v.data ?? []) as ValidationRow[],
      briefings: (b.data ?? []) as BriefingRow[],
      healthLatest: healthArr[0] ?? null,
      healthPrev: healthArr[1] ?? null,
      indexLatest: idxArr[0] ?? null,
      indexPrev: idxArr[1] ?? null,
      mirRows: statRows.filter(r => r.source === 'ecb_sdw' && r.indicator_code.includes('MIR')).slice(0, 8),
      hpiRows: statRows.filter(r => r.indicator_code.includes('RCH_A')).slice(0, 8),
    };
  } catch { return empty; }
}

function fmtChange(curr: number | null, prev: number | null, decimals = 2): { val: string; up: boolean | null } {
  if (curr == null || prev == null) return { val: '—', up: null };
  const d = curr - prev;
  return { val: `${d >= 0 ? '+' : ''}${d.toFixed(decimals)}`, up: d >= 0 };
}

export default async function TerminalPage() {
  const data = await loadTerminal();
  const indexDelta = fmtChange(data.indexLatest?.value ?? null, data.indexPrev?.value ?? null);
  const healthDelta = fmtChange(data.healthLatest?.index_level ?? null, data.healthPrev?.index_level ?? null);
  const eurEsMir = data.mirRows.find(r => r.country_code === 'ES');
  const eurAggMir = data.mirRows.find(r => r.country_code === 'EA20' || r.country_code === 'U2');

  return (
    <div className="avena-v2 min-h-screen flex flex-col" style={{ background: 'hsl(var(--av-background))' }}>
      <Nav />
      <CommandPalette />

      {/* ─── Top ticker bar ─────────────────────────────────────────── */}
      <div className="border-b border-t mt-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono">
          <span className="text-primary uppercase tracking-[0.22em]">Avena Terminal</span>
          <TickerItem label="AVENA-CC" value={data.indexLatest?.value?.toFixed(2) ?? '—'} delta={indexDelta} />
          <TickerItem label="HEALTH" value={data.healthLatest?.index_level?.toFixed(1) ?? '—'} delta={healthDelta} />
          <TickerItem label="EURIBOR3M" value="2.85" suffix="%" />
          <TickerItem label={`MIR ${eurEsMir?.country_code ?? 'ES'}`} value={eurEsMir?.value?.toFixed(2) ?? '—'} suffix="%" />
          <TickerItem label={`MIR ${eurAggMir?.country_code ?? 'EA20'}`} value={eurAggMir?.value?.toFixed(2) ?? '—'} suffix="%" />
          <TickerItem label="ANOMALIES" value={data.anomalies.length.toString()} alert={data.anomalies.some(a => a.severity === 'critical')} />
          <TickerItem label="BRIEFINGS" value={data.briefings.length.toString()} />
          <span className="ml-auto text-muted-foreground uppercase tracking-[0.22em]">⌘K palette · live refresh 60s</span>
        </div>
      </div>

      {/* ─── Cockpit grid ───────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-4 grid gap-4 lg:grid-cols-[420px_1fr]">

        {/* ── Left rail: 6 institutional widgets ──────────────────── */}
        <div className="flex flex-col gap-4">
          <Widget title="Macro Anomalies" subtitle={`${data.anomalies.length} signals · z ≥ 2σ`} href="/alerts/macro">
            {data.anomalies.length === 0 ? <Empty>No anomalies — first scan pending</Empty> : (
              <ul className="space-y-1.5">
                {data.anomalies.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] truncate">{a.country_code} · {a.source}</span>
                    <span className="font-mono text-[10px] tabular shrink-0" style={{ color: a.severity === 'critical' ? 'hsl(var(--av-destructive))' : a.severity === 'alert' ? 'hsl(var(--av-accent))' : 'hsl(var(--av-warning))' }}>
                      {a.trend === 'up' ? '↑' : '↓'} z={a.z_score.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          <Widget title="Cross-Validation" subtitle="Avena vs official · signed Δ" href="/eu-official">
            {data.validations.length === 0 ? <Empty>Calibration phase · awaiting validation snapshots</Empty> : (
              <ul className="space-y-1.5">
                {data.validations.slice(0, 5).map((v, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] truncate">{v.country_code}·{v.region}·{v.period}</span>
                    <span className="font-mono text-[10px] tabular shrink-0" style={{ color: v.delta_bps === 0 ? 'hsl(var(--av-muted-foreground))' : v.delta_bps > 0 ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>
                      {v.delta_bps >= 0 ? '+' : ''}{v.delta_bps} bps
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          <Widget title="Sovereign Briefings" subtitle={`Vol 1-${data.briefings[0]?.volume ?? 0} published`} href="/sovereign-briefing">
            {data.briefings.length === 0 ? <Empty>No briefings yet</Empty> : (
              <ul className="space-y-2">
                {data.briefings.slice(0, 4).map(b => (
                  <li key={b.slug}>
                    <Link href={`/sovereign-briefing/${b.slug}`} className="block hover:bg-[hsl(var(--av-muted)/0.4)] -mx-2 px-2 py-1 rounded-sm transition-colors">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Vol. {b.volume}</span>
                      <div className="text-[11px] text-foreground/90 leading-snug line-clamp-2">{b.title}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          <Widget title="Counterpart Health" subtitle="Developer risk graph" href="/counterpart/health-index">
            {data.healthLatest ? (
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Index" value={data.healthLatest.index_level.toFixed(1)} />
                <Mini label="Tracked" value={data.healthLatest.developers_tracked.toString()} />
                <Mini label="Distressed" value={data.healthLatest.developers_distressed.toString()} accent={data.healthLatest.developers_distressed > 0} />
              </div>
            ) : <Empty>Health index not yet computed</Empty>}
          </Widget>

          <Widget title="ECB Mortgage Rates" subtitle="Cost-of-borrowing per country (MIR)" href="/eu-official">
            {data.mirRows.length === 0 ? <Empty>No ECB MIR data yet</Empty> : (
              <ul className="space-y-1.5">
                {data.mirRows.slice(0, 6).map((r, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{r.country_code} · {r.period}</span>
                    <span className="font-mono text-[10px] tabular text-foreground">{r.value.toFixed(2)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          <Widget title="EU HPI · YoY" subtitle="Eurostat residential, latest" href="/eu-official">
            {data.hpiRows.length === 0 ? <Empty>No Eurostat HPI YoY rows</Empty> : (
              <ul className="space-y-1.5">
                {data.hpiRows.slice(0, 6).map((r, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{r.country_code} · {r.period}</span>
                    <span className="font-mono text-[10px] tabular text-foreground">{r.value >= 0 ? '+' : ''}{r.value.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>
        </div>

        {/* ── Right rail: Oracle ──────────────────────────────────── */}
        <TerminalChat
          contextPreamble={`Latest tickers — AVENA-CC ${data.indexLatest?.value?.toFixed(2) ?? '—'} ${indexDelta.val}, Health ${data.healthLatest?.index_level?.toFixed(1) ?? '—'} ${healthDelta.val}, Anomalies ${data.anomalies.length}, Briefings Vol 1-${data.briefings[0]?.volume ?? 0}.`}
        />
      </main>

      {/* ─── Footer status strip ─────────────────────────────────────── */}
      <div className="border-t mt-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
          <span className="text-success">● online</span>
          <Link href="/status" className="hover:text-foreground">System status</Link>
          <Link href="/governance" className="hover:text-foreground">Governance</Link>
          <Link href="/docs/api" className="hover:text-foreground">API · OpenAPI 3.1</Link>
          <Link href="/docs/webhooks" className="hover:text-foreground">Webhooks</Link>
          <Link href="/archive" className="hover:text-foreground">Moat archive · hash-chained</Link>
          <Link href="/terminal/seat" className="ml-auto text-primary hover:text-foreground">Get a seat · €499/mo →</Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function TickerItem({ label, value, delta, suffix, alert }: { label: string; value: string; delta?: { val: string; up: boolean | null }; suffix?: string; alert?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-muted-foreground uppercase tracking-[0.22em]">{label}</span>
      <span className="tabular text-foreground/90" style={{ color: alert ? 'hsl(var(--av-destructive))' : undefined }}>{value}{suffix ?? ''}</span>
      {delta && delta.up !== null && (
        <span className="tabular text-[10px]" style={{ color: delta.up ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>{delta.val}</span>
      )}
    </span>
  );
}

function Widget({ title, subtitle, href, children }: { title: string; subtitle: string; href?: string; children: React.ReactNode }) {
  const header = (
    <div className="flex items-baseline justify-between mb-3">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-primary">{title}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      {href && <Link href={href} className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">open →</Link>}
    </div>
  );
  return (
    <div className="rounded-sm border p-3.5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      {header}
      {children}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border px-2 py-1.5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm tabular" style={{ color: accent ? 'hsl(var(--av-warning))' : 'hsl(var(--av-foreground))' }}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground py-2 italic">{children}</div>;
}

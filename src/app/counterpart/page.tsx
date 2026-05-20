import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, ArrowUpRight, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Avena Counterpart — developer intelligence + network risk | Avena Terminal',
  description: 'Before you trust a developer with €500,000 — know their track record, financial health, network exposure, and stress signals. Avena Counterpart builds the first developer counterparty intelligence layer for European property.',
  alternates: { canonical: 'https://avenaterminal.com/counterpart' },
  openGraph: {
    title: 'Avena Counterpart — know who you trust with your capital',
    description: 'Counterpart scores, network graphs, and stress alerts for every European developer.',
    url: 'https://avenaterminal.com/counterpart',
  },
};

interface Developer {
  developer_id: string;
  name: string;
  country: string;
  counterpart_score: number;
  score_grade: string;
  score_trend: string | null;
  total_projects: number;
  on_time_delivery_rate: number | null;
  legal_disputes_active: number;
  payment_delay_signals: number;
  founded_year: number | null;
}

interface Alert {
  id: string;
  developer_id: string;
  alert_type: string;
  severity: string;
  description: string;
  affected_markets: string[] | null;
  network_exposure_count: number | null;
  detected_at: string;
  developer?: { name: string; counterpart_score: number };
}

async function loadData(): Promise<{ developers: Developer[]; alerts: Alert[] }> {
  if (!supabase) return { developers: [], alerts: [] };
  try {
    const [d, a] = await Promise.all([
      supabase.from('counterpart_developers').select('developer_id, name, country, counterpart_score, score_grade, score_trend, total_projects, on_time_delivery_rate, legal_disputes_active, payment_delay_signals, founded_year').order('counterpart_score', { ascending: false }).limit(100),
      supabase.from('counterpart_stress_alerts').select('*, developer:counterpart_developers!inner(name, counterpart_score)').eq('status', 'active').order('severity', { ascending: false }).order('detected_at', { ascending: false }).limit(20),
    ]);
    return { developers: (d.data ?? []) as Developer[], alerts: (a.data ?? []) as Alert[] };
  } catch { return { developers: [], alerts: [] }; }
}

const GRADE_META: Record<string, { color: string; bg: string; label: string }> = {
  AAV: { color: 'hsl(var(--av-primary))',     bg: 'hsl(var(--av-primary) / 0.12)',    label: 'Triple-A vetted' },
  AV:  { color: 'hsl(var(--av-primary))',     bg: 'hsl(var(--av-primary) / 0.10)',    label: 'A-vetted' },
  ABV: { color: 'hsl(var(--av-warning))',     bg: 'hsl(var(--av-warning) / 0.10)',    label: 'Above-baseline' },
  BBV: { color: 'hsl(var(--av-warning))',     bg: 'hsl(var(--av-warning) / 0.10)',    label: 'Below-baseline' },
  CV:  { color: 'hsl(var(--av-destructive))', bg: 'hsl(var(--av-destructive) / 0.10)', label: 'Caution' },
  DV:  { color: 'hsl(var(--av-destructive))', bg: 'hsl(var(--av-destructive) / 0.15)', label: 'Distressed' },
};

const SEVERITY_META: Record<string, { color: string }> = {
  critical: { color: 'hsl(var(--av-destructive))' },
  high:     { color: 'hsl(var(--av-destructive))' },
  medium:   { color: 'hsl(var(--av-warning))' },
  low:      { color: 'hsl(var(--av-muted-foreground))' },
};

export default async function CounterpartPage() {
  const { developers, alerts } = await loadData();

  const avgScore = developers.length ? Math.round(developers.reduce((s, d) => s + d.counterpart_score, 0) / developers.length) : 0;
  const distressed = developers.filter((d) => d.counterpart_score < 50).length;
  const critical = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="avena-v2 min-h-screen overflow-x-clip" style={{ maxWidth: '100vw' }}>
      <Nav />
      <main className="pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        {/* Hero */}
        <section className="border-b relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'linear-gradient(180deg, hsl(32 14% 8%) 0%, hsl(32 14% 11%) 100%)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-14 sm:py-20 min-w-0">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <ShieldCheck className="h-3.5 w-3.5" />
              Avena Counterpart · developer intelligence · live
            </span>
            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.92] tracking-tight text-foreground mb-6">
              Know who you <span className="italic text-gold">trust</span>.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light mb-10">
              Every off-plan property purchase is a bet on the developer. Avena Counterpart builds the first systematic intelligence layer for European developers — track record, financial health, network exposure, stress signals. Score 0–100, grade AAV→DV, alert on contagion.
            </p>

            <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Developers monitored</div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-primary leading-none">{developers.length}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Average score</div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-foreground leading-none">{avgScore}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Active alerts</div>
                <div className="font-serif text-5xl sm:text-6xl tabular leading-none" style={{ color: critical > 0 ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-foreground))' }}>{alerts.length}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Distressed (&lt;50)</div>
                <div className="font-serif text-5xl sm:text-6xl tabular leading-none" style={{ color: distressed > 0 ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-foreground))' }}>{distressed}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Active stress alerts */}
        {alerts.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12 min-w-0">
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-2 flex items-center gap-3">
                Active <span className="italic text-gold">stress alerts</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm" style={{ background: 'hsl(var(--av-destructive) / 0.12)', color: 'hsl(var(--av-destructive))' }}>
                  {alerts.length} live
                </span>
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
                Live feed of developer stress signals across EU markets
              </p>

              <div className="space-y-3">
                {alerts.map((a) => {
                  const sev = SEVERITY_META[a.severity] ?? SEVERITY_META.medium;
                  return (
                    <Link
                      key={a.id}
                      href={`/counterpart/${a.developer_id}`}
                      className="block rounded-sm border p-5 hover:border-primary transition-colors group min-w-0"
                      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: sev.color }} />
                          <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-sm" style={{ background: `${sev.color.replace(')', ' / 0.12)')}`, color: sev.color }}>
                            {a.severity}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{a.alert_type.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/85">→ {a.developer?.name ?? a.developer_id}</span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-sm text-foreground/85 font-light leading-relaxed">{a.description}</p>
                      {a.network_exposure_count != null && a.network_exposure_count > 0 && (
                        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Network exposure: {a.network_exposure_count} connected entities
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Developer directory */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12 min-w-0">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-2">
              Developer <span className="italic text-gold">directory</span>.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
              {developers.length} developers monitored · sortable by score, grade, market
            </p>

            <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm" style={{ minWidth: 760 }}>
                <thead style={{ background: 'hsl(var(--av-surface) / 0.5)' }}>
                  <tr className="text-left font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                    <th className="px-3 py-2.5">Developer</th>
                    <th className="px-3 py-2.5 text-center">Score</th>
                    <th className="px-3 py-2.5 text-center">Grade</th>
                    <th className="px-3 py-2.5 text-center">Trend</th>
                    <th className="px-3 py-2.5 text-right">Projects</th>
                    <th className="px-3 py-2.5 text-right">On-time</th>
                    <th className="px-3 py-2.5 text-right">Disputes</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map((d) => {
                    const meta = GRADE_META[d.score_grade] ?? GRADE_META.BBV;
                    return (
                      <tr key={d.developer_id} className="border-t hover:bg-primary/5" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <td className="px-3 py-3">
                          <Link href={`/counterpart/${d.developer_id}`} className="hover:text-primary">
                            <span className="font-serif text-base text-foreground">{d.name}</span>
                            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">{d.country} · founded {d.founded_year ?? '—'}</div>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center font-serif text-2xl tabular" style={{ color: meta.color }}>{d.counterpart_score}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm" style={{ background: meta.bg, color: meta.color }}>
                            {d.score_grade}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: d.score_trend === 'improving' ? 'hsl(var(--av-primary))' : d.score_trend === 'deteriorating' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-muted-foreground))' }}>
                          {d.score_trend ?? '—'}
                        </td>
                        <td className="px-3 py-3 font-mono tabular text-right">{d.total_projects}</td>
                        <td className="px-3 py-3 font-mono tabular text-right">{d.on_time_delivery_rate != null ? `${Math.round(d.on_time_delivery_rate * 100)}%` : '—'}</td>
                        <td className="px-3 py-3 font-mono tabular text-right">
                          <span style={{ color: d.legal_disputes_active > 0 ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-foreground))' }}>
                            {d.legal_disputes_active}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/counterpart/${d.developer_id}`} className="text-primary hover:text-gold">
                            <ArrowUpRight className="h-4 w-4 inline" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Access */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-14 min-w-0">
            <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground mb-5">
              Access <span className="italic text-gold">tiers</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AccessCard icon={ShieldCheck} title="PRO · €79/mo" desc="Search any developer. See score, grade, project history. Watch up to 5 developers." />
              <AccessCard icon={ShieldAlert} title="Desk · €2,500/mo" desc="Full network graph. Stress alerts. API access. Unlimited watchlists." />
              <AccessCard icon={ShieldX} title="Fund · €12,000/mo" desc="Bulk scanning. Custom thresholds. Contagion modeling for your portfolio." accent />
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            CC BY 4.0 · DOI 10.5281/zenodo.19520064 · RICS Tech Partner 2026 · Sourced from public registries
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AccessCard({ icon: Icon, title, desc, accent }: { icon: typeof ShieldCheck; title: string; desc: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: accent ? 'hsl(var(--av-primary) / 0.4)' : 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <p className="text-sm text-foreground/85 font-light">{desc}</p>
    </div>
  );
}

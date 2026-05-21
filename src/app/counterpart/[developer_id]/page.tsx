import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Shield, AlertTriangle, Building, Network } from 'lucide-react';
import { NetworkGraph } from './NetworkGraph';

export const dynamic = 'force-dynamic';

interface Developer {
  developer_id: string;
  name: string;
  country: string;
  founded_year: number | null;
  counterpart_score: number;
  score_grade: string;
  score_trend: string | null;
  total_projects: number;
  completed_projects: number;
  delayed_projects: number;
  cancelled_projects: number;
  on_time_delivery_rate: number | null;
  avg_delay_months: number | null;
  financial_stress_score: number | null;
  payment_delay_signals: number;
  legal_disputes_active: number;
  legal_disputes_resolved: number;
  court_judgements_against: number;
  spec_match_rate: number | null;
  complaint_rate: number | null;
  primary_bank: string | null;
  primary_contractors: string[] | null;
  risk_flags: Array<string> | null;
  positive_signals: Array<string> | null;
  claude_assessment: string | null;
}

interface Project {
  project_id: string;
  name: string;
  location: string;
  market: string;
  total_units: number | null;
  units_sold: number | null;
  promised_completion: string | null;
  status: string;
  delay_months: number;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  detected_at: string;
}

interface NetworkEdge {
  from_entity_id: string;
  from_entity_type: string;
  to_entity_id: string;
  to_entity_type: string;
  relationship_type: string;
  strength: number | null;
  stress_contagion_risk: string | null;
}

interface NetworkDeveloper {
  developer_id: string;
  name: string;
  counterpart_score: number;
  score_grade: string;
}

async function loadDeveloper(id: string): Promise<{ developer: Developer | null; projects: Project[]; alerts: Alert[]; edges: NetworkEdge[]; networkDevelopers: NetworkDeveloper[] }> {
  if (!supabase) return { developer: null, projects: [], alerts: [], edges: [], networkDevelopers: [] };
  try {
    const [d, p, a, e] = await Promise.all([
      supabase.from('counterpart_developers').select('*').eq('developer_id', id).maybeSingle(),
      supabase.from('counterpart_projects').select('*').eq('developer_id', id).order('promised_completion', { ascending: true }),
      supabase.from('counterpart_stress_alerts').select('*').eq('developer_id', id).eq('status', 'active').order('detected_at', { ascending: false }),
      supabase.from('counterpart_network_edges').select('*').or(`from_entity_id.eq.${id},to_entity_id.eq.${id}`),
    ]);

    const edges = (e.data as NetworkEdge[]) ?? [];
    const ids = new Set<string>([id]);
    for (const edge of edges) { ids.add(edge.from_entity_id); ids.add(edge.to_entity_id); }
    const { data: devs } = await supabase
      .from('counterpart_developers')
      .select('developer_id, name, counterpart_score, score_grade')
      .in('developer_id', [...ids]);

    return {
      developer: (d.data as Developer | null) ?? null,
      projects: (p.data as Project[]) ?? [],
      alerts: (a.data as Alert[]) ?? [],
      edges,
      networkDevelopers: (devs as NetworkDeveloper[]) ?? [],
    };
  } catch { return { developer: null, projects: [], alerts: [], edges: [], networkDevelopers: [] }; }
}

export async function generateMetadata({ params }: { params: Promise<{ developer_id: string }> }): Promise<Metadata> {
  const { developer_id } = await params;
  const { developer } = await loadDeveloper(developer_id);
  return {
    title: developer ? `${developer.name} — Counterpart dossier | Avena Terminal` : 'Counterpart dossier',
    alternates: { canonical: `https://avenaterminal.com/counterpart/${developer_id}` },
  };
}

const GRADE_COLORS: Record<string, string> = {
  AAV: 'hsl(var(--av-primary))', AV: 'hsl(var(--av-primary))',
  ABV: 'hsl(var(--av-warning))', BBV: 'hsl(var(--av-warning))',
  CV: 'hsl(var(--av-destructive))', DV: 'hsl(var(--av-destructive))',
};

export default async function DeveloperPage({ params }: { params: Promise<{ developer_id: string }> }) {
  const { developer_id } = await params;
  const { developer: d, projects, alerts, edges, networkDevelopers } = await loadDeveloper(developer_id);
  if (!d) notFound();

  const gradeColor = GRADE_COLORS[d.score_grade] ?? 'hsl(var(--av-muted-foreground))';

  return (
    <div className="avena-v2 min-h-screen overflow-x-clip" style={{ maxWidth: '100vw' }}>
      <Nav />
      <main className="pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12 min-w-0">
            <Link href="/counterpart" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="h-3 w-3" /> All developers
            </Link>

            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-2">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-foreground break-words" style={{ overflowWrap: 'anywhere' }}>
                {d.name}
              </h1>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Counterpart Score</div>
                <div className="font-serif text-7xl tabular leading-none" style={{ color: gradeColor }}>
                  {d.counterpart_score}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] mt-2 inline-block px-2 py-0.5 rounded-sm" style={{ background: `${gradeColor.replace(')', ' / 0.12)')}`, color: gradeColor }}>
                  Grade {d.score_grade} · {d.score_trend ?? 'stable'}
                </span>
              </div>
            </div>

            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {d.country} · founded {d.founded_year ?? '—'} · {d.total_projects} total projects
            </p>

            {d.claude_assessment && (
              <p className="mt-6 max-w-3xl text-base text-foreground/90 font-light leading-relaxed">
                {d.claude_assessment}
              </p>
            )}
          </div>
        </section>

        {/* Stats grid */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
            <Stat label="On-time delivery" value={d.on_time_delivery_rate != null ? `${Math.round(d.on_time_delivery_rate * 100)}%` : '—'} accent={d.on_time_delivery_rate != null && d.on_time_delivery_rate > 0.85} />
            <Stat label="Avg delay" value={d.avg_delay_months != null ? `${d.avg_delay_months.toFixed(1)} mo` : '—'} />
            <Stat label="Spec match" value={d.spec_match_rate != null ? `${Math.round(d.spec_match_rate * 100)}%` : '—'} accent={d.spec_match_rate != null && d.spec_match_rate > 0.9} />
            <Stat label="Complaint rate" value={d.complaint_rate != null ? `${(d.complaint_rate * 100).toFixed(1)}%` : '—'} />
            <Stat label="Completed" value={String(d.completed_projects)} />
            <Stat label="Delayed" value={String(d.delayed_projects)} bad={d.delayed_projects > 5} />
            <Stat label="Cancelled" value={String(d.cancelled_projects)} bad={d.cancelled_projects > 0} />
            <Stat label="Financial stress" value={d.financial_stress_score != null ? `${d.financial_stress_score}` : '—'} bad={d.financial_stress_score != null && d.financial_stress_score > 50} />
            <Stat label="Active disputes" value={String(d.legal_disputes_active)} bad={d.legal_disputes_active > 0} />
            <Stat label="Payment delays" value={String(d.payment_delay_signals)} bad={d.payment_delay_signals > 2} />
            <Stat label="Court judgements" value={String(d.court_judgements_against)} bad={d.court_judgements_against > 0} />
            <Stat label="Primary bank" value={d.primary_bank ?? '—'} />
          </div>
        </section>

        {/* Active alerts */}
        {alerts.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10 min-w-0">
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--av-destructive))' }} />
                Active <span className="italic text-gold">alerts</span>
              </h2>
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.id} className="rounded-sm border p-4" style={{ background: 'hsl(var(--av-destructive) / 0.06)', borderColor: 'hsl(var(--av-destructive) / 0.3)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-destructive))' }}>{a.severity}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{a.alert_type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-foreground/85 font-light">{a.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Risk flags + positives */}
        {(d.risk_flags || d.positive_signals) && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
              {d.risk_flags && d.risk_flags.length > 0 && (
                <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-warning) / 0.06)', borderColor: 'hsl(var(--av-warning) / 0.3)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: 'hsl(var(--av-warning))' }}>Risk flags</div>
                  <ul className="space-y-2">
                    {d.risk_flags.map((f, i) => (
                      <li key={i} className="text-sm text-foreground/85 font-light flex gap-2">
                        <span className="text-warning">·</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.positive_signals && d.positive_signals.length > 0 && (
                <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-primary) / 0.06)', borderColor: 'hsl(var(--av-primary) / 0.3)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3 text-primary">Positive signals</div>
                  <ul className="space-y-2">
                    {d.positive_signals.map((s, i) => (
                      <li key={i} className="text-sm text-foreground/85 font-light flex gap-2">
                        <span className="text-primary">·</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Network graph */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10 min-w-0">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5 flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Counterparty <span className="italic text-gold">network</span>
            </h2>
            <NetworkGraph
              centerId={d.developer_id}
              edges={edges}
              developers={networkDevelopers}
            />
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Edges thickness = relationship strength · color = stress contagion risk (red high · amber medium · grey low)
            </p>
          </div>
        </section>

        {/* Projects */}
        {projects.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10 min-w-0">
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5 flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Project <span className="italic text-gold">history</span>
              </h2>
              <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full text-sm" style={{ minWidth: 700 }}>
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.5)' }}>
                    <tr className="text-left font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      <th className="px-3 py-2.5">Project</th>
                      <th className="px-3 py-2.5">Location</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5 text-right">Units</th>
                      <th className="px-3 py-2.5 text-right">Sold</th>
                      <th className="px-3 py-2.5 text-right">Delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.project_id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <td className="px-3 py-3 font-serif text-foreground">{p.name}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{p.location} · {p.market}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm" style={{ background: p.status === 'completed' ? 'hsl(var(--av-primary) / 0.12)' : p.status === 'delayed' ? 'hsl(var(--av-destructive) / 0.12)' : 'hsl(var(--av-surface) / 0.5)', color: p.status === 'completed' ? 'hsl(var(--av-primary))' : p.status === 'delayed' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-foreground))' }}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono tabular text-right">{p.total_units ?? '—'}</td>
                        <td className="px-3 py-3 font-mono tabular text-right">{p.units_sold ?? '—'}</td>
                        <td className="px-3 py-3 font-mono tabular text-right">
                          <span style={{ color: p.delay_months > 3 ? 'hsl(var(--av-destructive))' : p.delay_months > 0 ? 'hsl(var(--av-warning))' : 'hsl(var(--av-foreground))' }}>
                            {p.delay_months > 0 ? `${p.delay_months}mo` : 'on time'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground inline-flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Counterpart dossier · CC BY 4.0 · sourced from public registries
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, accent, bad }: { label: string; value: string; accent?: boolean; bad?: boolean }) {
  const color = bad ? 'hsl(var(--av-destructive))' : accent ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))';
  return (
    <div className="rounded-sm border p-4" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-2xl tabular" style={{ color }}>{value}</div>
    </div>
  );
}

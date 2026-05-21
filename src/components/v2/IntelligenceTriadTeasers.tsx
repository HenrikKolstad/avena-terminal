import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Radio, FlaskConical, ShieldAlert, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';

interface Signal {
  signal_id: string;
  title: string;
  signal_type: string;
  affected_markets: string[];
  confidence_score: number;
  direction: string;
}

interface PrebuiltScenario {
  title: string;
  category: string | null;
}

interface CounterpartSummary {
  monitored: number;
  alerts_active: number;
  recent_drop: { name: string; score: number; developer_id: string } | null;
}

async function loadTriadStats(): Promise<{
  signals: Signal[];
  scenarios: PrebuiltScenario[];
  counterpart: CounterpartSummary;
}> {
  const empty = {
    signals: [],
    scenarios: [],
    counterpart: { monitored: 0, alerts_active: 0, recent_drop: null },
  };
  if (!supabase) return empty;
  try {
    const [signalsRes, scenariosRes, devCountRes, alertsCountRes, recentDropRes] = await Promise.all([
      supabase
        .from('precursor_signals')
        .select('signal_id, title, signal_type, affected_markets, confidence_score, direction')
        .eq('status', 'active')
        .order('confidence_score', { ascending: false })
        .limit(3),
      supabase
        .from('genesis_prebuilt_scenarios')
        .select('title, category')
        .eq('is_featured', true)
        .limit(3),
      supabase.from('counterpart_developers').select('developer_id', { count: 'exact', head: true }),
      supabase
        .from('counterpart_stress_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('counterpart_developers')
        .select('developer_id, name, counterpart_score')
        .eq('score_trend', 'deteriorating')
        .order('counterpart_score', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    const recentDrop = recentDropRes.data
      ? {
          name: (recentDropRes.data as { name: string }).name,
          score: (recentDropRes.data as { counterpart_score: number }).counterpart_score,
          developer_id: (recentDropRes.data as { developer_id: string }).developer_id,
        }
      : null;

    return {
      signals: (signalsRes.data as Signal[]) ?? [],
      scenarios: (scenariosRes.data as PrebuiltScenario[]) ?? [],
      counterpart: {
        monitored: devCountRes.count ?? 0,
        alerts_active: alertsCountRes.count ?? 0,
        recent_drop: recentDrop,
      },
    };
  } catch {
    return empty;
  }
}

export async function IntelligenceTriadTeasers() {
  const { signals, scenarios, counterpart } = await loadTriadStats();

  // Don't render if nothing to show
  if (signals.length === 0 && scenarios.length === 0 && counterpart.monitored === 0) return null;

  return (
    <section
      className="border-y relative overflow-hidden"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'linear-gradient(180deg, hsl(32 14% 7%) 0%, hsl(32 14% 10%) 100%)',
      }}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16 sm:py-20 min-w-0">
        <div className="mb-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary inline-flex items-center gap-3">
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
            Institutional intelligence · the triad
          </span>
          <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-light tracking-tight text-foreground max-w-3xl">
            Three systems no one else has <span className="italic text-gold">shipped</span>.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground font-light">
            What signals the market hasn&apos;t seen yet. What happens under any macro scenario. Who you can actually trust with your capital.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-w-0">

          {/* PRECURSOR teaser */}
          <Link
            href="/precursor"
            className="group rounded-sm border p-6 flex flex-col hover:border-primary transition-colors min-w-0"
            style={{ background: 'hsl(var(--av-surface) / 0.5)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Precursor</span>
            </div>
            <h3 className="font-serif text-2xl font-light text-foreground mb-1">The signal before the signal.</h3>
            <p className="text-sm text-muted-foreground font-light mb-5">Alpha before the market sees it.</p>

            {signals.length > 0 ? (
              <div className="space-y-2 mb-4 flex-1">
                {signals.map((s) => {
                  const DirIcon = s.direction === 'bullish' ? TrendingUp : s.direction === 'bearish' ? TrendingDown : Radio;
                  const dirColor = s.direction === 'bullish' ? 'hsl(var(--av-primary))' : s.direction === 'bearish' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-muted-foreground))';
                  return (
                    <div key={s.signal_id} className="font-mono text-[10px] uppercase tracking-[0.18em] flex items-center justify-between gap-2 min-w-0">
                      <span className="text-foreground/85 truncate">
                        {s.affected_markets[0]} · {s.signal_type}
                      </span>
                      <span className="flex items-center gap-1 text-primary shrink-0">
                        {s.confidence_score}%
                        <DirIcon className="h-3 w-3" style={{ color: dirColor }} />
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4 flex-1">
                Daily scan at 05:00 UTC
              </p>
            )}

            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary group-hover:text-gold inline-flex items-center gap-1">
              View all signals <ArrowUpRight className="h-3 w-3" />
            </span>
          </Link>

          {/* GENESIS teaser */}
          <Link
            href="/genesis"
            className="group rounded-sm border p-6 flex flex-col hover:border-primary transition-colors min-w-0"
            style={{ background: 'hsl(var(--av-surface) / 0.5)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Genesis</span>
            </div>
            <h3 className="font-serif text-2xl font-light text-foreground mb-1">Run the future.</h3>
            <p className="text-sm text-muted-foreground font-light mb-5">Stress-test any macro scenario.</p>

            <div className="space-y-2 mb-4 flex-1">
              {scenarios.length > 0 ? (
                scenarios.map((s, i) => (
                  <div key={i} className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85 truncate flex items-center gap-2 min-w-0">
                    <span className="text-primary shrink-0">▸</span>
                    <span className="truncate">{s.title}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85">ECB +100bps</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85">Spain restrictions</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85">German migration</div>
                </>
              )}
            </div>

            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary group-hover:text-gold inline-flex items-center gap-1">
              Build your scenario <ArrowUpRight className="h-3 w-3" />
            </span>
          </Link>

          {/* COUNTERPART teaser */}
          <Link
            href="/counterpart"
            className="group rounded-sm border p-6 flex flex-col hover:border-primary transition-colors min-w-0"
            style={{ background: 'hsl(var(--av-surface) / 0.5)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Counterpart</span>
            </div>
            <h3 className="font-serif text-2xl font-light text-foreground mb-1">Know who you trust.</h3>
            <p className="text-sm text-muted-foreground font-light mb-5">Developer intelligence + network risk.</p>

            <div className="space-y-2 mb-4 flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/85">
                <span className="text-primary tabular">{counterpart.monitored}</span> developers monitored
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/85 flex items-center gap-2">
                <span className="tabular" style={{ color: counterpart.alerts_active > 0 ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-primary))' }}>
                  {counterpart.alerts_active}
                </span>
                <span>stress alerts active</span>
              </div>
              {counterpart.recent_drop && (
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/85 truncate min-w-0">
                  Recently flagged: <span className="text-foreground">{counterpart.recent_drop.name}</span> →{' '}
                  <span style={{ color: 'hsl(var(--av-destructive))' }}>{counterpart.recent_drop.score} ↓</span>
                </div>
              )}
            </div>

            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary group-hover:text-gold inline-flex items-center gap-1">
              Check your developer <ArrowUpRight className="h-3 w-3" />
            </span>
          </Link>

        </div>
      </div>
    </section>
  );
}

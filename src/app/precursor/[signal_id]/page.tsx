import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Signal {
  signal_id: string;
  signal_type: string;
  title: string;
  description: string;
  source_url: string | null;
  affected_markets: string[];
  affected_regions: string[] | null;
  historical_price_impact_pct: number | null;
  historical_time_lag_days: number | null;
  historical_sample_size: number | null;
  confidence_score: number;
  magnitude_estimate: string | null;
  direction: string;
  current_apci: number | null;
  projected_apci_low: number | null;
  projected_apci_high: number | null;
  projection_horizon_days: number | null;
  claude_analysis: string;
  detected_at: string;
  signal_date: string | null;
  track_until: string | null;
}

async function loadSignal(id: string): Promise<Signal | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('precursor_signals').select('*').eq('signal_id', id).maybeSingle();
    return (data as Signal | null) ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ signal_id: string }> }): Promise<Metadata> {
  const { signal_id } = await params;
  const s = await loadSignal(signal_id);
  return {
    title: s ? `${s.title} — Precursor Signal | Avena Terminal` : 'Precursor Signal | Avena Terminal',
    alternates: { canonical: `https://avenaterminal.com/precursor/${signal_id}` },
  };
}

export default async function SignalDetailPage({ params }: { params: Promise<{ signal_id: string }> }) {
  const { signal_id } = await params;
  const s = await loadSignal(signal_id);
  if (!s) notFound();

  const DirIcon = s.direction === 'bullish' ? TrendingUp : s.direction === 'bearish' ? TrendingDown : Minus;
  const dirColor = s.direction === 'bullish' ? 'hsl(var(--av-primary))' : s.direction === 'bearish' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-muted-foreground))';

  return (
    <div className="avena-v2 min-h-screen overflow-x-clip" style={{ maxWidth: '100vw' }}>
      <Nav />
      <main className="pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-12 min-w-0">
            <Link href="/precursor" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="h-3 w-3" /> All signals
            </Link>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 border rounded-sm" style={{ borderColor: 'hsl(var(--av-border-strong))', color: 'hsl(var(--av-muted-foreground))' }}>
                {s.signal_id}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-sm" style={{ background: 'hsl(var(--av-primary) / 0.1)', color: 'hsl(var(--av-primary))' }}>
                {s.signal_type}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] flex items-center gap-1" style={{ color: dirColor }}>
                <DirIcon className="h-3 w-3" /> {s.direction}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-light tracking-tight text-foreground mb-4 break-words" style={{ overflowWrap: 'anywhere' }}>
              {s.title}
            </h1>
            <p className="text-base text-foreground/85 font-light leading-relaxed">
              {s.description}
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
            <Stat label="Confidence" value={`${s.confidence_score}%`} accent />
            <Stat label="Magnitude" value={s.magnitude_estimate ?? '—'} />
            <Stat label="Historical impact" value={s.historical_price_impact_pct != null ? `${s.historical_price_impact_pct}%` : '—'} />
            <Stat label="Time lag" value={s.historical_time_lag_days ? `${Math.round(s.historical_time_lag_days / 30)} mo` : '—'} />
            <Stat label="Current APCI" value={s.current_apci?.toFixed(1) ?? '—'} />
            <Stat label="Projected low" value={s.projected_apci_low?.toFixed(1) ?? '—'} />
            <Stat label="Projected high" value={s.projected_apci_high?.toFixed(1) ?? '—'} accent />
            <Stat label="Sample size" value={s.historical_sample_size?.toString() ?? '—'} />
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-10 min-w-0">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-4">
              Avena <span className="italic text-gold">analysis</span>.
            </h2>
            <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <p className="text-base text-foreground/90 font-light leading-relaxed whitespace-pre-line">
                {s.claude_analysis}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-10 min-w-0">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-4">
              Affected <span className="italic text-gold">markets</span>.
            </h2>
            <div className="flex flex-wrap gap-2">
              {s.affected_markets.map((m) => (
                <span key={m} className="font-mono text-[10px] uppercase tracking-[0.22em] px-3 py-1 rounded-sm border" style={{ borderColor: 'hsl(var(--av-primary) / 0.3)', background: 'hsl(var(--av-primary) / 0.08)', color: 'hsl(var(--av-primary))' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground inline-flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Detected {new Date(s.detected_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            {s.track_until && <> · Tracking until {new Date(s.track_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
            · CC BY 4.0
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border p-4" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</div>
      <div className={`font-serif text-2xl tabular ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { recentAnomalies } from '@/lib/eu-anomalies';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Macro Anomaly Feed · Avena Terminal',
  description: 'Daily anomaly detection across European official residential property statistics. Indicators deviating >2σ from trailing 8-period mean — refreshed daily 06:00 UTC.',
  alternates: { canonical: 'https://avenaterminal.com/alerts/macro' },
};

const SEVERITY_COLOUR: Record<string, string> = {
  watch: 'hsl(var(--av-warning))',
  alert: 'hsl(var(--av-accent))',
  critical: 'hsl(var(--av-destructive))',
};

const SOURCE_LABEL: Record<string, string> = {
  eurostat: 'Eurostat',
  ecb_sdw: 'ECB SDW',
  ine_es: 'INE Spain',
  istat: 'ISTAT',
  cbs: 'CBS',
  bis: 'BIS',
};

export default async function MacroAlertsPage() {
  const anomalies = await recentAnomalies(100);
  const critical = anomalies.filter((a) => a.severity === 'critical');
  const alert = anomalies.filter((a) => a.severity === 'alert');
  const watch = anomalies.filter((a) => a.severity === 'watch');

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Macro Anomaly Feed</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Where official series<br />
              <span className="text-gold italic">break their own trend.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-8">
              Avena scans every observation in the EU official statistics layer daily. Any indicator that deviates more than 2 standard deviations from its trailing 8-period mean lands here, classified by severity. Refreshed 06:00 UTC.
            </p>

            <div className="grid grid-cols-3 gap-4 mt-10">
              <Tally count={critical.length} label="Critical (≥3σ)" colour={SEVERITY_COLOUR.critical} />
              <Tally count={alert.length} label="Alert (≥2.5σ)" colour={SEVERITY_COLOUR.alert} />
              <Tally count={watch.length} label="Watch (≥2σ)" colour={SEVERITY_COLOUR.watch} />
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Methodology</div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              For each (country, source, indicator) series, the engine compares the latest observation to the mean and standard deviation of the prior 8 periods. The z-score classifies the deviation: <span className="font-mono text-warning">watch</span> ≥2σ, <span className="font-mono text-accent">alert</span> ≥2.5σ, <span className="font-mono text-destructive">critical</span> ≥3σ. Series with fewer than 8 prior observations are skipped. Methodology specification at <Link href="/sovereign-briefing/cross-validating-official-statistics-2026" className="text-foreground hover:text-primary">Sovereign Briefing Vol. 3</Link>.
            </p>
          </div>
        </section>

        {/* Feed */}
        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Detected anomalies</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">{anomalies.length} signal{anomalies.length === 1 ? '' : 's'} live.</h2>

            {anomalies.length === 0 ? (
              <div className="rounded-sm border p-8 text-center" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">No anomalies detected</p>
                <p className="text-sm text-foreground">The next anomaly scan runs at 06:00 UTC. Series with fewer than 8 prior observations are not yet eligible — coverage expands as the official stats layer accumulates history.</p>
              </div>
            ) : (
              <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                    <tr>
                      <Th>Severity</Th>
                      <Th>Country</Th>
                      <Th>Source</Th>
                      <Th>Indicator</Th>
                      <Th>Period</Th>
                      <Th align="right">Value</Th>
                      <Th align="right">Mean</Th>
                      <Th align="right">z</Th>
                      <Th>Trend</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((a, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td>
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-sm" style={{ color: SEVERITY_COLOUR[a.severity], border: `1px solid ${SEVERITY_COLOUR[a.severity]}55` }}>
                            {a.severity}
                          </span>
                        </Td>
                        <Td><span className="font-mono text-xs">{a.country_code}</span></Td>
                        <Td><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{SOURCE_LABEL[a.source] ?? a.source}</span></Td>
                        <Td><span className="text-xs text-foreground/90">{a.indicator_name}</span></Td>
                        <Td><span className="font-mono text-xs tabular text-muted-foreground">{a.period}</span></Td>
                        <Td align="right"><span className="font-mono text-sm tabular text-foreground">{Number(a.value).toFixed(2)}</span></Td>
                        <Td align="right"><span className="font-mono text-xs tabular text-muted-foreground">{Number(a.trailing_mean).toFixed(2)}</span></Td>
                        <Td align="right"><span className="font-mono text-sm tabular" style={{ color: SEVERITY_COLOUR[a.severity] }}>{Number(a.z_score) > 0 ? '+' : ''}{Number(a.z_score).toFixed(2)}</span></Td>
                        <Td><span className="font-mono text-xs text-muted-foreground">{a.trend === 'up' ? '↑' : '↓'} {a.trend}</span></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Tally({ count, label, colour }: { count: number; label: string; colour: string }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-serif text-4xl font-light tabular" style={{ color: colour }}>{count}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-4 py-3 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}

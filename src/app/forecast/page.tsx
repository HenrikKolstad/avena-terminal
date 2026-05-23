'use client';

import { useState, useEffect } from 'react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RegionForecast {
  region: string;
  properties: number;
  avg_score: number;
  avg_yield: number;
  base_growth: number;
  adjusted_forecast: number;
  confidence: string;
  bull_case: number;
  bear_case: number;
  key_drivers: string[];
  key_risks: string[];
  price_forecast_12m: { current_avg_pm2: number; forecast_avg_pm2: number; change_euros: number };
}

// All regions use the gold palette — confidence is expressed via opacity, not hue.
const REGION_OPACITY: Record<string, number> = {
  'Costa del Sol':       1.00,
  'Costa Blanca South':  0.80,
  'Costa Blanca North':  0.65,
  'Costa Calida':        0.50,
};
function regionStroke(region: string): string {
  const op = REGION_OPACITY[region] ?? 0.7;
  return `hsl(42 85% 64% / ${op})`;
}

function confidenceStyle(level: string): { bg: string; color: string } {
  if (level === 'HIGH')   return { bg: 'hsl(var(--av-success) / 0.15)', color: 'hsl(var(--av-success))' };
  if (level === 'MEDIUM') return { bg: 'hsl(var(--av-warning) / 0.15)', color: 'hsl(var(--av-warning))' };
  return { bg: 'hsl(var(--av-muted) / 0.4)', color: 'hsl(var(--av-muted-foreground))' };
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<RegionForecast[]>([]);

  useEffect(() => {
    fetch('/api/forecast').then(r => r.json()).then(d => {
      setForecasts(d.forecasts || []);
    }).catch(() => {});
  }, []);

  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const chartData = months.map((m, i) => {
    const point: Record<string, unknown> = { month: m };
    for (const f of forecasts) {
      const monthly = f.adjusted_forecast / 12;
      point[f.region] = Math.round(f.price_forecast_12m.current_avg_pm2 * (1 + monthly * (i + 1) / 100));
    }
    return point;
  });

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <span className="inline-block font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              Regional Forecast Model · Updated Quarterly
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[1.05] tracking-tight text-foreground mb-4">
              12-month <span className="italic text-gold">price/m²</span> projections.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light leading-relaxed">
              Macro-adjusted trend extrapolation across Spanish coastal markets. Base growth rates from five-year historicals, adjusted by eight macro indicators (ECB policy rate, Euribor, EUR/GBP/NOK/SEK, Spain GDP, HICP, unemployment, mortgage approvals).
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>API <span className="text-foreground">GET /api/forecast</span></span>
              <span>Methodology <Link href="/methodology" className="text-foreground hover:text-primary">/methodology</Link></span>
              <span>Cite <span className="text-foreground">DOI 10.5281/zenodo.19520064</span></span>
            </div>
          </div>
        </section>

        {/* Region cards */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">By region · 12-month adjusted forecast</div>
            {forecasts.length === 0 ? (
              <div className="rounded-sm border p-8 text-center" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Loading model output…</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {forecasts.map((f) => {
                  const conf = confidenceStyle(f.confidence);
                  return (
                    <div
                      key={f.region}
                      className="rounded-sm border p-6"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-serif text-xl text-foreground leading-tight">{f.region}</h3>
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{f.properties} properties tracked</div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif text-4xl font-light tabular leading-none text-gold">+{f.adjusted_forecast}%</div>
                          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Base case</div>
                        </div>
                      </div>

                      {/* Range bar — bear → base → bull, neutral palette */}
                      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm mb-4" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
                        <div className="p-2.5" style={{ background: 'hsl(var(--av-background))' }}>
                          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Bear</div>
                          <div className="font-mono tabular text-sm text-destructive">{f.bear_case > 0 ? '+' : ''}{f.bear_case}%</div>
                        </div>
                        <div className="p-2.5" style={{ background: 'hsl(var(--av-background))' }}>
                          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Base</div>
                          <div className="font-mono tabular text-sm text-foreground">+{f.adjusted_forecast}%</div>
                        </div>
                        <div className="p-2.5" style={{ background: 'hsl(var(--av-background))' }}>
                          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Bull</div>
                          <div className="font-mono tabular text-sm text-success">+{f.bull_case}%</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4 text-xs">
                        <span className="rounded-full font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-1" style={{ background: conf.bg, color: conf.color }}>{f.confidence} confidence</span>
                        <span className="font-mono tabular text-muted-foreground">€{f.price_forecast_12m.current_avg_pm2.toLocaleString()}/m² → €{f.price_forecast_12m.forecast_avg_pm2.toLocaleString()}/m²</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        {f.key_drivers.slice(0, 2).map((d) => (
                          <div key={d} className="flex items-start gap-2 text-muted-foreground">
                            <span className="text-success mt-0.5">+</span><span>{d}</span>
                          </div>
                        ))}
                        {f.key_risks.slice(0, 1).map((r) => (
                          <div key={r} className="flex items-start gap-2 text-muted-foreground">
                            <span className="text-destructive mt-0.5">−</span><span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Projection chart */}
        {chartData.length > 0 && forecasts.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">12-month projection · €/m²</div>
              <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--av-border) / 0.5)" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--av-muted-foreground))', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: 'hsl(var(--av-muted-foreground))', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--av-background))',
                        border: '1px solid hsl(var(--av-border-strong))',
                        borderRadius: 4,
                        fontFamily: 'JetBrains Mono',
                        fontSize: 11,
                      }}
                      labelStyle={{ color: 'hsl(var(--av-primary))' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.18em' }} />
                    {forecasts.map((f) => (
                      <Line key={f.region} type="monotone" dataKey={f.region} stroke={regionStroke(f.region)} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Line opacity scales with region weight in the composite. Highest-weight region rendered at full gold.</p>
            </div>
          </section>
        )}

        {/* Methodology + citation */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12 grid md:grid-cols-2 gap-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Methodology</div>
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-3">Macro-adjusted trend extrapolation.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Base growth rates derived from five-year historical region medians. Adjusted by eight macro indicators sourced live from ECB SDW and Eurostat: policy rate, Euribor 3M, EUR/GBP, EUR/NOK, EUR/SEK, Spain GDP, HICP inflation, unemployment, mortgage approvals YoY. Bull and bear cases stress each adjustment ±1.5σ. Confidence label reflects the spread of the 90% interval — wider spread = lower confidence.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Full mathematical specification at <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>. Methodology version bumps announced 30 days in advance at <Link href="/changelog" className="text-primary hover:underline">/changelog</Link>.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cite as</div>
              <div className="rounded-sm border p-4 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
                <div className="text-muted-foreground">Kolstad, H. (2026).</div>
                <div className="text-foreground">Avena Regional Forecast Model.</div>
                <div className="text-muted-foreground">Avena Terminal. avenaterminal.com/forecast</div>
                <div className="text-primary mt-2">DOI: 10.5281/zenodo.19520064</div>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                API <span className="text-foreground">GET /api/forecast</span> · CC BY 4.0
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            First systematic property forecast model in Spain · Updated quarterly
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

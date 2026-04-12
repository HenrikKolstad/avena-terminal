'use client';

import { useState, useEffect } from 'react';
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

const COLORS: Record<string, string> = {
  'Costa Blanca South': '#10b981',
  'Costa Blanca North': '#60a5fa',
  'Costa Calida': '#a78bfa',
  'Costa del Sol': '#fbbf24',
};

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<RegionForecast[]>([]);
  const [macro, setMacro] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch('/api/forecast').then(r => r.json()).then(d => {
      setForecasts(d.forecasts || []);
      setMacro(d.macro_inputs || {});
    }).catch(() => {});
  }, []);

  // Generate 12-month projection data
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
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ background: '#fbbf24', color: '#0d1117' }}>FORECAST</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Regional Forecast Model</h1>
        <p className="text-gray-400 text-sm mb-8">12-month price-per-m&sup2; projections for Spanish coastal markets. Macro-adjusted. Updated quarterly.</p>

        {/* Forecast Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {forecasts.map(f => (
            <div key={f.region} className="rounded-lg p-5" style={{ background: '#161b22', border: `1px solid ${COLORS[f.region] || '#30363d'}40` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold">{f.region}</h3>
                  <span className="text-[10px] text-gray-500">{f.properties} properties</span>
                </div>
                <span className="text-3xl font-bold" style={{ color: COLORS[f.region] }}>+{f.adjusted_forecast}%</span>
              </div>
              <div className="flex items-center gap-4 text-xs mb-3">
                <span className="text-emerald-400">Bull: +{f.bull_case}%</span>
                <span className="text-gray-400">Base: +{f.adjusted_forecast}%</span>
                <span className="text-red-400">Bear: {f.bear_case > 0 ? '+' : ''}{f.bear_case}%</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: f.confidence === 'HIGH' ? '#10b98120' : f.confidence === 'MEDIUM' ? '#fbbf2420' : '#f8717120', color: f.confidence === 'HIGH' ? '#10b981' : f.confidence === 'MEDIUM' ? '#fbbf24' : '#f87171' }}>{f.confidence}</span>
                <span className="text-[10px] text-gray-600">&euro;{f.price_forecast_12m.current_avg_pm2}/m&sup2; &rarr; &euro;{f.price_forecast_12m.forecast_avg_pm2}/m&sup2;</span>
              </div>
              <div className="text-[10px] text-gray-500 space-y-0.5">
                {f.key_drivers.slice(0, 2).map(d => <div key={d} className="text-emerald-400/60">+ {d}</div>)}
                {f.key_risks.slice(0, 1).map(r => <div key={r} className="text-red-400/60">- {r}</div>)}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 0 && forecasts.length > 0 && (
          <div className="rounded-lg p-4 mb-10" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <h2 className="text-sm font-bold text-white mb-4">12-Month Price/m&sup2; Projection</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" />
                <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {forecasts.map(f => (
                  <Line key={f.region} type="monotone" dataKey={f.region} stroke={COLORS[f.region]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Methodology */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Methodology</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            The Avena Regional Forecast Model uses macro-adjusted trend extrapolation. Base growth rates derived from 5-year historical averages are adjusted by 8 macro indicators covering monetary policy, FX, GDP, inflation, demand, tourism, supply, and financing costs.
          </p>
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Forecast API: GET avenaterminal.com/api/forecast</p>
            <p className="text-gray-400">Updated quarterly. DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <section className="mb-10">
          <div className="rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
            <p className="text-gray-400">Kolstad, H. (2026). Avena Regional Forecast Model Q2 2026.</p>
            <p className="text-gray-400">Avena Terminal. avenaterminal.com/forecast</p>
            <p className="text-gray-400">DOI: 10.5281/zenodo.19520064</p>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-600 pb-8">
          &copy; 2026 Avena Terminal &middot; First systematic property forecast model in Spain
        </footer>
      </div>
    </main>
  );
}

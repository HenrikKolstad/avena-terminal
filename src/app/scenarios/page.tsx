'use client';

import { useState } from 'react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import Link from 'next/link';

interface ScenarioResult {
  scenario: string;
  variables: { ecb_rate: number; spain_gdp: number; eur_gbp: number };
  baseline: { ecb_rate: number; spain_gdp: number; eur_gbp: number };
  market_outcome: {
    avg_price_impact_pct: number;
    probability_decline: number;
    probability_flat: number;
    probability_appreciate: number;
    simulations: number;
  };
  apci_projected: number;
  most_resilient: Array<{
    ref: string; name: string; town: string; region: string;
    price: number; score: number; status: string; beach_km: number;
    developer: string; resilience_score: number;
  }>;
  most_vulnerable: Array<{
    ref: string; name: string; town: string; region: string;
    price: number; score: number; status: string; beach_km: number;
    developer: string; vulnerability_score: number;
  }>;
}

interface Preset {
  label: string;
  desc: string;
  variables: { ecb_rate: number; spain_gdp: number; eur_gbp: number };
}

const PRESETS: Preset[] = [
  { label: 'ECB Hikes +1%', desc: 'Rate reversal shock', variables: { ecb_rate: 3.5, spain_gdp: 2.3, eur_gbp: 0.86 } },
  { label: 'ECB Cuts to 1.5%', desc: 'Aggressive easing', variables: { ecb_rate: 1.5, spain_gdp: 2.3, eur_gbp: 0.86 } },
  { label: 'Spanish Recession', desc: 'GDP drops to -1%', variables: { ecb_rate: 2.5, spain_gdp: -1.0, eur_gbp: 0.86 } },
  { label: 'Spanish Boom', desc: 'GDP surges to 4%', variables: { ecb_rate: 2.5, spain_gdp: 4.0, eur_gbp: 0.86 } },
  { label: 'Sterling Crash', desc: 'EUR/GBP hits 0.95', variables: { ecb_rate: 2.5, spain_gdp: 2.3, eur_gbp: 0.95 } },
  { label: 'Sterling Surge', desc: 'EUR/GBP drops to 0.82', variables: { ecb_rate: 2.5, spain_gdp: 2.3, eur_gbp: 0.82 } },
  { label: 'Perfect Storm', desc: 'Rate hike + recession + FX shock', variables: { ecb_rate: 3.5, spain_gdp: -0.5, eur_gbp: 0.93 } },
  { label: 'Goldilocks', desc: 'Low rates + growth + strong GBP', variables: { ecb_rate: 1.5, spain_gdp: 3.5, eur_gbp: 0.82 } },
  { label: 'Status Quo', desc: 'No change from baseline', variables: { ecb_rate: 2.5, spain_gdp: 2.3, eur_gbp: 0.86 } },
  { label: 'Mild Stress', desc: 'Moderate headwinds', variables: { ecb_rate: 3.0, spain_gdp: 1.0, eur_gbp: 0.89 } },
];

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 60) return 'text-green-400';
  if (score >= 45) return 'text-yellow-400';
  return 'text-red-400';
}

function formatEur(n: number): string {
  return '\u20AC' + n.toLocaleString('en-IE');
}

export default function ScenariosPage() {
  const [ecbRate, setEcbRate] = useState(2.5);
  const [spainGdp, setSpainGdp] = useState(2.3);
  const [eurGbp, setEurGbp] = useState(0.86);
  const [scenarioName, setScenarioName] = useState('Custom Scenario');
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(preset: Preset) {
    setEcbRate(preset.variables.ecb_rate);
    setSpainGdp(preset.variables.spain_gdp);
    setEurGbp(preset.variables.eur_gbp);
    setScenarioName(preset.label);
  }

  async function runScenario() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenarioName,
          variables: { ecb_rate: ecbRate, spain_gdp: spainGdp, eur_gbp: eurGbp },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScenarioResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-wider text-gray-100">
            AVENA<span className="text-emerald-400">.</span>
          </Link>
          <nav className="flex gap-6 text-sm text-gray-400">
            <Link href="/apci" className="hover:text-gray-100 transition">APCI</Link>
            <Link href="/predictions" className="hover:text-gray-100 transition">Predictions</Link>
            <Link href="/alerts" className="hover:text-gray-100 transition">Alerts</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black mb-4 text-gray-100">
            Stress-Test the Future
          </h1>
          <p className="text-lg text-emerald-400 mb-2">
            Monte Carlo Simulation for European Property
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Adjust macroeconomic variables and run 100 simulated outcomes.
            See how the market responds, which properties are resilient, and which are vulnerable.
          </p>
        </div>

        {/* Presets */}
        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Pre-built Scenarios</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-left hover:border-emerald-700 hover:bg-gray-900/80 transition"
              >
                <div className="text-sm font-medium text-gray-200">{preset.label}</div>
                <div className="text-xs text-gray-500 mt-1">{preset.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Input Form */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-200">Variables</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">ECB Rate (%)</label>
              <input
                type="number"
                step="0.25"
                value={ecbRate}
                onChange={e => setEcbRate(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs text-gray-600 mt-1 block">Baseline: 2.50%</span>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Spain GDP Growth (%)</label>
              <input
                type="number"
                step="0.1"
                value={spainGdp}
                onChange={e => setSpainGdp(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs text-gray-600 mt-1 block">Baseline: 2.30%</span>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">EUR/GBP</label>
              <input
                type="number"
                step="0.01"
                value={eurGbp}
                onChange={e => setEurGbp(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs text-gray-600 mt-1 block">Baseline: 0.86</span>
            </div>
          </div>
          <button
            onClick={runScenario}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition w-full sm:w-auto"
          >
            {loading ? 'Running 100 simulations...' : 'Run Monte Carlo Simulation'}
          </button>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Outcome Summary */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4 text-gray-200">
                Scenario: {result.scenario}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                  <div className={`text-3xl font-bold ${scoreColor(result.apci_projected)}`}>
                    {result.apci_projected}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Projected APCI</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                  <div className={`text-3xl font-bold ${result.market_outcome.avg_price_impact_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.market_outcome.avg_price_impact_pct > 0 ? '+' : ''}{result.market_outcome.avg_price_impact_pct}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Avg Price Impact</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-100">{result.market_outcome.simulations}</div>
                  <div className="text-xs text-gray-500 mt-1">Simulations</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                  <div className="text-sm font-mono text-gray-300 leading-relaxed">
                    ECB {result.variables.ecb_rate}%<br />
                    GDP {result.variables.spain_gdp}%<br />
                    FX {result.variables.eur_gbp}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Inputs</div>
                </div>
              </div>

              {/* Probability Distribution */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Probability Distribution (100 runs)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-black text-red-400">{result.market_outcome.probability_decline}%</div>
                    <div className="w-full bg-gray-800 rounded-full h-3 mt-2">
                      <div className="h-3 rounded-full bg-red-500" style={{ width: `${result.market_outcome.probability_decline}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Decline (&gt;1% drop)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-yellow-400">{result.market_outcome.probability_flat}%</div>
                    <div className="w-full bg-gray-800 rounded-full h-3 mt-2">
                      <div className="h-3 rounded-full bg-yellow-500" style={{ width: `${result.market_outcome.probability_flat}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Flat (-1% to +1%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-emerald-400">{result.market_outcome.probability_appreciate}%</div>
                    <div className="w-full bg-gray-800 rounded-full h-3 mt-2">
                      <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${result.market_outcome.probability_appreciate}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Appreciate (&gt;1% gain)</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Resilient vs Vulnerable */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* Most Resilient */}
              <div className="bg-gray-900 border border-emerald-900/50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-emerald-400 mb-4">Most Resilient Properties</h3>
                <div className="space-y-4">
                  {result.most_resilient.map((p, i) => (
                    <div key={p.ref || i} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-gray-200">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.town} &middot; {p.region}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-gray-300">{formatEur(p.price)}</div>
                          <div className="text-xs text-emerald-400">Score: {p.score}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{p.status}</span>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{p.beach_km < 99 ? p.beach_km + 'km beach' : 'N/A'}</span>
                        <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">Resilience: {p.resilience_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Vulnerable */}
              <div className="bg-gray-900 border border-red-900/50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4">Most Vulnerable Properties</h3>
                <div className="space-y-4">
                  {result.most_vulnerable.map((p, i) => (
                    <div key={p.ref || i} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-gray-200">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.town} &middot; {p.region}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-gray-300">{formatEur(p.price)}</div>
                          <div className="text-xs text-red-400">Score: {p.score}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{p.status}</span>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{p.beach_km < 99 ? p.beach_km + 'km beach' : 'N/A'}</span>
                        <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded">Vulnerability: {p.vulnerability_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Methodology */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 text-gray-200">How It Works</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              <strong className="text-gray-100">Monte Carlo Simulation:</strong> For each scenario, we run 100 simulated
              market outcomes with random noise of +/-2% per run, modeling the inherent uncertainty in macro-to-property
              price transmission.
            </p>
            <p>
              <strong className="text-gray-100">Variable Sensitivity:</strong> ECB rate changes have the strongest impact
              (each +0.25% = -1.5% price pressure). GDP changes have moderate impact (each -1% GDP = -3% price pressure).
              EUR/GBP changes affect UK buyer demand (each +0.01 above 0.87 = -0.5% demand pressure).
            </p>
            <p>
              <strong className="text-gray-100">Resilience Scoring:</strong> Properties score higher on resilience if they
              are key-ready, close to the beach, from established developers, and have high investment scores. Vulnerability
              favors off-plan units from new developers at high price points.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-xs text-gray-600">
        Avena Terminal &mdash; European Property Intelligence
      </footer>
    </div>
  );
}

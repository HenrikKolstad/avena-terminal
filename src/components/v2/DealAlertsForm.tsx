'use client';

import { useState } from 'react';
import { Bell, Check } from 'lucide-react';

const REGIONS = [
  { value: 'costa-blanca', label: 'Costa Blanca' },
  { value: 'costa-del-sol', label: 'Costa del Sol' },
  { value: 'costa-calida', label: 'Costa Cálida' },
  { value: 'costa-brava', label: 'Costa Brava' },
  { value: 'balearics', label: 'Balearics' },
  { value: 'canary', label: 'Canary Islands' },
  { value: 'valencia', label: 'Valencia metro' },
  { value: 'madrid', label: 'Madrid metro' },
  { value: '*', label: 'Any' },
];

export function DealAlertsForm() {
  const [email, setEmail] = useState('');
  const [regions, setRegions] = useState<string[]>(['*']);
  const [minScore, setMinScore] = useState(75);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRegion = (r: string) => {
    if (r === '*') return setRegions(['*']);
    setRegions((prev) => {
      const next = prev.filter((x) => x !== '*');
      return next.includes(r) ? next.filter((x) => x !== r) : [...next, r];
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/deal-alerts/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, regions: regions.length ? regions : ['*'], min_score: minScore }),
      });
      const data = await r.json();
      if (r.ok) setDone(true);
      else setError(data.error || 'Failed to subscribe');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div
        className="rounded-sm border p-6 flex items-center gap-3"
        style={{ background: 'hsl(var(--av-primary) / 0.08)', borderColor: 'hsl(var(--av-primary) / 0.3)' }}
      >
        <Check className="h-5 w-5 text-primary" />
        <div>
          <div className="font-serif text-lg text-foreground">Subscribed.</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
            Check your inbox to confirm. Alerts fire daily at 09:00 UTC.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
        <Bell className="h-3.5 w-3.5" />
        Deal alerts · new properties matching your filters
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="flex-1 rounded-sm border px-4 py-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          style={{ borderColor: 'hsl(var(--av-border-strong))' }}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold disabled:opacity-50 whitespace-nowrap"
          style={{ background: 'var(--av-gradient-gold)' }}
        >
          {loading ? 'Subscribing…' : 'Get alerts'}
        </button>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Regions</div>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((r) => {
            const on = regions.includes(r.value);
            return (
              <button
                type="button"
                key={r.value}
                onClick={() => toggleRegion(r.value)}
                className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                style={{
                  borderColor: on ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                  background: on ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                  color: on ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Min Avena Score</div>
          <div className="font-mono text-sm text-primary tabular">{minScore}</div>
        </div>
        <input
          type="range"
          min={50}
          max={95}
          step={5}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {error && <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">{error}</div>}
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
        One email confirmation · unsubscribe in one click · no spam
      </p>
    </form>
  );
}

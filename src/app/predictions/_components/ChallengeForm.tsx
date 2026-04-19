'use client';

import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';

export default function ChallengeForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [target, setTarget] = useState('');
  const [metric, setMetric] = useState('price_per_m2');
  const [predictionType, setPredictionType] = useState('price_change');
  const [currentValue, setCurrentValue] = useState('');
  const [predictedValue, setPredictedValue] = useState('');
  const [confidence, setConfidence] = useState(65);
  const [reasoning, setReasoning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cur = Number(currentValue);
    const pred = Number(predictedValue);
    if (!name || !email || !target || !reasoning) {
      setError('Fill in all fields');
      return;
    }
    if (!Number.isFinite(cur) || !Number.isFinite(pred) || cur <= 0) {
      setError('Current and predicted must be positive numbers');
      return;
    }
    const changePct = ((pred - cur) / cur) * 100;
    setSubmitting(true);
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitter: name,
          submitter_type: 'analyst',
          target,
          metric,
          prediction_type: predictionType,
          current_value: cur,
          predicted_value: pred,
          predicted_change_pct: changePct,
          confidence,
          reasoning,
          horizon_days: 365,
          email,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-sm border p-8 text-center"
        style={{
          background: 'hsl(var(--av-primary) / 0.08)',
          borderColor: 'hsl(var(--av-primary) / 0.4)',
        }}
      >
        <Check className="h-8 w-8 text-primary mx-auto mb-4" />
        <p className="font-serif text-2xl text-foreground mb-2">Prediction logged.</p>
        <p className="text-muted-foreground font-light">
          It enters the ledger as <span className="text-primary">pending</span>.
          Appears on the leaderboard after review. Verification runs automatically at the 365-day mark.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Your name *
          </label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="jane.doe"
            className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Email *
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@fund.com"
            className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          />
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Target *
        </label>
        <input
          required
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="e.g. Torrevieja new builds"
          className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
          style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Prediction type
          </label>
          <select
            value={predictionType}
            onChange={e => setPredictionType(e.target.value)}
            className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          >
            <option value="price_change">Price change</option>
            <option value="yield_change">Yield change</option>
            <option value="time_to_sell">Days to sellout</option>
            <option value="volume_change">Volume change</option>
            <option value="market_call">Market call</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Metric
          </label>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          >
            <option value="price_per_m2">Price per m²</option>
            <option value="yield_gross">Gross yield %</option>
            <option value="days_to_sellout">Days to sellout</option>
            <option value="inventory_count">Inventory count</option>
            <option value="apci">APCI</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Current value *
          </label>
          <input
            required
            type="number"
            step="any"
            value={currentValue}
            onChange={e => setCurrentValue(e.target.value)}
            className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Predicted value (365 days) *
          </label>
          <input
            required
            type="number"
            step="any"
            value={predictedValue}
            onChange={e => setPredictedValue(e.target.value)}
            className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
          />
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Confidence: <span className="text-primary tabular">{confidence}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={confidence}
          onChange={e => setConfidence(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Reasoning *
        </label>
        <textarea
          required
          value={reasoning}
          onChange={e => setReasoning(e.target.value)}
          rows={3}
          placeholder="Two sentences minimum. What's the thesis, what's the evidence?"
          className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary resize-y"
          style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="group mt-2 inline-flex items-center justify-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 w-fit"
        style={{ background: 'var(--av-gradient-gold)' }}
      >
        {submitting ? 'Submitting…' : 'Log prediction'}
        {!submitting && <ArrowUpRight className="h-3.5 w-3.5" />}
      </button>

      {error && (
        <p
          className="rounded-sm border px-3 py-2 font-mono text-[11px] text-destructive"
          style={{
            background: 'hsl(var(--av-destructive) / 0.08)',
            borderColor: 'hsl(var(--av-destructive) / 0.3)',
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}

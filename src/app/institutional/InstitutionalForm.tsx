'use client';

import { useState, FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { trackEvent } from '@/lib/tracking';

type State = 'idle' | 'sending' | 'sent' | 'error';

export function InstitutionalForm() {
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [mandate, setMandate] = useState('');
  const [tier, setTier] = useState<'Desk' | 'Fund' | 'Sovereign'>('Fund');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes('@')) {
      setError('Enter a valid work email');
      return;
    }
    if (!mandate.trim()) {
      setError('Briefly describe your mandate');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/institutional/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firm_name: org.trim() || email.split('@')[1] || 'Unspecified',
          contact_email: email.trim(),
          firm_type: tier.toLowerCase(),
          use_case: mandate.trim(),
          data_needs: `Tier interest: ${tier}`,
        }),
      });
      if (!res.ok) throw new Error('Could not send');
      trackEvent('CompleteRegistration', {
        source: 'institutional',
        tier,
        value: tier === 'Fund' ? 12000 : tier === 'Desk' ? 2500 : 50000,
      });
      setState('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div
        className="rounded-sm border p-10 text-center"
        style={{
          background: 'hsl(var(--av-primary) / 0.08)',
          borderColor: 'hsl(var(--av-primary) / 0.35)',
        }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
          Received
        </div>
        <h3 className="font-serif text-4xl font-light text-foreground mb-3">
          The desk will <span className="italic text-gold">reply</span>.
        </h3>
        <p className="text-muted-foreground font-light max-w-md mx-auto">
          Most enquiries answered within 4 hours, always within 24. If your
          timing is tight, email directly from the address below.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-sm border p-8 sm:p-10 space-y-5"
      style={{
        background: 'hsl(var(--av-surface) / 0.5)',
        borderColor: 'hsl(var(--av-border) / 0.6)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Tier picker */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Tier interest
        </label>
        <div className="flex gap-2">
          {(['Desk', 'Fund', 'Sovereign'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className="flex-1 rounded-sm border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors"
              style={
                tier === t
                  ? {
                      background: 'hsl(var(--av-primary) / 0.1)',
                      borderColor: 'hsl(var(--av-primary) / 0.5)',
                      color: 'hsl(var(--av-primary))',
                    }
                  : {
                      borderColor: 'hsl(var(--av-border-strong))',
                      color: 'hsl(var(--av-muted-foreground))',
                    }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Work email */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Work email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@fund.com"
          autoComplete="email"
          inputMode="email"
          required
          disabled={state === 'sending'}
          className="w-full min-h-12 rounded-sm border px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary disabled:opacity-50"
          style={{
            background: 'hsl(var(--av-background))',
            borderColor: 'hsl(var(--av-border-strong))',
          }}
        />
      </div>

      {/* Organization */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Organization <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <input
          type="text"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          placeholder="Acme Property Partners"
          disabled={state === 'sending'}
          className="w-full min-h-12 rounded-sm border px-4 py-3 font-mono text-base text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary disabled:opacity-50"
          style={{
            background: 'hsl(var(--av-background))',
            borderColor: 'hsl(var(--av-border-strong))',
          }}
        />
      </div>

      {/* Mandate */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Mandate · what are you solving?
        </label>
        <textarea
          value={mandate}
          onChange={(e) => setMandate(e.target.value)}
          placeholder="e.g. Deploying €40M across Costa Blanca new-builds for a Norwegian family office, need independent scoring + yield-curve benchmark"
          rows={3}
          required
          disabled={state === 'sending'}
          className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary disabled:opacity-50 resize-y"
          style={{
            background: 'hsl(var(--av-background))',
            borderColor: 'hsl(var(--av-border-strong))',
          }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="group w-full inline-flex items-center justify-center gap-3 rounded-sm px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0"
        style={{ background: 'var(--av-gradient-gold)' }}
      >
        {state === 'sending' ? 'Sending…' : 'Request access'}
        {state !== 'sending' && (
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
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

      <p className="text-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70 pt-2">
        Private · SOC 2 infra · Private Slack channel on approval
      </p>
    </form>
  );
}

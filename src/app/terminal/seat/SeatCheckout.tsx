'use client';

import { useState } from 'react';

export function SeatCheckout() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid institutional email.');
      return;
    }
    setError(null);
    setLoading(true);
    // Self-serve Stripe checkout retired 2026-10-22 (it charged the €79 PRO
    // price, not the Seat). Seat access is provisioned by request.
    window.location.href = `mailto:henrik@avenaterminal.com?subject=${encodeURIComponent('Avena Terminal Seat: request access')}&body=${encodeURIComponent(`Hi Henrik,\n\nPlease get in touch about a Terminal Seat for ${email}.\n`)}`;
    setLoading(false);
  }

  return (
    <div className="rounded-sm border p-5 max-w-xl" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground block mb-2">
        Institutional email · onboarding within 5 minutes
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="analyst@your-fund.eu"
          className="flex-1 rounded-sm border bg-transparent px-3 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
        />
        <button
          onClick={startCheckout}
          disabled={loading}
          className="rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          style={{ background: 'var(--av-gradient-gold)' }}
        >
          {loading ? 'Opening email…' : 'Request access →'}
        </button>
      </div>
      {error && <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">{error}</div>}
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        Access by request · EUR · monthly · DPA on request
      </p>
    </div>
  );
}

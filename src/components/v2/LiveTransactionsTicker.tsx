'use client';

import { useEffect, useState } from 'react';

interface LiveTxn {
  ref: string;
  name: string;
  town: string;
  country: string;
  type: string;
  price_eur: number | null;
  pm2: number | null;
  sold_date: string | null;
  beds: number | null;
}

const FLAGS: Record<string, string> = {
  ES: '🇪🇸', PT: '🇵🇹', FR: '🇫🇷', DE: '🇩🇪', NL: '🇳🇱', IT: '🇮🇹', GR: '🇬🇷', CY: '🇨🇾',
  HR: '🇭🇷', MT: '🇲🇹', AT: '🇦🇹', BE: '🇧🇪', SE: '🇸🇪', DK: '🇩🇰', FI: '🇫🇮', IE: '🇮🇪',
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const age = (Date.now() - new Date(iso).getTime()) / 1000;
  if (age < 60) return `${Math.round(age)}s ago`;
  if (age < 3600) return `${Math.round(age / 60)}m ago`;
  if (age < 86400) return `${Math.round(age / 3600)}h ago`;
  return `${Math.round(age / 86400)}d ago`;
}

/**
 * Bloomberg-style live transactions ticker. Pulls from
 * /api/v1/transactions/live, refreshes every 60s. Renders a continuously
 * scrolling strip of recently-sold properties with country flag, town,
 * type, sale price, and how long ago the sale was detected by the feed
 * diff. If the database is empty, the ticker hides itself.
 */
export function LiveTransactionsTicker() {
  const [txns, setTxns] = useState<LiveTxn[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchTxns() {
      // Skip when the tab is hidden — major perf + battery saver, and the
      // user can't see the ticker scroll anyway.
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch('/api/v1/transactions/live?limit=30');
        const json = await res.json();
        if (!cancelled && json.ok) setTxns(json.transactions ?? []);
      } catch { /* ignore */ }
      if (!cancelled) setLoaded(true);
    }
    fetchTxns();
    const interval = setInterval(fetchTxns, 60_000);
    // Refetch immediately when the tab becomes visible again
    const onVisible = () => { if (!document.hidden) fetchTxns(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!loaded || txns.length === 0) return null;

  // Double the array so the CSS scroll animation loops seamlessly
  const items = [...txns, ...txns];

  return (
    <div
      className="overflow-hidden border-y"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.5)' }}
    >
      <div className="flex items-center gap-0 px-4 py-2 border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mr-3 flex items-center gap-2 flex-shrink-0">
          <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
          Live transactions
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {txns.length} most recent · sold-detection from daily feed sync
        </span>
      </div>
      <div className="flex ticker-track" style={{ whiteSpace: 'nowrap' }}>
        {items.map((t, i) => (
          <span
            key={`${t.ref}-${i}`}
            className="inline-flex items-baseline gap-2 px-5 py-3 font-mono text-xs"
            style={{ borderRight: '1px solid hsl(var(--av-border) / 0.3)' }}
          >
            <span aria-hidden="true">{FLAGS[t.country] ?? ''}</span>
            <span className="uppercase tracking-[0.18em] text-foreground/85">{t.town}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{t.type}{t.beds ? ` ${t.beds}bd` : ''}</span>
            <span className="text-muted-foreground">·</span>
            <span className="tabular text-gold">€{t.price_eur != null ? Math.round(t.price_eur / 1000).toLocaleString() + 'k' : '—'}</span>
            {t.pm2 != null && <><span className="text-muted-foreground">·</span><span className="tabular text-muted-foreground">€{t.pm2.toLocaleString()}/m²</span></>}
            <span className="text-muted-foreground">·</span>
            <span className="uppercase tracking-[0.18em] text-[10px] text-muted-foreground">sold {relativeTime(t.sold_date)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

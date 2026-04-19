'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface CitationData {
  mcp_calls_total: number;
  mcp_calls_month: number;
  agents_total: number;
  agents_active: number;
}

/**
 * Live citation counter — polls /api/cited every 30s and shows
 * the current AI tool-call and agent numbers.
 *
 * Use variants:
 *   - 'banner'  — wide horizontal strip for homepage
 *   - 'inline'  — compact inline badge for headers/footers
 *   - 'card'    — big stat card for dashboard sections
 */
export function LiveCitations({
  variant = 'banner',
}: {
  variant?: 'banner' | 'inline' | 'card';
}) {
  const [data, setData] = useState<CitationData>({
    mcp_calls_total: 0,
    mcp_calls_month: 0,
    agents_total: 0,
    agents_active: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let prevTotal = 0;

    async function load() {
      try {
        const [citedRes, agentsRes] = await Promise.all([
          fetch('/api/cited').then(r => r.json()).catch(() => null),
          fetch('/api/agents/stats').then(r => r.json()).catch(() => null),
        ]);

        if (!mounted) return;

        const newTotal = citedRes?.cited_by_ai?.total_tool_calls || 0;
        const newMonth = citedRes?.cited_by_ai?.this_month || 0;
        const newAgentsTotal = agentsRes?.stats?.total_registered || 0;
        const newAgentsActive = agentsRes?.stats?.active_agents || 0;

        if (prevTotal > 0 && newTotal > prevTotal) {
          setDelta(newTotal - prevTotal);
          setTimeout(() => setDelta(null), 3000);
        }
        prevTotal = newTotal;

        setData({
          mcp_calls_total: newTotal,
          mcp_calls_month: newMonth,
          agents_total: newAgentsTotal,
          agents_active: newAgentsActive,
        });
        setLoaded(true);
      } catch {
        /* silent */
      }
    }

    load();
    const interval = setInterval(load, 30_000); // 30s poll
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // -------- BANNER (homepage strip) --------
  if (variant === 'banner') {
    return (
      <section
        className="relative overflow-hidden border-y py-6"
        style={{
          borderColor: 'hsl(var(--av-border) / 0.6)',
          background: 'hsl(var(--av-surface) / 0.3)',
        }}
      >
        <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'hsl(var(--av-primary))' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'hsl(var(--av-primary))' }} />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                AI Citation Counter · Live
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
              <Stat
                label="MCP tool calls"
                value={data.mcp_calls_total.toLocaleString()}
                delta={delta}
                loaded={loaded}
              />
              <Divider />
              <Stat
                label="This month"
                value={data.mcp_calls_month.toLocaleString()}
                loaded={loaded}
              />
              <Divider />
              <Stat
                label="Registered agents"
                value={data.agents_total.toLocaleString()}
                loaded={loaded}
              />
              <Divider />
              <Stat
                label="Active agents"
                value={data.agents_active.toLocaleString()}
                loaded={loaded}
              />
            </div>

            <Link
              href="/ai-citations"
              className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:opacity-80 whitespace-nowrap"
            >
              Full citation map
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // -------- INLINE (for nav/header) --------
  if (variant === 'inline') {
    return (
      <Link
        href="/ai-citations"
        className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'hsl(var(--av-primary))' }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'hsl(var(--av-primary))' }} />
        </span>
        <span className="tabular">{data.mcp_calls_total.toLocaleString()}</span>
        <span>cited</span>
      </Link>
    );
  }

  // -------- CARD (big stat card) --------
  return (
    <Link
      href="/ai-citations"
      className="block rounded-sm border p-6 hover:opacity-90 transition-opacity"
      style={{
        background: 'hsl(var(--av-surface) / 0.4)',
        borderColor: 'hsl(var(--av-border) / 0.6)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'hsl(var(--av-primary))' }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'hsl(var(--av-primary))' }} />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
          Live Citations
        </span>
      </div>
      <div className="font-serif text-5xl font-light text-foreground tabular mb-2">
        {data.mcp_calls_total.toLocaleString()}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        AI tool calls · {data.mcp_calls_month.toLocaleString()} this month · {data.agents_active} active agents
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  delta,
  loaded,
}: {
  label: string;
  value: string;
  delta?: number | null;
  loaded?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
        {label}
      </span>
      <span className="relative font-serif text-2xl font-light tabular text-foreground leading-none">
        {loaded ? value : '—'}
        {delta != null && delta > 0 && (
          <span
            className="absolute -right-8 top-0 font-mono text-[10px] text-primary animate-pulse"
            style={{ animation: 'av-fade-up 2s ease-out forwards' }}
          >
            +{delta}
          </span>
        )}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="hidden sm:block h-8 w-px" style={{ background: 'hsl(var(--av-border))' }} />;
}

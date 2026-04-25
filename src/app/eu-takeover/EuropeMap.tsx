/**
 * Theatre of operations — institutional data panel that replaces the
 * old hand-drawn SVG map. Two columns: country status table + top
 * regions ranked by today's findings velocity. No fake geography.
 *
 * Pure server-side render. Data flows in from the page.
 */

import { INGESTION_SWARM } from './_agents';

interface CountryStatus {
  name: string;
  flag: string;
  pct: number;
  active: boolean;
}

const COUNTRY_CODE: Record<string, string> = {
  Spain: 'ES',
  Portugal: 'PT',
  France: 'FR',
  Italy: 'IT',
  Greece: 'GR',
  Sweden: 'SE',
  Denmark: 'DK',
};

export function EuropeMap({
  countries,
  byAgent = {},
}: {
  countries: CountryStatus[];
  byAgent?: Record<string, number>;
}) {
  // Per-country findings rollup from byAgent map
  const findingsByCountry: Record<string, number> = {};
  for (const a of INGESTION_SWARM) {
    findingsByCountry[a.country] = (findingsByCountry[a.country] ?? 0) + (byAgent[a.id] ?? 0);
  }

  // Top regions today — every active agent ranked by count desc
  const ranked = INGESTION_SWARM
    .filter((a) => a.active)
    .map((a) => ({ ...a, count: byAgent[a.id] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(1, ...ranked.map((r) => r.count));
  const totalToday = ranked.reduce((s, r) => s + r.count, 0);

  // Coverage tier color
  const tier = (pct: number, active: boolean) => {
    if (!active) return { label: 'ROADMAP', color: 'hsl(var(--av-muted-foreground))', bg: 'hsl(var(--av-muted-foreground) / 0.08)' };
    if (pct >= 80) return { label: 'COMPLETE', color: 'hsl(42 95% 64%)', bg: 'hsl(42 95% 64% / 0.12)' };
    if (pct >= 30) return { label: 'ADVANCING', color: 'hsl(var(--av-warning))', bg: 'hsl(var(--av-warning) / 0.12)' };
    return { label: 'ONBOARDING', color: 'hsl(var(--av-primary))', bg: 'hsl(var(--av-primary) / 0.12)' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* ── LEFT: Country status table ──────────────────────── */}
      <div
        className="rounded-sm border overflow-hidden"
        style={{ background: '#100E0C', borderColor: 'hsl(var(--av-border-strong))' }}
      >
        <div
          className="px-4 py-2.5 border-b font-mono text-[9px] uppercase tracking-[0.3em] text-primary flex items-center justify-between"
          style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.4)' }}
        >
          <span className="flex items-center gap-2">
            <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
            Theatre of operations
          </span>
          <span className="text-muted-foreground">{countries.length} countries</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
          {countries
            .slice()
            .sort((a, b) => Number(b.active) - Number(a.active) || b.pct - a.pct)
            .map((c) => {
              const t = tier(c.pct, c.active);
              const code = COUNTRY_CODE[c.name] ?? c.name.slice(0, 2).toUpperCase();
              const todayCt = findingsByCountry[c.name] ?? 0;
              return (
                <div
                  key={c.name}
                  className="px-4 py-3 grid grid-cols-[36px_1fr_auto] items-center gap-3"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}
                >
                  {/* Country code chip */}
                  <div
                    className="font-mono tabular text-[11px] text-center py-1 rounded-sm border"
                    style={{
                      color: t.color,
                      borderColor: t.color.replace(')', ' / 0.4)'),
                      background: t.bg,
                    }}
                  >
                    {code}
                  </div>

                  {/* Name + bar */}
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="font-serif text-sm sm:text-base text-foreground flex items-center gap-1.5 truncate">
                        <span>{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="font-mono text-[10px] tabular text-muted-foreground shrink-0">
                        {c.pct}%
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.5)' }}>
                      <div
                        style={{
                          width: `${c.pct}%`,
                          height: '100%',
                          background:
                            c.pct >= 80
                              ? 'linear-gradient(90deg, hsl(42 85% 64%) 0%, hsl(42 95% 72%) 100%)'
                              : c.pct >= 30
                              ? 'hsl(var(--av-warning))'
                              : 'hsl(var(--av-primary))',
                          boxShadow: c.pct >= 80 ? '0 0 8px hsl(42 85% 64% / 0.5)' : 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Today count */}
                  <div className="text-right">
                    <div className="font-mono tabular text-sm text-foreground">
                      {todayCt.toLocaleString('en-US')}
                    </div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">
                      24h
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── RIGHT: Top regions by velocity ──────────────────── */}
      <div
        className="rounded-sm border overflow-hidden"
        style={{ background: '#100E0C', borderColor: 'hsl(var(--av-border-strong))' }}
      >
        <div
          className="px-4 py-2.5 border-b font-mono text-[9px] uppercase tracking-[0.3em] text-primary flex items-center justify-between"
          style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.4)' }}
        >
          <span>Top regions · 24h</span>
          <span className="text-muted-foreground tabular">{totalToday.toLocaleString('en-US')} total</span>
        </div>

        <div className="px-4 py-3 space-y-2">
          {ranked.slice(0, 12).map((r, i) => {
            const pct = (r.count / maxCount) * 100;
            const isHot = i < 3 && r.count > 0;
            return (
              <div key={r.id} className="grid grid-cols-[20px_1fr_56px] items-center gap-3">
                <span className="font-mono text-[10px] tabular text-muted-foreground text-right">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/85 truncate flex items-center gap-1.5">
                      <span>{r.flag}</span>
                      <span className="truncate">{r.region}</span>
                    </span>
                  </div>
                  <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.4)' }}>
                    <div
                      style={{
                        width: `${Math.max(3, pct)}%`,
                        height: '100%',
                        background: isHot
                          ? 'linear-gradient(90deg, hsl(42 85% 64%) 0%, hsl(42 95% 72%) 100%)'
                          : 'hsl(var(--av-primary) / 0.7)',
                        boxShadow: isHot ? '0 0 6px hsl(42 85% 64% / 0.5)' : 'none',
                      }}
                    />
                  </div>
                </div>
                <span
                  className="font-mono tabular text-[12px] text-right"
                  style={{ color: isHot ? 'hsl(42 95% 72%)' : 'hsl(var(--av-foreground))' }}
                >
                  {r.count.toLocaleString('en-US')}
                </span>
              </div>
            );
          })}

          {ranked.length === 0 && (
            <div className="py-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              First ingestion tick fires at 12:30 UTC
            </div>
          )}
        </div>

        {/* Footer summary */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground"
          style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.3)' }}
        >
          <span>{ranked.filter((r) => r.count > 0).length} active · {ranked.length} total</span>
          <span>auto-refresh on next cron</span>
        </div>
      </div>
    </div>
  );
}

/**
 * HeroInstrument — the DELPHI-standard hero stat card.
 *
 * The bordered, warm-gradient instrument panel with large serif numbers
 * that made /delphi read like a Bloomberg surface. Applied beneath the
 * hero on every header canonical so the whole site speaks one design
 * language: badge → claim → instrument → sections.
 */

interface Stat {
  value: string;
  label: string;
  sub?: string;
}

export function HeroInstrument({ stats, callout }: { stats: Stat[]; callout?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 pb-8 sm:pb-10">
      <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)' }}>
        <div
          className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8"
          style={{ background: 'linear-gradient(135deg, hsl(var(--av-primary) / 0.07) 0%, transparent 60%)' }}
        >
          {stats.map(s => (
            <div key={s.label}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">{s.label}</div>
              <div className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-foreground tabular leading-none tracking-tight">{s.value}</div>
              {s.sub && (
                <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80 leading-relaxed">{s.sub}</div>
              )}
            </div>
          ))}
        </div>
        {callout && (
          <div
            className="border-t px-6 sm:px-8 py-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.35)' }}
          >
            {callout}
          </div>
        )}
      </div>
    </section>
  );
}

/** The live-pulse badge pill from /delphi — drop above any hero H1. */
export function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.32em]"
      style={{ borderColor: 'hsl(var(--av-primary) / 0.5)', background: 'hsl(var(--av-primary) / 0.08)', color: 'hsl(var(--av-primary))' }}
    >
      <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
      {children}
    </span>
  );
}

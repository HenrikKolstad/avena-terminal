const ticks = [
  { sym: 'APCI', v: '67.3', d: '+0.84%', up: true, label: 'Composite' },
  { sym: 'APYI', v: '6.42', d: '+0.12bps', up: true, label: 'Yield' },
  { sym: 'APLI', v: '82.1', d: '−1.10%', up: false, label: 'Liquidity' },
  { sym: 'APRI', v: 'EXPANSION', d: 'r03', up: true, label: 'Regime' },
  { sym: 'APSI', v: '18.7', d: '−2.4%', up: true, label: 'Stress' },
  { sym: 'APIP', v: 'v1.0', d: 'live', up: true, label: 'Protocol' },
  { sym: 'AGENTS', v: '19/19', d: 'online', up: true, label: 'Swarm' },
  { sym: 'CRONS', v: '14', d: '0 fail', up: true, label: 'Daily Jobs' },
  { sym: 'API', v: '192', d: 'routes', up: true, label: 'Surface' },
  { sym: 'FEAT', v: '130+', d: '/prop', up: true, label: 'Signals' },
  { sym: 'CITE', v: '52%', d: '+3pp', up: true, label: 'Score' },
  { sym: 'TRAIN', v: 'JSONL', d: '→ HF', up: true, label: 'Self-improve' },
  { sym: 'LANG', v: '11', d: '× 2200', up: true, label: 'Translation' },
];

export function Ticker() {
  const row = [...ticks, ...ticks];
  return (
    <section
      id="signals"
      className="relative overflow-hidden border-y"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-surface) / 0.4)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{
          background:
            'linear-gradient(to right, hsl(var(--av-background)), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{
          background:
            'linear-gradient(to left, hsl(var(--av-background)), transparent)',
        }}
      />

      <div className="ticker-track flex w-max items-center gap-10 py-4">
        {row.map((t, i) => (
          <div key={i} className="flex items-center gap-3 whitespace-nowrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {t.sym}
            </span>
            <span className="font-mono text-sm tabular text-foreground">
              {t.v}
            </span>
            <span
              className={`font-mono text-xs tabular ${
                t.up ? 'text-primary' : 'text-destructive'
              }`}
            >
              {t.d}
            </span>
            <span className="font-serif text-xs italic text-muted-foreground/70">
              {t.label}
            </span>
            <span
              className="ml-6 h-1 w-1 rounded-full"
              style={{ background: 'hsl(var(--av-border-strong))' }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

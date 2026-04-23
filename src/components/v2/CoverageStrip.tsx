import Link from 'next/link';

/**
 * Compact breadth strip for the homepage — shows the EU-wide coverage
 * between CredentialBar and LaFincaProof so the "1,881 = Spain niche"
 * impression never lands.
 *
 * 10 countries tracked + 30 cities bubble-risk + 60+ macro feeds
 * rendered as a single horizontal band with flags.
 */

const SCORED = [{ flag: '🇪🇸', code: 'ES', tier: 'scored' }];

const TRACKED = [
  { flag: '🇵🇹', code: 'PT' },
  { flag: '🇫🇷', code: 'FR' },
  { flag: '🇮🇹', code: 'IT' },
  { flag: '🇩🇪', code: 'DE' },
  { flag: '🇳🇱', code: 'NL' },
  { flag: '🇬🇷', code: 'GR' },
  { flag: '🇨🇾', code: 'CY' },
  { flag: '🇭🇷', code: 'HR' },
  { flag: '🇲🇹', code: 'MT' },
];

const MACRO = [
  { flag: '🇦🇹', code: 'AT' },
  { flag: '🇨🇭', code: 'CH' },
];

const ROADMAP = [
  { flag: '🇸🇪', code: 'SE' },
  { flag: '🇩🇰', code: 'DK' },
  { flag: '🇳🇴', code: 'NO' },
  { flag: '🇫🇮', code: 'FI' },
];

export function CoverageStrip() {
  return (
    <section
      className="border-y"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-background))',
      }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
          {/* Left label */}
          <div className="flex-shrink-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-2 flex items-center gap-2">
              <span className="h-px w-8" style={{ background: 'hsl(var(--av-primary))' }} />
              European coverage
            </div>
            <div className="font-serif text-xl text-foreground">
              Depth + <span className="italic text-gold">breadth</span>.
            </div>
          </div>

          {/* Tier rows */}
          <div className="flex-1 flex flex-wrap items-center gap-x-8 gap-y-3">
            <TierRow label="Scored" color="hsl(var(--av-primary))" items={SCORED} />
            <TierRow label="Tracked" color="hsl(var(--av-foreground))" items={TRACKED} />
            <TierRow label="Macro" color="hsl(var(--av-warning))" items={MACRO} />
            <TierRow label="Roadmap" color="hsl(var(--av-muted-foreground))" items={ROADMAP} dim />
          </div>

          {/* CTA */}
          <Link
            href="/coverage"
            className="flex-shrink-0 group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:text-gold"
          >
            Full coverage map →
          </Link>
        </div>
      </div>
    </section>
  );
}

function TierRow({
  label,
  color,
  items,
  dim = false,
}: {
  label: string;
  color: string;
  items: Array<{ flag: string; code: string }>;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-mono text-[9px] uppercase tracking-[0.3em]"
        style={{ color, opacity: dim ? 0.7 : 1 }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5" style={{ opacity: dim ? 0.55 : 1 }}>
        {items.map((i) => (
          <span
            key={i.code}
            className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.15em]"
            style={{
              background: 'hsl(var(--av-surface) / 0.4)',
              borderColor: 'hsl(var(--av-border) / 0.6)',
              color: 'hsl(var(--av-foreground))',
            }}
          >
            <span className="text-sm leading-none">{i.flag}</span>
            {i.code}
          </span>
        ))}
      </div>
    </div>
  );
}

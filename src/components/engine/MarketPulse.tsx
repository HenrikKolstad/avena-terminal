/**
 * The market-pulse line at the top of /engine: what the engine caught this
 * week, in one sentence. Every figure comes from price_snapshots /
 * sold_properties via getEngineDeltas(). When there is nothing captured to
 * report, the component renders nothing at all: an empty pulse printed as
 * zeros would read as "the market stood still", which is a claim.
 */

import type { MarketPulse as Pulse } from '@/lib/engine-pulse';
import { GOLD, INK, LINE, MONO, MUTED, NEG, SERIF, SURFACE, fmtDay, grp } from './tokens';

export function MarketPulse({ pulse, sellouts30d }: { pulse: Pulse | null | undefined; sellouts30d: number }) {
  const hasCuts = Boolean(pulse);
  const hasSellouts = sellouts30d > 0;
  if (!hasCuts && !hasSellouts) return null;

  const parts: Array<{ big: string; label: string; tone?: string }> = [];
  if (pulse) {
    parts.push({ big: grp(pulse.cuts), label: pulse.cuts === 1 ? 'price cut · 7 days' : 'price cuts · 7 days' });
  }
  if (hasSellouts) {
    parts.push({ big: sellouts30d >= 500 ? '500+' : grp(sellouts30d), label: 'homes gone from the feed · 30 days' });
  }
  if (pulse?.medianCutPct != null) {
    parts.push({ big: `${pulse.medianCutPct.toFixed(1).replace('-', '−')}%`, label: 'median cut', tone: NEG });
  }

  return (
    <div
      data-testid="market-pulse"
      className="av-eng-pulse"
      style={{ marginBottom: 56, border: `1px solid ${LINE}`, borderRadius: 4, background: SURFACE, padding: '18px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 36px' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: MONO, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
        Market pulse · this week
      </span>
      {parts.map((p) => (
        <span key={p.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 300, lineHeight: 1, whiteSpace: 'nowrap', color: p.tone ?? INK }}>{p.big}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>{p.label}</span>
        </span>
      ))}
      {pulse?.from && pulse?.to && (
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>
          Captured {fmtDay(pulse.from)} → {fmtDay(pulse.to)}
        </span>
      )}
    </div>
  );
}

/**
 * One real home's asking price over time, straight from price_snapshots, with
 * every captured cut marked. Pure SVG so it renders in the server HTML (the
 * text-extracting crawlers that skip JS get the same evidence humans do).
 *
 * The series is never smoothed, interpolated or extended: each step is a
 * price the engine actually captured on that day. With no history to show the
 * section renders an honest empty state, never an example series.
 */

import Link from 'next/link';
import type { PriceHistory } from '@/lib/engine-pulse';
import { GOLD, INK, LINE, MONO, MUTED, NEG, SERIF, SURFACE, eur, fmtDay } from './tokens';

// Two geometries: a wide plot for desktop and a taller, narrower one for
// phones, so labels stay legible instead of shrinking with the viewBox.
const WIDE = { W: 1000, H: 300, PAD: { l: 92, r: 24, t: 40, b: 36 }, font: 12, cutFont: 13 };
const TALL = { W: 420, H: 300, PAD: { l: 58, r: 14, t: 30, b: 30 }, font: 12, cutFont: 12 };
type Geo = typeof WIDE;

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const compactEur = (n: number) => (n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(2)}M` : `€${Math.round(n / 1000)}k`);

export function PriceHistoryChart({ history }: { history: PriceHistory | null | undefined }) {
  return (
    <section style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '84px 32px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>Price memory · one real home</span>
        <h2 style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem,3.6vw,3rem)', letterSpacing: '-0.02em', margin: '18px 0 14px' }}>Every cut, on the record</h2>
        <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 30px', maxWidth: 660 }}>
          The source feed only ever shows today&apos;s price. The engine captures every listing every day,
          so a quiet price cut becomes a permanent, dated fact.
        </p>
        {history && history.points.length >= 2 && history.cuts.length > 0 ? <Chart h={history} /> : <Empty />}
      </div>
    </section>
  );
}

function Empty() {
  return (
    <div data-testid="price-history-empty" style={{ border: `1px dashed ${LINE}`, borderRadius: 4, padding: '28px 26px', background: 'hsl(var(--av-background))', maxWidth: 760 }}>
      <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 300 }}>No price history to chart right now.</div>
      <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6, marginTop: 8 }}>
        The chart shows the home with the most captured cuts among this week&apos;s movers. When no home has
        taken a cut this week, or the price archive is briefly unreachable, it stays empty rather than showing an example.
      </p>
    </div>
  );
}

function Chart({ h }: { h: PriceHistory }) {
  const pts = h.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const totalPct = Math.round(((last.price - first.price) / first.price) * 1000) / 10;
  return (
    <div data-testid="price-history" style={{ border: `1px solid ${LINE}`, borderRadius: 4, background: 'hsl(var(--av-background))', padding: '24px 24px 18px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px 24px', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>{h.town || 'Spanish coast'} · ref {h.ref}</div>
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 300, marginTop: 6, color: INK }}>{h.title ?? 'New-build home'}</div>
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 300, color: INK }}>
          {eur(first.price)} → {eur(last.price)}{' '}
          <span style={{ fontFamily: MONO, fontSize: 13, color: totalPct < 0 ? NEG : MUTED }}>{totalPct > 0 ? '+' : ''}{totalPct.toFixed(1).replace('-', '−')}%</span>
        </div>
      </div>

      <div className="av-phc-wide"><Plot h={h} g={WIDE} /></div>
      <div className="av-phc-tall"><Plot h={h} g={TALL} /></div>
      <style>{`.av-phc-tall { display: none; } @media (max-width: 640px) { .av-phc-wide { display: none; } .av-phc-tall { display: block; } }`}</style>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 22px', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
        {h.cuts.map((c, i) => (
          <span key={`${c.date}-l-${i}`} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', color: MUTED }}>
            <span style={{ color: NEG }}>●</span> {fmtDay(c.date)}: {eur(c.from)} → {eur(c.to)}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>
          {pts.length} captured days · {h.cuts.length} {h.cuts.length === 1 ? 'cut' : 'cuts'} · most cuts among this week&apos;s movers
        </span>
        <Link href={`/property/${encodeURIComponent(h.ref)}`} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, textDecoration: 'none' }}>
          Open this home →
        </Link>
      </div>
    </div>
  );
}

function Plot({ h, g }: { h: PriceHistory; g: Geo }) {
  const { W, H, PAD, font, cutFont } = g;
  const pts = h.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const t0 = dayMs(first.date);
  const t1 = Math.max(dayMs(last.date), t0 + 86_400_000);
  const prices = pts.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = Math.max(hi - lo, hi * 0.02);
  const yMin = lo - span * 0.15;
  const yMax = hi + span * 0.15;

  const x = (d: string) => PAD.l + ((dayMs(d) - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (p: number) => PAD.t + (1 - (p - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  // Step path: a captured price holds until the next capture changes it.
  let d = `M ${x(first.date).toFixed(1)} ${y(first.price).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` H ${x(pts[i].date).toFixed(1)} V ${y(pts[i].price).toFixed(1)}`;
  }
  const ticks = [hi, (hi + lo) / 2, lo].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Asking price of ${h.title ?? h.ref} from ${first.date} to ${last.date}, ${h.cuts.length} price cuts`} style={{ display: 'block', overflow: 'visible' }}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={LINE} strokeDasharray="2 4" />
          <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" style={{ fontFamily: MONO, fontSize: font, fill: MUTED }}>{compactEur(v)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={GOLD} strokeWidth={2.2} strokeLinejoin="round" />
      {pts.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.price)} r={2} fill={GOLD} opacity={0.55} />
      ))}
      {h.cuts.map((c, i) => {
        const cx = x(c.date);
        const cy = y(c.to);
        const anchor = cx > W - 60 ? 'end' : cx < PAD.l + 30 ? 'start' : 'middle';
        return (
          <g key={`${c.date}-${i}`}>
            <line x1={cx} x2={cx} y1={y(c.from)} y2={cy} stroke={NEG} strokeWidth={2} />
            <circle cx={cx} cy={cy} r={5.5} fill={NEG} stroke="hsl(var(--av-background))" strokeWidth={2} />
            <text x={cx} y={cy + cutFont + 10} textAnchor={anchor} style={{ fontFamily: MONO, fontSize: cutFont, fill: NEG }}>
              {c.pct.toFixed(1).replace('-', '−')}%
            </text>
          </g>
        );
      })}
      <text x={PAD.l} y={H - 6} style={{ fontFamily: MONO, fontSize: font, fill: MUTED }}>{fmtDay(first.date)}</text>
      <text x={W - PAD.r} y={H - 6} textAnchor="end" style={{ fontFamily: MONO, fontSize: font, fill: MUTED }}>{fmtDay(last.date)}</text>
    </svg>
  );
}

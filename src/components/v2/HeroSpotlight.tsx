/**
 * HeroSpotlight — today's #1-ranked deal as a hero instrument (2026-07-02).
 *
 * The single highest-scored live deal, rendered as a rich card beside the
 * homepage hero: SVG score ring, price / market / saved / yield, alpha tag,
 * one click to the property page. Uses the exact same discount/saved math
 * as FeaturedDeals so the number a visitor sees here reconciles with the
 * grid below and the detail page behind the click.
 */

import Link from 'next/link';
import { getAllProperties } from '@/lib/properties';

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
const DISPLAY_CAP_PCT = 35;

function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(score, 100) / 100) * c;
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" strokeWidth="4" style={{ stroke: 'hsl(var(--av-border) / 0.7)' }} />
        <circle
          cx="38" cy="38" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          style={{ stroke: 'hsl(var(--av-primary))', filter: 'drop-shadow(0 0 6px hsl(var(--av-primary) / 0.55))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl font-light tabular text-gold leading-none">{score}</span>
        <span className="font-mono text-[7px] uppercase tracking-[0.28em] text-muted-foreground mt-0.5">Score</span>
      </div>
    </div>
  );
}

export function HeroSpotlight() {
  const all = getAllProperties();
  const top = all
    .filter(p => p.ref && p._sc != null && p.pf > 0 && p.pm2 && p.mm2 && p.mm2 > p.pm2 && p.bm)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
  if (!top) return null;

  const score = Math.round(top._sc ?? 0);
  const pm2 = top.pm2!;
  const mm2 = top.mm2!;
  const built = Math.round(top.bm || 0);
  const rawDiscount = Math.round((1 - pm2 / mm2) * 100);
  const discount = Math.min(rawDiscount, DISPLAY_CAP_PCT);
  const saved = rawDiscount > DISPLAY_CAP_PCT
    ? Math.round(mm2 * built * (DISPLAY_CAP_PCT / 100))
    : Math.round((mm2 - pm2) * built);
  const yieldGross = top._yield?.gross ?? null;
  const marketPrice = Math.round(mm2 * built);

  return (
    <Link
      href={`/property/${encodeURIComponent(top.ref!)}`}
      className="group block rounded-sm border overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        borderColor: 'hsl(var(--av-primary) / 0.45)',
        background: 'linear-gradient(150deg, hsl(var(--av-primary) / 0.08) 0%, hsl(var(--av-surface) / 0.5) 55%, transparent 100%)',
        boxShadow: '0 20px 60px -30px hsl(var(--av-primary) / 0.35)',
      }}
    >
      {/* header strip */}
      <div className="flex items-center justify-between border-b px-5 py-2.5" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
        <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.32em] text-gold">
          <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
          Top signal · ranked #1 of 50
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70 tabular">{top.ref}</span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground mb-1.5">
              {top.costa ?? 'ES'} · {top.t}
            </div>
            <div className="font-serif text-xl sm:text-2xl font-light text-foreground leading-snug line-clamp-2 group-hover:text-gold transition-colors">
              {top.p || `${top.t} in ${top.l}`}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{top.l}</div>
          </div>
          <ScoreRing score={score} />
        </div>

        {/* stats */}
        <div className="mt-5 grid grid-cols-4 gap-3 border-t pt-4" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
          {[
            { k: 'Price', v: `€${fmt(top.pf)}` },
            { k: 'Market', v: `€${fmt(marketPrice)}` },
            { k: 'Saved', v: `€${fmt(saved)}`, gold: true },
            { k: 'Yield', v: yieldGross ? `${yieldGross.toFixed(1)}%` : '—' },
          ].map(s => (
            <div key={s.k} className="min-w-0">
              <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground mb-1">{s.k}</div>
              <div className={`font-mono text-[13px] sm:text-sm tabular truncate ${s.gold ? 'font-bold text-gold' : 'text-foreground/90'}`}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* footer line */}
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-success))' }}>
            −{discount}% vs market reference
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold group-hover:translate-x-1 transition-transform">
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}

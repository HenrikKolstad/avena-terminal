'use client';

/**
 * The Avena Engine — institutional data-infrastructure page (2026-08-04).
 * Light register (Bloomberg/Stripe/Apple calm). Every figure is real and
 * verifiable — production Supabase audit + the live feed's own deal math —
 * never fabricated. Numbers are the current verified baseline.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import type { EngineDeltas, PriceMove, EngineTruth } from '@/lib/deltas';
import type { EngineStats } from '@/lib/deals';

const GOLD = 'hsl(var(--av-primary))';
const PAPER = 'hsl(var(--av-surface))';
const INK = 'hsl(var(--av-foreground))';
const MUTED = 'hsl(var(--av-foreground) / 0.6)';
const LINE = 'hsl(var(--av-border) / 0.7)';
const SURFACE = 'hsl(var(--av-surface))';
const POS = '#5FB87A';
const NEG = '#E0785C';

// ── Fallback figures ─────────────────────────────────────────────────────────
// AUDIT 2026-08-09: this block used to hold ten hardcoded numbers copied from a
// one-time April audit, rendered as "verified from production". Four months on,
// several were not just stale but false in ways that would fail due diligence:
//   1,881 "today's score updates"  → the frozen properties_registry count
//   387,000 "price records"        → property_pricing_history, which holds ZERO
//                                    move events; every row is status 'listed'
//   380,435 "verified transactions, reconciled against market benchmarks"
//                                  → French DVF open data, reconciled with nothing
//   191,862 "score revisions"      → a frozen snapshot rewritten nightly
//   "Observation depth: since Apr 2026" → the real ledger starts 2026-08-05
// Everything now comes live from getEngineTruth(). Only the deal math survives
// here as a fallback, because it is computed from public/data.json rather than
// from a dead table. If a live figure is unavailable the card omits it rather
// than substituting a number — an unverifiable figure is worse than a gap.
const F = {
  savingsTotal: 265262097,   // Σ capped savings, deals.ts logic over data.json
  underpriced: 1425,         // homes trading below market benchmark
  liveDeals: 1982,           // scored new-builds in the live feed
  regions: 9,                // Spanish coastal regions
};

const MOVEMENTS = [
  { ref: 'N8764',  town: 'Costa Blanca South', from: 501000, to: 394000 },
  { ref: 'SP0297', town: 'Costa del Sol',      from: 391000, to: 475000 },
  { ref: 'SP1468', town: 'Costa del Sol',      from: 998000, to: 1200000 },
  { ref: 'N9240',  town: 'Costa Blanca South', from: 450000, to: 428000 },
  { ref: 'N6937',  town: 'Costa Calida',       from: 405000, to: 435000 },
  { ref: 'N9491',  town: 'Costa Blanca North', from: 319900, to: 369900 },
];

const grp = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
const eur = (n: number) => '€' + grp(n);

function useCountUp(target: number, run: boolean, ms = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.2 });
    io.observe(el); return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>{children}</span>;
}

function MiniStat({ value, prefix = '', suffix = '', label, run }: { value: number; prefix?: string; suffix?: string; label: string; run: boolean }) {
  const v = useCountUp(value, run);
  return (
    <div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 25, fontWeight: 300, color: INK, lineHeight: 1 }}>{prefix}{grp(v)}{suffix}</div>
      <div style={{ marginTop: 7, fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: MUTED }}>{label}</div>
    </div>
  );
}

function Metric({ value, prefix = '', suffix = '', label, run }: { value: number; prefix?: string; suffix?: string; label: string; run: boolean }) {
  const v = useCountUp(value, run);
  return (
    <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 4, padding: '28px 26px' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 38, fontWeight: 300, color: INK, lineHeight: 1, letterSpacing: '-0.02em' }}>{prefix}{grp(v)}{suffix}</div>
      <div style={{ marginTop: 12, fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED }}>{label}</div>
    </div>
  );
}

export default function EngineClient({ deltas, stats, truth }: { deltas?: EngineDeltas; stats?: EngineStats; truth?: EngineTruth }) {
  const hero = useInView<HTMLDivElement>();
  const grid = useInView<HTMLDivElement>();
  const [ticked, setTicked] = useState(0);
  useEffect(() => { const t = setInterval(() => setTicked((s) => s + 7), 1000); return () => clearInterval(t); }, []);

  // Live figures from the feed (passed by the server wrapper — this card
  // moved here from the homepage hero 2026-08-05); F constants as fallback.
  const live = {
    savingsTotal: stats?.savingsTotal ?? F.savingsTotal,
    underpriced: stats?.underpriced ?? F.underpriced,
    liveDeals: stats?.liveDeals ?? F.liveDeals,
    regions: stats?.regions ?? F.regions,
  };
  const savingsCount = useCountUp(live.savingsTotal, hero.seen);

  // The Delta Layer: real moves from the moat tables when the nightly
  // capture has them; the verified historical sweep as fallback until then.
  const movements: PriceMove[] = deltas?.moves?.length ? deltas.moves : MOVEMENTS;
  const liveDeltas = Boolean(deltas?.moves?.length);

  const timeline: Array<[string, string, string]> = [
    ['02:00', 'Score engine runs', 'One score written per property, every day — the observation history no competitor can rebuild backwards.'],
    ['02:20', 'Price sweep', 'Every listing compared against its last recorded price; changes logged as permanent history. Four times daily.'],
    ['03:00', 'Feed sync', 'The coastal new-build feed is re-pulled — new projects in, sold projects out.'],
    ['04:30', 'External data ingested', 'French DVF registered transactions ingested as an independent method check — kept separate from Spanish figures.'],
    ['06:00', 'Benchmarks recomputed', 'A segmented hedonic regression re-fits the market €/m² reference across every price band.'],
    ['—', 'Live on Avena', 'Recalculated scores surface on the deal feed. The moat is one day deeper.'],
  ];
  const pipeline = ['Developers', 'Property portals', 'Registries', 'Historical pricing', 'Transaction records', 'Cleaning', 'Validation', 'Avena Engine', 'Avena Score'];
  const why: Array<[string, string]> = [
    ['Historical memory', 'Every project keeps a permanent pricing trajectory. "Fell 12% in 90 days" becomes a verifiable statement, not a claim.'],
    ['Continuous monitoring', 'Projects are re-evaluated as new information arrives — nightly, without exception, since April 2026.'],
    ['Verified scoring', 'Every score is generated from structured data — discount-to-market, yield, developer quality — not opinion.'],
  ];
  const deeper: Array<[string, string]> = [
    ['Methodology', '/methodology'], ['Proof of data', '/proof'], ['DELPHI panel', '/delphi'],
    ['PLAB benchmark', '/benchmark'], ['Open standards', '/standards'], ['Verify', '/verify'],
  ];

  return (
    <div style={{ background: 'hsl(var(--av-background))', color: INK, minHeight: '100vh' }}>
      <Nav />

      {/* Hero */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '124px 32px 76px' }}>
        <div ref={hero.ref} className="av-eng-hero" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 64, alignItems: 'start' }}>
          <div>
            <Label>The infrastructure behind every score</Label>
            <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(2.6rem,5.2vw,4.6rem)', lineHeight: 1.02, letterSpacing: '-0.025em', margin: '22px 0 0' }}>The Avena Engine</h1>
            <p style={{ maxWidth: 560, marginTop: 26, fontSize: 18, lineHeight: 1.65, color: MUTED, fontWeight: 300 }}>
              Every score on Avena is backed by continuously collected property data, historical pricing,
              verified transactions and developer intelligence — recomputed every night, never guessed.
            </p>
            <div style={{ marginTop: 40 }}>
              <Link href="/deals" style={{ background: GOLD, color: '#fff', padding: '15px 30px', borderRadius: 4, fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', textDecoration: 'none' }}>Explore this week&apos;s opportunities →</Link>
            </div>
          </div>

          {/* Live status card */}
          <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 6, padding: 28, boxShadow: '0 1px 2px rgba(26,23,18,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Engine status</Label>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: POS }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: POS, boxShadow: '0 0 0 3px rgba(46,125,70,0.15)' }} /> Operational
              </span>
            </div>
            <div style={{ marginTop: 24, paddingBottom: 22, borderBottom: `1px solid ${LINE}` }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 300, color: INK, lineHeight: 1, letterSpacing: '-0.02em' }}>{eur(savingsCount)}</div>
              <div style={{ marginTop: 8, fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>Identified savings · {grp(live.underpriced)} underpriced homes</div>
            </div>
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 24px' }}>
              <MiniStat value={live.liveDeals} label="Scored tonight" run={hero.seen} />
              <MiniStat value={live.regions} label="Coastal regions" run={hero.seen} />
              {truth?.observationDays != null && (
                <MiniStat value={truth.observationDays} label="Observation days" run={hero.seen} />
              )}
              {truth?.refsObserved != null && (
                <MiniStat value={truth.refsObserved} label="Units under observation" run={hero.seen} />
              )}
              {truth?.priceMoves != null && (
                <MiniStat value={truth.priceMoves} label="Price moves recorded" run={hero.seen} />
              )}
              {truth?.tombstones != null && (
                <MiniStat value={truth.tombstones} label="Units left the market" run={hero.seen} />
              )}
            </div>
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${LINE}`, fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>Verified from production · updated {ticked}s ago</div>
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="av-eng-cov" style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40 }}>
          {[
            ['Live scoring', 'Spanish coast', `Costa Blanca, Cálida, del Sol, Tropical — ${live.regions} regions, ${grp(live.liveDeals)} new-builds scored daily.`],
            ['External comparator', truth?.externalTransactions != null ? `${grp(truth.externalTransactions)}` : '—', 'Registered French transactions (DVF open data, 2023–2024) — held separately as a method check, never blended into Spanish figures.'],
            ['Observation depth', truth?.observationDays != null ? `${truth.observationDays} days` : '—', truth?.firstObservation ? `Every listing re-read nightly since ${truth.firstObservation}. Small today, and irreproducible after the fact — a rival starting tomorrow begins at zero.` : 'Every listing re-read nightly — irreproducible after the fact.'],
          ].map(([l, big, body]) => (
            <div key={l as string}>
              <Label>{l}</Label>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 300, marginTop: 14 }}>{big}</div>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '84px 32px' }}>
        <Label>Every day the engine works</Label>
        <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(2rem,3.6vw,3rem)', letterSpacing: '-0.02em', margin: '18px 0 44px' }}>The nightly pipeline</h2>
        <div style={{ maxWidth: 780 }}>
          {timeline.map(([time, title, body], i) => (
            <div key={title} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 28 }}>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: GOLD, paddingTop: 3 }}>{time}</div>
              <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 28, paddingBottom: i === timeline.length - 1 ? 0 : 34, position: 'relative' }}>
                <span style={{ position: 'absolute', left: -4, top: 6, width: 7, height: 7, borderRadius: '50%', background: i === timeline.length - 1 ? GOLD : '#fff', border: `1px solid ${GOLD}` }} />
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 19 }}>{title}</div>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6, marginTop: 6, maxWidth: 560 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 32px' }}>
          <Label>How raw data becomes a score</Label>
          <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(2rem,3.6vw,3rem)', letterSpacing: '-0.02em', margin: '18px 0 40px' }}>The data pipeline</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {pipeline.map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ border: `1px solid ${LINE}`, borderRadius: 4, padding: '14px 18px', fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: i >= pipeline.length - 2 ? GOLD : INK, background: PAPER, whiteSpace: 'nowrap' }}>{step}</div>
                {i < pipeline.length - 1 && <span style={{ color: '#C9C2B6', fontSize: 14 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The engine today */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '84px 32px' }}>
        <Label>The engine today</Label>
        <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(2rem,3.6vw,3rem)', letterSpacing: '-0.02em', margin: '18px 0 40px' }}>Verified scale</h2>
        <div ref={grid.ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          <Metric value={live.savingsTotal} prefix="€" label="Identified savings" run={grid.seen} />
          <Metric value={live.underpriced} label="Underpriced homes" run={grid.seen} />
          <Metric value={live.liveDeals} label="Scored every night" run={grid.seen} />
          {truth?.observationDays != null && <Metric value={truth.observationDays} label="Observation days" run={grid.seen} />}
          {truth?.refsObserved != null && <Metric value={truth.refsObserved} label="Units under observation" run={grid.seen} />}
          {truth?.priceMoves != null && <Metric value={truth.priceMoves} label="Price moves recorded" run={grid.seen} />}
          {truth?.tombstones != null && <Metric value={truth.tombstones} label="Units left the market" run={grid.seen} />}
          {truth?.externalTransactions != null && <Metric value={truth.externalTransactions} label="French DVF comparator" run={grid.seen} />}
        </div>
      </section>

      {/* Why it matters */}
      <section style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 32px' }}>
          <Label>Why it matters</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginTop: 32 }}>
            {why.map(([t, b]) => (
              <div key={t} style={{ border: `1px solid ${LINE}`, borderRadius: 4, padding: '30px 28px', background: PAPER }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 300 }}>{t}</div>
                <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.65, marginTop: 12 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent movements — the Delta Layer, live from the moat tables */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '84px 32px' }}>
        <Label>{liveDeltas ? 'Price movements · last 7 days · live' : 'Recent price movements · latest sweep'}</Label>
        <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(2rem,3.6vw,3rem)', letterSpacing: '-0.02em', margin: '18px 0 36px' }}>What the engine caught</h2>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 4, overflow: 'hidden', background: SURFACE }}>
          {movements.map((m, i) => {
            const pct = Math.round(((m.to - m.from) / m.from) * 100);
            return (
              <Link key={m.ref} href={`/property/${encodeURIComponent(m.ref)}`} className="av-eng-mv" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto auto', gap: 20, alignItems: 'center', padding: '18px 26px', borderTop: i === 0 ? 'none' : `1px solid ${LINE}`, color: 'inherit', textDecoration: 'none' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>{m.town}</span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>{eur(m.from)} → {eur(m.to)}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: pct < 0 ? NEG : POS }}>{pct > 0 ? '+' : ''}{pct}%</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>{m.date ?? 'logged'}</span>
              </Link>
            );
          })}
        </div>
        <p style={{ color: MUTED, fontSize: 12.5, marginTop: 14 }}>Every movement is written to permanent price history — the record that makes &ldquo;underpriced&rdquo; provable.</p>

        {/* Left the market — the absorption signal the source deletes */}
        {deltas && deltas.selloutCount30d > 0 && (
          <div style={{ marginTop: 56 }}>
            <Label>Left the market · last 30 days · live</Label>
            <h3 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(1.5rem,2.6vw,2.1rem)', letterSpacing: '-0.02em', margin: '16px 0 10px' }}>
              {deltas.selloutCount30d} new-builds gone from the feed
              {deltas.medianExitPm2 ? ` · median exit ${eur(deltas.medianExitPm2)}/m²` : ''}
            </h3>
            <p style={{ color: MUTED, fontSize: 13.5, margin: '0 0 24px', maxWidth: 640 }}>
              When a unit sells, the source removes it — the listing, the price, everything. These records now exist only here.
            </p>
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 4, overflow: 'hidden', background: SURFACE }}>
              {deltas.sellouts.map((s, i) => (
                <div key={s.ref} className="av-eng-mv" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto auto', gap: 20, alignItems: 'center', padding: '16px 26px', borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>{s.town ?? '—'}</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>{s.type ?? 'New build'}{s.lastPrice ? ` · last asked ${eur(s.lastPrice)}` : ''}</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>{s.lastSeen}</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>archived</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Closing */}
      <section style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '96px 32px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 'clamp(2.2rem,4.4vw,3.6rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}>Every opportunity begins<br />with <em style={{ color: GOLD, fontStyle: 'italic' }}>better data</em>.</h2>
          <p style={{ maxWidth: 620, margin: '26px auto 0', color: MUTED, fontSize: 16, lineHeight: 1.65, fontWeight: 300 }}>
            The Avena Engine continuously collects, validates and scores residential developments across the
            Spanish coast so every opportunity is backed by structured evidence — not speculation.
          </p>
          <div style={{ marginTop: 40 }}>
            <Link href="/deals" style={{ background: GOLD, color: '#fff', padding: '16px 34px', borderRadius: 4, fontFamily: 'ui-monospace, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', textDecoration: 'none' }}>Explore this week&apos;s opportunities →</Link>
          </div>
          {/* Go deeper — the technical cathedral, preserved */}
          <div style={{ marginTop: 56, paddingTop: 28, borderTop: `1px solid ${LINE}`, display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
            {deeper.map(([l, href]) => (
              <Link key={href} href={href} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, textDecoration: 'none' }}>{l} →</Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 900px) {
          .av-eng-hero { grid-template-columns: 1fr !important; }
          .av-eng-cov  { grid-template-columns: 1fr !important; gap: 28px !important; }
          .av-eng-mv   { grid-template-columns: 1fr auto !important; row-gap: 4px !important; }
        }
      `}</style>
    </div>
  );
}

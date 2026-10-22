/**
 * The sell-out ledger: homes that left the source feed in the last 30 days,
 * with the last price Avena captured. The source deletes a listing when it
 * sells; this is the only place that price still exists.
 *
 * Always rendered, so the idea is on the page even when the table is empty.
 * The empty state does not claim "nothing sold": getRecentSellouts() returns
 * the same empty result for a quiet month and for an unreachable archive, so
 * the copy says exactly that.
 */

import Link from 'next/link';
import type { Sellout } from '@/lib/deltas';
import { GOLD, LINE, MONO, MUTED, SERIF, SURFACE, eur, grp } from './tokens';

export function SelloutLedger({ sellouts, count, medianExitPm2 }: { sellouts: Sellout[]; count: number; medianExitPm2: number | null }) {
  return (
    <section style={{ borderTop: `1px solid ${LINE}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '84px 32px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>The sell-out ledger · last 30 days</span>
        <h2 style={{ fontFamily: SERIF, fontWeight: 300, fontSize: 'clamp(2rem,3.6vw,3rem)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '18px 0 14px', maxWidth: 900 }}>
          Gone from the source feed.<br />
          <em style={{ color: GOLD, fontStyle: 'italic' }}>Only Avena still has the last price.</em>
        </h2>
        <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 30px', maxWidth: 660 }}>
          When a unit sells or is withdrawn, the developer feed deletes it: the listing, the price, everything.
          The engine keeps the last asking price it captured, the day it was last seen, and nothing it did not observe.
        </p>

        {count > 0 && sellouts.length > 0 ? (
          <>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>
              {count >= 500 ? '500+' : grp(count)} homes left the feed
              {medianExitPm2 ? ` · median last price ${eur(medianExitPm2)}/m²` : ''}
              {count > sellouts.length ? ` · ${sellouts.length} highest-priced shown` : ''}
            </div>
            <div data-testid="sellout-ledger" style={{ border: `1px solid ${LINE}`, borderRadius: 4, overflow: 'hidden', background: SURFACE }}>
              {sellouts.map((s, i) => (
                <div key={s.ref} className="av-eng-mv" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto auto', gap: 20, alignItems: 'center', padding: '16px 26px', borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>{s.town ?? '—'}</span>
                  <span style={{ fontFamily: SERIF, fontSize: 15 }}>{s.type ?? 'New build'}{s.lastPrice ? ` · last asked ${eur(s.lastPrice)}` : ''}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>last seen {s.lastSeen}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>archived</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div data-testid="sellout-ledger-empty" style={{ border: `1px dashed ${LINE}`, borderRadius: 4, padding: '28px 26px', background: SURFACE, maxWidth: 760 }}>
            <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 300 }}>No sell-outs to show right now.</div>
            <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6, marginTop: 8 }}>
              Either no home has left the source feed in the last 30 days, or the archive is briefly unreachable.
              We show nothing rather than an estimate. The next nightly capture refreshes this ledger.
            </p>
            <Link href="/archive" style={{ display: 'inline-block', marginTop: 14, fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, textDecoration: 'none' }}>Browse the archive →</Link>
          </div>
        )}
      </div>
    </section>
  );
}

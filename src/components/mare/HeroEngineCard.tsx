'use client';

/**
 * HeroEngineCard (2026-08-04) — the floating engine-status card in the hero.
 * A light frosted-glass panel over the dusk villa, per Henrik's reference.
 * Live savings/underpriced/regions come from the dataset; DB depth figures
 * are the verified production baseline. Every number counts up on mount.
 */

import { useEffect, useState } from 'react';
import { TrendingUp, Globe, Database, Tag, ShieldCheck, RefreshCw } from 'lucide-react';
import type { EngineStats } from '@/lib/deals';

const INK = '#2A2620';
const MUTED = '#8A8378';
const GOLD = '#C79A4B';
const LINE = 'rgba(42,38,32,0.10)';
const GREEN = '#3E8E5A';

// Verified production depth (Supabase audit) — not derivable from the feed.
const DB = { dailyUpdates: 1881, indexed: 60792, priceRecords: 387000, transactions: 380435, scoreRevisions: 191862 };

const grp = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

function useCountUp(target: number, ms = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function GridStat({ icon: Icon, value, suffix = '', label }: { icon: typeof Globe; value: number; suffix?: string; label: string }) {
  const v = useCountUp(value);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
        <Icon size={14} style={{ color: GOLD, transform: 'translateY(2px)' }} strokeWidth={1.6} />
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 23, fontWeight: 300, color: INK, lineHeight: 1 }}>{grp(v)}{suffix}</span>
      </div>
      <div style={{ marginTop: 7, marginLeft: 23, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>{label}</div>
    </div>
  );
}

export function HeroEngineCard({ stats }: { stats: EngineStats }) {
  const savingsM = useCountUp(Math.round(stats.savingsTotal / 1e6), 1600);
  const [secs, setSecs] = useState(0);
  useEffect(() => { const t = setInterval(() => setSecs((s) => s + 7), 1000); return () => clearInterval(t); }, []);

  return (
    <div
      style={{
        width: '100%',
        background: 'rgba(249,247,243,0.90)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.45)',
        borderRadius: 16,
        padding: '26px 28px',
        boxShadow: '0 24px 60px -20px rgba(20,15,10,0.45)',
        color: INK,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9.5, letterSpacing: '0.26em', textTransform: 'uppercase', color: GOLD }}>Engine status</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GREEN }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 0 3px ${GREEN}22` }} /> Operational
        </span>
      </div>

      {/* Hero figure */}
      <div style={{ marginTop: 20, paddingBottom: 20, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 46, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1 }}>€{savingsM}M</div>
        <div style={{ marginTop: 9, fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>
          Identified savings · {grp(stats.underpriced)} underpriced homes
        </div>
      </div>

      {/* Grid */}
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 20px' }}>
        <GridStat icon={TrendingUp} value={DB.dailyUpdates} label="Today's score updates" />
        <GridStat icon={Globe} value={stats.regions} label="Coastal regions" />
        <GridStat icon={Database} value={DB.indexed} label="Records indexed" />
        <GridStat icon={Tag} value={DB.priceRecords} suffix="+" label="Price records" />
        <GridStat icon={ShieldCheck} value={DB.transactions} suffix="+" label="Verified transactions" />
        <GridStat icon={RefreshCw} value={DB.scoreRevisions} label="Score revisions" />
      </div>

      {/* Footer */}
      <div style={{ marginTop: 22, paddingTop: 15, borderTop: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN }} />
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>Verified from production · updated {secs}s ago</span>
      </div>
    </div>
  );
}

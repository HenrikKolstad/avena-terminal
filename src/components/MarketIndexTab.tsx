'use client';

import { useState, useMemo } from 'react';
import { Property } from '@/lib/types';
import { ChevronRight } from 'lucide-react';
import { regionLabel } from '@/lib/scoring';
import Link from 'next/link';

export default function MarketIndexTab({ properties }: { properties: Property[] }) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [townSort, setTownSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'avgScore', dir: 'desc' });
  const [townFilter, setTownFilter] = useState('');

  // Compute regional data
  const regionMap = useMemo(() => {
    const map: Record<string, Property[]> = {};
    for (const p of properties) {
      const r = p.r || 'unknown';
      if (!map[r]) map[r] = [];
      map[r].push(p);
    }
    return map;
  }, [properties]);

  const regionLabels: Record<string, string> = { 'cb-south': 'Costa Blanca South', 'cb-north': 'Costa Blanca North', 'costa-calida': 'Costa Calida', 'costa-del-sol': 'Costa del Sol' };

  const regions = useMemo(() => {
    return Object.entries(regionMap).map(([code, props]) => {
      const withYield = props.filter(p => p._yield);
      const withScore = props.filter(p => p._sc);
      const avgPm2 = props.length ? Math.round(props.reduce((s, p) => s + (p.pm2 || (p.bm > 0 ? p.pf / p.bm : 0)), 0) / props.length) : 0;
      const avgDisc = props.length ? (props.reduce((s, p) => { const d = p.mm2 && p.pm2 ? ((p.mm2 - p.pm2) / p.mm2) * 100 : 0; return s + d; }, 0) / props.length).toFixed(1) : '0';
      const avgYield = withYield.length ? (withYield.reduce((s, p) => s + p._yield!.gross, 0) / withYield.length).toFixed(1) : '0';
      const townScores: Record<string, { total: number; count: number }> = {};
      for (const p of withScore) {
        const t = p.l;
        if (!townScores[t]) townScores[t] = { total: 0, count: 0 };
        townScores[t].total += p._sc!;
        townScores[t].count++;
      }
      let bestTown = '';
      let bestTownScore = 0;
      for (const [town, { total, count }] of Object.entries(townScores)) {
        const avg = total / count;
        if (avg > bestTownScore) { bestTownScore = avg; bestTown = town; }
      }
      return { code, name: regionLabels[code] || code, count: props.length, avgPm2, avgDisc, avgYield, bestTown, bestTownScore: Math.round(bestTownScore), props };
    }).sort((a, b) => b.count - a.count);
  }, [regionMap]);

  // Town data
  const towns = useMemo(() => {
    const map: Record<string, { props: Property[]; region: string }> = {};
    for (const p of properties) {
      const t = p.l;
      if (!t) continue;
      if (!map[t]) map[t] = { props: [], region: p.r };
      map[t].props.push(p);
    }
    return Object.entries(map).map(([town, { props, region }]) => {
      const withYield = props.filter(p => p._yield);
      const withScore = props.filter(p => p._sc);
      const avgPrice = Math.round(props.reduce((s, p) => s + p.pf, 0) / props.length);
      const avgDisc = props.length ? Number((props.reduce((s, p) => { const d = p.mm2 && p.pm2 ? ((p.mm2 - p.pm2) / p.mm2) * 100 : 0; return s + d; }, 0) / props.length).toFixed(1)) : 0;
      const avgYield = withYield.length ? Number((withYield.reduce((s, p) => s + p._yield!.gross, 0) / withYield.length).toFixed(1)) : 0;
      const avgScore = withScore.length ? Math.round(withScore.reduce((s, p) => s + p._sc!, 0) / withScore.length) : 0;
      return { town, region: regionLabels[region] || region, regionCode: region, count: props.length, avgPrice, avgDisc, avgYield, avgScore };
    }).filter(t => !townFilter || t.town.toLowerCase().includes(townFilter.toLowerCase()));
  }, [properties, townFilter]);

  const sortedTowns = useMemo(() => {
    const key = townSort.key as keyof typeof towns[0];
    return [...towns].sort((a, b) => {
      const av = a[key] as number, bv = b[key] as number;
      return townSort.dir === 'desc' ? bv - av : av - bv;
    });
  }, [towns, townSort]);

  const toggleSort = (key: string) => {
    setTownSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });
  };

  // Global stats
  const totalProps = properties.length;
  const nationalDisc = regions.length ? (regions.reduce((s, r) => s + Number(r.avgDisc) * r.count, 0) / totalProps).toFixed(1) : '0';
  const nationalYield = (() => { const wy = properties.filter(p => p._yield); return wy.length ? (wy.reduce((s, p) => s + p._yield!.gross, 0) / wy.length).toFixed(1) : '0'; })();
  const bestProp = properties.reduce((best, p) => (p._sc ?? 0) > (best._sc ?? 0) ? p : best, properties[0]);

  // Insight cards
  const bestValueRegion = regions.reduce((best, r) => Number(r.avgDisc) > Number(best.avgDisc) ? r : best, regions[0]);
  const highestYieldRegion = regions.reduce((best, r) => Number(r.avgYield) > Number(best.avgYield) ? r : best, regions[0]);
  const mostListingsRegion = regions.reduce((best, r) => r.count > best.count ? r : best, regions[0]);

  // Best deal (highest discount)
  const bestDeal = useMemo(() => {
    let best = properties[0];
    let bestDisc = 0;
    for (const p of properties) {
      const d = p.mm2 && p.pm2 ? ((p.mm2 - p.pm2) / p.mm2) * 100 : 0;
      if (d > bestDisc) { bestDisc = d; best = p; }
    }
    return { name: best?.l?.split(',')[0] || '', disc: bestDisc.toFixed(1) };
  }, [properties]);

  // Ticker data — all towns sorted by score
  const tickerTowns = useMemo(() => {
    return sortedTowns.filter(t => t.avgScore > 0).slice(0, 50);
  }, [sortedTowns]);

  return (
    <div>
      {/* ── LIVE MARKET STATUS BAR ── */}
      <div className="w-full px-4 py-2 flex items-center gap-3 md:gap-6 text-[10px] md:text-xs overflow-x-auto scrollbar-none" style={{ background: '#080c11', borderBottom: '1px solid #1c2333', fontFamily: 'ui-monospace, monospace' }}>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold tracking-wider">MARKET OPEN</span>
        </span>
        <span className="text-gray-600 hidden md:inline">|</span>
        <span className="text-gray-400 flex-shrink-0">{totalProps.toLocaleString()} properties tracked</span>
        <span className="text-gray-600 hidden md:inline">|</span>
        <span className="text-gray-400 flex-shrink-0 hidden md:inline">Last scan: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span className="text-gray-600 hidden md:inline">|</span>
        <span className="text-gray-400 flex-shrink-0">Best deal today: <span className="text-emerald-400 font-semibold">{bestDeal.name} &mdash; {bestDeal.disc}% below market</span></span>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-extralight tracking-[0.2em] mb-2" style={{ background: 'linear-gradient(135deg, #00b9ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SPAIN NEW BUILD PRICE INDEX</h1>
        <p className="text-xs md:text-sm tracking-wide mb-1" style={{ color: '#a78bfa' }}>Live data &middot; {totalProps.toLocaleString()} properties tracked &middot; Updated daily</p>
        <p className="text-[10px] text-gray-600">The only real-time index tracking new build prices, discounts and yields across Spain&apos;s costas.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Properties Tracked', value: totalProps.toLocaleString() },
          { label: 'National Avg Discount', value: `${nationalDisc}%` },
          { label: 'National Avg Yield', value: `${nationalYield}%` },
          { label: 'Highest Score', value: `${Math.round(bestProp?._sc ?? 0)} — ${bestProp?.l?.split(',')[0] || ''}` },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-3 md:p-4 border text-center" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
            <div className="font-bold text-lg md:text-xl" style={{ background: 'linear-gradient(135deg, #00b9ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
            <div className="text-gray-500 text-[9px] md:text-[10px] uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-gray-600 -mt-6 mb-8">Gross yield. Net typically 30–35% lower after fees &amp; tax.</p>

      {/* ── REGIONAL HEAT MAP ── */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] mb-4" style={{ color: '#a78bfa' }}>Regional Heat Map</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(() => {
            const yields = regions.map(r => Number(r.avgYield) || 0);
            const maxY = Math.max(...yields, 1);
            const minY = Math.min(...yields);
            return regions.map((r, idx) => {
            const yld = Number(r.avgYield) || 0;
            const intensity = maxY > minY ? (yld - minY) / (maxY - minY) : 0.5;
            const color = intensity > 0.6 ? '#10B981' : intensity > 0.3 ? '#00b9ff' : '#6366f1';
            const glowStrength = Math.round(30 + intensity * 70);
            const outerGlow = Math.round(15 + intensity * 50);
            const bgOpacity = Math.round(5 + intensity * 35).toString(16).padStart(2, '0');
            const innerOpacity = Math.round(10 + intensity * 40).toString(16).padStart(2, '0');
            return (
              <div key={r.code} className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.05]"
                style={{
                  minHeight: 200, background: '#080c11',
                  border: `1px solid ${color}${Math.round(20 + intensity * 30).toString(16)}`,
                  boxShadow: `inset 0 0 ${glowStrength}px ${color}${innerOpacity}, 0 0 ${outerGlow}px ${color}${bgOpacity}, 0 0 ${outerGlow * 2}px ${color}${Math.round(intensity * 15).toString(16).padStart(2, '0')}`,
                  animation: `core-breathe ${2.5 + idx * 0.35}s ease-in-out infinite`,
                  animationDelay: `${idx * 0.7}s`,
                }}>
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 70%, ${color}${innerOpacity} 0%, ${color}08 50%, transparent 80%)` }} />
                <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-center" style={{ minHeight: 200 }}>
                  <div className="text-lg md:text-xl font-extralight tracking-[0.25em] text-white mb-2" style={{ textShadow: `0 0 ${15 + intensity * 25}px ${color}` }}>{r.name.toUpperCase()}</div>
                  <div className="text-3xl md:text-4xl font-bold mb-1" style={{ color, textShadow: `0 0 ${20 + intensity * 40}px ${color}` }}>{r.avgYield}%</div>
                  <div className="text-[10px] text-gray-500 tracking-wider">{r.count} properties</div>
                  {/* Hover detail */}
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] space-y-0.5">
                    <div className="text-gray-400">Best town: <span className="text-white font-semibold">{r.bestTown?.split(',')[0]}</span></div>
                    <div className="text-gray-400">Avg discount: <span style={{ color }}>{r.avgDisc}%</span></div>
                    <div className="text-gray-400">Avg score: <span className="text-white font-semibold">{r.bestTownScore}</span></div>
                  </div>
                </div>
              </div>
            );
          });
          })()}
        </div>
      </div>

      {/* ── LIVE TICKER ── */}
      <div className="mb-8 overflow-hidden rounded-lg border" style={{ background: '#080c11', borderColor: '#1c2333' }}>
        <div className="py-2 overflow-hidden">
          <div className="animate-ticker flex whitespace-nowrap hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
            {[...tickerTowns, ...tickerTowns].map((t, i) => (
              <span key={`${t.town}-${i}`} className="inline-flex items-center gap-1 mx-4 text-[10px] md:text-xs" style={{ fontFamily: 'ui-monospace, monospace' }}>
                <span className="text-white font-semibold">{t.town.split(',')[0]}</span>
                <span className="text-emerald-400 font-bold">{t.avgScore}pts</span>
                <span className="text-gray-500">&middot;</span>
                <span style={{ color: '#a78bfa' }}>{t.avgDisc}% disc</span>
                <span className="text-gray-500">&middot;</span>
                <span className="text-emerald-400">{t.avgYield}% yield</span>
                <span className="text-gray-700 mx-2">&middot;&middot;&middot;</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Regional breakdown */}
      <h2 className="text-lg font-bold mb-4" style={{ color: '#a78bfa' }}>Regional Breakdown</h2>
      <div className="space-y-2 mb-8">
        {regions.map(r => (
          <div key={r.code}>
            <button onClick={() => setExpandedRegion(expandedRegion === r.code ? null : r.code)}
              className="w-full flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 p-3 min-h-[48px] rounded-lg border text-left transition-all hover:border-emerald-500/30"
              style={{ background: '#0f1419', borderColor: expandedRegion === r.code ? '#10B981' : '#1c2333', borderLeftWidth: expandedRegion === r.code ? 3 : 1 }}>
              <ChevronRight size={14} className={`text-gray-500 transition-transform flex-shrink-0 ${expandedRegion === r.code ? 'rotate-90' : ''}`} />
              <span className="text-white font-medium text-sm flex-1 min-w-[120px]">{r.name}</span>
              <span className="text-gray-400 text-xs">{r.count} props</span>
              <span className="text-emerald-400 text-xs font-semibold hidden md:inline">{r.avgPm2 ? <>&euro;{r.avgPm2.toLocaleString()}/m&sup2;</> : ''}</span>
              <span className="text-emerald-400 text-xs font-semibold">{r.avgDisc}% disc</span>
              <span className="text-emerald-400 text-xs font-semibold">{r.avgYield}% yield</span>
              <span className="text-gray-400 text-xs hidden md:inline">{r.bestTown?.split(',')[0]}</span>
            </button>
            {expandedRegion === r.code && (
              <div className="ml-3 md:ml-6 mt-2 space-y-1 mb-3">
                {(() => {
                  const townMap: Record<string, Property[]> = {};
                  for (const p of r.props) { if (!townMap[p.l]) townMap[p.l] = []; townMap[p.l].push(p); }
                  return Object.entries(townMap).map(([town, props]) => {
                    const wy = props.filter(p => p._yield);
                    const ws = props.filter(p => p._sc);
                    return { town, count: props.length, avgYield: wy.length ? (wy.reduce((s, p) => s + p._yield!.gross, 0) / wy.length).toFixed(1) : '0', avgScore: ws.length ? Math.round(ws.reduce((s, p) => s + p._sc!, 0) / ws.length) : 0 };
                  }).sort((a, b) => b.avgScore - a.avgScore).map(t => (
                    <div key={t.town} className="flex items-center gap-3 px-3 py-2 rounded text-xs" style={{ background: '#0d1117', border: '1px solid #1c2333' }}>
                      <span className="text-white flex-1">{t.town}</span>
                      <span className="text-gray-400">{t.count}</span>
                      <span className="text-emerald-400 font-semibold">{t.avgYield}%</span>
                      <span className="text-white font-bold">{t.avgScore}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Town table */}
      <h2 className="text-lg font-bold mb-3" style={{ color: '#a78bfa' }}>All Towns</h2>
      <input
        type="text"
        placeholder="Filter towns..."
        value={townFilter}
        onChange={e => setTownFilter(e.target.value)}
        className="w-full md:w-64 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 mb-3 outline-none"
        style={{ background: '#0f1419', border: '1px solid #1c2333' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#10B981'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#1c2333'; }}
      />
      <div className="overflow-x-auto mb-8">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              {[
                { key: 'town', label: 'Town' },
                { key: 'region', label: 'Region' },
                { key: 'count', label: 'Properties' },
                { key: 'avgPrice', label: 'Avg Price' },
                { key: 'avgDisc', label: 'Avg Discount' },
                { key: 'avgYield', label: 'Avg Yield' },
                { key: 'avgScore', label: 'Avg Score' },
              ].map(col => (
                <th key={col.key} onClick={() => toggleSort(col.key)}
                  className={`px-3 py-2 text-[10px] uppercase tracking-widest text-left cursor-pointer hover:text-emerald-400 whitespace-nowrap ${townSort.key === col.key ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}
                  style={{ background: '#0d1117', position: 'sticky', top: 0 }}>
                  {col.label}{townSort.key === col.key ? (townSort.dir === 'desc' ? ' \u25BC' : ' \u25B2') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTowns.map((t, i) => (
              <tr key={t.town} className="transition-colors hover:bg-emerald-500/5" style={{ background: i % 2 === 0 ? '#0d1117' : '#0a0f15' }}>
                <td className="px-3 py-2 text-xs"><a href={`/towns/${t.town.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`} className="text-white hover:text-emerald-400 transition-colors">{t.town}</a></td>
                <td className="px-3 py-2 text-xs text-gray-400">{t.region}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{t.count}</td>
                <td className="px-3 py-2 text-xs text-white">&euro;{t.avgPrice.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-emerald-400 font-semibold">{t.avgDisc}%</td>
                <td className="px-3 py-2 text-xs text-emerald-400 font-semibold">{t.avgYield}%</td>
                <td className="px-3 py-2 text-xs text-white font-bold">{t.avgScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { title: 'BEST VALUE REGION', value: `${bestValueRegion?.name}`, sub: `${bestValueRegion?.avgDisc}% avg discount` },
          { title: 'HIGHEST YIELD REGION', value: `${highestYieldRegion?.name}`, sub: `${highestYieldRegion?.avgYield}% gross yield` },
          { title: 'MOST LISTINGS', value: `${mostListingsRegion?.name}`, sub: `${mostListingsRegion?.count} properties` },
        ].map(card => (
          <div key={card.title} className="rounded-lg p-5" style={{ background: '#0d1117', border: '1px solid #1c2333', borderTop: '2px solid #a78bfa' }}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ background: 'linear-gradient(135deg, #00b9ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{card.title}</h3>
            <div className="text-white font-bold text-lg">{card.value}</div>
            <div className="text-gray-400 text-xs">{card.sub}</div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-gray-600 text-right">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    </div>
  );
}


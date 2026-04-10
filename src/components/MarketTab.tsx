'use client';

import { useState, useMemo } from 'react';
import { Property } from '@/lib/types';
import { formatPrice, regionLabel } from '@/lib/scoring';
import Link from 'next/link';

function growthRate5yr(region: string): number {
  const r = (region || '').toLowerCase();
  if (r.includes('marbella') || r.includes('costa del sol') || r.includes('costa-del-sol')) return 0.09;
  if (r.includes('javea') || r.includes('altea') || r.includes('cb-north')) return 0.085;
  if (r.includes('mallorca') || r.includes('ibiza')) return 0.10;
  if (r.includes('torrevieja') || r.includes('cb-south') || r.includes('alicante')) return 0.065;
  return 0.075;
}

export default function MarketTab({ properties }: { properties: Property[] }) {
  const regions = ['cb-south', 'cb-north', 'costa-calida', 'costa-del-sol'];

  const regionData = regions.map(r => {
    const props = properties.filter(p => p.r === r);
    const withM2 = props.filter(p => p.pm2 && p.pm2 > 0);
    const avgPrice = props.length ? Math.round(props.reduce((a, b) => a + b.pf, 0) / props.length) : 0;
    const avgM2 = withM2.length ? Math.round(withM2.reduce((a, b) => a + (b.pm2 || 0), 0) / withM2.length) : 0;
    const minPrice = props.length ? Math.min(...props.map(p => p.pf)) : 0;
    const maxPrice2 = props.length ? Math.max(...props.map(p => p.pf)) : 0;
    const offPlan = props.filter(p => p.s === 'off-plan').length;
    const ready = props.filter(p => p.s === 'ready').length;
    const building = props.filter(p => p.s === 'under-construction').length;
    return { region: r, count: props.length, avgPrice, avgM2, minPrice, maxPrice: maxPrice2, offPlan, ready, building };
  });

  const totalListings = properties.length;

  // Type breakdown
  const typeColors: Record<string, string> = { Villa: '#10B981', Apartment: '#60a5fa', Townhouse: '#a78bfa', Bungalow: '#f59e0b', Penthouse: '#ec4899', Duplex: '#14b8a6' };
  const types = ['Villa', 'Apartment', 'Townhouse', 'Bungalow', 'Penthouse', 'Duplex'];
  const typeData = types.map(t => ({ type: t, count: properties.filter(p => p.t === t).length }))
    .filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  const maxTypeCount = Math.max(...typeData.map(t => t.count));

  // Status breakdown
  const totalOffPlan = properties.filter(p => p.s === 'off-plan').length;
  const totalReady = properties.filter(p => p.s === 'ready').length;
  const totalBuilding = properties.filter(p => p.s === 'under-construction').length;

  // Price bands
  const bands = [
    { label: '< \€150k', min: 0, max: 150000 },
    { label: '\€150\–250k', min: 150000, max: 250000 },
    { label: '\€250\–400k', min: 250000, max: 400000 },
    { label: '\€400\–600k', min: 400000, max: 600000 },
    { label: '\€600k\–1M', min: 600000, max: 1000000 },
    { label: '> \€1M', min: 1000000, max: Infinity },
  ];
  const bandData = bands.map(b => ({ ...b, count: properties.filter(p => p.pf >= b.min && p.pf < b.max).length }));
  const maxBandCount = Math.max(...bandData.map(b => b.count));

  // Top towns
  const townMap: Record<string, { count: number; avgPrice: number; avgM2: number; total: number }> = {};
  properties.forEach(p => {
    const town = p.l || 'Unknown';
    if (!townMap[town]) townMap[town] = { count: 0, avgPrice: 0, avgM2: 0, total: 0 };
    townMap[town].count++;
    townMap[town].total += p.pf;
    townMap[town].avgM2 += p.pm2 || 0;
  });
  const topTowns = Object.entries(townMap)
    .map(([town, d]) => ({ town, count: d.count, avgPrice: Math.round(d.total / d.count), avgM2: Math.round(d.avgM2 / d.count) }))
    .sort((a, b) => b.count - a.count).slice(0, 12);

  // Overall stats
  const allWithM2 = properties.filter(p => p.pm2 && p.pm2 > 0);
  const overallAvgM2 = allWithM2.length ? Math.round(allWithM2.reduce((a, b) => a + (b.pm2 || 0), 0) / allWithM2.length) : 0;
  const overallAvgPrice = properties.length ? Math.round(properties.reduce((a, b) => a + b.pf, 0) / properties.length) : 0;
  const medianPrice = properties.length ? [...properties].sort((a, b) => a.pf - b.pf)[Math.floor(properties.length / 2)].pf : 0;
  const uniqueRegions = new Set(properties.map(p => p.r)).size;
  const uniqueTowns = new Set(properties.map(p => p.l)).size;

  const townSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="pt-6 px-3 pb-6 md:p-8 space-y-6">

      {/* ── 1. Title Section ────────────────────────────────── */}
      <div className="text-center mb-2">
        <h2 className="text-2xl md:text-3xl font-extralight tracking-[0.25em] uppercase mb-2"
            style={{ background: 'linear-gradient(135deg, #00b9ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MARKET OVERVIEW
        </h2>
        <p className="text-[11px] md:text-xs text-gray-500 tracking-widest uppercase">
          Live analysis of {totalListings.toLocaleString()} new build properties across Spain{"'"}s costas
        </p>
      </div>

      {/* ── 2. Key Metrics Strip ────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'TOTAL LISTINGS', value: totalListings.toLocaleString() },
          { label: 'AVG PRICE', value: formatPrice(overallAvgPrice) },
          { label: 'MEDIAN PRICE', value: formatPrice(medianPrice) },
          { label: 'AVG \€/M\²', value: `\€${overallAvgM2.toLocaleString()}` },
          { label: 'TOTAL REGIONS', value: String(uniqueRegions) },
          { label: 'TOTAL TOWNS', value: String(uniqueTowns) },
        ].map(s => (
          <div key={s.label} className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-3 md:p-4 text-center">
            <div className="text-lg md:text-xl font-bold text-white">{s.value}</div>
            <div className="text-[8px] md:text-[9px] uppercase tracking-[0.15em] text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── 3. Regional Comparison Cards ─────────────────────── */}
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-3 font-semibold">Regional Comparison</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {regionData.map(r => {
            const pct = totalListings ? Math.round((r.count / totalListings) * 100) : 0;
            return (
              <div key={r.region} className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-white mb-3 tracking-wide">{regionLabel(r.region)}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Listings</span><span className="text-[#60a5fa] font-semibold">{r.count}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Avg Price</span><span className="text-[#10B981] font-semibold">{formatPrice(r.avgPrice)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Avg \€/m\²</span><span className="text-[#10B981] font-semibold">\€{r.avgM2.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Price Range</span><span className="text-gray-300 text-[11px]">{formatPrice(r.minPrice)} &ndash; {formatPrice(r.maxPrice)}</span></div>
                </div>
                {/* Proportion bar */}
                <div className="mt-3">
                  <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00b9ff, #a78bfa)' }} />
                  </div>
                  <div className="text-[9px] text-gray-600 mt-1">{pct}% of total listings</div>
                </div>
                {/* Status dots */}
                <div className="flex items-center gap-3 mt-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" /><span className="text-gray-500">{r.offPlan} off-plan</span></span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#60a5fa] inline-block" /><span className="text-gray-500">{r.building} building</span></span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a78bfa] inline-block" /><span className="text-gray-500">{r.ready} ready</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Price Distribution ────────────────────────────── */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5 md:p-6">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-5 font-semibold">Price Distribution</h3>
        <div className="flex items-end gap-2 md:gap-4 h-36 md:h-44 px-2">
          {bandData.map(b => {
            const heightPct = maxBandCount ? (b.count / maxBandCount) * 100 : 0;
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] md:text-xs text-[#10B981] font-bold mb-1">{b.count}</span>
                <div className="w-full rounded-t-md" style={{ height: `${heightPct}%`, minHeight: b.count > 0 ? '4px' : '0px', background: 'linear-gradient(180deg, #10B981, #065f46)' }} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 md:gap-4 mt-2 px-2">
          {bandData.map(b => (
            <div key={b.label} className="flex-1 text-center text-[8px] md:text-[10px] text-gray-500 leading-tight">{b.label}</div>
          ))}
        </div>
      </div>

      {/* ── 5. Property Type Breakdown ───────────────────────── */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5 md:p-6">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-5 font-semibold">Property Type Breakdown</h3>
        <div className="space-y-3">
          {typeData.map(t => {
            const pct = Math.round((t.count / totalListings) * 100);
            const widthPct = maxTypeCount ? (t.count / maxTypeCount) * 100 : 0;
            const color = typeColors[t.type] || '#60a5fa';
            return (
              <div key={t.type}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300 font-medium">{t.type}</span>
                  <span className="font-semibold" style={{ color }}>{t.count} <span className="text-gray-500 font-normal">({pct}%)</span></span>
                </div>
                <div className="h-3 bg-[#1c2333] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%`, backgroundColor: color, opacity: 0.8 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. 5-Year Growth Forecast ────────────────────────── */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5 md:p-6">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-5 font-semibold">5-Year Growth Forecast</h3>
        <div className="space-y-4">
          {regions.map(r => {
            const rate = growthRate5yr(r);
            const pct = (rate * 100).toFixed(1);
            const cumulative = ((Math.pow(1 + rate, 5) - 1) * 100).toFixed(1);
            const maxRate = 0.10;
            return (
              <div key={r}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-300 font-medium">{regionLabel(r)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#10B981] font-bold">{pct}% / yr</span>
                    <span className="text-gray-500 text-[10px]">{cumulative}% cumulative</span>
                  </div>
                </div>
                <div className="h-3 bg-[#1c2333] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(rate / maxRate) * 100}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[9px] text-gray-600 mt-4 tracking-wide">Annualised avg capital appreciation forecast. 5-yr cumulative shown in property detail view.</div>
      </div>

      {/* ── 7. Top 12 Towns Table ─────────────────────────────── */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5 md:p-6">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-5 font-semibold">Top 12 Towns by Listings</h3>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.15em] text-gray-500 border-b border-[#1c2333]">
                <th className="text-left pb-3 font-medium">#</th>
                <th className="text-left pb-3 font-medium">Town</th>
                <th className="text-right pb-3 font-medium">Listings</th>
                <th className="text-right pb-3 font-medium">Avg Price</th>
                <th className="text-right pb-3 font-medium">Avg \€/m\²</th>
                <th className="text-right pb-3 font-medium">Est. Yield</th>
              </tr>
            </thead>
            <tbody>
              {topTowns.map((t, i) => {
                const estYield = t.avgM2 > 0 ? ((t.avgM2 * 0.055) / (t.avgPrice / (t.avgPrice / t.avgM2)) * 100).toFixed(1) : null;
                return (
                  <tr key={t.town} className={`border-b border-[#1c2333]/50 hover:bg-[#1c2333]/30 transition-colors ${i % 2 === 0 ? 'bg-[#0f1419]' : 'bg-[#0d1117]'}`}>
                    <td className="py-2.5 text-gray-600 font-mono">{i + 1}</td>
                    <td className="py-2.5">
                      <Link href={`/towns/${townSlug(t.town)}`} className="text-[#60a5fa] hover:text-[#93bbfc] transition-colors font-medium">
                        {t.town}
                      </Link>
                    </td>
                    <td className="py-2.5 text-right text-white font-semibold">{t.count}</td>
                    <td className="py-2.5 text-right text-[#10B981] font-semibold">{formatPrice(t.avgPrice)}</td>
                    <td className="py-2.5 text-right text-[#10B981]">\€{t.avgM2.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-[#60a5fa]">{estYield ? `${estYield}%` : '\u2014'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {topTowns.map((t, i) => (
            <Link key={t.town} href={`/towns/${townSlug(t.town)}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 border border-[#1c2333] transition-colors hover:border-[#a78bfa]/30 ${i % 2 === 0 ? 'bg-[#0f1419]' : 'bg-[#0d1117]'}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-gray-600 text-[10px] font-mono w-4">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[#60a5fa] text-xs font-semibold truncate">{t.town}</div>
                  <div className="text-gray-500 text-[10px]">{t.count} listings</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-[#10B981] text-xs font-bold">{formatPrice(t.avgPrice)}</div>
                <div className="text-gray-500 text-[10px]">\€{t.avgM2.toLocaleString()}/m\²</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 8. Status Breakdown ──────────────────────────────── */}
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-3 font-semibold">Construction Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Off-Plan', count: totalOffPlan, color: '#10B981', desc: 'Pre-construction phase' },
            { label: 'Under Construction', count: totalBuilding, color: '#60a5fa', desc: 'Currently being built' },
            { label: 'Key Ready', count: totalReady, color: '#a78bfa', desc: 'Ready for delivery' },
          ].map(s => {
            const pct = totalListings ? Math.round((s.count / totalListings) * 100) : 0;
            const circumference = 2 * Math.PI * 36;
            const strokeDash = (pct / 100) * circumference;
            return (
              <div key={s.label} className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5 text-center">
                <div className="flex justify-center mb-3">
                  <svg width="88" height="88" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="36" fill="none" stroke="#1c2333" strokeWidth="6" />
                    <circle cx="44" cy="44" r="36" fill="none" stroke={s.color} strokeWidth="6"
                      strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`}
                      transform="rotate(-90 44 44)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                    <text x="44" y="40" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">{pct}%</text>
                    <text x="44" y="56" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="sans-serif">{s.count}</text>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-white tracking-wide">{s.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 9. Developer Scorecard ───────────────────────────── */}
      {(() => {
        const devMap: Record<string, { count: number; totalScore: number; totalDisc: number; discCount: number; totalPrice: number; regions: Set<string>; totalBeach: number; beachCount: number }> = {};
        properties.forEach(p => {
          const dev = p.d || 'Unknown';
          if (!devMap[dev]) devMap[dev] = { count: 0, totalScore: 0, totalDisc: 0, discCount: 0, totalPrice: 0, regions: new Set(), totalBeach: 0, beachCount: 0 };
          devMap[dev].count++;
          devMap[dev].totalScore += (p._sc || 0);
          devMap[dev].totalPrice += p.pf;
          devMap[dev].regions.add(p.r);
          const d = p.pm2 && p.mm2 ? (((p.mm2 - p.pm2) / p.mm2) * 100) : 0;
          if (d > 0) { devMap[dev].totalDisc += d; devMap[dev].discCount++; }
          if (p.bk !== null) { devMap[dev].totalBeach += p.bk; devMap[dev].beachCount++; }
        });
        const devs = Object.entries(devMap)
          .map(([name, d]) => ({
            name,
            count: d.count,
            avgScore: Math.round(d.totalScore / d.count),
            avgDisc: d.discCount > 0 ? (d.totalDisc / d.discCount).toFixed(1) : null,
            avgPrice: Math.round(d.totalPrice / d.count),
            regions: Array.from(d.regions),
            avgBeach: d.beachCount > 0 ? (d.totalBeach / d.beachCount).toFixed(1) : null,
          }))
          .filter(d => d.count >= 2)
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 15);

        return (
          <div className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5 md:p-6">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-5 font-semibold">Developer Scorecard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devs.map((dev, i) => (
                <div key={dev.name} className="bg-[#0d1117] border border-[#1c2333] rounded-xl p-4 hover:border-[#a78bfa]/20 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-sm font-semibold text-white truncate">{dev.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{dev.count} propert{dev.count !== 1 ? 'ies' : 'y'}</div>
                    </div>
                    <span className={`text-xl font-extrabold flex-shrink-0 ${dev.avgScore >= 70 ? 'text-[#10B981]' : dev.avgScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {dev.avgScore}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dev.avgScore}%`, background: dev.avgScore >= 70 ? '#10B981' : dev.avgScore >= 40 ? '#f59e0b' : '#f87171' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-gray-600 uppercase tracking-wide">Avg Price</div>
                      <div className="text-xs font-semibold text-white">{dev.avgPrice >= 1_000_000 ? `\€${(dev.avgPrice/1_000_000).toFixed(1)}M` : `\€${Math.round(dev.avgPrice/1000)}k`}</div>
                    </div>
                    {dev.avgDisc && (
                      <div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-wide">Avg Discount</div>
                        <div className="text-xs font-semibold text-[#10B981]">{dev.avgDisc}%</div>
                      </div>
                    )}
                    {dev.avgBeach && (
                      <div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-wide">Avg Beach</div>
                        <div className="text-xs font-semibold text-[#60a5fa]">{dev.avgBeach}km</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[9px] text-gray-600 uppercase tracking-wide">Regions</div>
                      <div className="text-xs font-semibold text-gray-300">{dev.regions.map(r => regionLabel(r)).join(', ')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── 10. Data Timestamp ───────────────────────────────── */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-gray-600 tracking-widest uppercase">
          Data last updated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &middot; {totalListings.toLocaleString()} properties indexed
        </p>
      </div>
    </div>
  );
}


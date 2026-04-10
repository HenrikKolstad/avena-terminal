'use client';

import { useState, useMemo } from 'react';
import { Property } from '@/lib/types';
import { formatPrice, scoreColor, discount, displayDiscount, discountEuros, cappedDiscountEuros } from '@/lib/scoring';

const LUXURY_THRESHOLD = 1_000_000;

export default function LuxuryTab({ properties, isPaid, onUpgrade, onPreview }: {
  properties: Property[];
  isPaid: boolean;
  onUpgrade: () => void;
  onPreview: (ref: string, lsc: number) => void;
}) {
  const [sortMode, setSortMode] = useState<'value' | 'price' | 'pm2' | 'plot'>('value');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const luxProps = properties.filter(p => p.pf >= LUXURY_THRESHOLD);

  // Luxury-segment relative scoring: compare pm2 only within luxury set
  const luxPm2s = luxProps.map(p => p.pm2 || 0).filter(x => x > 0);
  const luxAvgPm2 = luxPm2s.length ? luxPm2s.reduce((a, b) => a + b, 0) / luxPm2s.length : 5000;
  const luxMinPm2 = Math.min(...luxPm2s);
  const luxMaxPm2 = Math.max(...luxPm2s);

  function luxScore(p: Property): number {
    const pm2 = p.pm2 || 0;
    if (!pm2) return 50;
    // Value score: lower pm2 relative to luxury peers = better value
    const valueScore = Math.max(0, Math.min(100, ((luxMaxPm2 - pm2) / (luxMaxPm2 - luxMinPm2 || 1)) * 70));
    // Plot bonus: large plot/built ratio
    const plotRatio = p.pl && p.bm ? p.pl / p.bm : 1;
    const plotScore = Math.min(30, plotRatio * 5);
    // Beach bonus
    const beachScore = p.bk !== null ? Math.max(0, 15 - p.bk * 5) : 0;
    return Math.round(Math.min(99, valueScore + plotScore + beachScore));
  }

  const scored = luxProps.map(p => ({ ...p, _lsc: luxScore(p) }));

  const filtered = scored.filter(p => {
    if (regionFilter !== 'all' && p.r !== regionFilter) return false;
    if (typeFilter !== 'all' && p.t !== typeFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'value') return b._lsc - a._lsc;
    if (sortMode === 'price') return a.pf - b.pf;
    if (sortMode === 'pm2') return (a.pm2 || 0) - (b.pm2 || 0);
    if (sortMode === 'plot') return (b.pl || 0) - (a.pl || 0);
    return 0;
  });

  const avgLuxPm2 = filtered.length ? Math.round(filtered.reduce((a, b) => a + (b.pm2 || 0), 0) / filtered.length) : 0;
  const avgLuxPrice = filtered.length ? Math.round(filtered.reduce((a, b) => a + b.pf, 0) / filtered.length) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-serif text-xl md:text-2xl text-emerald-400">Luxury Portfolio</h2>
        <p className="text-gray-500 text-sm mt-1">Properties €1,000,000+ — ranked within the luxury segment only</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold font-serif text-emerald-400">{filtered.length}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Props</div>
          </div>
          <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold font-serif text-emerald-400 truncate">{formatPrice(avgLuxPrice)}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Avg Price</div>
          </div>
          <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold font-serif text-emerald-400">€{avgLuxPm2.toLocaleString()}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Avg €/m²</div>
          </div>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-col gap-3 bg-[#0f1419] border border-[#1c2333] rounded-xl px-4 py-3">
        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <span className="text-[9px] uppercase tracking-widest text-gray-500">Region</span>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
              className="w-full bg-[#08080d] border border-[#1c2333] text-gray-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-emerald-500">
              <option value="all">All Regions</option>
              <option value="cb-north">CB North</option>
              <option value="cb-south">CB South</option>
              <option value="costa-calida">Costa Cálida</option>
              <option value="costa-del-sol">Costa del Sol</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <span className="text-[9px] uppercase tracking-widest text-gray-500">Type</span>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="w-full bg-[#08080d] border border-[#1c2333] text-gray-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-emerald-500">
              <option value="all">All Types</option>
              <option value="Villa">Villa</option>
              <option value="Apartment">Apartment</option>
              <option value="Townhouse">Townhouse</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-500">Rank by</span>
          <div className="flex gap-1 flex-wrap">
            {([['value','Best Value'],['price','Price ↑'],['pm2','€/m² ↑'],['plot','Plot']] as ['value'|'price'|'pm2'|'plot', string][]).map(([k, l]) => (
              <button key={k} onClick={() => setSortMode(k)}
                className={`text-[10px] px-3 py-1.5 rounded border transition-all min-h-[36px] ${sortMode === k ? 'bg-emerald-600 border-emerald-600 text-black font-semibold' : 'border-[#1c2333] text-gray-400 hover:border-emerald-600/50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-gray-400 leading-relaxed">
        <span className="text-emerald-400 font-semibold">Luxury scoring</span> ranks these properties against each other — not the general market. Best Value = lowest €/m² within this segment, adjusted for plot size and beach proximity. A score of 85 here means excellent value <span className="italic">for a €1M+ property</span>.
      </div>

      {/* Property cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sorted.map((p, i) => {
          const plotRatio = p.pl && p.bm ? (p.pl / p.bm).toFixed(1) : null;
          const hasSeaView = p.views?.some(v => v.toLowerCase().includes('sea'));
          const hasFrontline = p.cats?.some(c => c.toLowerCase().includes('frontline') || c.toLowerCase().includes('beach'));
          const isPrivatePool = p.pool === 'private' || p.pool === 'yes';
          const scoreColor2 = p._lsc >= 70 ? 'text-emerald-400' : p._lsc >= 40 ? 'text-emerald-400' : 'text-red-400';
          const scoreBg = p._lsc >= 70 ? 'bg-emerald-400/10 border-emerald-400/30' : p._lsc >= 40 ? 'bg-emerald-400/10 border-emerald-400/30' : 'bg-red-400/10 border-red-400/30';

          return (
            <div key={p.ref || i}
              className="bg-[#0f1419] border border-[#1c2333] rounded-2xl overflow-hidden hover:border-emerald-500/40 transition-all cursor-pointer group"
              onClick={() => onPreview(p.ref || '', p._lsc)}>

              {/* Image */}
              {p.imgs && p.imgs.length > 0 ? (
                <div className="relative h-52 overflow-hidden">
                  <img src={p.imgs[0]} alt={p.p} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Rank badge */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${scoreBg} ${scoreColor2}`}>
                      #{i + 1} · {p._lsc}/100
                    </div>
                  </div>
                  {/* Feature badges */}
                  <div className="absolute top-3 right-3 flex gap-1.5 flex-wrap justify-end">
                    {hasSeaView && <span className="bg-blue-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Sea Views</span>}
                    {hasFrontline && <span className="bg-cyan-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Frontline</span>}
                    {isPrivatePool && <span className="bg-indigo-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Private Pool</span>}
                  </div>
                  {/* Price overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <div className="text-white font-bold text-xl font-serif">{formatPrice(p.pf)}</div>
                      <div className="text-gray-300 text-[11px]">{p.l}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-300 font-semibold text-sm">{p.t}</div>
                      <div className="text-gray-400 text-[10px]">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${p.s === 'off-plan' ? 'bg-emerald-500/70 text-white' : p.s === 'under-construction' ? 'bg-emerald-500/70 text-black' : 'bg-blue-500/70 text-white'}`}>
                          {p.s === 'off-plan' ? 'Off-Plan' : p.s === 'under-construction' ? 'Building' : 'Key Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-32 bg-[#0f1419] flex items-center justify-center">
                  <span className="text-gray-600 text-sm">{p.t} · {p.l}</span>
                </div>
              )}

              {/* Details */}
              <div className="p-5">
                <h3 className="text-emerald-300 font-semibold text-sm leading-snug mb-1 line-clamp-2">{p.p}</h3>
                <p className="text-gray-500 text-[11px] mb-4">Via Xavia Estate — {p.l}</p>

                {/* Key metrics grid */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wide text-gray-600 mb-0.5">€/m²</div>
                    <div className="text-sm font-bold text-white">€{(p.pm2 || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wide text-gray-600 mb-0.5">Built</div>
                    <div className="text-sm font-bold text-white">{p.bm}m²</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wide text-gray-600 mb-0.5">Plot</div>
                    <div className="text-sm font-bold text-white">{p.pl ? `${p.pl}m²` : '—'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wide text-gray-600 mb-0.5">Beds</div>
                    <div className="text-sm font-bold text-white">{p.bd || '—'}</div>
                  </div>
                </div>

                {/* Secondary metrics */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {plotRatio && <span className="text-[10px] bg-[#0f1419] border border-[#1c2333] px-2 py-1 rounded-lg text-gray-400">Plot/Built: <span className="text-white font-semibold">{plotRatio}×</span></span>}
                  {p.bk !== null && <span className="text-[10px] bg-[#0f1419] border border-[#1c2333] px-2 py-1 rounded-lg text-gray-400">Beach: <span className="text-white font-semibold">{p.bk}km</span></span>}
                  {p.ba > 0 && <span className="text-[10px] bg-[#0f1419] border border-[#1c2333] px-2 py-1 rounded-lg text-gray-400">Baths: <span className="text-white font-semibold">{p.ba}</span></span>}
                  {p.parking && p.parking > 0 ? <span className="text-[10px] bg-[#0f1419] border border-[#1c2333] px-2 py-1 rounded-lg text-gray-400">Parking: <span className="text-white font-semibold">{p.parking}</span></span> : null}
                  {p.energy && <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-emerald-500">Energy {p.energy}</span>}
                  {(() => { const de = cappedDiscountEuros(p); if (de > 0) return <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-emerald-400">~€{Math.round(de/1000)}k below market</span>; if (de < 0) return <span className="text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg text-red-400">~€{Math.round(Math.abs(de)/1000)}k above market</span>; return null; })()}
                </div>

                {/* Luxury score bar */}
                <div className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-xl border border-[#1c2333]">
                  <div className="flex-1">
                    <div className="flex justify-between text-[9px] uppercase tracking-wide text-gray-600 mb-1">
                      <span>Luxury Value Score</span>
                      <span className={scoreColor2}>{p._lsc}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#0a0a0f] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p._lsc}%`, background: p._lsc >= 70 ? '#34d399' : p._lsc >= 40 ? '#f59e0b' : '#f87171' }} />
                    </div>
                  </div>
                  <div className={`text-2xl font-extrabold font-serif ${scoreColor2}`}>{p._lsc}</div>
                </div>

                {/* CTA */}
                <a href={`mailto:henrik@xaviaestate.com?subject=${encodeURIComponent(`Inquiry: ${p.p}`)}&body=${encodeURIComponent(`Hi Avena,\n\nI'm interested in:\n\n${p.p}\nLocation: ${p.l}\nPrice: €${p.pf?.toLocaleString()}\nRef: ${p.ref || ''}\n\nPlease send me more details.\n\nBest regards`)}`}
                  onClick={e => e.stopPropagation()}
                  className="mt-3 flex items-center justify-center gap-2 py-2.5 text-xs rounded-xl hover:opacity-90 transition-all tracking-wide font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                  Contact Avena Team
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {!isPaid && (
        <div className="mt-4 p-6 bg-[#0f1419] border border-emerald-500/30 rounded-xl text-center">
          <div className="text-emerald-400 font-serif text-lg mb-1">PRO feature</div>
          <p className="text-gray-400 text-sm mb-4">Subscribe to unlock full luxury portfolio access, investment calculator, and rental yield data.</p>
          <button onClick={onUpgrade} className="px-8 py-3 rounded-lg text-sm tracking-wide font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
            Subscribe — €79/month
          </button>
        </div>
      )}
    </div>
  );
}


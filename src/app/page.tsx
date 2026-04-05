'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Property, SortKey, SortDir } from '@/lib/types';
import { loadProperties } from '@/lib/data';
import { formatPrice, scoreClass, scoreColor, regionLabel, discount, discountEuros, calcYield } from '@/lib/scoring';

type QuickFilter = '' | 'budget' | 'mid' | 'premium' | 'beach' | 'golf' | 'cashflow' | 'favs';

export default function Explorer() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState({
    region: 'all', type: 'all', status: 'all', source: 'all',
    minPrice: 0, maxPrice: 5000000, minScore: 0, minBeds: 0, query: '',
  });
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');
  const [preview, setPreview] = useState<number | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [tab, setTab] = useState<'deals' | 'yield' | 'market' | 'about'>('deals');
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    loadProperties().then(d => { setProperties(d); setLoading(false); });
    const saved = localStorage.getItem('avena_favs');
    if (saved) setFavs(JSON.parse(saved));
  }, []);

  const toggleFav = useCallback((ref: string) => {
    setFavs(prev => {
      const next = prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref];
      localStorage.setItem('avena_favs', JSON.stringify(next));
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = properties.filter(d => {
      const { region, type, status, source, minPrice, maxPrice, minScore, minBeds, query } = filters;
      if (region !== 'all' && d.r !== region) return false;
      if (type !== 'all' && d.t !== type) return false;
      if (status !== 'all' && d.s !== status) return false;
      if (d.pf > maxPrice || d.pf < minPrice) return false;
      if ((d._sc || 0) < minScore) return false;
      if (minBeds > 0 && (d.bd || 0) < minBeds) return false;
      if (source === 'curated' && d.d === 'Via Xavia Estate') return false;
      if (source === 'scraped' && d.d !== 'Via Xavia Estate') return false;
      if (query) {
        const h = (d.d + d.p + d.l + d.t + (d.f || '')).toLowerCase();
        if (!h.includes(query.toLowerCase())) return false;
      }
      if (quickFilter === 'budget' && d.pf >= 200000) return false;
      if (quickFilter === 'mid' && (d.pf < 200000 || d.pf > 400000)) return false;
      if (quickFilter === 'premium' && d.pf < 400000) return false;
      if (quickFilter === 'beach' && (d.bk === null || d.bk > 2)) return false;
      if (quickFilter === 'golf') {
        const gl = (d.l + d.p).toLowerCase();
        if (!['golf','finca','roda','serena','rosalia','condado','camposol','marquesa','vistabella','colinas','altaona'].some(k => gl.includes(k))) return false;
      }
      if (quickFilter === 'cashflow') {
        const y = calcYield(d);
        const avgP = Math.round((d.pf + (d.pt || d.pf)) / 2);
        const net = Math.round(y.annual * 0.75);
        const tc = Math.round(avgP * 1.13);
        const down = Math.round(tc * 0.3);
        const loan = tc - down;
        const rm = 0.0375 / 12;
        const n = 300;
        const mo = loan > 0 ? Math.round(loan * (rm * Math.pow(1 + rm, n)) / (Math.pow(1 + rm, n) - 1)) : 0;
        if (net - mo * 12 < 0) return false;
      }
      if (quickFilter === 'favs' && !favs.includes(d.ref || d.p)) return false;
      return true;
    });

    result.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      let va: number, vb: number;
      switch (sortKey) {
        case 'score': va = a._sc || 0; vb = b._sc || 0; break;
        case 'price': va = a.pf; vb = b.pf; break;
        case 'priceM2': va = a.pm2 || 0; vb = b.pm2 || 0; break;
        case 'marketM2': va = a.mm2; vb = b.mm2; break;
        case 'discount': va = discount(a); vb = discount(b); break;
        case 'built': va = a.bm || 0; vb = b.bm || 0; break;
        case 'plot': va = a.pl || 0; vb = b.pl || 0; break;
        case 'beds': va = a.bd || 0; vb = b.bd || 0; break;
        case 'beach': va = a.bk ?? 999; vb = b.bk ?? 999; break;
        case 'developer': return dir * a.d.localeCompare(b.d);
        case 'project': return dir * a.p.localeCompare(b.p);
        default: va = a._sc || 0; vb = b._sc || 0;
      }
      return dir * (va - vb);
    });

    return result;
  }, [properties, filters, sortKey, sortDir, quickFilter, favs]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const stats = useMemo(() => {
    if (!filtered.length) return { count: 0, avgDisc: 0, bestScore: 0 };
    const discs = filtered.map(d => discount(d)).filter(x => x > 0);
    return {
      count: filtered.length,
      avgDisc: discs.length ? Math.round(discs.reduce((a, b) => a + b, 0) / discs.length) : 0,
      bestScore: Math.max(...filtered.map(d => d._sc || 0)),
    };
  }, [filtered]);

  const previewProp = preview !== null ? filtered[preview] : null;

  // Reset image index when preview changes
  useEffect(() => { setImgIdx(0); }, [preview]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-amber-400 font-serif mb-2">AVENA</div>
          <div className="text-sm text-gray-500">Loading properties...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* TOP BAR */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#12121c] via-[#1a1520] to-[#12121c] border-b-2 border-amber-700/40 px-8 py-5 flex items-center justify-between flex-wrap gap-4 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-widest bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent">AVENA</h1>
          <p className="text-[10px] tracking-[4px] uppercase text-amber-500 mt-0.5">Estate</p>
          <p className="text-[10px] text-gray-500 italic mt-1">In partnership with <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 transition-colors">Xavia Estate</a></p>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400 font-serif">{stats.count}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Properties</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400 font-serif">{stats.avgDisc}%</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Avg Discount</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400 font-serif">{stats.bestScore}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Best Score</div>
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="bg-[#111118] border-b border-[#2a2a30] px-8 py-3 flex gap-3 flex-wrap items-end">
        <FilterSelect label="Region" value={filters.region} onChange={v => setFilters(f => ({...f, region: v}))}
          options={[['all','All Regions'],['cb-south','CB South'],['cb-north','CB North'],['costa-calida','C. Cálida']]} />
        <FilterSelect label="Type" value={filters.type} onChange={v => setFilters(f => ({...f, type: v}))}
          options={[['all','All Types'],['Villa','Villa'],['Apartment','Apartment'],['Townhouse','Townhouse'],['Bungalow','Bungalow']]} />
        <FilterSelect label="Status" value={filters.status} onChange={v => setFilters(f => ({...f, status: v}))}
          options={[['all','All'],['off-plan','Off-Plan'],['under-construction','Building'],['ready','Ready']]} />
        <FilterSelect label="Min Score" value={String(filters.minScore)} onChange={v => setFilters(f => ({...f, minScore: +v}))}
          options={[['0','Any'],['40','40+'],['50','50+'],['60','60+'],['70','70+'],['80','80+']]} />
        <FilterSelect label="Beds" value={String(filters.minBeds)} onChange={v => setFilters(f => ({...f, minBeds: +v}))}
          options={[['0','Any'],['1','1+'],['2','2+'],['3','3+'],['4','4+']]} />
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase tracking-widest text-gray-500">Search</label>
          <input type="text" value={filters.query} onChange={e => setFilters(f => ({...f, query: e.target.value}))}
            placeholder="Developer, location..."
            className="bg-[#08080d] border border-[#2a2a30] text-gray-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-amber-500 min-w-[150px]" />
        </div>
      </div>

      {/* QUICK FILTERS */}
      <div className="bg-[#111118] border-b border-[#2a2a30] px-8 py-2 flex gap-2 flex-wrap">
        {([['budget','Budget <€200k'],['mid','Mid €200-400k'],['premium','Premium €400k+'],['beach','Beach <2km'],['golf','Golf Resort'],['cashflow','Cash-Flow +'],['favs','Favorites']] as [QuickFilter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => { setQuickFilter(q => q === key ? '' : key); }}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${quickFilter === key ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-transparent border-[#2a2a30] text-gray-500 hover:text-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-0 px-8 bg-[#111118] border-b border-[#2a2a30]">
        {([['deals','Deal Rankings'],['yield','Rental Yield'],['market','Market Overview'],['about','Scoring Method']] as [typeof tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all ${tab === key ? 'text-amber-400 border-amber-400' : 'text-amber-700 border-transparent hover:text-amber-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex">
        <div className={`flex-1 transition-all ${preview !== null ? 'mr-[480px]' : ''}`}>
          {tab === 'deals' && (
            <div className="overflow-x-auto px-4 pb-6">
              <table className="w-full border-collapse min-w-[1100px]">
                <thead>
                  <tr>
                    {([['#',''],['score','Score'],['developer','Developer'],['project','Project'],['','Region'],['','Type'],['price','Price'],['priceM2','€/m²'],['marketM2','Market'],['discount','Discount'],['built','Built'],['plot','Plot'],['beds','Beds'],['beach','Beach'],['','Status']] as [SortKey|'', string][]).map(([key, label], i) => (
                      <th key={i} onClick={() => key && handleSort(key as SortKey)}
                        className={`bg-[#0e0e15] px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 text-left border-b border-[#2a2a30] cursor-pointer hover:text-amber-400 whitespace-nowrap sticky top-0 z-10 select-none ${sortKey === key ? 'text-amber-400' : ''}`}>
                        {label}{sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => {
                    const dc = discount(d);
                    const rank = i + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <tr key={d.ref || d.p + i} onClick={() => setPreview(i)}
                        className={`transition-colors cursor-pointer hover:bg-[#1c1c26] ${preview === i ? 'bg-amber-500/10 border-l-[3px] border-l-amber-500' : isTop3 ? 'bg-amber-500/[0.03]' : ''}`}>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-xs">
                          {isTop3 ? (
                            <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-extrabold text-[11px] ${rank === 1 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' : rank === 2 ? 'bg-gray-400 text-black' : 'bg-amber-700 text-white'}`}>{rank}</span>
                          ) : <span className="text-gray-600">{rank}</span>}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22]">
                          <span className={`text-base font-extrabold font-serif ${scoreClass(d._sc || 0)}`}>{d._sc}</span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-[11px] font-semibold">{d.d}</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22]">
                          <div className="text-amber-300 font-semibold text-xs">{d.p}</div>
                          <div className="text-gray-500 text-[11px]">{d.l}</div>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${d.r === 'cb-south' ? 'bg-blue-500/10 text-blue-400' : d.r === 'cb-north' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {regionLabel(d.r)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${d.t === 'Villa' ? 'bg-purple-500/10 text-purple-400' : d.t === 'Townhouse' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-blue-500/10 text-blue-400'}`}>
                            {d.t}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] font-bold text-[13px]">{formatPrice(d.pf)}</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-xs text-gray-400">{d.pm2 ? `€${d.pm2}` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-xs text-gray-400">€{d.mm2}</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22]">
                          {(() => {
                            const de = discountEuros(d);
                            return dc >= 0 ? (
                              <div>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${dc >= 15 ? 'bg-emerald-500/15 text-emerald-400' : dc >= 5 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-500/5 text-emerald-200'}`}>
                                  -{dc.toFixed(0)}%
                                </span>
                                {de > 0 && <div className="text-[9px] text-emerald-500/70 mt-0.5">-€{(de/1000).toFixed(0)}k</div>}
                              </div>
                            ) : (
                              <div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
                                  +{Math.abs(dc).toFixed(0)}%
                                </span>
                                {de < 0 && <div className="text-[9px] text-red-500/70 mt-0.5">+€{(Math.abs(de)/1000).toFixed(0)}k</div>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-xs">{d.bm}m²</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-xs text-gray-400">{d.pl ? `${d.pl}m²` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-xs">{d.bd}</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22] text-xs text-gray-400">{d.bk !== null ? `${d.bk}km` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#1a1a22]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${d.s === 'off-plan' ? 'bg-emerald-500/12 text-emerald-400' : d.s === 'under-construction' ? 'bg-amber-500/12 text-amber-400' : 'bg-blue-500/12 text-blue-400'}`}>
                            {d.s === 'off-plan' ? 'Off-Plan' : d.s === 'under-construction' ? 'Building' : 'Ready'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'yield' && <YieldTab properties={filtered} />}
          {tab === 'market' && <MarketTab properties={filtered} />}
          {tab === 'about' && <AboutTab />}
        </div>

        {/* PREVIEW PANEL */}
        {previewProp && (
          <div className="fixed top-0 right-0 w-[480px] h-screen bg-[#111118] border-l border-amber-500/25 z-[300] overflow-y-auto shadow-2xl animate-slide-in">
            <button onClick={() => setPreview(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full border border-[#2a2a30] text-gray-400 hover:text-amber-400 hover:border-amber-400 flex items-center justify-center z-10 bg-black/50">×</button>
            {/* IMAGE GALLERY */}
            {previewProp.imgs && previewProp.imgs.length > 0 ? (
              <div className="relative w-full h-60 bg-[#18181f]">
                <img src={previewProp.imgs[imgIdx] || previewProp.imgs[0]} alt={previewProp.p}
                  className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {previewProp.imgs.length > 1 && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + previewProp.imgs!.length) % previewProp.imgs!.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-amber-500/80 transition-all">‹</button>
                    <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % previewProp.imgs!.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-amber-500/80 transition-all">›</button>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">{imgIdx + 1}/{previewProp.imgs.length}</div>
                  </>
                )}
                {/* Status badge */}
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold ${previewProp.s === 'off-plan' ? 'bg-emerald-500/90 text-white' : previewProp.s === 'ready' ? 'bg-blue-500/90 text-white' : 'bg-amber-500/90 text-black'}`}>
                  {previewProp.s === 'off-plan' ? 'Off-Plan' : previewProp.s === 'ready' ? 'Key Ready' : 'Under Construction'}
                </div>
              </div>
            ) : (
              <div className="w-full h-60 bg-[#18181f] flex items-center justify-center">
                <div className="text-gray-500 text-sm">{previewProp.t} in {previewProp.l}</div>
              </div>
            )}
            {/* Image thumbnails */}
            {previewProp.imgs && previewProp.imgs.length > 1 && (
              <div className="flex gap-1 px-4 py-2 overflow-x-auto bg-[#18181f] border-b border-[#2a2a30]">
                {previewProp.imgs.slice(0, 10).map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-14 h-10 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${imgIdx === i ? 'border-amber-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-6">
              <h2 className="font-serif text-xl text-amber-300 mb-1">{previewProp.p}</h2>
              <p className="text-gray-500 text-sm mb-4">{previewProp.l}</p>

              <div className="flex items-center gap-4 mb-5 p-4 bg-[#18181f] rounded-lg border border-[#2a2a30]">
                <span className={`text-4xl font-extrabold font-serif ${scoreClass(previewProp._sc || 0)}`}>{previewProp._sc}</span>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">Deal Score</div>
                  <div className="h-1.5 bg-[#1e1e28] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${previewProp._sc}%`, background: scoreColor(previewProp._sc || 0) }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <StatBox label="Price" value={formatPrice(previewProp.pf)} />
                <StatBox label="€/m²" value={`€${previewProp.pm2 || '-'}`} />
                <StatBox label="Built Area" value={`${previewProp.bm}m²`} />
                <StatBox label="Plot" value={previewProp.pl ? `${previewProp.pl}m²` : '-'} />
                <StatBox label="Bedrooms" value={String(previewProp.bd)} />
                <StatBox label="Beach" value={previewProp.bk !== null ? `${previewProp.bk}km` : '-'} />
                {previewProp._yield && (
                  <>
                    <StatBox label="Rental Yield" value={`${previewProp._yield.gross}%`} />
                    <StatBox label="Annual Income" value={formatPrice(previewProp._yield.annual)} />
                  </>
                )}
              </div>

              {previewProp.f && (
                <div className="mb-5">
                  <h4 className="text-[11px] uppercase tracking-widest text-amber-500 mb-2">Description</h4>
                  <p className="text-sm leading-relaxed text-gray-300">{previewProp.f}</p>
                </div>
              )}

              {/* TAGS: categories, views, features */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {previewProp.cats?.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{c}</span>
                ))}
                {previewProp.views?.map(v => (
                  <span key={v} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">{v} views</span>
                ))}
                {previewProp.pool && previewProp.pool !== 'no' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{previewProp.pool} pool</span>
                )}
                {previewProp.parking && previewProp.parking > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">{previewProp.parking} parking</span>
                )}
                {previewProp.energy && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Energy {previewProp.energy}</span>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => toggleFav(previewProp.ref || previewProp.p)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${favs.includes(previewProp.ref || previewProp.p) ? 'border-amber-500 text-amber-400' : 'border-[#2a2a30] text-gray-400 hover:text-amber-400'}`}>
                  {favs.includes(previewProp.ref || previewProp.p) ? 'Remove Favorite' : 'Add to Favorites'}
                </button>
              </div>

              <a href={previewProp.u} target="_blank" rel="noopener noreferrer"
                onClick={() => {
                  fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      property_ref: previewProp.ref,
                      property_name: previewProp.p,
                      property_price: previewProp.pf,
                      developer: previewProp.d,
                      action: 'click_contact',
                    }),
                  }).catch(() => {});
                }}
                className="block text-center py-3 bg-gradient-to-r from-amber-600 to-amber-400 text-black font-bold text-sm rounded-lg hover:from-amber-500 hover:to-amber-300 transition-all tracking-wide">
                View on Xavia Estate →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[][];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] uppercase tracking-widest text-gray-500">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="bg-[#08080d] border border-[#2a2a30] text-gray-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-amber-500 min-w-[130px]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#18181f] border border-[#2a2a30] rounded-lg p-3 text-center">
      <div className="text-lg font-bold font-serif">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function YieldCard({ d, expanded, onToggle }: { d: Property; expanded: boolean; onToggle: () => void }) {
  const [downPct, setDownPct] = useState(30);
  if (!d._yield) return null;

  const net = Math.round(d._yield.annual * 0.75);
  const netYield = ((net / d.pf) * 100).toFixed(1);
  const buyFee = Math.round(d.pf * 0.13);
  const totalCost = d.pf + buyFee;
  const downPayment = Math.round(totalCost * (downPct / 100));
  const loanAmt = totalCost - downPayment;
  const rate = 0.0375 / 12;
  const n = 25 * 12;
  const mortgageMo = loanAmt > 0 ? Math.round(loanAmt * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1)) : 0;
  const annualCashflow = net - mortgageMo * 12;
  const cashOnCash = downPayment > 0 ? ((annualCashflow / downPayment) * 100).toFixed(1) : '0';

  const srcIcon = d._yield.src?.toLowerCase().includes('airbnb') ? '🏠' : d._yield.src?.toLowerCase().includes('resort') ? '🏨' : '📊';

  return (
    <div
      className={`bg-[#111118] border rounded-lg overflow-hidden transition-all cursor-pointer ${expanded ? 'border-amber-500' : 'border-[#2a2a30] hover:border-amber-500/40'}`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1 pr-2">
            <div className="text-amber-300 font-semibold text-sm leading-tight">{d.p}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Via Xavia Estate — {d.l}</div>
            {d.u && (
              <a href={d.u} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] text-amber-500 hover:text-amber-300 underline mt-0.5 block">
                View property ↗
              </a>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${(d._yield.gross || 0) >= 7 ? 'text-emerald-400' : (d._yield.gross || 0) >= 5 ? 'text-amber-400' : 'text-gray-400'}`}>
              {d._yield.gross}%
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Gross Yield</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#1e1e28]">
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Avg Night</div>
            <div className="text-sm font-bold">€{d._yield.rate}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Annual Gross</div>
            <div className="text-sm font-bold">{formatPrice(d._yield.annual)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Annual Net</div>
            <div className="text-sm font-bold text-emerald-400">{formatPrice(net)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Avg Price</div>
            <div className="text-sm font-bold">{formatPrice(d.pf)}</div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          <div className="text-[9px] text-gray-600">
            {d.t} · {d.bd}bed · {d._yield.weeks}wk
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px]">{srcIcon}</span>
            <span className="text-[9px] text-gray-600">{d._yield.src}</span>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-gray-500">Net Yield</div>
            <div className="text-sm font-bold text-emerald-400">{netYield}%</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#2a2a30] p-4 bg-[#0d0d14]" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-semibold text-amber-400">Investment Calculator</div>
            <div className="text-[10px] text-gray-500">3.75% eff. interest · 25yr term</div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Down Payment</span>
              <span className="text-amber-400 font-bold">{downPct}%</span>
            </div>
            <input
              type="range" min={10} max={100} step={5} value={downPct}
              onChange={e => setDownPct(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Down Payment</div>
              <div className="text-sm font-bold text-amber-400">{formatPrice(downPayment)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Mortgage/Mo</div>
              <div className="text-sm font-bold">{formatPrice(mortgageMo)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Annual Cashflow</div>
              <div className={`text-sm font-bold ${annualCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPrice(annualCashflow)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Total Cost (13%)</div>
              <div className="text-sm font-bold">{formatPrice(totalCost)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Loan Amount</div>
              <div className="text-sm font-bold">{formatPrice(loanAmt)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Cash-on-Cash</div>
              <div className={`text-sm font-bold ${Number(cashOnCash) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{cashOnCash}%</div>
            </div>
          </div>

          {d.u && (
            <a href={d.u} target="_blank" rel="noopener noreferrer"
              className="mt-3 block text-center text-xs bg-amber-600 hover:bg-amber-500 text-black font-semibold py-2 rounded transition-colors">
              View on Xavia Estate →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function YieldTab({ properties }: { properties: Property[] }) {
  const [sortMode, setSortMode] = useState<'yield' | 'income' | 'price'>('yield');
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  const sorted = [...properties].filter(p => p._yield).sort((a, b) => {
    if (sortMode === 'yield') return (b._yield?.gross || 0) - (a._yield?.gross || 0);
    if (sortMode === 'income') return (b._yield?.annual || 0) - (a._yield?.annual || 0);
    return a.pf - b.pf;
  });

  return (
    <div className="p-6">
      {/* Three info boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-widest text-amber-600 font-bold mb-2">How It Works</div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Each property is matched to <span className="text-white">real Airbnb/Booking.com data</span> from its exact area. Nightly rates are annual averages across high, mid, and low seasons — not just the peak summer price agents show you.
          </p>
        </div>
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-widest text-amber-600 font-bold mb-2">What&apos;s Included in Net (−25%)</div>
          <ul className="text-[11px] text-gray-400 space-y-0.5">
            <li>Airbnb platform fee <span className="text-gray-500">(14%)</span></li>
            <li>Cleaning <span className="text-gray-500">(~€35/turnover)</span></li>
            <li>IBI property tax + Insurance</li>
            <li>Community fees</li>
            <li>Utilities <span className="text-gray-500">(water, electric)</span></li>
            <li>Maintenance <span className="text-gray-500">(~€500/yr)</span></li>
          </ul>
        </div>
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-widest text-red-600 font-bold mb-2">Not Included</div>
          <ul className="text-[11px] text-gray-400 space-y-0.5">
            <li>Spanish income tax <span className="text-gray-500">(19% IRNR for non-residents on net rental profit)</span></li>
            <li>Tourist license <span className="text-gray-500">(€250–500, one-time)</span></li>
            <li>Furnishing costs <span className="text-gray-500">(~€5–15k)</span></li>
            <li>Home country tax <span className="text-gray-500">(varies)</span></li>
            <li>Mortgage interest <span className="text-gray-500">(see calculator)</span></li>
          </ul>
        </div>
      </div>

      {/* Source bar + Sort */}
      <div className="flex flex-wrap justify-between items-center bg-[#111118] border border-[#2a2a30] rounded-lg px-4 py-2 mb-4 gap-2">
        <div className="text-[10px] text-gray-500">
          <span className="text-gray-400">Sources:</span> AirDNA, Airbtics, Vrbo, Booking.com (2025–2026 data) &bull;{' '}
          <span className="text-gray-400">Occupancy:</span> 16–24 weeks/year based on beach distance &bull;{' '}
          <span className="text-gray-400">Self-managed model</span> (no management company)
        </div>
        <div className="flex gap-2">
          {([['yield', 'By Yield %'], ['income', 'By Income €'], ['price', 'By Price']] as ['yield' | 'income' | 'price', string][]).map(([key, label]) => (
            <button key={key} onClick={() => setSortMode(key)}
              className={`text-[10px] px-3 py-1 rounded border transition-all ${sortMode === key ? 'bg-amber-600 border-amber-600 text-black font-semibold' : 'border-[#2a2a30] text-gray-400 hover:border-amber-600/50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <h2 className="font-serif text-xl text-amber-400 mb-4">Estimated Rental Yield</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.slice(0, 30).map((d, i) => (
          <YieldCard
            key={d.ref || i}
            d={d}
            expanded={expandedRef === (d.ref || String(i))}
            onToggle={() => setExpandedRef(expandedRef === (d.ref || String(i)) ? null : (d.ref || String(i)))}
          />
        ))}
      </div>
    </div>
  );
}

function MarketTab({ properties }: { properties: Property[] }) {
  const regions = ['cb-south', 'cb-north', 'costa-calida'];
  const regionData = regions.map(r => {
    const props = properties.filter(p => p.r === r);
    const avgPrice = props.length ? Math.round(props.reduce((a, b) => a + b.pf, 0) / props.length) : 0;
    const avgM2 = props.length ? Math.round(props.reduce((a, b) => a + (b.pm2 || 0), 0) / props.length) : 0;
    return { region: r, count: props.length, avgPrice, avgM2 };
  });
  const maxPrice = Math.max(...regionData.map(r => r.avgPrice));

  return (
    <div className="p-8">
      <h2 className="font-serif text-xl text-amber-400 mb-4">Market Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Average Price by Region</h3>
          {regionData.map(r => (
            <div key={r.region} className="flex items-center gap-3 mb-2">
              <span className="w-24 text-right text-xs">{regionLabel(r.region)}</span>
              <div className="flex-1 h-6 bg-[#1e1e28] rounded overflow-hidden">
                <div className="h-full bg-amber-500/60 rounded" style={{ width: `${maxPrice ? (r.avgPrice / maxPrice) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-24">{formatPrice(r.avgPrice)}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Properties by Region</h3>
          {regionData.map(r => (
            <div key={r.region} className="flex items-center gap-3 mb-2">
              <span className="w-24 text-right text-xs">{regionLabel(r.region)}</span>
              <div className="flex-1 h-6 bg-[#1e1e28] rounded overflow-hidden">
                <div className="h-full bg-blue-500/60 rounded" style={{ width: `${properties.length ? (r.count / properties.length) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-16">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-6">
        <h3 className="font-serif text-lg text-amber-400 mb-3">How the AVENA Deal Score Works</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">
          Each property is scored 0-100 based on five weighted factors designed to identify the best investment opportunities:
        </p>
        <div className="space-y-3">
          <ScoreFactor title="Price vs Market (40%)" desc="Compares the property's €/m² against regional market averages. Bigger discounts = higher scores." />
          <ScoreFactor title="Off-Plan Potential (20%)" desc="Off-plan properties score higher due to capital appreciation potential during construction. Later completion dates score even higher." />
          <ScoreFactor title="Value Density (15%)" desc="For plots: price per m² of land. For apartments: built area relative to price. More space per euro = better." />
          <ScoreFactor title="Location Premium (15%)" desc="Beach proximity is a key driver. Properties under 500m from the coast get maximum points." />
          <ScoreFactor title="Developer Track Record (10%)" desc="Established developers (30+ years) score higher, reducing construction and quality risk." />
        </div>
      </div>
    </div>
  );
}

function ScoreFactor({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#18181f] rounded-lg p-3">
      <h4 className="text-amber-300 text-sm font-semibold mb-1">{title}</h4>
      <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

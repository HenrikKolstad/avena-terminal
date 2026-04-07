'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Property, SortKey, SortDir } from '@/lib/types';
import { loadProperties } from '@/lib/data';
import { formatPrice, scoreClass, scoreColor, regionLabel, discount, discountEuros, calcYield } from '@/lib/scoring';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/lib/translations';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type QuickFilter = '' | 'budget' | 'mid' | 'premium' | 'beach' | 'golf' | 'cashflow' | 'favs';

interface AiMemoResult {
  verdict: 'BUY' | 'CONSIDER' | 'PASS';
  confidence: number;
  headline: string;
  price_prediction: {
    year1: number;
    year3: number;
    year5: number;
    rationale: string;
  };
  strengths: string[];
  risks: string[];
  yield_outlook: string;
  market_context: string;
  comparable_position: string;
  recommendation: string;
}

const LUXURY_THRESHOLD = 1_000_000;

// Free tier limits
const FREE_DEALS_LIMIT = 5;
const FREE_YIELD_LIMIT = 3;

// 5-year market value forecast helper
function growthRate5yr(region: string): number {
  const r = (region || '').toLowerCase();
  if (r.includes('marbella') || r.includes('costa del sol') || r.includes('estepona') || r.includes('benahavis')) return 0.09;
  if (r.includes('javea') || r.includes('altea') || r.includes('moraira') || r.includes('denia') || r.includes('cb-north')) return 0.085;
  if (r.includes('mallorca') || r.includes('ibiza') || r.includes('balear')) return 0.10;
  if (r.includes('barcelona') || r.includes('sitges')) return 0.065;
  if (r.includes('valencia')) return 0.07;
  if (r.includes('torrevieja') || r.includes('cb-south') || r.includes('alicante')) return 0.065;
  return 0.075;
}
function profit5yr(pf: number, region: string): number {
  return Math.round(pf * Math.pow(1 + growthRate5yr(region), 5) - pf);
}

export default function Explorer() {
  const { user, isPaid, loading: authLoading, signInWithEmail, signOut, startCheckout } = useAuth();
  const { lang, setLang, t } = useLanguage();
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
  const [previewLuxScore, setPreviewLuxScore] = useState<number | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [tab, setTab] = useState<'deals' | 'yield' | 'portfolio' | 'map' | 'market' | 'luxury' | 'about' | 'legal' | 'contact'>('deals');
  const [imgIdx, setImgIdx] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authSent, setAuthSent] = useState(false);
  const [authLoading2, setAuthLoading2] = useState(false);
  const [showWelcomePro, setShowWelcomePro] = useState(false);
  const [paywallEmail, setPaywallEmail] = useState('');
  const [paywallLoading, setPaywallLoading] = useState(false);
  // AI Memo state
  const [aiMemo, setAiMemo] = useState<AiMemoResult | null>(null);
  const [aiMemoLoading, setAiMemoLoading] = useState(false);
  const [aiMemoError, setAiMemoError] = useState<string | null>(null);
  // Notes state (Supabase)
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  // Portfolio state
  const [portfolio, setPortfolio] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('avena_portfolio');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    loadProperties().then(d => { setProperties(d); setLoading(false); });
    const saved = localStorage.getItem('avena_favs');
    if (saved) setFavs(JSON.parse(saved));
    // Handle Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      window.history.replaceState({}, '', '/');
      setShowWelcomePro(true);
      setTimeout(() => setShowWelcomePro(false), 8000);
      if (!user) setShowAuthModal(true);
    }
  }, []);

  const toggleFav = useCallback((ref: string) => {
    setFavs(prev => {
      const next = prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref];
      localStorage.setItem('avena_favs', JSON.stringify(next));
      return next;
    });
  }, []);

  const togglePortfolio = useCallback((ref: string) => {
    setPortfolio(prev => {
      const next = prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref];
      localStorage.setItem('avena_portfolio', JSON.stringify(next));
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

  // Reset image index and AI memo when preview changes
  useEffect(() => {
    setImgIdx(0);
    setAiMemo(null);
    setAiMemoError(null);
    setNote('');
    setNoteSaved(false);
  }, [preview]);

  // Load note for current preview property from Supabase
  useEffect(() => {
    if (!user || !previewProp || !supabase) return;
    const ref = previewProp.ref || previewProp.p;
    supabase
      .from('notes')
      .select('note')
      .eq('property_ref', ref)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.note) setNote(data.note);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewProp?.ref, user?.id]);

  const exportCSV = () => {
    const headers = ['Project','Developer','Location','Region','Type','Price','€/m²','Market €/m²','Discount%','Score','Built m²','Plot m²','Beds','Beach km','Status','Completion','Yield%'];
    const rows = filtered.map(d => [
      d.p, d.d, d.l, regionLabel(d.r), d.t,
      d.pf, d.pm2 || '', d.mm2,
      discount(d).toFixed(1),
      d._sc || '',
      d.bm || '', d.pl || '', d.bd || '',
      d.bk !== null ? d.bk : '',
      d.s, d.c,
      d._yield ? d._yield.gross : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'avena-properties.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const fetchAiMemo = async () => {
    if (!previewProp) return;
    setAiMemoLoading(true);
    setAiMemoError(null);
    setAiMemo(null);
    try {
      const comparables = properties
        .filter(p => p.r === previewProp.r && (p.ref || p.p) !== (previewProp.ref || previewProp.p))
        .sort((a, b) => Math.abs(a.pf - previewProp.pf) - Math.abs(b.pf - previewProp.pf))
        .slice(0, 5);
      const res = await fetch('/api/ai/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: previewProp, comparables }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiMemo(data);
    } catch {
      setAiMemoError('Failed to generate analysis. Please try again.');
    } finally {
      setAiMemoLoading(false);
    }
  };

  const saveNote = async () => {
    if (!user || !previewProp || !supabase) return;
    setNoteSaving(true);
    const ref = previewProp.ref || previewProp.p;
    await supabase.from('notes').upsert(
      { user_id: user.id, property_ref: ref, note, created_at: new Date().toISOString() },
      { onConflict: 'user_id,property_ref' }
    );
    setNoteSaving(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070709' }}>
        <div className="text-center">
          <div className="text-5xl font-bold font-serif tracking-[0.3em] mb-3" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c96a, #c9a84c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AVENA</div>
          <div className="text-[10px] tracking-[6px] uppercase text-[#c9a84c]/40 mb-8">ESTATE</div>
          <div className="text-xs text-gray-600 tracking-widest">Loading properties...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709]">
      {/* TOP BAR */}
      <header className="relative sticky top-0 z-50 border-b border-[#1a1a24] px-4 md:px-8 py-3 md:py-6 shadow-2xl" style={{ background: 'linear-gradient(180deg, #0f0e18 0%, #0a0a12 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, #c9a84c 30%, #e8c96a 50%, #c9a84c 70%, transparent 100%)' }} />

        {/* MOBILE HEADER */}
        <div className="flex md:hidden items-center justify-between gap-3">
          <a href="/" className="flex-shrink-0">
            <h1 className="text-2xl font-bold font-serif tracking-[0.2em] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent">AVENA</h1>
            <p className="text-[8px] tracking-[5px] uppercase text-[#c9a84c]/60 font-light">Estate</p>
          </a>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400 font-serif leading-none">{stats.count}</div>
              <div className="text-[8px] uppercase tracking-widest text-gray-600">Props</div>
            </div>
            <div className="text-center border-l border-[#1a1a24] pl-2">
              <div className="text-lg font-bold text-amber-400 font-serif leading-none">{stats.avgDisc}%</div>
              <div className="text-[8px] uppercase tracking-widest text-gray-600">Disc</div>
            </div>
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2 border-l border-[#1a1a24] pl-2">
                  {isPaid ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'linear-gradient(135deg, #c9a84c22, #c9a84c44)', border: '1px solid rgba(201,168,76,0.5)', color: '#c9a84c' }}>PRO</span>
                  ) : (
                    <button onClick={() => setShowPaywall(true)} className="text-[10px] bg-amber-600 text-black font-bold px-2.5 py-1 rounded-lg">Go PRO</button>
                  )}
                  <button onClick={signOut} className="text-[10px] text-gray-600">↩</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 border-l border-[#1a1a24] pl-2">
                  <button onClick={() => setShowAuthModal(true)} className="text-[10px] border border-[#c9a84c]/40 text-[#c9a84c]/80 font-semibold px-2 py-1 rounded-lg">In</button>
                  <button onClick={() => setShowPaywall(true)} className="text-[10px] text-black font-bold px-2.5 py-1 rounded-lg" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>PRO</button>
                </div>
              )
            )}
          </div>
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* LEFT — logo */}
          <div className="flex-shrink-0">
            <a href="/" className="block cursor-pointer">
              <h1 className="text-4xl font-bold font-serif tracking-[0.2em] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">AVENA</h1>
              <p className="text-[9px] tracking-[6px] uppercase text-[#c9a84c]/60 mt-0.5 font-light">Estate</p>
            </a>
            <div className="text-[10px] text-gray-600 mt-2 leading-relaxed">
              <div>{t.hero_scanner}</div>
            </div>
            <p className="text-[9px] text-gray-700 mt-1.5 flex items-center gap-1 flex-wrap">
              <span>With</span>
              <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#F5A623' }}>Xavia Estate</a>
              <span>&amp;</span>
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#635BFF' }}>Stripe</a>
            </p>
          </div>

          {/* CENTER — hero punchlines */}
          <div className="hidden lg:flex flex-col gap-2 flex-1 max-w-md mx-auto text-center">
            <div className="text-lg xl:text-xl font-semibold leading-snug text-gray-200">{t.hero_line1}</div>
            <div className="h-px w-16 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />
            <div className="text-lg xl:text-xl font-semibold leading-snug text-gray-200">{t.hero_line2}</div>
          </div>

          {/* RIGHT — stats + auth */}
          <div className="flex gap-5 items-center flex-shrink-0">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400 font-serif">{stats.count}</div>
              <div className="text-[9px] uppercase tracking-widest text-gray-500">Properties</div>
            </div>
            <div className="text-center border-l border-[#1a1a24] pl-6">
              <div className="text-3xl font-bold text-amber-400 font-serif">{stats.avgDisc}%</div>
              <div className="text-[9px] uppercase tracking-widest text-gray-500">Avg Discount</div>
            </div>
            <div className="text-center border-l border-[#1a1a24] pl-6">
              <div className="text-3xl font-bold text-amber-400 font-serif">{stats.bestScore}</div>
              <div className="text-[9px] uppercase tracking-widest text-gray-500">Best Score</div>
            </div>
            <div className="ml-4">
              {!authLoading && (
                user ? (
                  <div className="flex items-center gap-3">
                    {isPaid ? (
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide" style={{ background: 'linear-gradient(135deg, #c9a84c22, #c9a84c44)', border: '1px solid rgba(201,168,76,0.5)', color: '#c9a84c' }}>PRO</span>
                    ) : (
                      <button onClick={() => setShowPaywall(true)} className="text-[11px] bg-amber-600 hover:bg-amber-500 text-black font-bold px-3 py-1.5 rounded-lg transition-colors">Upgrade →</button>
                    )}
                    <button onClick={signOut} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">{t.btn_signout}</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAuthModal(true)} className="text-[11px] border border-[#c9a84c]/40 text-[#c9a84c]/80 hover:border-[#c9a84c] hover:text-[#c9a84c] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">{t.btn_signin}</button>
                    <button onClick={() => setShowPaywall(true)} className="text-[11px] text-black font-bold px-4 py-1.5 rounded-lg whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>{t.btn_subscribe}</button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* FILTER BAR — desktop: single row, mobile: 2-row grid */}
      <div className="bg-[#0a0a12] border-b border-[#1a1a24] px-3 md:px-8 py-2">
        {/* Mobile filters */}
        <div className="md:hidden">
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <FilterSelect label="Region" value={filters.region} onChange={v => setFilters(f => ({...f, region: v}))}
              options={[['all',t.filter_all_regions],['cb-south',t.filter_cb_south],['cb-north',t.filter_cb_north],['costa-calida',t.filter_calida]]} />
            <FilterSelect label="Type" value={filters.type} onChange={v => setFilters(f => ({...f, type: v}))}
              options={[['all',t.filter_all_types],['Villa','Villa'],['Apartment','Apartment'],['Townhouse','Townhouse'],['Bungalow','Bungalow']]} />
            <FilterSelect label="Status" value={filters.status} onChange={v => setFilters(f => ({...f, status: v}))}
              options={[['all',t.filter_all_status],['off-plan',t.filter_offplan],['under-construction',t.filter_construction],['ready',t.filter_ready]]} />
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="flex-1">
              <input type="text" value={filters.query} onChange={e => setFilters(f => ({...f, query: e.target.value}))}
                placeholder={t.search_placeholder}
                className="w-full text-gray-300 px-3 py-1.5 rounded-md text-xs outline-none"
                style={{ background: '#0d0d16', border: '1px solid #1e1e28' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#c9a84c'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e1e28'; }} />
            </div>
            {/* Language flags on mobile */}
            <div className="flex items-center gap-0.5">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} title={l.label}
                  className={`text-base leading-none transition-all ${lang === l.code ? 'opacity-100' : 'opacity-30'}`}>
                  {l.flag}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Desktop filters */}
        <div className="hidden md:flex gap-2 overflow-x-auto items-end scrollbar-none py-0.5">
          <FilterSelect label="Region" value={filters.region} onChange={v => setFilters(f => ({...f, region: v}))}
            options={[['all',t.filter_all_regions],['cb-south',t.filter_cb_south],['cb-north',t.filter_cb_north],['costa-calida',t.filter_calida]]} />
          <FilterSelect label="Type" value={filters.type} onChange={v => setFilters(f => ({...f, type: v}))}
            options={[['all',t.filter_all_types],['Villa','Villa'],['Apartment','Apartment'],['Townhouse','Townhouse'],['Bungalow','Bungalow']]} />
          <FilterSelect label="Status" value={filters.status} onChange={v => setFilters(f => ({...f, status: v}))}
            options={[['all',t.filter_all_status],['off-plan',t.filter_offplan],['under-construction',t.filter_construction],['ready',t.filter_ready]]} />
          <FilterSelect label="Min Score" value={String(filters.minScore)} onChange={v => setFilters(f => ({...f, minScore: +v}))}
            options={[['0','Any'],['40','40+'],['50','50+'],['60','60+'],['70','70+'],['80','80+']]} />
          <FilterSelect label="Beds" value={String(filters.minBeds)} onChange={v => setFilters(f => ({...f, minBeds: +v}))}
            options={[['0','Any'],['1','1+'],['2','2+'],['3','3+'],['4','4+']]} />
          <div className="flex flex-col gap-1">
            <label className="text-[8px] tracking-[2px] text-gray-600 uppercase">Search</label>
            <input type="text" value={filters.query} onChange={e => setFilters(f => ({...f, query: e.target.value}))}
              placeholder={t.search_placeholder}
              className="text-gray-300 px-3 py-1.5 rounded-md text-xs outline-none min-w-[150px]"
              style={{ background: '#0a0a12', border: '1px solid #1e1e28' }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#c9a84c'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e1e28'; }} />
          </div>
          {/* Language switcher */}
          <div className="flex flex-col gap-1">
            <label className="text-[8px] tracking-[2px] text-gray-600 uppercase opacity-0">Lang</label>
            <div className="flex items-center gap-1">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} title={l.label}
                  className={`text-lg leading-none transition-all hover:scale-110 ${lang === l.code ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-70'}`}>
                  {l.flag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-auto">
            <label className="text-[9px] uppercase tracking-widest text-gray-500 opacity-0">x</label>
            <button onClick={exportCSV}
              className="bg-[#18181f] border border-[#2a2a30] hover:border-amber-500/50 text-gray-400 hover:text-amber-400 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap">
              Export CSV ↓
            </button>
          </div>
        </div>
      </div>

      {/* QUICK FILTERS */}
      <div className="bg-[#070709] border-b border-[#1a1a24] px-4 md:px-8 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
        {([['budget','Budget <€200k'],['mid','Mid €200-400k'],['premium','Premium €400k+'],['beach','Beach <2km'],['golf','Golf Resort'],['cashflow','Cash-Flow +'],['favs','Favorites']] as [QuickFilter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => { setQuickFilter(q => q === key ? '' : key); }}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${quickFilter === key ? 'bg-[#c9a84c]/15 border-[#c9a84c]/60 text-[#c9a84c]' : 'bg-transparent border-[#1f1f28] text-gray-600 hover:border-[#c9a84c]/30 hover:text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TABS — mobile: wrapping grid, desktop: scrollable row */}
      <div className="bg-[#070709] border-b border-[#1a1a24]">
        {/* Mobile */}
        <div className="md:hidden flex flex-wrap px-2 pt-1 pb-0">
          {([[`deals`,t.tab_deals],[`yield`,t.tab_yield],[`portfolio`,t.tab_portfolio],[`luxury`,t.tab_luxury],[`map`,t.tab_map],[`market`,t.tab_market],[`about`,t.tab_scoring],[`legal`,t.tab_legal],[`contact`,t.tab_contact]] as [typeof tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-2 text-[10px] font-semibold tracking-wide border-b-2 transition-all ${tab === key ? 'text-[#c9a84c] border-[#c9a84c]' : 'text-gray-600 border-transparent hover:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* Desktop */}
        <div className="hidden md:flex gap-0 px-8 overflow-x-auto scrollbar-none">
          {([[`deals`,t.tab_deals],[`yield`,t.tab_yield],[`portfolio`,t.tab_portfolio],[`luxury`,t.tab_luxury],[`map`,t.tab_map],[`market`,t.tab_market],[`about`,t.tab_scoring],[`legal`,t.tab_legal],[`contact`,t.tab_contact]] as [typeof tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-shrink-0 whitespace-nowrap px-5 py-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all ${tab === key ? 'text-[#c9a84c] border-[#c9a84c]' : 'text-gray-600 border-transparent hover:text-gray-400'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex">
        <div className={`flex-1 transition-all ${preview !== null ? 'md:mr-[480px]' : ''}`}>
          {tab === 'deals' && (
            <>
            {/* MOBILE CARD LIST */}
            <div className="md:hidden px-3 pb-6 space-y-2 pt-2">
              {filtered.map((d, i) => {
                const dc = discount(d);
                const rank = i + 1;
                const isLocked = !isPaid && rank > FREE_DEALS_LIMIT;
                return (
                  <div key={d.ref || d.p + i}
                    onClick={() => isLocked ? setShowPaywall(true) : (setPreview(i), setPreviewLuxScore(null))}
                    className={`relative border rounded-xl cursor-pointer transition-all active:scale-[0.99] ${isLocked ? 'opacity-30 blur-[2px] select-none border-[#1a1a24]' : preview === i ? 'border-[#c9a84c]/60 shadow-lg shadow-[#c9a84c]/5' : 'border-[#1e1e2a]'}`}
                    style={{ background: 'linear-gradient(160deg, #0e0e18 0%, #0a0a12 100%)' }}>
                    {/* Top row: rank badge + title + score */}
                    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold ${rank <= 3 ? (rank === 1 ? 'bg-[#c9a84c] text-black' : rank === 2 ? 'bg-gray-400 text-black' : 'bg-amber-800 text-white') : 'bg-[#1a1a24] text-gray-500'}`}>
                        {rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm leading-tight truncate">{d.p}</div>
                        <div className="text-gray-600 text-[11px]">{d.l}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xl font-extrabold font-serif ${scoreClass(d._sc || 0)}`}>{d._sc}</span>
                      </div>
                    </div>
                    {/* Middle row: price + discount + 5yr */}
                    <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{formatPrice(d.pf)}</span>
                      {d.pm2 ? <span className="text-gray-500 text-xs">€{d.pm2}/m²</span> : null}
                      {dc >= 0 ? (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${dc >= 15 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-300'}`}>
                          -{dc.toFixed(0)}%{discountEuros(d) > 0 ? ` · -€${Math.round(discountEuros(d)/1000)}k` : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">+{Math.abs(dc).toFixed(0)}%</span>
                      )}
                      {(() => { const p5 = profit5yr(d.pf, d.r); return p5 > 0 ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#c9a84c]/10 text-[#c9a84c]">+€{Math.round(p5/1000)}k 5yr</span>
                      ) : null; })()}
                    </div>
                    {/* Bottom row: meta chips + portfolio button */}
                    <div className="flex items-center gap-1.5 px-3 pb-2.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${d.s === 'off-plan' ? 'bg-emerald-500/12 text-emerald-400' : d.s === 'under-construction' ? 'bg-amber-500/12 text-amber-400' : 'bg-blue-500/12 text-blue-400'}`}>
                        {d.s === 'off-plan' ? t.off_plan_tag : d.s === 'under-construction' ? t.under_construction_tag : t.ready_tag}
                      </span>
                      {d.c && <span className="text-[10px] text-amber-500/70">~{d.c}</span>}
                      <span className="text-gray-600 text-[10px]">{d.bd}bd · {d.bm}m²{d.bk !== null ? ` · ${d.bk}km 🏖` : ''}</span>
                      <button
                        onClick={e => { e.stopPropagation(); if (!isLocked) togglePortfolio(d.ref || d.p); }}
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded border transition-all ${portfolio.includes(d.ref || d.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#2a2a30] text-gray-600'}`}>
                        {portfolio.includes(d.ref || d.p) ? '✓' : '+'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!isPaid && filtered.length > FREE_DEALS_LIMIT && (
                <div className="bg-amber-900/20 border border-amber-600/40 rounded-xl p-5 text-center">
                  <div className="text-amber-400 font-bold text-sm mb-1">🔒 {filtered.length - FREE_DEALS_LIMIT} more deals locked</div>
                  <div className="text-gray-400 text-xs mb-3">Subscribe to unlock all {filtered.length} properties</div>
                  <button onClick={() => user ? setShowPaywall(true) : setShowAuthModal(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-lg text-sm">
                    Subscribe — €79/month
                  </button>
                </div>
              )}
            </div>
            <div className="hidden md:block overflow-x-auto px-4 pb-6">
              <table className="w-full border-collapse min-w-[1100px]">
                <thead>
                  <tr>
                    {([['#',''],['score',t.col_score],['developer',t.col_developer],['project',t.col_project],['',t.col_region],['',t.col_type],['price',t.col_price],['priceM2',t.col_pm2],['marketM2',t.col_market],['discount',t.col_discount],['built',t.col_built],['plot',t.col_plot],['beds',t.col_beds],['beach',t.lbl_beach],['','Status'],['','Completion'],['','+']] as [SortKey|'', string][]).map(([key, label], i) => (
                      <th key={i} onClick={() => key && handleSort(key as SortKey)}
                        className={`bg-[#09090f] px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 text-left border-b border-[#1a1a24] cursor-pointer hover:text-[#c9a84c] whitespace-nowrap sticky top-0 z-10 select-none ${sortKey === key ? 'text-[#c9a84c]' : ''}`}>
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
                    const isLocked = !isPaid && rank > FREE_DEALS_LIMIT;
                    return (
                      <tr key={d.ref || d.p + i} onClick={() => isLocked ? setShowPaywall(true) : (setPreview(i), setPreviewLuxScore(null))}
                        className={`transition-colors cursor-pointer hover:bg-[#0e0e18] ${isLocked ? 'opacity-40 blur-[2px] select-none' : ''} ${preview === i ? 'bg-[#c9a84c]/5 border-l-2 border-l-[#c9a84c]' : isTop3 ? 'bg-amber-500/[0.03]' : ''}`}>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs">
                          {isTop3 ? (
                            <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-extrabold text-[11px] ${rank === 1 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' : rank === 2 ? 'bg-gray-400 text-black' : 'bg-amber-700 text-white'}`}>{rank}</span>
                          ) : <span className="text-gray-600">{rank}</span>}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`text-base font-extrabold font-serif ${scoreClass(d._sc || 0)}`}>{d._sc}</span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-[11px] font-semibold">{d.d}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <div className="text-gray-100 font-semibold text-xs">{d.p}</div>
                          <div className="text-gray-500 text-[11px]">{d.l}</div>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${d.r === 'cb-south' ? 'bg-blue-500/10 text-blue-400' : d.r === 'cb-north' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {regionLabel(d.r)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${d.t === 'Villa' ? 'bg-purple-500/10 text-purple-400' : d.t === 'Townhouse' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-blue-500/10 text-blue-400'}`}>
                            {d.t}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] font-bold text-[13px]">{formatPrice(d.pf)}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400">{d.pm2 ? `€${d.pm2}` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400">€{d.mm2}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          {(() => {
                            const de = discountEuros(d);
                            return dc >= 0 ? (
                              <div>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${dc >= 15 ? 'bg-emerald-500/15 text-emerald-400' : dc >= 5 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-500/5 text-emerald-200'}`}>
                                  -{dc.toFixed(0)}%
                                </span>
                                {de > 0 && <div className="text-[9px] text-emerald-500/70 mt-0.5">-€{(de/1000).toFixed(0)}k</div>}
                                <div className="text-[9px] text-[#c9a84c]/80 mt-0.5 font-semibold">+€{(profit5yr(d.pf, d.r)/1000).toFixed(0)}k 5yr</div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
                                  +{Math.abs(dc).toFixed(0)}%
                                </span>
                                {de < 0 && <div className="text-[9px] text-red-500/70 mt-0.5">+€{(Math.abs(de)/1000).toFixed(0)}k</div>}
                                <div className="text-[9px] text-[#c9a84c]/80 mt-0.5 font-semibold">+€{(profit5yr(d.pf, d.r)/1000).toFixed(0)}k 5yr</div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs">{d.bm}m²</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400">{d.pl ? `${d.pl}m²` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs">{d.bd}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400">{d.bk !== null ? `${d.bk}km` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${d.s === 'off-plan' ? 'bg-emerald-500/12 text-emerald-400' : d.s === 'under-construction' ? 'bg-amber-500/12 text-amber-400' : 'bg-blue-500/12 text-blue-400'}`}>
                            {d.s === 'off-plan' ? t.status_offplan : d.s === 'under-construction' ? t.status_construction : t.status_ready}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-[10px] text-amber-500/70 whitespace-nowrap">{d.c ? `~${d.c}` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420]" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => !isLocked && togglePortfolio(d.ref || d.p)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all whitespace-nowrap ${portfolio.includes(d.ref || d.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#2a2a30] text-gray-600 hover:text-gray-300'}`}>
                            {portfolio.includes(d.ref || d.p) ? '✓' : '+'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Paywall CTA row after free limit */}
                  {!isPaid && filtered.length > FREE_DEALS_LIMIT && (
                    <tr>
                      <td colSpan={17} className="px-6 py-5 text-center border-b border-[#141420]">
                        <div className="bg-gradient-to-r from-amber-900/20 via-amber-800/20 to-amber-900/20 border border-amber-600/40 rounded-xl p-5 max-w-xl mx-auto">
                          <div className="text-amber-400 font-bold text-sm mb-1">
                            🔒 {filtered.length - FREE_DEALS_LIMIT} more deals locked
                          </div>
                          <div className="text-gray-400 text-xs mb-3">Subscribe to unlock all {filtered.length} properties, full calculators, and rental yield data</div>
                          <button onClick={() => user ? setShowPaywall(true) : setShowAuthModal(true)}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition-colors">
                            Subscribe — €79/month
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}

          {tab === 'yield' && <YieldTab properties={filtered} isPaid={isPaid} onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} />}
          {tab === 'portfolio' && <PortfolioTab properties={properties} portfolio={portfolio} onToggle={togglePortfolio} />}
          {tab === 'map' && <MapView properties={filtered} onPreview={(ref) => { const idx = filtered.findIndex(p => (p.ref || p.p) === ref); if (idx !== -1) { setPreview(idx); setPreviewLuxScore(null); } }} isPaid={isPaid} />}
          {tab === 'market' && <MarketTab properties={filtered} />}
          {tab === 'luxury' && <LuxuryTab properties={properties} isPaid={isPaid} onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} onPreview={(ref, lsc) => { const idx = filtered.findIndex(p => p.ref === ref); if (idx !== -1) { setPreview(idx); setPreviewLuxScore(lsc ?? null); } }} />}
          {tab === 'about' && <AboutTab />}
          {tab === 'legal' && <LegalTab />}
          {tab === 'contact' && <ContactTab />}
        </div>

        {/* PREVIEW PANEL */}
        {previewProp && (
          <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-[299]" onClick={() => { setPreview(null); setPreviewLuxScore(null); }} />
          <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:left-auto md:right-0 w-full md:w-[480px] h-[90vh] md:h-screen border-t md:border-t-0 md:border-l border-[#1a1a24] z-[300] overflow-y-auto shadow-2xl rounded-t-2xl md:rounded-none animate-slide-in" style={{ background: 'linear-gradient(180deg, #0e0d18 0%, #09090f 100%)' }}>
            <div className="md:hidden w-12 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-1" />
            <button onClick={() => { setPreview(null); setPreviewLuxScore(null); }} className="absolute top-4 right-4 w-8 h-8 rounded-full border border-[#2a2a30] text-gray-400 hover:text-amber-400 hover:border-amber-400 flex items-center justify-center z-10 bg-black/50">×</button>
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
                  {previewProp.s === 'off-plan' ? t.status_offplan : previewProp.s === 'ready' ? t.status_ready : t.status_construction}
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
                {(() => {
                  const displayScore = previewLuxScore !== null ? previewLuxScore : (previewProp._sc || 0);
                  const label = previewLuxScore !== null ? 'Luxury Score' : 'Deal Score';
                  return <>
                    <span className={`text-4xl font-extrabold font-serif ${scoreClass(displayScore)}`}>{displayScore}</span>
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
                      <div className="h-1.5 bg-[#1e1e28] rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${displayScore}%`, background: scoreColor(displayScore) }} />
                      </div>
                    </div>
                  </>;
                })()}
              </div>

              {/* AI ANALYSIS BUTTON */}
              {isPaid && (
                <button
                  onClick={fetchAiMemo}
                  disabled={aiMemoLoading}
                  className="w-full mb-4 py-2.5 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/40 hover:border-purple-400/60 text-purple-300 font-semibold text-xs rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {aiMemoLoading ? (
                    <><span className="animate-pulse">●</span> {t.memo_generating}</>
                  ) : (
                    <><span>✦</span> {t.btn_ai}</>
                  )}
                </button>
              )}
              {aiMemoError && <div className="mb-4 text-xs text-red-400 text-center">{aiMemoError}</div>}

              {/* AI MEMO RESULT */}
              {aiMemo && (
                <div className="mb-5 bg-[#13101f] border border-purple-500/30 rounded-xl overflow-hidden">
                  {/* Verdict badge */}
                  <div className={`px-5 py-4 flex items-center gap-4 border-b border-purple-500/20 ${aiMemo.verdict === 'BUY' ? 'bg-emerald-900/30' : aiMemo.verdict === 'CONSIDER' ? 'bg-amber-900/30' : 'bg-red-900/30'}`}>
                    <span className={`text-3xl font-extrabold font-serif px-4 py-2 rounded-xl ${aiMemo.verdict === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : aiMemo.verdict === 'CONSIDER' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                      {aiMemo.verdict}
                    </span>
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.memo_confidence}</div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span key={i} className={`w-3 h-3 rounded-full ${i < aiMemo.confidence ? (aiMemo.verdict === 'BUY' ? 'bg-emerald-400' : aiMemo.verdict === 'CONSIDER' ? 'bg-amber-400' : 'bg-red-400') : 'bg-[#2a2a30]'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    {/* Headline */}
                    <p className="text-sm font-semibold text-white leading-snug">{aiMemo.headline}</p>

                    {/* Price prediction */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-purple-400 mb-2">Price Prediction</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['year1', 'year3', 'year5'] as const).map((yr) => {
                          const pred = aiMemo.price_prediction[yr];
                          const growth = (((pred - previewProp!.pf) / previewProp!.pf) * 100).toFixed(1);
                          return (
                            <div key={yr} className="bg-[#18181f] rounded-lg p-2.5 text-center">
                              <div className="text-[9px] uppercase tracking-wide text-gray-600 mb-1">{yr === 'year1' ? t.memo_price_yr1 : yr === 'year3' ? t.memo_price_yr3 : t.memo_price_yr5}</div>
                              <div className="text-sm font-bold text-white">{pred >= 1_000_000 ? `€${(pred/1_000_000).toFixed(1)}M` : `€${Math.round(pred/1000)}k`}</div>
                              <div className={`text-[10px] font-semibold mt-0.5 ${Number(growth) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(growth) >= 0 ? '+' : ''}{growth}%</div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">{aiMemo.price_prediction.rationale}</p>
                    </div>

                    {/* Strengths */}
                    {aiMemo.strengths.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-emerald-500 mb-1.5">{t.memo_strengths}</div>
                        <ul className="space-y-1">
                          {aiMemo.strengths.map((s, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span>{s}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Risks */}
                    {aiMemo.risks.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-red-500 mb-1.5">{t.memo_risks}</div>
                        <ul className="space-y-1">
                          {aiMemo.risks.map((r, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-red-400 flex-shrink-0">⚠</span>{r}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Yield outlook */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-amber-500 mb-1">{t.memo_yield_outlook}</div>
                      <p className="text-xs text-gray-400 leading-relaxed">{aiMemo.yield_outlook}</p>
                    </div>

                    {/* Market context */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-blue-400 mb-1">{t.memo_market_context}</div>
                      <p className="text-xs text-gray-400 leading-relaxed">{aiMemo.market_context}</p>
                    </div>

                    {/* Comparable position */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.memo_vs_comparables}</div>
                      <p className="text-xs text-gray-400 leading-relaxed">{aiMemo.comparable_position}</p>
                    </div>

                    {/* Recommendation */}
                    <div className={`p-3 rounded-lg border ${aiMemo.verdict === 'BUY' ? 'bg-emerald-900/20 border-emerald-500/25' : aiMemo.verdict === 'CONSIDER' ? 'bg-amber-900/20 border-amber-500/25' : 'bg-red-900/20 border-red-500/25'}`}>
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.memo_recommendation}</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{aiMemo.recommendation}</p>
                    </div>

                    <div className="text-[9px] text-purple-600/70 text-right">Powered by Claude AI</div>
                  </div>
                </div>
              )}

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

              {/* 5-YEAR MARKET VALUE FORECAST */}
              {(() => {
                const region = (previewProp.r || '').toLowerCase();
                const growthRate =
                  region.includes('marbella') || region.includes('costa del sol') || region.includes('estepona') || region.includes('benahavis') ? 0.09 :
                  region.includes('javea') || region.includes('altea') || region.includes('moraira') || region.includes('costa blanca norte') ? 0.085 :
                  region.includes('mallorca') || region.includes('ibiza') ? 0.10 :
                  region.includes('barcelona') || region.includes('sitges') ? 0.065 :
                  region.includes('valencia') || region.includes('alicante') ? 0.07 :
                  region.includes('torrevieja') || region.includes('costa blanca') ? 0.065 :
                  0.075;
                const base = previewProp.pf;
                const yr1 = Math.round(base * Math.pow(1 + growthRate, 1));
                const yr3 = Math.round(base * Math.pow(1 + growthRate, 3));
                const yr5 = Math.round(base * Math.pow(1 + growthRate, 5));
                const pct1 = (((yr1 - base) / base) * 100).toFixed(1);
                const pct3 = (((yr3 - base) / base) * 100).toFixed(1);
                const pct5 = (((yr5 - base) / base) * 100).toFixed(1);
                const fmtK = (v: number) => v >= 1_000_000 ? `€${(v/1_000_000).toFixed(2)}M` : `€${Math.round(v/1000)}k`;
                return (
                  <div className="mb-5 bg-[#12101a] border border-[#c9a84c]/20 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#c9a84c]/15 flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-[#c9a84c]">5-Year Value Forecast</div>
                      <div className="text-[9px] text-gray-600 uppercase tracking-wide">{(growthRate * 100).toFixed(1)}% avg/yr · {previewProp.r}</div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-[#c9a84c]/10">
                      {[['1 Year', fmtK(yr1), pct1], ['3 Years', fmtK(yr3), pct3], ['5 Years', fmtK(yr5), pct5]].map(([label, val, pct]) => (
                        <div key={label} className="px-3 py-3 text-center">
                          <div className="text-[9px] uppercase tracking-wide text-gray-600 mb-1">{label}</div>
                          <div className="text-sm font-bold text-white">{val}</div>
                          <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">+{pct}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-[#c9a84c]/10">
                      <p className="text-[9px] text-gray-600 leading-relaxed">Based on regional historical appreciation rates. New-build premium typically adds 5–10% over resale. Not financial advice.</p>
                    </div>
                  </div>
                );
              })()}

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

              {/* COMPARABLE PROPERTIES */}
              {(() => {
                const comps = properties
                  .filter(p => p.r === previewProp.r && p.t === previewProp.t && (p.ref || p.p) !== (previewProp.ref || previewProp.p))
                  .filter(p => Math.abs(p.pf - previewProp.pf) / previewProp.pf <= 0.3)
                  .sort((a, b) => Math.abs(a.pf - previewProp.pf) - Math.abs(b.pf - previewProp.pf))
                  .slice(0, 3);
                if (!comps.length) return null;
                return (
                  <div className="mb-5">
                    <h4 className="text-[11px] uppercase tracking-widest text-amber-500 mb-2">Comparable Properties</h4>
                    <div className="space-y-2">
                      {comps.map((c, i) => (
                        <div key={c.ref || i} className="bg-[#18181f] border border-[#2a2a30] rounded-lg p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-amber-300 font-semibold truncate">{c.p}</div>
                            <div className="text-[10px] text-gray-500">{c.l}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs font-bold text-white">{formatPrice(c.pf)}</div>
                            {c.pm2 && <div className="text-[10px] text-gray-500">€{c.pm2}/m²</div>}
                          </div>
                          <span className={`text-sm font-extrabold font-serif flex-shrink-0 ${scoreClass(c._sc || 0)}`}>{c._sc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* NOTES */}
              <div className="mb-4">
                <h4 className="text-[11px] uppercase tracking-widest text-amber-500 mb-2">Private Note</h4>
                {user ? (
                  <div>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add a private note..."
                      rows={3}
                      className="w-full bg-[#08080d] border border-[#2a2a30] text-gray-200 px-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 resize-none"
                    />
                    <div className="flex justify-end mt-1">
                      <button onClick={saveNote} disabled={noteSaving}
                        className="text-[10px] px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded transition-all disabled:opacity-50">
                        {noteSaving ? 'Saving...' : noteSaved ? 'Saved!' : 'Save Note'}
                      </button>
                    </div>
                    {/* SQL note for Supabase setup */}
                    {/* Run this SQL in Supabase dashboard:
                      CREATE TABLE IF NOT EXISTS notes (
                        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
                        property_ref text NOT NULL,
                        note text,
                        created_at timestamptz DEFAULT now(),
                        UNIQUE(user_id, property_ref)
                      );
                      ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
                      CREATE POLICY "Users manage own notes" ON notes FOR ALL USING (auth.uid() = user_id);
                    */}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-2 border border-[#2a2a30] rounded-lg">
                    <button onClick={() => setShowAuthModal(true)} className="text-amber-500 hover:text-amber-400">Sign in</button> to save notes
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => toggleFav(previewProp.ref || previewProp.p)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${favs.includes(previewProp.ref || previewProp.p) ? 'border-amber-500 text-amber-400' : 'border-[#2a2a30] text-gray-400 hover:text-amber-400'}`}>
                  {favs.includes(previewProp.ref || previewProp.p) ? 'Remove Favorite' : 'Add to Favorites'}
                </button>
                <button onClick={() => togglePortfolio(previewProp.ref || previewProp.p)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${portfolio.includes(previewProp.ref || previewProp.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#2a2a30] text-gray-400 hover:text-emerald-400'}`}>
                  {portfolio.includes(previewProp.ref || previewProp.p) ? 'In Portfolio' : '+ Portfolio'}
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
                Browse Similar on Xavia Estate →
              </a>
            </div>
          </div>
          </>
        )}
      </div>

      {/* WELCOME PRO TOAST */}
      {showWelcomePro && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] animate-slide-up">
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 border border-emerald-500/50 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 min-w-[300px]">
            <div className="text-3xl">🎉</div>
            <div>
              <div className="text-emerald-300 font-bold text-sm">Welcome to Avena PRO!</div>
              <div className="text-emerald-500 text-xs mt-0.5">All 1,000+ properties unlocked.</div>
              <div className="text-emerald-400 text-xs mt-1 font-medium">Sign in with the same email you used to subscribe to activate your access.</div>
            </div>
            <button onClick={() => setShowWelcomePro(false)} className="text-emerald-600 hover:text-emerald-300 ml-2 text-lg">×</button>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-[#111118] border border-[#2a2a30] rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">×</button>
            <div className="text-center mb-6">
              <div className="font-serif text-2xl text-amber-400 mb-1">Sign in to Avena Estate</div>
              <p className="text-gray-400 text-sm">We&apos;ll email you a magic link — no password needed.</p>
            </div>
            {authSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📬</div>
                <div className="text-amber-400 font-semibold mb-2">Check your inbox</div>
                <p className="text-gray-400 text-sm">Magic link sent to <span className="text-white">{authEmail}</span>. Click it to sign in.</p>
              </div>
            ) : (
              <form onSubmit={async e => {
                e.preventDefault();
                setAuthLoading2(true);
                const { error } = await signInWithEmail(authEmail);
                setAuthLoading2(false);
                if (error) alert('Error: ' + error);
                else setAuthSent(true);
              }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-[#08080d] border border-[#2a2a30] text-gray-100 px-4 py-3 rounded-lg text-sm outline-none focus:border-amber-500 mb-4"
                />
                <button type="submit" disabled={authLoading2}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-400 text-black font-bold py-3 rounded-lg hover:from-amber-500 hover:to-amber-300 transition-all text-sm disabled:opacity-50">
                  {authLoading2 ? 'Sending…' : 'Send Magic Link →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowPaywall(false)}>
          <div className="bg-[#111118] border-2 border-[#c9a84c]/50 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-amber-900/20" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">×</button>
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">🔒</div>
              <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">You&apos;re viewing 5 of 1,040+ scored properties</div>
              <div className="font-serif text-2xl text-[#c9a84c] mb-1">Unlock 1,040+ Investment Deals</div>
              <div className="font-serif text-xl text-white mb-0.5">Avena Estate PRO</div>
              <div className="text-4xl font-bold text-white mb-1">€79<span className="text-lg text-gray-400 font-normal">/month</span></div>
              <p className="text-gray-500 text-xs">Just €2.60/day · Cancel anytime</p>
            </div>
            <ul className="space-y-2 mb-6">
              {[
                ['✓', 'All 1,040+ properties unlocked'],
                ['✓', 'Save up to 30% vs market price'],
                ['✓', 'Full rental yield analysis for every property'],
                ['✓', 'Cash-on-cash return & mortgage calculator'],
                ['✓', 'Luxury €1M+ segment analysis'],
                ['✓', 'Daily updates — new listings every morning'],
              ].map(([icon, text]) => (
                <li key={text} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-[#c9a84c] font-bold">{icon}</span> {text}
                </li>
              ))}
            </ul>
            {user ? (
              <>
                <button onClick={startCheckout} disabled={paywallLoading}
                  className="w-full font-bold py-3.5 rounded-lg transition-all text-sm tracking-wide disabled:opacity-50 text-black"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a, #c9a84c)' }}>
                  {paywallLoading ? 'Redirecting…' : 'Subscribe — €79/month →'}
                </button>
                <p className="text-center text-gray-600 text-[10px] mt-2">Just €2.60/day for institutional-grade property intelligence</p>
              </>
            ) : (
              <form onSubmit={async e => {
                e.preventDefault();
                setPaywallLoading(true);
                try {
                  const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: paywallEmail }),
                  });
                  const { url, error } = await res.json();
                  if (error || !url) { alert('Error: ' + (error || 'Stripe account not yet activated. Visit dashboard.stripe.com to complete setup.')); setPaywallLoading(false); return; }
                  window.location.href = url;
                } catch {
                  alert('Something went wrong. Please try again.');
                  setPaywallLoading(false);
                }
              }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={paywallEmail}
                  onChange={e => setPaywallEmail(e.target.value)}
                  className="w-full bg-[#08080d] border border-[#2a2a30] text-gray-100 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#c9a84c] mb-3"
                />
                <button type="submit" disabled={paywallLoading}
                  className="w-full font-bold py-3.5 rounded-lg transition-all text-sm tracking-wide disabled:opacity-50 text-black"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a, #c9a84c)' }}>
                  {paywallLoading ? 'Redirecting to Stripe…' : 'Subscribe — €79/month →'}
                </button>
                <p className="text-center text-gray-600 text-[10px] mt-2">Just €2.60/day for institutional-grade property intelligence</p>
              </form>
            )}
            <div className="mt-4 pt-4 border-t border-[#2a2a30]">
              <div className="flex items-center justify-center gap-3 mb-2">
                <svg className="w-8 h-5 opacity-60" viewBox="0 0 60 25" fill="none"><text x="0" y="20" fontSize="22" fontWeight="bold" fill="#635BFF" fontFamily="Arial">stripe</text></svg>
                <span className="text-gray-600 text-[10px]">|</span>
                <div className="flex items-center gap-1 text-gray-500 text-[10px]"><span>🔒</span><span>256-bit SSL</span></div>
                <span className="text-gray-600 text-[10px]">|</span>
                <div className="flex items-center gap-1 text-gray-500 text-[10px]"><span>🛡️</span><span>PCI Compliant</span></div>
              </div>
              <div className="flex items-center justify-center gap-4 mb-2">
                {['VISA', 'MC', 'AMEX', 'IDEAL'].map(card => (
                  <span key={card} className="text-[9px] font-bold px-2 py-0.5 rounded border border-[#2a2a30] text-gray-500 tracking-wider">{card}</span>
                ))}
              </div>
              <p className="text-center text-gray-600 text-[10px]">Cancel anytime · Secured by Stripe</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[][];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[8px] tracking-[2px] text-gray-600 uppercase">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="text-gray-300 px-3 py-1.5 rounded-md text-xs outline-none min-w-[130px]"
        style={{ background: '#0a0a12', border: '1px solid #1e1e28' }}
        onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = '#c9a84c'; }}
        onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = '#1e1e28'; }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: '#0d0d16', border: '1px solid #1a1a24' }}>
      <div className="text-[8px] uppercase tracking-[3px] text-gray-600 mb-1.5">{label}</div>
      <div className="text-sm font-bold text-gray-100">{value}</div>
    </div>
  );
}

function YieldCard({ d, expanded, onToggle, fmtC, sym }: { d: Property; expanded: boolean; onToggle: () => void; fmtC?: (n: number) => string; sym?: string }) {
  const fmt = fmtC || formatPrice;
  const symb = sym || '€';
  const [downPct, setDownPct] = useState(30);
  const [interestPct, setInterestPct] = useState(3.75);
  if (!d._yield) return null;

  const net = Math.round(d._yield.annual * 0.75);
  const netYield = ((net / d.pf) * 100).toFixed(1);
  const buyFee = Math.round(d.pf * 0.13);
  const totalCost = d.pf + buyFee;
  const downPayment = Math.round(totalCost * (downPct / 100));
  const loanAmt = totalCost - downPayment;
  const rate = (interestPct / 100) / 12;
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
              <span className="mt-0.5 block" onClick={e => e.stopPropagation()}>
                <a href={d.u} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-amber-500 hover:text-amber-300 underline inline">
                  View property ↗
                </a>
              </span>
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
            <div className="text-sm font-bold">{fmt(d._yield.rate)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Annual Gross</div>
            <div className="text-sm font-bold">{fmt(d._yield.annual)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Annual Profit</div>
            <div className={`text-sm font-bold ${annualCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(annualCashflow)}</div>
            <div className={`text-[10px] font-semibold mt-0.5 ${annualCashflow >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>{fmt(Math.round(annualCashflow / 12))}/mo</div>
            <div className="text-[8px] text-gray-600">after costs &amp; mortgage</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Avg Price</div>
            <div className="text-sm font-bold">{fmt(d.pf)}</div>
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

        {/* Calculator hint */}
        <div className={`mt-3 pt-2 border-t border-[#1e1e28] flex items-center justify-center gap-1.5 transition-all ${expanded ? 'opacity-0 h-0 overflow-hidden mt-0 pt-0 border-0' : ''}`}>
          <span className="text-amber-500 text-[10px]">🧮</span>
          <span className="text-[10px] text-amber-600 font-medium">Click to open mortgage &amp; cashflow calculator</span>
          <span className="text-amber-700 text-[10px]">↓</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#2a2a30] p-4 bg-[#0d0d14]" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-semibold text-amber-400">Investment Calculator</div>
            <div className="text-[10px] text-gray-500">25yr term</div>
          </div>

          <div className="mb-2">
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
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Interest Rate</span>
              <span className="text-amber-400 font-bold">{interestPct.toFixed(2)}%</span>
            </div>
            <input
              type="range" min={1} max={8} step={0.25} value={interestPct}
              onChange={e => setInterestPct(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Down Payment</div>
              <div className="text-sm font-bold text-amber-400">{fmt(downPayment)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Mortgage/Mo</div>
              <div className="text-sm font-bold">{fmt(mortgageMo)}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Profit After Mortgage</div>
              <div className={`text-sm font-bold ${annualCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(annualCashflow)}</div>
              <div className="text-[8px] text-gray-700 mt-0.5">rent − costs − mortgage</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Total All-In Cost</div>
              <div className="text-sm font-bold">{fmt(totalCost)}</div>
              <div className="text-[8px] text-gray-600 mt-0.5">{fmt(d.pf)} + {fmt(buyFee)} fees</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Loan Amount</div>
              <div className="text-sm font-bold">{fmt(loanAmt)}</div>
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

const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'EUR €' },
  { code: 'NOK', symbol: 'kr', label: 'NOK kr' },
  { code: 'GBP', symbol: '£', label: 'GBP £' },
  { code: 'SEK', symbol: 'kr', label: 'SEK kr' },
  { code: 'DKK', symbol: 'kr', label: 'DKK kr' },
];

function YieldTab({ properties, isPaid, onUpgrade }: { properties: Property[]; isPaid: boolean; onUpgrade: () => void }) {
  const [sortMode, setSortMode] = useState<'yield' | 'income' | 'price'>('yield');
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('avena_currency') || 'EUR';
    return 'EUR';
  });
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?base=EUR&symbols=NOK,GBP,SEK,DKK')
      .then(r => r.json())
      .then(data => {
        if (data?.rates) setRates({ EUR: 1, ...data.rates });
      })
      .catch(() => {
        // Fallback static rates if API fails
        setRates({ EUR: 1, NOK: 11.7, GBP: 0.86, SEK: 11.2, DKK: 7.46 });
      });
  }, []);

  const handleCurrencyChange = (c: string) => {
    setCurrency(c);
    if (typeof window !== 'undefined') localStorage.setItem('avena_currency', c);
  };

  const convert = (eur: number) => Math.round(eur * (rates[currency] || 1));
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '€';
  const fmtC = (eur: number) => `${sym}${convert(eur).toLocaleString()}`;

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
        <div className="flex gap-2 items-center flex-wrap">
          {([['yield', 'By Yield %'], ['income', 'By Income'], ['price', 'By Price']] as ['yield' | 'income' | 'price', string][]).map(([key, label]) => (
            <button key={key} onClick={() => setSortMode(key)}
              className={`text-[10px] px-3 py-1 rounded border transition-all ${sortMode === key ? 'bg-amber-600 border-amber-600 text-black font-semibold' : 'border-[#2a2a30] text-gray-400 hover:border-amber-600/50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl text-amber-400">Estimated Rental Yield</h2>
          <select
            value={currency}
            onChange={e => handleCurrencyChange(e.target.value)}
            className="bg-[#08080d] border border-[#c9a84c]/40 text-[#c9a84c] px-2 py-1 rounded-lg text-[11px] outline-none focus:border-[#c9a84c] cursor-pointer font-semibold"
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
          <span className="text-amber-400 text-sm">💰</span>
          <span className="text-amber-300 text-xs font-medium">Tap any card to open the loan & investment calculator</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.slice(0, isPaid ? 30 : FREE_YIELD_LIMIT).map((d, i) => (
          <YieldCard
            key={d.ref || i}
            d={d}
            expanded={expandedRef === (d.ref || String(i))}
            onToggle={() => setExpandedRef(expandedRef === (d.ref || String(i)) ? null : (d.ref || String(i)))}
            fmtC={fmtC}
            sym={sym}
          />
        ))}
        {/* Blurred preview cards for free users */}
        {!isPaid && sorted.length > FREE_YIELD_LIMIT && sorted.slice(FREE_YIELD_LIMIT, FREE_YIELD_LIMIT + 3).map((d, i) => (
          <div key={`locked-${i}`} className="relative overflow-hidden rounded-lg cursor-pointer" onClick={onUpgrade}>
            <div className="opacity-30 blur-[3px] pointer-events-none select-none">
              <YieldCard d={d} expanded={false} onToggle={() => {}} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <div className="text-2xl mb-1">🔒</div>
              <div className="text-xs text-amber-400 font-semibold">PRO Only</div>
            </div>
          </div>
        ))}
      </div>

      {/* Paywall CTA */}
      {!isPaid && sorted.length > FREE_YIELD_LIMIT && (
        <div className="mt-6 p-6 bg-[#111118] border border-amber-500/30 rounded-xl text-center">
          <div className="text-amber-400 font-serif text-lg mb-1">
            🔒 {sorted.length - FREE_YIELD_LIMIT} more yield analyses locked
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Subscribe to see full rental yield data, cash-on-cash returns, and investment calculator for all {sorted.length} properties.
          </p>
          <button onClick={onUpgrade}
            className="bg-gradient-to-r from-amber-600 to-amber-400 text-black font-bold px-8 py-3 rounded-lg hover:from-amber-500 hover:to-amber-300 transition-all text-sm tracking-wide">
            Subscribe — €79/month
          </button>
        </div>
      )}
    </div>
  );
}

function MarketTab({ properties }: { properties: Property[] }) {
  const regions = ['cb-south', 'cb-north', 'costa-calida'];

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

  const maxAvgPrice = Math.max(...regionData.map(r => r.avgPrice));
  const maxAvgM2 = Math.max(...regionData.map(r => r.avgM2));
  const maxCount = Math.max(...regionData.map(r => r.count));

  // Type breakdown
  const types = ['Villa', 'Apartment', 'Townhouse', 'Bungalow'];
  const typeData = types.map(t => ({ type: t, count: properties.filter(p => p.t === t).length }))
    .filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  const maxTypeCount = Math.max(...typeData.map(t => t.count));

  // Status breakdown
  const totalOffPlan = properties.filter(p => p.s === 'off-plan').length;
  const totalReady = properties.filter(p => p.s === 'ready').length;
  const totalBuilding = properties.filter(p => p.s === 'under-construction').length;

  // Price bands
  const bands = [
    { label: '< €150k', min: 0, max: 150000 },
    { label: '€150–250k', min: 150000, max: 250000 },
    { label: '€250–400k', min: 250000, max: 400000 },
    { label: '€400–600k', min: 400000, max: 600000 },
    { label: '€600k–1M', min: 600000, max: 1000000 },
    { label: '> €1M', min: 1000000, max: Infinity },
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

  return (
    <div className="p-6 space-y-4">
      <h2 className="font-serif text-xl text-amber-400">Market Overview</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Listings', value: properties.length.toLocaleString() },
          { label: 'Avg Price', value: formatPrice(overallAvgPrice) },
          { label: 'Median Price', value: formatPrice(medianPrice) },
          { label: 'Avg €/m²', value: `€${overallAvgM2.toLocaleString()}` },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#2a2a30] rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-serif text-amber-400">{s.value}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Avg price by region */}
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Avg Price by Region</h3>
          {regionData.map(r => (
            <div key={r.region} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{regionLabel(r.region)}</span>
                <span className="text-amber-400 font-semibold">{formatPrice(r.avgPrice)}</span>
              </div>
              <div className="h-5 bg-[#1e1e28] rounded overflow-hidden">
                <div className="h-full bg-amber-500/50 rounded transition-all" style={{ width: `${maxAvgPrice ? (r.avgPrice / maxAvgPrice) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                <span>Min {formatPrice(r.minPrice)}</span>
                <span>Max {formatPrice(r.maxPrice)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Avg €/m² by region */}
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Avg €/m² by Region</h3>
          {regionData.map(r => (
            <div key={r.region} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{regionLabel(r.region)}</span>
                <span className="text-emerald-400 font-semibold">€{r.avgM2.toLocaleString()}/m²</span>
              </div>
              <div className="h-5 bg-[#1e1e28] rounded overflow-hidden">
                <div className="h-full bg-emerald-500/50 rounded transition-all" style={{ width: `${maxAvgM2 ? (r.avgM2 / maxAvgM2) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Properties by region */}
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Listings by Region</h3>
          {regionData.map(r => (
            <div key={r.region} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{regionLabel(r.region)}</span>
                <span className="text-blue-400 font-semibold">{r.count} props</span>
              </div>
              <div className="h-5 bg-[#1e1e28] rounded overflow-hidden">
                <div className="h-full bg-blue-500/50 rounded" style={{ width: `${maxCount ? (r.count / maxCount) * 100 : 0}%` }} />
              </div>
              <div className="flex gap-3 text-[10px] text-gray-600 mt-0.5">
                <span className="text-emerald-600">{r.offPlan} off-plan</span>
                <span className="text-blue-600">{r.building} building</span>
                <span className="text-gray-500">{r.ready} ready</span>
              </div>
            </div>
          ))}
        </div>

        {/* Property type breakdown */}
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">By Property Type</h3>
          {typeData.map(t => (
            <div key={t.type} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{t.type}</span>
                <span className="text-purple-400 font-semibold">{t.count} · {Math.round(t.count / properties.length * 100)}%</span>
              </div>
              <div className="h-5 bg-[#1e1e28] rounded overflow-hidden">
                <div className="h-full bg-purple-500/50 rounded" style={{ width: `${maxTypeCount ? (t.count / maxTypeCount) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price distribution */}
      <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Price Distribution</h3>
        <div className="flex items-end gap-2 h-24">
          {bandData.map(b => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-amber-400 font-semibold">{b.count}</span>
              <div className="w-full bg-amber-500/50 rounded-t" style={{ height: `${maxBandCount ? (b.count / maxBandCount) * 72 : 0}px` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          {bandData.map(b => (
            <div key={b.label} className="flex-1 text-center text-[8px] text-gray-600 leading-tight">{b.label}</div>
          ))}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">By Status</h3>
        <div className="flex gap-4">
          {[
            { label: 'Off-Plan', count: totalOffPlan, color: 'bg-emerald-500' },
            { label: 'Under Construction', count: totalBuilding, color: 'bg-amber-500' },
            { label: 'Key Ready', count: totalReady, color: 'bg-blue-500' },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center">
              <div className={`h-2 rounded-full ${s.color} mb-2`} style={{ opacity: 0.7 }} />
              <div className="text-lg font-bold font-serif text-white">{s.count}</div>
              <div className="text-[9px] uppercase tracking-wide text-gray-500">{s.label}</div>
              <div className="text-[10px] text-gray-600">{Math.round(s.count / properties.length * 100)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top towns table */}
      <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Top Towns</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-gray-600 border-b border-[#2a2a30]">
                <th className="text-left pb-2">Town</th>
                <th className="text-right pb-2">Listings</th>
                <th className="text-right pb-2">Avg Price</th>
                <th className="text-right pb-2">Avg €/m²</th>
              </tr>
            </thead>
            <tbody>
              {topTowns.map(t => (
                <tr key={t.town} className="border-b border-[#1e1e28] hover:bg-[#18181f]">
                  <td className="py-2 text-gray-300">{t.town}</td>
                  <td className="py-2 text-right text-blue-400">{t.count}</td>
                  <td className="py-2 text-right text-amber-400">{formatPrice(t.avgPrice)}</td>
                  <td className="py-2 text-right text-emerald-400">€{t.avgM2.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Developer Scorecard */}
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
          <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Developer Scorecard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devs.map((dev, i) => (
                <div key={dev.name} className="bg-[#18181f] border border-[#2a2a30] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-sm font-semibold text-amber-300 truncate">{dev.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{dev.count} propert{dev.count !== 1 ? 'ies' : 'y'}</div>
                    </div>
                    <span className={`text-xl font-extrabold font-serif flex-shrink-0 ${dev.avgScore >= 70 ? 'text-emerald-400' : dev.avgScore >= 50 ? 'text-amber-400' : 'text-gray-400'}`}>
                      {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{dev.avgScore}
                    </span>
                  </div>
                  {/* Score bar */}
                  <div className="h-1.5 bg-[#0a0a0f] rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${dev.avgScore}%`, background: dev.avgScore >= 70 ? '#34d399' : dev.avgScore >= 50 ? '#f59e0b' : '#6b7280' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-gray-600 uppercase tracking-wide">Avg Price</div>
                      <div className="text-xs font-semibold text-white">{dev.avgPrice >= 1_000_000 ? `€${(dev.avgPrice/1_000_000).toFixed(1)}M` : `€${Math.round(dev.avgPrice/1000)}k`}</div>
                    </div>
                    {dev.avgDisc && (
                      <div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-wide">Avg Discount</div>
                        <div className="text-xs font-semibold text-emerald-400">{dev.avgDisc}%</div>
                      </div>
                    )}
                    {dev.avgBeach && (
                      <div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-wide">Avg Beach</div>
                        <div className="text-xs font-semibold text-blue-400">{dev.avgBeach}km</div>
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
    </div>
  );
}

function PortfolioTab({ properties, portfolio, onToggle }: {
  properties: Property[];
  portfolio: string[];
  onToggle: (ref: string) => void;
}) {
  const portfolioProps = properties.filter(p => portfolio.includes(p.ref || p.p));

  const exportPortfolioCSV = () => {
    if (!portfolioProps.length) return;
    const headers = ['Project','Developer','Location','Price','Yield%','Annual Income','Score'];
    const rows = portfolioProps.map(d => [d.p, d.d, d.l, d.pf, d._yield?.gross || '', d._yield?.annual || '', d._sc || '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'avena-portfolio.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const [downPct, setDownPct] = useState(30);
  const [interestPct, setInterestPct] = useState(3.75);

  const totalInvestment = portfolioProps.reduce((a, b) => a + b.pf, 0);
  const totalAnnualIncome = portfolioProps.reduce((a, b) => a + (b._yield?.annual || 0), 0);
  const blendedYield = totalInvestment > 0 ? ((totalAnnualIncome / totalInvestment) * 100).toFixed(2) : '0';
  const totalDiscountSaved = portfolioProps.reduce((a, b) => {
    const d = b.pm2 && b.mm2 ? (b.mm2 - b.pm2) * b.bm : 0;
    return a + Math.max(0, d);
  }, 0);
  const regions = new Set(portfolioProps.map(p => p.r));
  const types = new Set(portfolioProps.map(p => p.t));
  const divScore = Math.min(10, regions.size * 3 + types.size * 2);

  // Portfolio mortgage calc
  const totalCost = Math.round(totalInvestment * 1.13);
  const downPayment = Math.round(totalCost * (downPct / 100));
  const loanAmt = totalCost - downPayment;
  const rate = (interestPct / 100) / 12;
  const n = 25 * 12;
  const totalMortgageMo = loanAmt > 0 ? Math.round(loanAmt * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1)) : 0;
  const netAnnualIncome = Math.round(totalAnnualIncome * 0.75);
  const annualCashflow = netAnnualIncome - totalMortgageMo * 12;

  if (!portfolioProps.length) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <div className="font-serif text-xl text-amber-400 mb-2">Portfolio Simulator</div>
        <p className="text-gray-400 text-sm max-w-md mx-auto">Click the <span className="text-emerald-400 font-semibold">+ Portfolio</span> button on any property card or in the deals table to add properties to your portfolio.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-x-hidden w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-xl text-amber-400">Portfolio Simulator</h2>
        <button onClick={exportPortfolioCSV}
          className="text-xs px-3 py-1.5 bg-[#18181f] border border-[#2a2a30] hover:border-amber-500/50 text-gray-400 hover:text-amber-400 rounded transition-all font-semibold">
          Export CSV ↓
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Investment', value: formatPrice(totalInvestment) },
          { label: 'Annual Income', value: formatPrice(totalAnnualIncome) },
          { label: 'Blended Yield', value: `${blendedYield}%` },
          { label: 'Discount Saved', value: totalDiscountSaved > 0 ? formatPrice(totalDiscountSaved) : 'N/A' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#2a2a30] rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-serif text-amber-400">{s.value}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Diversification */}
      <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Diversification Score</div>
          <div className="h-2 bg-[#1e1e28] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all" style={{ width: `${divScore * 10}%` }} />
          </div>
        </div>
        <div className="text-2xl font-extrabold font-serif text-amber-400">{divScore}/10</div>
        <div className="text-xs text-gray-500">
          <div>{regions.size} region{regions.size !== 1 ? 's' : ''}</div>
          <div>{types.size} type{types.size !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Portfolio mortgage calculator */}
      <div className="bg-[#111118] border border-[#2a2a30] rounded-xl p-5">
        <div className="text-[11px] uppercase tracking-widest text-amber-500 mb-4">Combined Mortgage Calculator</div>
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Down Payment</span><span className="text-amber-400 font-bold">{downPct}%</span></div>
          <input type="range" min={10} max={100} step={5} value={downPct} onChange={e => setDownPct(Number(e.target.value))} className="w-full accent-amber-500 h-1.5 rounded cursor-pointer" />
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Interest Rate</span><span className="text-amber-400 font-bold">{interestPct.toFixed(2)}%</span></div>
          <input type="range" min={1} max={8} step={0.25} value={interestPct} onChange={e => setInterestPct(Number(e.target.value))} className="w-full accent-amber-500 h-1.5 rounded cursor-pointer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {[
            { label: 'Total Down Payment', value: formatPrice(downPayment), color: 'text-amber-400' },
            { label: 'Monthly Mortgage', value: formatPrice(totalMortgageMo), color: 'text-white' },
            { label: 'Annual Profit', value: formatPrice(annualCashflow), sub: `${formatPrice(Math.round(annualCashflow/12))}/mo`, color: annualCashflow >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#18181f] rounded-lg p-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-1">{s.label}</div>
              <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
              {'sub' in s && s.sub && <div className={`text-[10px] mt-0.5 ${s.color} opacity-70`}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Property list */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Properties in Portfolio ({portfolioProps.length})</div>
        <div className="space-y-2">
          {portfolioProps.map(p => (
            <div key={p.ref || p.p} className="bg-[#111118] border border-[#2a2a30] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-amber-300 font-semibold text-sm leading-snug">{p.p}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{p.l} · {p.t}</div>
                </div>
                <button onClick={() => onToggle(p.ref || p.p)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/15 transition-all text-sm font-bold">
                  ×
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <div>
                  <div className="text-sm font-bold text-white">{formatPrice(p.pf)}</div>
                </div>
                {p._yield && (
                  <div className="text-xs text-emerald-400 font-semibold">{p._yield.gross}% yield</div>
                )}
                {p._sc && (
                  <div className="flex items-center gap-1">
                    <span className={`text-base font-extrabold font-serif ${scoreClass(p._sc)}`}>{p._sc}</span>
                    <span className="text-[9px] text-gray-600 uppercase">score</span>
                  </div>
                )}
                {p._yield && (
                  <div className="text-xs text-gray-500">{formatPrice(p._yield.annual)}/yr gross</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LuxuryTab({ properties, isPaid, onUpgrade, onPreview }: {
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-amber-400">Luxury Portfolio</h2>
          <p className="text-gray-500 text-sm mt-1">Properties €1,000,000+ — ranked within the luxury segment only</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#111118] border border-[#2a2a30] rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold font-serif text-amber-400">{filtered.length}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Luxury Props</div>
          </div>
          <div className="bg-[#111118] border border-[#2a2a30] rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold font-serif text-amber-400">{formatPrice(avgLuxPrice)}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Avg Price</div>
          </div>
          <div className="bg-[#111118] border border-[#2a2a30] rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold font-serif text-amber-400">€{avgLuxPm2.toLocaleString()}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500">Avg €/m²</div>
          </div>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 items-end bg-[#111118] border border-[#2a2a30] rounded-xl px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-500">Region</span>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="bg-[#08080d] border border-[#2a2a30] text-gray-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-amber-500">
            <option value="all">All Regions</option>
            <option value="cb-north">CB North</option>
            <option value="cb-south">CB South</option>
            <option value="costa-calida">Costa Cálida</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-500">Type</span>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-[#08080d] border border-[#2a2a30] text-gray-200 px-3 py-1.5 rounded-md text-xs outline-none focus:border-amber-500">
            <option value="all">All Types</option>
            <option value="Villa">Villa</option>
            <option value="Apartment">Apartment</option>
            <option value="Townhouse">Townhouse</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[9px] uppercase tracking-widest text-gray-500">Rank by</span>
          <div className="flex gap-1">
            {([['value','Best Value'],['price','Price ↑'],['pm2','€/m² ↑'],['plot','Plot Size']] as ['value'|'price'|'pm2'|'plot', string][]).map(([k, l]) => (
              <button key={k} onClick={() => setSortMode(k)}
                className={`text-[10px] px-3 py-1.5 rounded border transition-all ${sortMode === k ? 'bg-amber-600 border-amber-600 text-black font-semibold' : 'border-[#2a2a30] text-gray-400 hover:border-amber-600/50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-gray-400 leading-relaxed">
        <span className="text-amber-400 font-semibold">Luxury scoring</span> ranks these properties against each other — not the general market. Best Value = lowest €/m² within this segment, adjusted for plot size and beach proximity. A score of 85 here means excellent value <span className="italic">for a €1M+ property</span>.
      </div>

      {/* Property cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sorted.map((p, i) => {
          const plotRatio = p.pl && p.bm ? (p.pl / p.bm).toFixed(1) : null;
          const hasSeaView = p.views?.some(v => v.toLowerCase().includes('sea'));
          const hasFrontline = p.cats?.some(c => c.toLowerCase().includes('frontline') || c.toLowerCase().includes('beach'));
          const isPrivatePool = p.pool === 'private' || p.pool === 'yes';
          const scoreColor2 = p._lsc >= 70 ? 'text-emerald-400' : p._lsc >= 50 ? 'text-amber-400' : 'text-gray-400';
          const scoreBg = p._lsc >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : p._lsc >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-gray-500/10 border-gray-500/20';

          return (
            <div key={p.ref || i}
              className="bg-[#111118] border border-[#2a2a30] rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all cursor-pointer group"
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
                      <div className="text-amber-300 font-semibold text-sm">{p.t}</div>
                      <div className="text-gray-400 text-[10px]">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${p.s === 'off-plan' ? 'bg-emerald-500/70 text-white' : p.s === 'under-construction' ? 'bg-amber-500/70 text-black' : 'bg-blue-500/70 text-white'}`}>
                          {p.s === 'off-plan' ? 'Off-Plan' : p.s === 'under-construction' ? 'Building' : 'Key Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-32 bg-[#18181f] flex items-center justify-center">
                  <span className="text-gray-600 text-sm">{p.t} · {p.l}</span>
                </div>
              )}

              {/* Details */}
              <div className="p-5">
                <h3 className="text-amber-300 font-semibold text-sm leading-snug mb-1 line-clamp-2">{p.p}</h3>
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
                  {plotRatio && <span className="text-[10px] bg-[#18181f] border border-[#2a2a30] px-2 py-1 rounded-lg text-gray-400">Plot/Built: <span className="text-white font-semibold">{plotRatio}×</span></span>}
                  {p.bk !== null && <span className="text-[10px] bg-[#18181f] border border-[#2a2a30] px-2 py-1 rounded-lg text-gray-400">Beach: <span className="text-white font-semibold">{p.bk}km</span></span>}
                  {p.ba > 0 && <span className="text-[10px] bg-[#18181f] border border-[#2a2a30] px-2 py-1 rounded-lg text-gray-400">Baths: <span className="text-white font-semibold">{p.ba}</span></span>}
                  {p.parking && p.parking > 0 ? <span className="text-[10px] bg-[#18181f] border border-[#2a2a30] px-2 py-1 rounded-lg text-gray-400">Parking: <span className="text-white font-semibold">{p.parking}</span></span> : null}
                  {p.energy && <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-amber-500">Energy {p.energy}</span>}
                </div>

                {/* Luxury score bar */}
                <div className="flex items-center gap-3 p-3 bg-[#18181f] rounded-xl border border-[#2a2a30]">
                  <div className="flex-1">
                    <div className="flex justify-between text-[9px] uppercase tracking-wide text-gray-600 mb-1">
                      <span>Luxury Value Score</span>
                      <span className={scoreColor2}>{p._lsc}/100</span>
                    </div>
                    <div className="h-1.5 bg-[#0a0a0f] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p._lsc}%`, background: p._lsc >= 70 ? '#34d399' : p._lsc >= 50 ? '#f59e0b' : '#6b7280' }} />
                    </div>
                  </div>
                  <div className={`text-2xl font-extrabold font-serif ${scoreColor2}`}>{p._lsc}</div>
                </div>

                {/* CTA */}
                {p.u && (
                  <a href={p.u} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-3 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-600 to-amber-400 text-black font-bold text-xs rounded-xl hover:from-amber-500 hover:to-amber-300 transition-all tracking-wide">
                    View on Xavia Estate ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isPaid && (
        <div className="mt-4 p-6 bg-[#111118] border border-amber-500/30 rounded-xl text-center">
          <div className="text-amber-400 font-serif text-lg mb-1">🔒 PRO feature</div>
          <p className="text-gray-400 text-sm mb-4">Subscribe to unlock full luxury portfolio access, investment calculator, and rental yield data.</p>
          <button onClick={onUpgrade} className="bg-gradient-to-r from-amber-600 to-amber-400 text-black font-bold px-8 py-3 rounded-lg text-sm tracking-wide">
            Subscribe — €79/month
          </button>
        </div>
      )}
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

function LegalTab() {
  return (
    <div className="p-8 max-w-4xl space-y-4">
      <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-6">
        <h3 className="font-serif text-lg text-amber-400 mb-3">Your Investment is Secured by Law</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          All new-build properties in Spain are protected under Spanish property law. As a buyer, your investment is secured through the <span className="text-white">Spanish Land Registry (Registro de la Propiedad)</span> — the official public record of all property ownership and encumbrances in Spain. Every transaction is registered, making ownership legally binding and publicly verifiable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h4 className="text-amber-300 font-semibold mb-2 text-sm">Bank Guarantee on Off-Plan Purchases</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Under Spanish Law 20/2015, developers must provide a <span className="text-white">bank guarantee or insurance policy</span> for all stage payments made before completion. If the developer fails to deliver, your deposits are 100% refunded. This is mandatory — not optional.
          </p>
        </div>
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h4 className="text-amber-300 font-semibold mb-2 text-sm">Notary & Registration Process</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Every property purchase in Spain is completed before a <span className="text-white">licensed Spanish Notary</span> who verifies the legality of the transaction. The title deed (Escritura) is then registered in the Land Registry, giving you full legal ownership.
          </p>
        </div>
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h4 className="text-amber-300 font-semibold mb-2 text-sm">NIE Number (Required for Foreign Buyers)</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Non-Spanish buyers need a <span className="text-white">NIE (Número de Identificación de Extranjero)</span> — a tax ID number. This is obtained at a Spanish consulate or police station in Spain. Xavia Estate assists all buyers with this process.
          </p>
        </div>
        <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-5">
          <h4 className="text-amber-300 font-semibold mb-2 text-sm">Independent Legal Advice</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            We recommend all buyers engage an <span className="text-white">independent Spanish lawyer (Abogado)</span> to review contracts, verify the developer&apos;s licenses, and confirm no debts exist on the property. Typical legal fees are 1% of purchase price.
          </p>
        </div>
      </div>

      <div className="bg-[#111118] border border-[#2a2a30] rounded-lg p-6">
        <h4 className="text-amber-300 font-semibold mb-3 text-sm">Typical Purchase Costs (Spain)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'VAT (IVA)', value: '10%', note: 'New builds only' },
            { label: 'Stamp Duty (AJD)', value: '1.5%', note: 'On new builds' },
            { label: 'Notary & Registry', value: '~1%', note: 'Fixed cost' },
            { label: 'Legal Fees', value: '~1%', note: 'Recommended' },
          ].map(item => (
            <div key={item.label} className="bg-[#18181f] rounded-lg p-3 text-center">
              <div className="text-amber-400 font-bold text-lg">{item.value}</div>
              <div className="text-white text-xs font-semibold mt-0.5">{item.label}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{item.note}</div>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3">Total acquisition cost is typically <span className="text-gray-400">+13% on top of purchase price</span> for new builds in Spain. This is reflected in our investment calculator.</p>
      </div>

      <div className="bg-[#111118] border border-amber-700/20 rounded-lg p-5">
        <h4 className="text-amber-300 font-semibold mb-2 text-sm">About Avena Estate & Xavia Estate</h4>
        <p className="text-gray-400 text-xs leading-relaxed">
          Avena Estate is an independent investment analysis platform. Property listings are sourced from <span className="text-white">Xavia Estate</span>, a licensed Spanish real estate agency operating in Costa Blanca and Costa Cálida. All transactions are handled directly by Xavia Estate and their legal partners. Avena Estate does not hold client funds or act as a property agent.
        </p>
        <div className="mt-3 flex gap-4">
          <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-300 text-xs underline">Xavia Estate website →</a>
          <a href="mailto:Henrik@xaviaestate.com" className="text-amber-500 hover:text-amber-300 text-xs underline">Henrik@xaviaestate.com</a>
        </div>
      </div>
    </div>
  );
}

function ContactTab() {
  return (
    <div className="p-4 md:p-10 flex justify-center">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="relative bg-gradient-to-b from-[#18141f] to-[#0f0d15] border-2 border-[#c9a84c]/50 rounded-3xl overflow-hidden shadow-2xl shadow-[#c9a84c]/10">

          {/* Gold shimmer top bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, #e8c96a, #c9a84c, transparent)' }} />

          {/* Top accent glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#c9a84c' }} />

          <div className="px-8 pt-10 pb-8 relative">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-extrabold font-serif text-black shadow-xl shadow-[#c9a84c]/30"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a, #c9a84c)' }}>
                  HK
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-[#0f0d15] flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>
                  ✦
                </div>
              </div>
            </div>

            {/* Name & title */}
            <div className="text-center mb-8">
              <div className="font-serif text-3xl font-bold mb-1" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c96a, #c9a84c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Henrik Kolstad
              </div>
              <div className="text-[11px] uppercase tracking-[4px] text-gray-500">Founder · Avena Estate</div>
              <div className="mt-3 text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                Spain&apos;s new-build property intelligence platform. Helping investors find real value.
              </div>
            </div>

            {/* Contact links */}
            <div className="space-y-3 mb-8">
              <a href="mailto:Henrik@xaviaestate.com"
                className="flex items-center gap-4 rounded-2xl p-4 border border-[#c9a84c]/20 hover:border-[#c9a84c]/60 transition-all group"
                style={{ background: 'rgba(201,168,76,0.05)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #c9a84c22, #c9a84c44)', border: '1px solid rgba(201,168,76,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Direct Email</div>
                  <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: '#e8c96a' }}>Henrik@xaviaestate.com</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl p-4 border border-[#c9a84c]/20 hover:border-[#c9a84c]/60 transition-all group"
                style={{ background: 'rgba(201,168,76,0.05)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #c9a84c22, #c9a84c44)', border: '1px solid rgba(201,168,76,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Partner Agency</div>
                  <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: '#e8c96a' }}>www.xaviaestate.com</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>

            {/* Divider */}
            <div className="h-px w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />

            {/* Footer note */}
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[3px] text-gray-700 mb-2">Licensed Real Estate · Spain</div>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                All property transactions are handled by Xavia Estate and their certified legal partners operating across Costa Blanca &amp; Costa Cálida.
              </p>
            </div>
          </div>

          {/* Gold shimmer bottom bar */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />
        </div>
      </div>
    </div>
  );
}

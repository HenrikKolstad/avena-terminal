'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Property, SortKey, SortDir } from '@/lib/types';
import { loadProperties, syncSnapshots } from '@/lib/data';
import { formatPrice, scoreClass, scoreColor, regionLabel, discount, displayDiscount, discountEuros, cappedDiscountEuros, calcYield, DISCOUNT_PCT_CAP } from '@/lib/scoring';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/lib/translations';
import { BarChart3, Coins, Gem, Map, FolderOpen, TrendingUp, Star, Download, DollarSign, Heart, Crown, Settings, Info, Scale, Mail, BookOpen, Bitcoin, Menu, X, ChevronLeft, ChevronRight, Lock, User, ExternalLink, AlertTriangle, Check, Sparkles, FileText, Calculator, ArrowUpRight, Zap } from 'lucide-react';

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
const FREE_DEALS_LIMIT = 3;
const FREE_YIELD_LIMIT = 2;

// 5-year market value forecast helper
function growthRate5yr(region: string): number {
  const r = (region || '').toLowerCase();
  if (r.includes('marbella') || r.includes('costa del sol') || r.includes('costa-del-sol') || r.includes('estepona') || r.includes('benahavis')) return 0.09;
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

const PRO_GATE_DESCRIPTIONS: Record<string, string> = {
  'Portfolio Simulator': 'Build a multi-property portfolio, run combined mortgage calculations, and track blended yield across all your shortlisted deals.',
  'Interactive Map': 'See every property plotted on a live map with beach distance, region overlays, and one-click detail previews.',
  'Market Overview': 'Access region-by-region price trends, average €/m² benchmarks, and supply breakdowns to time your purchase.',
  'Luxury Portfolio €1M+': 'Browse and compare premium properties above €1M ranked by value-within-segment — not by list price alone.',
};

function ProGate({ onUpgrade, feature }: { onUpgrade: () => void; feature: string }) {
  const description = PRO_GATE_DESCRIPTIONS[feature] || 'Unlock full access to all analysis tools and data on Avena Terminal PRO.';
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6 py-16 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 50% 40%, #00b9ff 0%, transparent 70%)' }} />
      <div className="relative z-10">
        <div className="mb-4"><Lock size={40} className="mx-auto" style={{ color: '#00b9ff' }} /></div>
        <h2 className="text-xl font-bold text-white mb-2">Unlock {feature}</h2>
        <p className="text-gray-400 text-sm mb-6 max-w-sm">{description}</p>
        <button onClick={onUpgrade}
          className="px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] transition-all"
          style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
          Upgrade to PRO →
        </button>
        <p className="text-[11px] text-gray-600 mt-3">Cancel anytime · €79/month</p>
      </div>
    </div>
  );
}

export default function Explorer() {
  const { user, isPaid, loading: authLoading, signInWithEmail, signInWithPassword, signOut, startCheckout } = useAuth();
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
  const [tab, setTab] = useState<'deals' | 'yield' | 'portfolio' | 'map' | 'market' | 'luxury' | 'about' | 'legal' | 'contact' | 'whyavena' | 'crypto'>('deals');
  const [imgIdx, setImgIdx] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authSent, setAuthSent] = useState(false);
  const [authMode, setAuthMode] = useState<'magic' | 'password'>('magic');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);
  const [showWelcomePro, setShowWelcomePro] = useState(false);
  const [paywallEmail, setPaywallEmail] = useState('');
  const [paywallLoading, setPaywallLoading] = useState(false);
  // Yield tab currency state (lifted for tab label indicator)
  const [yieldCurrency, setYieldCurrency] = useState('EUR');
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
  // Pagination — reset when filters change
  const [displayLimit, setDisplayLimit] = useState(100);
  // Email capture popup state
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  // Header ref for CSS var (points to sticky top zone wrapper div)
  const headerRef = useRef<HTMLDivElement>(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCurrencyPanel, setShowCurrencyPanel] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [alertedRefs, setAlertedRefs] = useState<Set<string>>(new Set());
  const [alertLoading, setAlertLoading] = useState(false);

  // Measure header height after paint via ResizeObserver
  // Mobile header is ~480px (stats + tagline + chips + 2 filter rows), desktop ~120px
  const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 768;
  const [headerH, setHeaderH] = useState(isMobileInit ? 500 : 280);
  useEffect(() => {
    const measure = () => {
      if (!headerRef.current) return;
      const h = headerRef.current.getBoundingClientRect().height;
      if (h > 0) setHeaderH(h);
    };
    measure();
    setTimeout(measure, 100);
    setTimeout(measure, 500);
    setTimeout(measure, 1200); // extra pass for slow mobile renders
    const ro = new ResizeObserver(measure);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [sidebarCollapsed]);

  // Mobile: auto-hide header on scroll down, show on scroll up
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollUpAccum = useRef(0); // accumulate upward scroll distance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        if (delta > 0) {
          // Scrolling DOWN — hide after passing header, reset up-accumulator
          scrollUpAccum.current = 0;
          if (y > headerH && delta > 5) {
            setMobileHeaderHidden(true);
          }
        } else {
          // Scrolling UP — accumulate distance, only show after 800px of deliberate upward scroll
          scrollUpAccum.current += Math.abs(delta);
          if (scrollUpAccum.current > 800 || y <= 10) {
            setMobileHeaderHidden(false);
            scrollUpAccum.current = 0;
          }
        }
        lastScrollY.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headerH]);


  // Track desktop vs mobile for sidebar-aware layout
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    loadProperties().then(d => { setProperties(d); setLoading(false); syncSnapshots(d); });
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

  // Email capture popup: show after 45s for non-logged-in, non-subscribed visitors
  useEffect(() => {
    if (user) return;
    if (localStorage.getItem('avena-email-captured')) return;
    if (localStorage.getItem('avena-email-dismissed')) return;
    const timer = setTimeout(() => setShowEmailCapture(true), 45000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (!user) { setAlertedRefs(new Set()); return; }
    fetch('/api/price-alerts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlertedRefs(new Set(data.map((a: {property_ref: string}) => a.property_ref)));
        }
      })
      .catch(() => {});
  }, [user]);

  const handleEmailSubmit = async () => {
    if (!emailInput.includes('@')) return;
    setEmailLoading(true);
    try {
      await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });
      setEmailSubmitted(true);
      localStorage.setItem('avena-email-captured', '1');
    } catch {
      // still show success - don't frustrate user
      setEmailSubmitted(true);
      localStorage.setItem('avena-email-captured', '1');
    } finally {
      setEmailLoading(false);
    }
  };

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

  const togglePriceAlert = async (ref: string) => {
    if (!user) { setShowAuthModal(true); return; }
    setAlertLoading(true);
    try {
      if (alertedRefs.has(ref)) {
        await fetch(`/api/price-alerts?ref=${encodeURIComponent(ref)}`, { method: 'DELETE' });
        setAlertedRefs(prev => { const n = new Set(prev); n.delete(ref); return n; });
      } else {
        await fetch('/api/price-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_ref: ref }),
        });
        setAlertedRefs(prev => new Set(prev).add(ref));
      }
    } finally {
      setAlertLoading(false);
    }
  };

  const logLead = useCallback(async (prop: Property, action: string) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_ref: prop.ref || prop.p,
          property_name: prop.p,
          developer: prop.d,
          action, // 'click_contact', 'view_xavia', 'book_viewing', 'view_detail'
          user_email: user?.email || null,
        }),
      });
    } catch (e) {
      // silently fail — don't block UI
    }
  }, [user]);

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
        case 'discount': va = displayDiscount(a); vb = displayDiscount(b); break;
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
    setDisplayLimit(100);
  };

  // Reset pagination when filters change
  useEffect(() => { setDisplayLimit(100); }, [filters, quickFilter]);

  // Derived: the slice to actually render (single source of truth)
  const visibleDeals = useMemo(() => filtered.slice(0, displayLimit), [filtered, displayLimit]);

  const stats = useMemo(() => {
    if (!filtered.length) return { count: 0, avgDisc: 0, bestScore: 0, newThisWeek: 0 };
    const discs = filtered.map(d => displayDiscount(d)).filter(x => x > 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return {
      count: filtered.length,
      avgDisc: discs.length ? Math.round(discs.reduce((a, b) => a + b, 0) / discs.length) : 0,
      bestScore: Math.max(...filtered.map(d => d._sc || 0)),
      newThisWeek: filtered.filter(d => d._added && d._added >= sevenDaysAgo).length,
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
      displayDiscount(d).toFixed(1),
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <div className="text-5xl font-bold font-serif tracking-[0.3em] mb-3" style={{ background: 'linear-gradient(90deg, #10B981, #34d399, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AVENA</div>
          <div className="text-[10px] tracking-[6px] uppercase text-emerald-400/40 mb-8">ESTATE</div>
          <div className="text-xs text-gray-600 tracking-widest">Loading properties...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* HEADER — fixed top, full-width on mobile, offset left by sidebar on desktop */}
      <div ref={headerRef} className="fixed top-0 z-40 left-0 right-0"
        style={isDesktop ? {
          width: `calc(100% - ${sidebarCollapsed ? 32 : 240}px)`,
          marginLeft: sidebarCollapsed ? 32 : 240,
          left: 'auto',
          right: 0,
          transform: mobileHeaderHidden ? `translateY(-${headerH}px)` : 'translateY(0)',
          transition: 'transform 0.3s ease',
        } : {
          transform: mobileHeaderHidden ? `translateY(-${headerH}px)` : 'translateY(0)',
          transition: 'transform 0.3s ease',
        }}>
      {/* TOP BAR */}
      <header className="relative border-b border-[#1c2333] px-4 md:px-8 py-3 md:py-6 shadow-2xl" style={{ background: 'linear-gradient(180deg, #090d12 0%, #0d1117 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, #10B981 30%, #34d399 50%, #10B981 70%, transparent 100%)' }} />

        {/* MOBILE HEADER */}
        <div className="flex md:hidden flex-col gap-2">
          {/* Row 1: hamburger + logo + auth only */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-emerald-400 active:scale-90 transition-all"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <a href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold font-serif tracking-[0.2em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</h1>
              <p className="text-[8px] tracking-[5px] uppercase text-emerald-400/60 font-light">Terminal</p>
            </a>
            {/* Auth — right side, full space */}
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isPaid ? (
                    <span className="text-[11px] px-3 py-1 rounded-full font-bold" style={{ background: 'linear-gradient(135deg, rgba(0,185,255,0.12), rgba(159,232,112,0.15))', border: '1px solid rgba(0,185,255,0.4)', color: '#00b9ff' }}>PRO</span>
                  ) : (
                    <button onClick={() => setShowPaywall(true)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>Go PRO</button>
                  )}
                  {user.email?.toLowerCase() === 'henrik@xaviaestate.com' && (
                    <>
                      <a href="/admin" className="text-[11px] text-emerald-500 hover:text-emerald-400 font-semibold">Admin</a>
                      <a href="/developer" className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold">Dev</a>
                    </>
                  )}
                  <button onClick={signOut} className="text-[11px] text-gray-500">↩</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setShowAuthModal(true)} className="text-[11px] border border-[#10B981]/50 text-emerald-400 font-semibold px-3 py-1.5 rounded-lg">Sign In</button>
                  <button onClick={() => setShowPaywall(true)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>PRO</button>
                </div>
              )
            )}
          </div>
          {/* Stats strip — row between logo and tagline */}
          <div className="flex items-center justify-between border-t border-[#1c2333] pt-2">
            <div className="text-center">
              <div className="text-sm font-bold font-serif leading-none" style={{ color: '#ffffff' }}>{stats.count.toLocaleString()}</div>
              <div className="text-[7px] uppercase tracking-widest text-gray-600">Properties</div>
            </div>
            <div className="text-center border-l border-[#1c2333] pl-3">
              <div className="text-sm font-bold font-serif leading-none" style={{ color: '#ffffff' }}>{stats.avgDisc}%</div>
              <div className="text-[7px] uppercase tracking-widest text-gray-600">Avg Discount</div>
            </div>
            <div className="text-center border-l border-[#1c2333] pl-3">
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                <div className="text-sm font-bold font-serif leading-none" style={{ color: '#ffffff' }}>{stats.newThisWeek}</div>
              </div>
              <div className="text-[7px] uppercase tracking-widest text-gray-600">New This Week</div>
            </div>
          </div>
          {/* Row 2: tagline + partnership */}
          <div className="border-t border-[#1c2333] pt-2">
            <div className="text-[9px] text-gray-400 leading-relaxed">
              <div>{t.hero_scanner}</div>
              <div className="text-[10px] italic tracking-wide mt-0.5 font-semibold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>The Bloomberg of European property investment</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {([['Costa Blanca North','cb-north'],['Costa Blanca South','cb-south'],['Costa Cálida','costa-calida'],['Costa del Sol','costa-del-sol']] as [string,string][]).map(([r, code]) => (
                  <button key={r} onClick={() => { setFilters(f => ({...f, region: code})); setTab('deals'); }} className={`px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#1c2333] text-emerald-400 border transition-colors cursor-pointer hover:bg-[#10B981]/10 hover:border-[#10B981]/50 ${filters.region === code ? 'border-[#10B981]/70' : 'border-[#10B981]/20'}`}>{r}</button>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-gray-500 mt-1 flex items-center gap-1 flex-wrap">
              <span>In partnership with</span>
              <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: '#F5A623' }}>Xavia Estate</a>
              <span className="text-gray-600">·</span>
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: '#635BFF' }}>stripe</a>
              <span className="text-gray-600">·</span>
              <a href="https://redsp.net" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: '#E63946' }}>RedSP</a>
              <span>·</span>
              <a href="https://wise.com/invite/dic/henrikk267" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Wise</a>
              <a href="https://instagram.com/avenaestate" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#E1306C] transition-colors ml-0.5" title="@avenaestate">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </p>
          </div>
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden md:flex items-center justify-between gap-2">
          {/* LEFT — logo */}
          <div className="flex-shrink-0">
            <a href="/" className="block cursor-pointer">
              <h1 className={`font-bold font-serif tracking-[0.2em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity ${sidebarCollapsed ? 'text-4xl' : 'text-2xl'}`}>AVENA</h1>
              <p className="text-[9px] tracking-[6px] uppercase text-emerald-400/60 mt-0.5 font-light">Terminal</p>
            </a>
            {sidebarCollapsed && (
              <div className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                <div>{t.hero_scanner}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {([['Costa Blanca North','cb-north'],['Costa Blanca South','cb-south'],['Costa Cálida','costa-calida'],['Costa del Sol','costa-del-sol']] as [string,string][]).map(([r, code]) => (
                    <button key={r} onClick={() => { setFilters(f => ({...f, region: code})); setTab('deals'); }} className={`px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#1c2333] text-emerald-400 border transition-colors cursor-pointer hover:bg-[#10B981]/10 hover:border-[#10B981]/50 ${filters.region === code ? 'border-[#10B981]/70' : 'border-[#10B981]/20'}`}>{r}</button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[9px] text-gray-500 mt-1.5 flex items-center gap-1 flex-wrap">
              <span>In partnership with</span>
              <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#F5A623' }}>Xavia Estate</a>
              <span className="text-gray-600">·</span>
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#635BFF' }}>stripe</a>
              <span className="text-gray-600">·</span>
              <a href="https://redsp.net" target="_blank" rel="noopener noreferrer" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#E63946' }}>RedSP</a>
              <span>·</span>
              <a href="https://wise.com/invite/dic/henrikk267" target="_blank" rel="noopener noreferrer" className="font-semibold hover:opacity-80 transition-opacity" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Wise</a>
            </p>
          </div>

          {/* CENTER — hero punchlines — only when sidebar collapsed */}
          {sidebarCollapsed && (
            <div className="hidden lg:flex flex-col gap-2 flex-1 max-w-md mx-auto text-center">
              <div className="text-lg xl:text-xl font-bold leading-snug" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.hero_line1}</div>
              <div className="h-px w-16 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #00b9ff, transparent)' }} />
              <div className="text-lg xl:text-xl font-bold leading-snug" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.hero_line2}</div>
              <p className="text-[11px] mt-1 italic tracking-wide font-semibold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>The Bloomberg of European property investment</p>
            </div>
          )}

          {/* RIGHT — stats + auth — compact when sidebar expanded */}
          <div className={`flex items-center flex-shrink-0 ${sidebarCollapsed ? 'gap-5' : 'gap-2'}`}>
            <div className="text-center">
              <div className={`font-bold font-serif ${sidebarCollapsed ? 'text-3xl' : 'text-base'}`} style={{ color: '#ffffff' }}>{stats.count.toLocaleString()}</div>
              <div className="text-[9px] uppercase tracking-widest text-gray-500">Properties</div>
            </div>
            <div className={`text-center border-l border-[#1c2333] ${sidebarCollapsed ? 'pl-6' : 'pl-2'}`}>
              <div className={`font-bold font-serif ${sidebarCollapsed ? 'text-3xl' : 'text-base'}`} style={{ color: '#ffffff' }}>{stats.avgDisc}%</div>
              <div className="text-[9px] uppercase tracking-widest text-gray-500">Avg Disc</div>
            </div>
            <div className={`text-center border-l border-[#1c2333] ${sidebarCollapsed ? 'pl-6' : 'pl-2'}`}>
              <div className={`font-bold font-serif ${sidebarCollapsed ? 'text-3xl' : 'text-base'}`} style={{ color: '#ffffff' }}>{Math.round(stats.bestScore)}</div>
              <div className="text-[9px] uppercase tracking-widest text-gray-500">Best Score</div>
            </div>
            <div className={`text-center border-l border-[#1c2333] ${sidebarCollapsed ? 'pl-6' : 'pl-2'}`}>
              <div className="flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                <div className={`font-bold font-serif ${sidebarCollapsed ? 'text-3xl' : 'text-base'}`} style={{ color: '#ffffff' }}>{stats.newThisWeek}</div>
              </div>
              <div className="text-[9px] uppercase tracking-widest text-gray-500">New/Week</div>
            </div>
            {sidebarCollapsed && (
              <a href="https://instagram.com/avenaestate" target="_blank" rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#E1306C] transition-colors ml-2" title="@avenaestate on Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            )}
            <div className={sidebarCollapsed ? 'ml-4' : 'ml-2'}>
              {!authLoading && (
                user ? (
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide" style={{ background: 'linear-gradient(135deg, rgba(0,185,255,0.12), rgba(159,232,112,0.15))', border: '1px solid rgba(0,185,255,0.4)', color: '#00b9ff' }}>PRO</span>
                    ) : (
                      <button onClick={() => setShowPaywall(true)} className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-black font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">Upgrade →</button>
                    )}
                    {user.email?.toLowerCase() === 'henrik@xaviaestate.com' && (
                      <>
                        <a href="/admin" className="text-[10px] text-emerald-500 hover:text-emerald-400 font-semibold whitespace-nowrap border border-emerald-500/30 px-2 py-1 rounded">Admin</a>
                        <a href="/developer" className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold whitespace-nowrap border border-blue-400/30 px-2 py-1 rounded">Dev</a>
                      </>
                    )}
                    <button onClick={signOut} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap">{t.btn_signout}</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAuthModal(true)} className="text-[11px] border border-[#10B981]/40 text-emerald-400/80 hover:border-[#10B981] hover:text-emerald-400 font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">{t.btn_signin}</button>
                    <button onClick={() => setShowPaywall(true)} className="text-[11px] text-black font-bold px-4 py-1.5 rounded-lg whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #10B981, #34d399)' }}>{t.btn_subscribe}</button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* FILTER BAR — desktop: single row, mobile: 2-row grid */}
      <div className="bg-[#0d1117] border-b border-[#1c2333] px-3 md:px-8 py-2">
        {/* Mobile filters */}
        <div className="md:hidden">
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <FilterSelect label="Region" value={filters.region} onChange={v => setFilters(f => ({...f, region: v}))}
              options={[['all',t.filter_all_regions],['cb-south',t.filter_cb_south],['cb-north',t.filter_cb_north],['costa-calida',t.filter_calida],['costa-del-sol',t.filter_del_sol]]} />
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
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#10B981'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e1e28'; }} />
            </div>
            {/* Language flags on mobile */}
            <div className="flex items-center gap-1">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} title={l.label}
                  className={`transition-all active:scale-90 rounded-sm overflow-hidden ${lang === l.code ? 'opacity-100 ring-1 ring-[#10B981]' : 'opacity-35 hover:opacity-70'}`}>
                  <img src={`https://flagcdn.com/w20/${l.country}.png`} alt={l.label} width={20} height={14} className="block" />
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Desktop filters */}
        <div className="hidden md:flex gap-2 overflow-x-auto items-end scrollbar-none py-0.5">
          <FilterSelect label="Region" value={filters.region} onChange={v => setFilters(f => ({...f, region: v}))}
            options={[['all',t.filter_all_regions],['cb-south',t.filter_cb_south],['cb-north',t.filter_cb_north],['costa-calida',t.filter_calida],['costa-del-sol',t.filter_del_sol]]} />
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
              style={{ background: '#0d1117', border: '1px solid #1e1e28' }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#10B981'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e1e28'; }} />
          </div>
          {/* Language switcher */}
          <div className="flex flex-col gap-1">
            <label className="text-[8px] tracking-[2px] text-gray-600 uppercase opacity-0">Lang</label>
            <div className="flex items-center gap-1">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} title={l.label}
                  className={`transition-all hover:scale-110 active:scale-95 rounded-sm overflow-hidden ${lang === l.code ? 'opacity-100 ring-1 ring-[#10B981] scale-110' : 'opacity-35 hover:opacity-70'}`}>
                  <img src={`https://flagcdn.com/w20/${l.country}.png`} alt={l.label} width={20} height={14} className="block" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-auto">
            <label className="text-[9px] uppercase tracking-widest text-gray-500 opacity-0">x</label>
            <button onClick={exportCSV}
              className="bg-[#0f1419] border border-[#1c2333] hover:border-emerald-500/50 text-gray-400 hover:text-emerald-400 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap">
              Export CSV ↓
            </button>
          </div>
        </div>
      </div>

      {/* QUICK FILTERS */}
      <div className="bg-[#0d1117] border-b border-[#1c2333] px-3 md:px-8 py-2 flex flex-nowrap gap-1.5 md:gap-2 overflow-x-auto scrollbar-none">
        {([['budget','<€200k'],['mid','€200-400k'],['premium','€400k+'],['beach','Beach'],['golf','Golf'],['cashflow','Cash+'],['favs','Favs']] as [QuickFilter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => { setQuickFilter(q => q === key ? '' : key); }}
            className={`flex-shrink-0 px-2.5 md:px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-semibold border transition-all min-h-[36px] flex items-center ${quickFilter === key ? 'bg-white/5 border-white/40 text-white' : 'bg-transparent border-[#1c2333] text-gray-600 hover:border-white/20 hover:text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>
      </div>{/* end sticky top zone */}

      {/* ── SIDEBAR (desktop fixed + mobile overlay) ── */}
      {(() => {
        type TabKey = typeof tab;
        const sidebarWidth = sidebarCollapsed ? 32 : 240;

        const NavItem = ({ icon, label, isActive, onClick, disabled, badge }: { icon: React.ReactNode; label: string; isActive?: boolean; onClick?: () => void; disabled?: boolean; badge?: string }) => (
          <button
            onClick={disabled ? undefined : onClick}
            title={sidebarCollapsed ? label : undefined}
            disabled={disabled}
            className="flex items-center gap-3 w-full transition-all min-h-[40px] px-3 relative group"
            style={{
              color: disabled ? '#444' : isActive ? '#10B981' : '#cccccc',
              background: isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
              borderLeft: isActive ? '3px solid #10B981' : '3px solid transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!isActive && !disabled) (e.currentTarget as HTMLButtonElement).style.background = '#ffffff08'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <span className="text-base flex-shrink-0 w-5 text-center leading-none">{icon}</span>
            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <span className="text-[12px] font-medium tracking-wide whitespace-nowrap overflow-hidden flex-1 text-left flex items-center gap-1.5">
                <span className="flex-1">{label}</span>
                {disabled && <span className="text-[9px] text-gray-700 font-normal">soon</span>}
                {badge && !disabled && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10B98133, #10B98155)', border: '1px solid rgba(16,185,129,0.4)', color: '#10B981' }}>{badge}</span>}
              </span>
            )}
          </button>
        );

        const SectionHeader = ({ label }: { label: string }) => (
          (sidebarCollapsed && !mobileSidebarOpen) ? <div className="h-px mx-2 my-1.5 bg-[#1c2333]" /> : (
            <div className="px-3 pt-4 pb-1">
              <span className="text-[9px] font-bold uppercase tracking-[3px]" style={{ color: 'rgba(16,185,129,0.5)' }}>{label}</span>
            </div>
          )
        );

        const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
          const go = (t: TabKey) => { setTab(t); onClose?.(); };
          return (
            <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
              {(!sidebarCollapsed || onClose) && (
                <>
                  {/* Logo */}
                  <div className="px-4 pt-4 pb-2 flex-shrink-0 border-b border-[#1c2333]">
                    <div className="text-xs font-bold tracking-[4px] uppercase" style={{ background: 'linear-gradient(90deg, #10B981, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AVENA</div>
                    <div className="text-[8px] tracking-[3px] uppercase text-emerald-400/40 mt-0.5">TERMINAL</div>
                  </div>

                  <div className="flex-1 py-1">
                    {/* INVEST */}
                    <SectionHeader label="INVEST" />
                    <NavItem icon={<BarChart3 size={16} />} label="Deal Rankings" isActive={tab === 'deals'} onClick={() => go('deals')} />
                    <NavItem icon={<Coins size={16} />} label="Rental Yield" isActive={tab === 'yield'} onClick={() => go('yield')} badge="2 free" />
                    <NavItem icon={<Gem size={16} />} label="Luxury 1M+" isActive={tab === 'luxury'} onClick={() => go('luxury')} badge="PRO" />
                    <NavItem icon={<Map size={16} />} label="Map" isActive={tab === 'map'} onClick={() => go('map')} badge="PRO" />
                    <NavItem icon={<FolderOpen size={16} />} label="Portfolio" isActive={tab === 'portfolio'} onClick={() => go('portfolio')} badge="PRO" />
                    <button
                      onClick={() => go('crypto')}
                      title={sidebarCollapsed ? 'Crypto' : undefined}
                      className="flex items-center gap-3 w-full transition-all min-h-[40px] px-3 relative group"
                      style={{
                        background: tab === 'crypto' ? 'rgba(0,185,255,0.08)' : 'transparent',
                        borderLeft: tab === 'crypto' ? '3px solid #00b9ff' : '3px solid transparent',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { if (tab !== 'crypto') e.currentTarget.style.background = '#ffffff08'; }}
                      onMouseLeave={e => { if (tab !== 'crypto') e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span className="flex-shrink-0 w-5 text-center leading-none"><Bitcoin size={16} style={tab === 'crypto' ? { color: '#00b9ff' } : { color: '#4a5568' }} /></span>
                      {(!sidebarCollapsed || mobileSidebarOpen) && (
                        <span className="text-[12px] font-bold tracking-wide whitespace-nowrap overflow-hidden flex-1 text-left flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                          <span className="flex-1">Crypto</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(0,185,255,0.1)', border: '1px solid rgba(0,185,255,0.3)', color: '#00b9ff', WebkitTextFillColor: '#00b9ff' }}>Soon</span>
                        </span>
                      )}
                    </button>

                    {/* MARKET */}
                    <SectionHeader label="MARKET" />
                    <NavItem icon={<TrendingUp size={16} />} label="Market Overview" isActive={tab === 'market'} onClick={() => go('market')} badge="PRO" />
                    <NavItem icon={<Star size={16} />} label="Scoring Method" isActive={tab === 'about'} onClick={() => go('about')} />

                    {/* TOOLS */}
                    <SectionHeader label="TOOLS" />
                    <NavItem icon={<Download size={16} />} label="Export CSV" onClick={() => { exportCSV(); onClose?.(); }} />
                    <NavItem icon={<DollarSign size={16} />} label="Currency Settings" onClick={() => { setShowCurrencyPanel(v => !v); }} />
                    <NavItem icon={<Heart size={16} />} label="Favorites" onClick={() => { setQuickFilter(q => q === 'favs' ? '' : 'favs'); go('deals'); }} />

                    {/* ACCOUNT */}
                    <SectionHeader label="ACCOUNT" />
                    <NavItem icon={<Crown size={16} />} label="Pro Subscription" onClick={() => { setShowPaywall(true); onClose?.(); }} />
                    <NavItem icon={<Settings size={16} />} label="Settings" disabled />

                    {/* INFO */}
                    <SectionHeader label="INFO" />
                    <a href="/blog" className="flex items-center gap-3 w-full transition-all min-h-[40px] px-3 relative group" style={{ color: '#cccccc', background: 'transparent', borderLeft: '3px solid transparent', cursor: 'pointer', textDecoration: 'none' }} onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#ffffff08'; }} onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}>
                      <span className="flex-shrink-0 w-5 text-center leading-none"><FileText size={16} /></span>
                      {(!sidebarCollapsed || mobileSidebarOpen) && (
                        <span className="text-[12px] font-medium tracking-wide whitespace-nowrap overflow-hidden flex-1 text-left">Blog</span>
                      )}
                    </a>
                    <NavItem icon={<Info size={16} />} label="Why Avena" isActive={tab === 'whyavena'} onClick={() => go('whyavena')} />
                    <NavItem icon={<Scale size={16} />} label="Legal and Security" isActive={tab === 'legal'} onClick={() => go('legal')} />
                    <NavItem icon={<Mail size={16} />} label="Contact" isActive={tab === 'contact'} onClick={() => go('contact')} />
                    <NavItem icon={<BookOpen size={16} />} label="About" isActive={tab === 'about'} onClick={() => go('about')} />
                  </div>

                  {/* Upgrade CTA for non-paid logged-in users */}
                  {!isPaid && user && (
                    <div className="px-3 py-3 mt-2 border-t border-[#1c2333]">
                      <button onClick={() => setShowPaywall(true)}
                        className="w-full py-2 rounded-lg text-[10px] font-bold hover:opacity-90 transition-all"
                        style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                        Upgrade to PRO — €79/mo
                      </button>
                    </div>
                  )}

                  {/* User status at bottom */}
                  <div className="flex-shrink-0 border-t border-[#1c2333] px-2 py-3">
                    {!authLoading && (
                      user ? (
                        <div
                          className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-all hover:bg-[#ffffff08]"
                          onClick={() => signOut()}
                        >
                          <span className="flex-shrink-0 leading-none"><User size={16} /></span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
                            {isPaid ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>PRO</span>
                            ) : (
                              <span className="text-[9px] font-bold text-gray-600">Free</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all hover:bg-[#ffffff08]"
                          style={{ color: '#10B981' }}
                        >
                          <span className="flex-shrink-0 leading-none"><Lock size={16} /></span>
                          <span className="text-[11px] font-semibold">Sign In</span>
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          );
        };

        return (
          <>
            {/* ── DESKTOP SIDEBAR — fixed full height, top-0, z-50 (above header) ── */}
            <div
              className="hidden md:flex flex-col fixed left-0 top-0 z-50 border-r border-[#1c2333] overflow-y-auto overflow-x-hidden"
              style={{
                background: '#0d0d14',
                width: sidebarWidth,
                transition: 'none',
                height: '100vh',
              }}
            >
              {/* Collapse toggle button — centered in sidebar, no overflow clipping */}
              <div className="flex justify-center pt-3 pb-2">
                <button
                  onClick={() => setSidebarCollapsed(v => !v)}
                  className="w-6 h-6 rounded-full border border-[#1c2333] flex items-center justify-center transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                  style={{ background: '#0d0d14', color: '#555' }}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <span className="text-[10px] leading-none">{sidebarCollapsed ? '›' : '‹'}</span>
                </button>
              </div>
              {/* Tablet overlay: expand on hover */}
              <div
                className="hidden [@media(min-width:768px)_and_(max-width:1023px)]:block absolute inset-0 pointer-events-none"
                style={{ zIndex: -1 }}
              />
              <SidebarContent />
            </div>

            {/* ── TABLET SIDEBAR (placeholder removed — desktop sidebar handles tablet too) ── */}

            {/* ── MOBILE OVERLAY ── */}
            {mobileSidebarOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setMobileSidebarOpen(false)}
                />
                {/* Drawer */}
                <div
                  className="relative flex flex-col h-full border-r border-[#1c2333] overflow-hidden animate-slide-in-left"
                  style={{ background: '#0d0d14', width: 'min(90vw, 280px)', zIndex: 51 }}
                >
                  {/* Close button — 44px touch target */}
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all z-10 text-lg"
                    aria-label="Close navigation"
                  >✕</button>
                  <SidebarContent onClose={() => setMobileSidebarOpen(false)} />
                </div>
              </div>
            )}

            {/* ── CURRENCY PANEL (small floating panel) ── */}
            {showCurrencyPanel && (
              <div
                className="fixed z-50 border border-[#1c2333] rounded-xl p-4 shadow-2xl"
                style={{
                  background: '#0d0d14',
                  left: sidebarWidth + 8,
                  top: 200,
                  width: 220,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-bold">Currency</span>
                  <button onClick={() => setShowCurrencyPanel(false)} className="text-gray-600 hover:text-white text-sm">×</button>
                </div>
                <div className="flex flex-col gap-1">
                  {[
                    { code: 'EUR', symbol: '€', flag: '🇪🇺' },
                    { code: 'NOK', symbol: 'kr', flag: '🇳🇴' },
                    { code: 'GBP', symbol: '£', flag: '🇬🇧' },
                    { code: 'SEK', symbol: 'kr', flag: '🇸🇪' },
                    { code: 'DKK', symbol: 'kr', flag: '🇩🇰' },
                  ].map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setYieldCurrency(c.code); setShowCurrencyPanel(false); go('yield'); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${yieldCurrency === c.code ? 'bg-[#10B981]/15 border-[#10B981]/50 text-emerald-400' : 'border-[#1c2333] text-gray-400 hover:border-[#10B981]/30'}`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.code} {c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        );

        function go(t: TabKey) { setTab(t); }
      })()}

      {/* CONTENT — padded top (header height) + left (sidebar width on desktop only) */}
      <div
        className={`overflow-x-hidden min-w-0 transition-[margin-right] duration-200 ${preview !== null ? 'md:mr-[480px]' : ''}`}
        style={{ paddingTop: mobileHeaderHidden ? 0 : headerH, paddingLeft: isDesktop ? (sidebarCollapsed ? 32 : 240) : 0, transition: 'padding-top 0.3s ease' }}
      >
          {(tab === 'whyavena' || (!user && tab === 'deals')) && (() => {
            const [whyOpen, setWhyOpen] = [showWelcomePro, setShowWelcomePro]; // reuse existing state
            return (
            <div className="px-4 md:px-8 py-6 border-b border-[#1c2333]">
              {/* Collapsible headline — only collapses on mobile */}
              <button onClick={() => !isDesktop && setWhyOpen(!whyOpen)} className="w-full text-center group" style={{ cursor: isDesktop ? 'default' : 'pointer' }}>
                <h2 className="text-xl md:text-2xl font-bold font-serif text-white mb-1 inline-flex items-center gap-2">
                  Every question answered before you invest
                  <ChevronRight size={18} className={`transition-transform duration-200 md:hidden ${whyOpen ? 'rotate-90' : ''}`} style={{ color: '#60a5fa' }} />
                </h2>
                <p className="text-gray-500 text-xs md:text-sm max-w-2xl mx-auto">
                  Avena Terminal analyses 1,800+ new builds using institutional-grade scoring.
                  {!whyOpen && !isDesktop && <span className="text-gray-600 ml-1">Tap to learn more.</span>}
                </p>
              </button>

              {/* Expandable on mobile, always open on desktop */}
              {(whyOpen || isDesktop) && (
                <div className="mt-6 animate-slide-up">
                  {/* 8 Questions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {([
                      { q: 'Is this a good deal?', a: 'Deal scores powered by hedonic regression — the same pricing model used by institutional investors.', icon: <BarChart3 size={20} />, color: '#10b981' },
                      { q: 'Will it make money?', a: 'Rental yields from real Airbnb & Booking.com data. Gross and net, not guesses.', icon: <Coins size={20} />, color: '#3b82f6' },
                      { q: 'Can I afford it?', a: 'Mortgage simulator with live Spanish rates. See monthly payments, cashflow, and cash-on-cash return.', icon: <Calculator size={20} />, color: '#8b5cf6' },
                      { q: 'What should I know?', a: 'AI investment memo per property — strengths, risks, 5-year price prediction, comparable position.', icon: <Sparkles size={20} />, color: '#f59e0b' },
                      { q: 'What are the costs?', a: 'Full Spanish purchase cost breakdown. IVA, notary, legal, ITP. No surprises.', icon: <FileText size={20} />, color: '#ef4444' },
                      { q: 'Which area suits me?', a: 'Interactive map with color-coded deal scores. Find your ideal location fast.', icon: <Map size={20} />, color: '#06b6d4' },
                      { q: 'How liquid is it?', a: 'Risk scoring includes developer track record, off-plan exposure, and market velocity.', icon: <Zap size={20} />, color: '#84cc16' },
                      { q: 'Who do I trust?', a: 'One platform. One contact. Avena routes your inquiry to the right agency behind the scenes.', icon: <ArrowUpRight size={20} />, color: '#10B981' },
                    ] as { q: string; a: string; icon: React.ReactNode; color: string }[]).map(({ q, a, icon, color }) => (
                      <div key={q} className="bg-[#0d1117] border border-[#1c2333] rounded-xl p-3.5 hover:border-[#1c2333] transition-all">
                        <div className="mb-2" style={{ color }}>{icon}</div>
                        <div className="font-semibold text-sm mb-1" style={{ color }}>{q}</div>
                        <div className="text-gray-500 text-[10px] leading-relaxed">{a}</div>
                      </div>
                    ))}
                  </div>

                  {/* Stats bar */}
                  <div className="flex flex-wrap justify-center gap-6 md:gap-12 py-5 border-y border-[#1c2333] mb-6">
                    {[
                      { label: 'New Builds Scored', value: '1,800+' },
                      { label: 'Data Sources', value: '6+' },
                      { label: 'Scoring Factors', value: '25+' },
                      { label: 'Avg Time Saved', value: '40hrs' },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <div className="text-xl md:text-2xl font-bold text-white font-serif">{value}</div>
                        <div className="text-[9px] uppercase tracking-widest text-gray-600 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA — always visible */}
              <div className="text-center mt-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform"
                    style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                    Start PRO — €79/month →
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-8 py-3 rounded-xl font-semibold text-emerald-400 text-sm border border-[#10B981]/30 hover:border-[#10B981]/60 transition-all">
                    Sign In
                  </button>
                </div>
                <p className="text-[10px] text-gray-700 mt-2">Cancel anytime · Secured by Stripe · First 5 deals free without account</p>
              </div>

              {/* Blurred preview hint */}
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 text-[11px] text-gray-600 border border-[#1c2333] rounded-full px-4 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                  {stats.count} properties live · Scroll down for a free preview
                </div>
              </div>
            </div>
            );
          })()}

          {tab === 'deals' && (
            <>
            {/* MOBILE CARD LIST */}
            <div className="md:hidden px-3 pb-6 space-y-2 pt-2">
              {visibleDeals.map((d, i) => {
                const dc = displayDiscount(d);
                const rank = i + 1;
                const isLocked = !isPaid && rank > FREE_DEALS_LIMIT;
                return (
                  <div key={d.ref || d.p + i}
                    onClick={() => isLocked ? setShowPaywall(true) : (setPreview(i), setPreviewLuxScore(null), logLead(d, 'view_detail'))}
                    className={`relative border rounded-xl cursor-pointer transition-all active:scale-[0.99] ${isLocked ? 'opacity-30 blur-[2px] select-none border-[#1c2333]' : preview === i ? 'border-[#10B981]/60 shadow-lg shadow-[#10B981]/5' : 'border-[#1e1e2a]'}`}
                    style={{ background: 'linear-gradient(160deg, #0e0e18 0%, #0d1117 100%)' }}>
                    {/* Top row: rank badge + title + score */}
                    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold ${rank === 1 ? 'bg-[#10B981] text-black' : 'bg-[#1c2333] text-white'}`}>
                        {rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm leading-tight truncate">{d.p}</div>
                        <div className="text-gray-600 text-[11px]">{d.l}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xl font-extrabold font-serif ${scoreClass(d._sc || 0)}`}>{Math.round(d._sc || 0)}</span>
                      </div>
                    </div>
                    {/* Middle row: price + discount + 5yr */}
                    <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{formatPrice(d.pf)}</span>
                      {d.pm2 ? <span className="text-gray-500 text-xs whitespace-nowrap">€{d.pm2.toLocaleString()}/m²</span> : null}
                      {dc >= 0 ? (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${dc >= 15 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-300'}`}>
                          -{dc.toFixed(0)}%{cappedDiscountEuros(d) > 0 ? ` · -€${Math.round(cappedDiscountEuros(d)/1000)}k` : ''}{d._capped ? ' ⚠' : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 whitespace-nowrap">+{Math.abs(dc).toFixed(0)}%{d._capped ? ' ⚠' : ''}</span>
                      )}
                      {(() => { const p5 = profit5yr(d.pf, d.r); return p5 > 0 ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>+€{Math.round(p5/1000)}k 5yr</span>
                      ) : null; })()}
                    </div>
                    {/* Bottom row: meta chips + portfolio button */}
                    <div className="flex items-center gap-1.5 px-3 pb-2.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${d.s === 'off-plan' ? 'bg-emerald-500/12 text-emerald-400' : d.s === 'under-construction' ? 'bg-emerald-500/12 text-emerald-400' : 'bg-blue-500/12 text-blue-400'}`}>
                        {d.s === 'off-plan' ? t.off_plan_tag : d.s === 'under-construction' ? t.under_construction_tag : t.ready_tag}
                      </span>
                      {d.c && d.s !== 'ready' && (d._mths ?? 0) > 0 && <span className="text-[10px] text-emerald-500/70">~{d.c}</span>}
                      <span className="text-gray-600 text-[10px] whitespace-nowrap">{d.bd ?? '-'}bd · {(d.bm || 0).toLocaleString()}m²{d.bk !== null ? ` · ${d.bk}km 🏖` : ''}</span>
                      <button
                        onClick={e => { e.stopPropagation(); if (!isLocked) togglePortfolio(d.ref || d.p); }}
                        className={`ml-auto flex-shrink-0 text-[10px] px-2 py-0.5 rounded border transition-all ${portfolio.includes(d.ref || d.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#1c2333] text-gray-600'}`}>
                        {portfolio.includes(d.ref || d.p) ? <Check size={12} /> : '+'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!isPaid && filtered.length > FREE_DEALS_LIMIT && (
                <div className="rounded-xl p-5 text-center border" style={{ background: 'rgba(0,185,255,0.05)', borderColor: 'rgba(0,185,255,0.2)' }}>
                  <div className="font-bold text-sm mb-1" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{filtered.length - FREE_DEALS_LIMIT} more deals locked</div>
                  <div className="text-gray-400 text-xs mb-3">Subscribe to unlock all {filtered.length} properties</div>
                  <button onClick={() => user ? setShowPaywall(true) : setShowAuthModal(true)}
                    className="font-bold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-all"
                    style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                    Subscribe — €79/month
                  </button>
                </div>
              )}
              {isPaid && filtered.length > displayLimit && (
                <div className="text-center py-4">
                  <button onClick={() => setDisplayLimit(l => l + 100)}
                    className="px-6 py-2 rounded-lg border border-[#1c2333] text-[11px] text-gray-400 hover:text-emerald-400 hover:border-[#10B981]/40 transition-colors">
                    Show more ({filtered.length - displayLimit} remaining)
                  </button>
                </div>
              )}
            </div>
            <div className="hidden md:block px-4 pb-6" style={{ overflowX: 'auto' }}>
              <table className="w-full border-collapse min-w-[1100px]">
                <thead>
                  {/* Column labels — sticky, sortable */}
                  <tr>
                    {([['#','',''],['score',t.col_score,''],['developer',t.col_developer,''],['project',t.col_project,''],['',t.col_region,''],['',t.col_type,''],['price',t.col_price,''],['priceM2',t.col_pm2,'Price per m² asked'],['marketM2',t.col_market,'Market benchmark €/m²'],['discount',t.col_discount,'vs market benchmark'],['built',t.col_built,''],['plot',t.col_plot,''],['beds',t.col_beds,''],['beach',t.lbl_beach,''],['','Status',''],['','Completion',''],['','+','']] as [SortKey|'', string, string][]).map(([key, label, tip], i) => (
                      <th key={i} onClick={() => key && handleSort(key as SortKey)}
                        title={tip || undefined}
                        style={{ position: 'sticky', top: 0, background: '#0a0a10' }}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest text-left border-t border-[#1c2333] cursor-pointer hover:text-emerald-400 whitespace-nowrap z-10 select-none ${sortKey === key ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>
                        {label}{sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </th>
                    ))}
                  </tr>
                  {/* Description sub-row — explains each column in plain English */}
                  <tr>
                    {([
                      'Rank',
                      'Deal quality 0–100',
                      'Developer / agency',
                      'Project name & town',
                      'Costa region',
                      'Property type',
                      'List price',
                      '€/m² asked',
                      '€/m² market avg',
                      'Saving vs market',
                      'Built area m²',
                      'Plot size m²',
                      'Bedrooms',
                      'Distance to beach',
                      'Build stage',
                      'Est. handover',
                      'Portfolio',
                    ]).map((desc, i) => (
                      <th key={i} style={{ position: 'sticky', top: 28, background: '#070710' }}
                        className="px-3 py-1 text-[9px] text-gray-600 font-normal whitespace-nowrap border-b border-[#1c2333] z-10">
                        {desc}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDeals.map((d, i) => {
                    const dc = displayDiscount(d);
                    const rank = i + 1;
                    const isTop3 = rank <= 3;
                    const isLocked = !isPaid && rank > FREE_DEALS_LIMIT;
                    return (
                      <tr key={d.ref || d.p + i} onClick={() => isLocked ? setShowPaywall(true) : (setPreview(i), setPreviewLuxScore(null), logLead(d, 'view_detail'))}
                        className={`transition-colors cursor-pointer hover:bg-[#0e0e18] ${isLocked ? 'opacity-40 blur-[2px] select-none' : ''} ${preview === i ? 'bg-[#10B981]/5 border-l-2 border-l-[#10B981]' : isTop3 ? 'bg-white/[0.02]' : ''}`}>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs">
                          {isTop3 ? (
                            <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-extrabold text-[11px] ${rank === 1 ? 'bg-[#10B981] text-black shadow-lg shadow-emerald-400/40' : 'bg-[#1c2333] text-white'}`}>{rank}</span>
                          ) : <span className="text-gray-600">{rank}</span>}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`text-base font-extrabold font-serif ${scoreClass(d._sc || 0)}`}>{Math.round(d._sc || 0)}</span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-[11px] font-semibold max-w-[160px]"><span className="block truncate whitespace-nowrap">{d.d}</span></td>
                        <td className="px-3 py-2.5 border-b border-[#141420] max-w-[200px]">
                          <div className="text-gray-100 font-semibold text-xs truncate">{d.p}</div>
                          <div className="text-gray-500 text-[11px] truncate">{d.l}</div>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${d.r === 'cb-south' ? 'bg-blue-500/10 text-blue-400' : d.r === 'cb-north' ? 'bg-emerald-500/10 text-emerald-400' : d.r === 'costa-del-sol' ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {regionLabel(d.r)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${d.t === 'Villa' ? 'bg-purple-500/10 text-purple-400' : d.t === 'Townhouse' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-blue-500/10 text-blue-400'}`}>
                            {d.t}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] font-bold text-[13px]">{formatPrice(d.pf)}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400">{d.pm2 ? `€${d.pm2.toLocaleString()}` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400">€{(d.mm2 || 0).toLocaleString()}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          {(() => {
                            const de = cappedDiscountEuros(d);
                            return dc >= 0 ? (
                              <div>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${dc >= 15 ? 'bg-emerald-500/15 text-emerald-400' : dc >= 5 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-500/5 text-emerald-200'}`}>
                                  -{dc.toFixed(0)}%{d._capped ? <span className="ml-0.5 text-emerald-400" title="Under review — benchmark may need adjustment">⚠</span> : null}
                                </span>
                                {de > 0 && <div className="text-[9px] text-emerald-500/70 mt-0.5">{d._capReason === 'luxury_review' ? '~' : ''}-€{(de/1000).toFixed(0)}k{d._capped && d._capReason !== 'luxury_review' ? ' (cap)' : ''}</div>}
                                <div className="text-[9px] mt-0.5 font-semibold" style={{ color: '#60a5fa' }}>+€{(profit5yr(d.pf, d.r)/1000).toFixed(0)}k 5yr</div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
                                  +{Math.abs(dc).toFixed(0)}%{d._capped ? <span className="ml-0.5 text-emerald-400" title="Under review">⚠</span> : null}
                                </span>
                                {de < 0 && <div className="text-[9px] text-red-500/70 mt-0.5">{d._capReason === 'luxury_review' ? '~' : ''}+€{(Math.abs(de)/1000).toFixed(0)}k{d._capped && d._capReason !== 'luxury_review' ? ' (cap)' : ''}</div>}
                                <div className="text-[9px] mt-0.5 font-semibold" style={{ color: '#60a5fa' }}>+€{(profit5yr(d.pf, d.r)/1000).toFixed(0)}k 5yr</div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs whitespace-nowrap">{(d.bm || 0).toLocaleString()}m²</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400 whitespace-nowrap">{d.pl ? `${d.pl.toLocaleString()}m²` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs">{d.bd ?? '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-xs text-gray-400">{d.bk !== null ? `${d.bk}km` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${d.s === 'off-plan' ? 'bg-emerald-500/12 text-emerald-400' : d.s === 'under-construction' ? 'bg-emerald-500/12 text-emerald-400' : 'bg-blue-500/12 text-blue-400'}`}>
                            {d.s === 'off-plan' ? t.status_offplan : d.s === 'under-construction' ? t.status_construction : t.status_ready}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-[10px] text-emerald-500/70 whitespace-nowrap">{d.c && d.s !== 'ready' && (d._mths ?? 0) > 0 ? `~${d.c}` : '-'}</td>
                        <td className="px-3 py-2.5 border-b border-[#141420] text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => !isLocked && togglePortfolio(d.ref || d.p)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all whitespace-nowrap ${portfolio.includes(d.ref || d.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#1c2333] text-gray-600 hover:text-gray-300'}`}>
                            {portfolio.includes(d.ref || d.p) ? <Check size={12} /> : '+'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Paywall blur+upgrade block after free limit */}
                  {!isPaid && filtered.length > FREE_DEALS_LIMIT && (
                    <tr>
                      <td colSpan={17} className="p-0">
                        <div className="relative">
                          {/* Blurred ghost rows */}
                          <div className="blur-sm pointer-events-none opacity-40">
                            <table className="w-full border-collapse min-w-[1100px]">
                              <tbody>
                                {[
                                  { p: 'Residencial Vista Mar', l: 'Torrevieja', score: 74, price: '€189,000', dc: '-12%', type: 'Apartment', region: 'CB South' },
                                  { p: 'Villas del Golf', l: 'Orihuela Costa', score: 81, price: '€345,000', dc: '-18%', type: 'Villa', region: 'CB South' },
                                  { p: 'Marina Beach Suites', l: 'Denia', score: 68, price: '€224,500', dc: '-9%', type: 'Apartment', region: 'CB North' },
                                ].map((row, i) => (
                                  <tr key={i} className="border-b border-[#141420]">
                                    <td className="px-3 py-2.5 text-xs text-gray-600">{FREE_DEALS_LIMIT + i + 1}</td>
                                    <td className="px-3 py-2.5"><span className="text-base font-extrabold font-serif text-emerald-400">{row.score}</span></td>
                                    <td className="px-3 py-2.5 text-[11px] font-semibold text-gray-400">Xavia Estate</td>
                                    <td className="px-3 py-2.5"><div className="text-gray-300 font-semibold text-xs">{row.p}</div><div className="text-gray-600 text-[11px]">{row.l}</div></td>
                                    <td className="px-3 py-2.5"><span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400">{row.region}</span></td>
                                    <td className="px-3 py-2.5"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400">{row.type}</span></td>
                                    <td className="px-3 py-2.5 font-bold text-[13px] text-gray-300">{row.price}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">{row.dc}</span></td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">—</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {/* Upgrade overlay */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]/80 rounded-xl z-10">
                            <div className="text-center px-6 py-8">
                              <div className="mb-2"><Lock size={24} className="mx-auto text-emerald-400" /></div>
                              <div className="text-white font-bold text-lg mb-1">1,800+ deals ranked</div>
                              <div className="text-gray-400 text-sm mb-4">Upgrade to PRO to unlock all deal rankings</div>
                              <button onClick={() => user ? setShowPaywall(true) : setShowAuthModal(true)}
                                className="px-6 py-2.5 rounded-xl font-bold text-black text-sm"
                                style={{ background: 'linear-gradient(135deg, #10B981, #34d399)' }}>
                                {user ? 'Upgrade to PRO →' : 'Sign In / Get PRO →'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {isPaid && filtered.length > displayLimit && (
                <div className="text-center py-6">
                  <button onClick={() => setDisplayLimit(l => l + 100)}
                    className="px-8 py-2.5 rounded-lg border border-[#1c2333] text-[11px] text-gray-400 hover:text-emerald-400 hover:border-[#10B981]/40 transition-colors">
                    Show more — {filtered.length - displayLimit} remaining
                  </button>
                </div>
              )}
            </div>
            </>
          )}

          {tab === 'yield' && <YieldTab properties={filtered} isPaid={isPaid} onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} onCurrencyChange={setYieldCurrency} />}
          {tab === 'portfolio' && !isPaid && <ProGate feature="Portfolio Simulator" onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} />}
          {tab === 'portfolio' && isPaid && <PortfolioTab properties={properties} portfolio={portfolio} onToggle={togglePortfolio} />}
          {tab === 'map' && !isPaid && <ProGate feature="Interactive Map" onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} />}
          {tab === 'map' && isPaid && <MapView properties={filtered} onPreview={(ref) => { const idx = filtered.findIndex(p => (p.ref || p.p) === ref); if (idx !== -1) { setPreview(idx); setPreviewLuxScore(null); } }} isPaid={isPaid} headerH={headerH} />}
          {tab === 'market' && !isPaid && <ProGate feature="Market Overview" onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} />}
          {tab === 'market' && isPaid && <MarketTab properties={filtered} />}
          {tab === 'luxury' && !isPaid && <ProGate feature="Luxury Portfolio €1M+" onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} />}
          {tab === 'luxury' && isPaid && <LuxuryTab properties={properties} isPaid={isPaid} onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} onPreview={(ref, lsc) => { const idx = filtered.findIndex(p => p.ref === ref); if (idx !== -1) { setPreview(idx); setPreviewLuxScore(lsc ?? null); } }} />}
          {tab === 'about' && <AboutTab />}
          {tab === 'legal' && <LegalTab />}
          {tab === 'contact' && <ContactTab />}
          {tab === 'crypto' && <CryptoTab />}
        </div>

        {/* PREVIEW PANEL */}
        {previewProp && (
          <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-[299]" onClick={() => { setPreview(null); setPreviewLuxScore(null); }} />
          <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:left-auto md:right-0 w-full md:w-[480px] h-[92vh] md:h-screen border-t md:border-t-0 md:border-l border-[#1c2333] z-[300] overflow-y-auto shadow-2xl rounded-t-2xl md:rounded-none animate-slide-in overscroll-contain" style={{ background: 'linear-gradient(180deg, #0e0d18 0%, #09090f 100%)' }}>
            <div className="md:hidden w-12 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-1" />
            <button onClick={() => { setPreview(null); setPreviewLuxScore(null); }} className="absolute top-4 right-4 w-8 h-8 rounded-full border border-[#1c2333] text-gray-400 hover:text-emerald-400 hover:border-emerald-400 flex items-center justify-center z-10 bg-black/50">×</button>
            {/* IMAGE GALLERY */}
            {previewProp.imgs && previewProp.imgs.length > 0 ? (
              <div className="relative w-full h-60 bg-[#0f1419]">
                <img src={previewProp.imgs[imgIdx] || previewProp.imgs[0]} alt={previewProp.p}
                  className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {previewProp.imgs.length > 1 && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + previewProp.imgs!.length) % previewProp.imgs!.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-emerald-500/80 transition-all">‹</button>
                    <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % previewProp.imgs!.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-emerald-500/80 transition-all">›</button>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">{imgIdx + 1}/{previewProp.imgs.length}</div>
                  </>
                )}
                {/* Status badge */}
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold ${previewProp.s === 'off-plan' ? 'bg-emerald-500/90 text-white' : previewProp.s === 'ready' ? 'bg-blue-500/90 text-white' : 'bg-emerald-500/90 text-black'}`}>
                  {previewProp.s === 'off-plan' ? t.status_offplan : previewProp.s === 'ready' ? t.status_ready : t.status_construction}
                </div>
              </div>
            ) : (
              <div className="w-full h-60 bg-[#0f1419] flex items-center justify-center">
                <div className="text-gray-500 text-sm">{previewProp.t} in {previewProp.l}</div>
              </div>
            )}
            {/* Image thumbnails */}
            {previewProp.imgs && previewProp.imgs.length > 1 && (
              <div className="flex gap-1 px-4 py-2 overflow-x-auto bg-[#0f1419] border-b border-[#1c2333]">
                {previewProp.imgs.slice(0, 10).map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-14 h-10 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${imgIdx === i ? 'border-emerald-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-4 md:p-6">
              <h2 className="font-serif text-lg md:text-xl text-emerald-300 mb-1 pr-8">{previewProp.p}</h2>
              <p className="text-gray-500 text-sm mb-4">{previewProp.l}</p>

              <div className="flex items-center gap-4 mb-5 p-4 bg-[#0f1419] rounded-lg border border-[#1c2333]">
                {(() => {
                  const displayScore = Math.round(previewLuxScore !== null ? previewLuxScore : (previewProp._sc || 0));
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

              {/* SCORE BREAKDOWN */}
              {previewProp._scores && (
                <div className="px-4 py-3 mb-5 border border-[#1c2333] rounded-lg bg-[#0e0e18]">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-2">Score Breakdown</div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Value', key: 'value', weight: '40%', color: '#10b981' },
                      { label: 'Yield', key: 'yield', weight: '25%', color: '#3b82f6' },
                      { label: 'Location', key: 'location', weight: '20%', color: '#8b5cf6' },
                      { label: 'Quality', key: 'quality', weight: '10%', color: '#f59e0b' },
                      { label: 'Risk', key: 'risk', weight: '5%', color: '#ef4444' },
                    ].map(({ label, key, weight, color }) => {
                      const val = previewProp._scores![key as keyof typeof previewProp._scores];
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <div className="text-[9px] text-gray-500 w-14 flex-shrink-0">{label} <span className="text-gray-700">{weight}</span></div>
                          <div className="flex-1 h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: color, opacity: 0.8 }} />
                          </div>
                          <div className="text-[10px] font-bold w-7 text-right" style={{ color }}>{val}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  <div className={`px-4 py-4 flex items-center gap-3 border-b border-purple-500/20 ${aiMemo.verdict === 'BUY' ? 'bg-emerald-900/30' : aiMemo.verdict === 'CONSIDER' ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                    <span className={`text-3xl font-extrabold font-serif px-4 py-2 rounded-xl ${aiMemo.verdict === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : aiMemo.verdict === 'CONSIDER' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                      {aiMemo.verdict}
                    </span>
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.memo_confidence}</div>
                      <div className="flex gap-0.5 flex-wrap">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < aiMemo.confidence ? (aiMemo.verdict === 'BUY' ? 'bg-emerald-400' : aiMemo.verdict === 'CONSIDER' ? 'bg-emerald-400' : 'bg-red-400') : 'bg-[#1c2333]'}`} />
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
                            <div key={yr} className="bg-[#0f1419] rounded-lg p-2.5 text-center">
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
                          {aiMemo.strengths.map((s, i) => <li key={i} className="text-xs text-gray-300 flex gap-2"><Check size={12} className="text-emerald-500 flex-shrink-0" />{s}</li>)}
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
                      <div className="text-[10px] uppercase tracking-widest text-emerald-500 mb-1">{t.memo_yield_outlook}</div>
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
                    <div className={`p-3 rounded-lg border ${aiMemo.verdict === 'BUY' ? 'bg-emerald-900/20 border-emerald-500/25' : aiMemo.verdict === 'CONSIDER' ? 'bg-emerald-900/20 border-emerald-500/25' : 'bg-red-900/20 border-red-500/25'}`}>
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.memo_recommendation}</div>
                      <p className="text-xs text-gray-300 leading-relaxed">{aiMemo.recommendation}</p>
                    </div>

                    <div className="text-[9px] text-purple-600/70 text-right">Powered by Claude AI</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                <StatBox label="Price" value={formatPrice(previewProp.pf)} />
                <StatBox label="€/m²" value={previewProp.pm2 ? `€${previewProp.pm2.toLocaleString()}` : '-'} />
                <StatBox label="Built Area" value={`${(previewProp.bm || 0).toLocaleString()}m²`} />
                <StatBox label="Plot" value={previewProp.pl != null ? `${previewProp.pl.toLocaleString()}m²` : 'N/A'} />
                <StatBox label="Bedrooms" value={previewProp.bd != null ? String(previewProp.bd) : '-'} />
                <StatBox label="Beach" value={previewProp.bk !== null && previewProp.bk !== undefined ? `${previewProp.bk}km` : 'Inland'} />
                {previewProp.s !== 'ready' && (
                  <StatBox label="Completion" value={previewProp.c || 'TBD'} />
                )}
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
                  <div className="mb-5 bg-[#12101a] border border-[#10B981]/20 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#10B981]/15 flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-emerald-400">5-Year Value Forecast</div>
                      <div className="text-[9px] text-gray-600 uppercase tracking-wide">{(growthRate * 100).toFixed(1)}% avg/yr · {previewProp.r}</div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-[#10B981]/10">
                      {[['1 Year', fmtK(yr1), pct1], ['3 Years', fmtK(yr3), pct3], ['5 Years', fmtK(yr5), pct5]].map(([label, val, pct]) => (
                        <div key={label} className="px-3 py-3 text-center">
                          <div className="text-[9px] uppercase tracking-wide text-gray-600 mb-1">{label}</div>
                          <div className="text-sm font-bold text-white">{val}</div>
                          <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">+{pct}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-[#10B981]/10">
                      <p className="text-[9px] text-gray-600 leading-relaxed">Based on regional historical appreciation rates. New-build premium typically adds 5–10% over resale. Not financial advice.</p>
                    </div>
                  </div>
                );
              })()}

              {previewProp.f && (
                <div className="mb-5">
                  <h4 className="text-[11px] uppercase tracking-widest text-emerald-500 mb-2">Description</h4>
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Energy {previewProp.energy}</span>
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
                    <h4 className="text-[11px] uppercase tracking-widest text-emerald-500 mb-2">Comparable Properties</h4>
                    <div className="space-y-2">
                      {comps.map((c, i) => (
                        <div key={c.ref || i} className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-emerald-300 font-semibold truncate">{c.p}</div>
                            <div className="text-[10px] text-gray-500">{c.l}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs font-bold text-white">{formatPrice(c.pf)}</div>
                            {c.pm2 && <div className="text-[10px] text-gray-500">€{c.pm2.toLocaleString()}/m²</div>}
                          </div>
                          <span className={`text-sm font-extrabold font-serif flex-shrink-0 ${scoreClass(c._sc || 0)}`}>{Math.round(c._sc || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* NOTES */}
              <div className="mb-4">
                <h4 className="text-[11px] uppercase tracking-widest text-emerald-500 mb-2">Private Note</h4>
                {user ? (
                  <div>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add a private note..."
                      rows={3}
                      className="w-full bg-[#08080d] border border-[#1c2333] text-gray-200 px-3 py-2 rounded-lg text-xs outline-none focus:border-emerald-500 resize-none"
                    />
                    <div className="flex justify-end mt-1">
                      <button onClick={saveNote} disabled={noteSaving}
                        className="text-[10px] px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold rounded transition-all disabled:opacity-50">
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
                  <div className="text-xs text-gray-500 text-center py-2 border border-[#1c2333] rounded-lg">
                    <button onClick={() => setShowAuthModal(true)} className="text-emerald-500 hover:text-emerald-400">Sign in</button> to save notes
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => toggleFav(previewProp.ref || previewProp.p)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${favs.includes(previewProp.ref || previewProp.p) ? 'border-emerald-500 text-emerald-400' : 'border-[#1c2333] text-gray-400 hover:text-emerald-400'}`}>
                  {favs.includes(previewProp.ref || previewProp.p) ? 'Remove Favorite' : 'Add to Favorites'}
                </button>
                <button onClick={() => togglePortfolio(previewProp.ref || previewProp.p)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-all ${portfolio.includes(previewProp.ref || previewProp.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#1c2333] text-gray-400 hover:text-emerald-400'}`}>
                  {portfolio.includes(previewProp.ref || previewProp.p) ? 'In Portfolio' : '+ Portfolio'}
                </button>
              </div>

              {previewProp && (
                <button
                  onClick={() => togglePriceAlert(previewProp.ref || previewProp.p)}
                  disabled={alertLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all mb-3 ${
                    alertedRefs.has(previewProp.ref || previewProp.p)
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'border-[#1c2333] text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400'
                  }`}
                  title="Get emailed if this property's price drops by 2%+">
                  {alertedRefs.has(previewProp.ref || previewProp.p) ? <Check size={14} /> : <span>+</span>}
                  <span>{alertedRefs.has(previewProp.ref || previewProp.p) ? 'Alert set' : 'Price alert'}</span>
                </button>
              )}

              <a href={`mailto:henrik@xaviaestate.com?subject=${encodeURIComponent(`Inquiry: ${previewProp.p}`)}&body=${encodeURIComponent(`Hi Avena,\n\nI'm interested in the following property:\n\n${previewProp.p}\nLocation: ${previewProp.l}\nPrice: €${previewProp.pf?.toLocaleString()}\nRef: ${previewProp.ref || ''}\n\nPlease send me more details.\n\nBest regards`)}`}
                onClick={() => logLead(previewProp, 'contact_avena')}
                className="block text-center py-3 text-sm rounded-lg hover:opacity-90 transition-all tracking-wide font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                Contact Avena Team
              </a>
            </div>
          </div>
          </>
        )}

      {/* WELCOME PRO TOAST */}
      {showWelcomePro && (
        <div className="fixed bottom-6 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[600] animate-slide-up">
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 border border-emerald-500/50 rounded-2xl px-4 md:px-6 py-4 shadow-2xl flex items-center gap-3 md:gap-4 md:min-w-[300px]">
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
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="relative bg-[#0f1419] border border-[#1c2333] rounded-t-2xl md:rounded-2xl p-6 md:p-8 w-full max-w-sm md:mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white text-xl">×</button>
            <div className="text-center mb-5">
              <div className="font-serif text-xl md:text-2xl text-emerald-400 mb-1">Sign in to Avena Terminal</div>
              {/* Mode toggle */}
              <div className="flex items-center justify-center gap-1 mt-3 bg-[#08080d] rounded-lg p-1 w-fit mx-auto">
                <button onClick={() => { setAuthMode('magic'); setAuthError(''); }} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${authMode === 'magic' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}>Magic Link</button>
                <button onClick={() => { setAuthMode('password'); setAuthError(''); }} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${authMode === 'password' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}>Password</button>
              </div>
            </div>
            {authError && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">{authError}</div>}
            {authSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">📬</div>
                <div className="text-emerald-400 font-semibold mb-2">Check your inbox</div>
                <p className="text-gray-400 text-sm">Magic link sent to <span className="text-white">{authEmail}</span>. Click it to sign in.</p>
                <button onClick={() => { setAuthSent(false); setAuthError(''); }} className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline">← Try again</button>
              </div>
            ) : authMode === 'magic' ? (
              <form onSubmit={async e => {
                e.preventDefault();
                setAuthError('');
                setAuthLoading2(true);
                const { error } = await signInWithEmail(authEmail);
                setAuthLoading2(false);
                if (error) {
                  if (error.toLowerCase().includes('rate limit')) setAuthError('Too many emails sent. Wait 1 hour or use Password login instead.');
                  else setAuthError(error);
                } else setAuthSent(true);
              }}>
                <input type="email" required placeholder="your@email.com" value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-[#08080d] border border-[#1c2333] text-gray-100 px-4 py-3 rounded-lg text-sm outline-none focus:border-emerald-500 mb-4" />
                <button type="submit" disabled={authLoading2}
                  className="w-full py-3 rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-50 font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                  {authLoading2 ? 'Sending…' : 'Send Magic Link →'}
                </button>
              </form>
            ) : (
              <form onSubmit={async e => {
                e.preventDefault();
                setAuthError('');
                setAuthLoading2(true);
                let { error } = await signInWithPassword(authEmail, authPassword);
                // First time: no password set yet — set it now (admin only) then retry
                if (error && (error.includes('Invalid login credentials') || error.includes('invalid_credentials'))) {
                  const res = await fetch('/api/auth/set-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: authEmail, password: authPassword }),
                  });
                  const json = await res.json();
                  if (json.ok) {
                    const retry = await signInWithPassword(authEmail, authPassword);
                    error = retry.error;
                  } else if (json.error !== 'Not allowed') {
                    error = json.error || error;
                  }
                }
                setAuthLoading2(false);
                if (error) setAuthError(error);
                else { setShowAuthModal(false); setAuthPassword(''); }
              }}>
                <input type="email" required placeholder="your@email.com" value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-[#08080d] border border-[#1c2333] text-gray-100 px-4 py-3 rounded-lg text-sm outline-none focus:border-emerald-500 mb-3" />
                <input type="password" required placeholder="Password" value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="w-full bg-[#08080d] border border-[#1c2333] text-gray-100 px-4 py-3 rounded-lg text-sm outline-none focus:border-emerald-500 mb-4" />
                <button type="submit" disabled={authLoading2}
                  className="w-full py-3 rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-50 font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                  {authLoading2 ? 'Signing in…' : 'Sign In →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowPaywall(false)}>
          <div className="relative rounded-t-2xl md:rounded-2xl p-5 md:p-8 w-full max-w-md md:mx-4 shadow-2xl max-h-[92vh] overflow-y-auto overscroll-contain" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1117 100%)', border: '1px solid rgba(0,185,255,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 rounded-t-2xl md:rounded-2xl opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #00b9ff 0%, transparent 60%)' }} />
            <div className="relative z-10">
            <button onClick={() => setShowPaywall(false)} className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white text-xl">×</button>
            <div className="text-center mb-4 md:mb-6">
              <div className="mb-3"><Sparkles size={28} className="mx-auto" style={{ color: '#00b9ff' }} /></div>
              <div className="text-gray-400 text-[10px] uppercase tracking-[3px] mb-2">You&apos;re viewing 5 of 1,800+ scored properties</div>
              <div className="font-serif text-xl md:text-2xl font-bold mb-1" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Unlock 1,800+ Investment Deals</div>
              <div className="font-serif text-lg md:text-xl text-white mb-0.5">Avena Terminal PRO</div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">€79<span className="text-base md:text-lg text-gray-400 font-normal">/month</span></div>
              <p className="text-gray-500 text-xs">Just €2.63/day · Cancel anytime</p>
            </div>
            <ul className="space-y-2.5 mb-6">
              {[
                'All 1,800+ properties unlocked',
                'Save up to 30% vs market price',
                'Full rental yield analysis for every property',
                'Cash-on-cash return & mortgage calculator',
                'Luxury €1M+ segment analysis',
                'Daily updates — new listings every morning',
              ].map((text) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Check size={14} style={{ color: '#00b9ff', flexShrink: 0 }} /> {text}
                </li>
              ))}
            </ul>
            {user ? (
              <>
                <button onClick={startCheckout} disabled={paywallLoading}
                  className="w-full font-bold py-3.5 rounded-lg transition-all text-sm tracking-wide disabled:opacity-50 text-black"
                  style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                  {paywallLoading ? 'Redirecting…' : 'Subscribe — €79/month →'}
                </button>
                <p className="text-center text-gray-600 text-[10px] mt-2">Just €2.63/day for institutional-grade property intelligence</p>
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
                  className="w-full bg-[#08080d] border border-[#1c2333] text-gray-100 px-4 py-3 rounded-lg text-sm outline-none focus:border-[#10B981] mb-3"
                />
                <button type="submit" disabled={paywallLoading}
                  className="w-full font-bold py-3.5 rounded-lg transition-all text-sm tracking-wide disabled:opacity-50 text-black"
                  style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                  {paywallLoading ? 'Redirecting to Stripe…' : 'Subscribe — €79/month →'}
                </button>
                <p className="text-center text-gray-600 text-[10px] mt-2">Just €2.63/day for institutional-grade property intelligence</p>
              </form>
            )}
            <div className="mt-4 pt-4 border-t border-[#1c2333]">
              <div className="flex items-center justify-center gap-3 mb-2">
                <svg className="w-8 h-5 opacity-60" viewBox="0 0 60 25" fill="none"><text x="0" y="20" fontSize="22" fontWeight="bold" fill="#635BFF" fontFamily="Arial">stripe</text></svg>
                <span className="text-gray-600 text-[10px]">|</span>
                <div className="flex items-center gap-1 text-gray-500 text-[10px]"><Lock size={12} className="inline" /><span>256-bit SSL</span></div>
                <span className="text-gray-600 text-[10px]">|</span>
                <div className="flex items-center gap-1 text-gray-500 text-[10px]"><span>PCI Compliant</span></div>
              </div>
              <div className="flex items-center justify-center gap-4 mb-2">
                {['VISA', 'MC', 'AMEX', 'IDEAL'].map(card => (
                  <span key={card} className="text-[9px] font-bold px-2 py-0.5 rounded border border-[#1c2333] text-gray-500 tracking-wider">{card}</span>
                ))}
              </div>
              <p className="text-center text-gray-600 text-[10px]">Cancel anytime · Secured by Stripe</p>
            </div>
            </div>{/* end z-10 */}
          </div>
        </div>
      )}

      {/* EMAIL CAPTURE POPUP */}
      {showEmailCapture && !user && (
        <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowEmailCapture(false); localStorage.setItem('avena-email-dismissed', '1'); }}>
          <div className="relative w-full max-w-md bg-[#0e0d18] border border-[#10B981]/30 rounded-t-2xl md:rounded-2xl p-6 md:p-8 shadow-2xl shadow-emerald-900/20 mx-0 md:mx-4"
            onClick={e => e.stopPropagation()}>
            {/* Close */}
            <button onClick={() => { setShowEmailCapture(false); localStorage.setItem('avena-email-dismissed', '1'); }}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 text-xl w-8 h-8 flex items-center justify-center">×</button>

            {!emailSubmitted ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="mb-2"><BarChart3 size={24} className="mx-auto text-emerald-400" /></div>
                  <h2 className="text-xl font-bold text-white font-serif mb-1">Top 5 Deals This Week</h2>
                  <p className="text-gray-400 text-sm">Free every Monday. The best-scored new builds on the Costa Blanca &amp; Calida — straight to your inbox.</p>
                </div>

                {/* Stats proof */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-400 font-serif">1,800+</div>
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">Properties</div>
                  </div>
                  <div className="text-center border-l border-[#1c2333] pl-6">
                    <div className="text-lg font-bold text-emerald-400 font-serif">Free</div>
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">Weekly</div>
                  </div>
                  <div className="text-center border-l border-[#1c2333] pl-6">
                    <div className="text-lg font-bold text-emerald-400 font-serif">AI</div>
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">Scored</div>
                  </div>
                </div>

                {/* Form */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                    placeholder="your@email.com"
                    className="flex-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10B981]/50 placeholder-gray-700"
                  />
                  <button
                    onClick={handleEmailSubmit}
                    disabled={emailLoading || !emailInput.includes('@')}
                    className="px-5 py-3 rounded-lg font-bold text-sm text-black disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #10B981, #34d399)' }}>
                    {emailLoading ? '...' : 'Get →'}
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-700 mt-3">No spam. Unsubscribe anytime.</p>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="mb-3"><Check size={36} className="text-emerald-400 mx-auto" /></div>
                <h2 className="text-xl font-bold text-white font-serif mb-2">You&apos;re in.</h2>
                <p className="text-gray-400 text-sm">Check your inbox every Monday for the top 5 deals. First edition next week.</p>
                <button onClick={() => setShowEmailCapture(false)}
                  className="mt-6 text-emerald-400 text-sm hover:underline">View the full terminal →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t py-6 text-center" style={{ borderColor: '#1c2333', paddingLeft: isDesktop ? (sidebarCollapsed ? 32 : 240) : 0 }}>
        <p className="text-[10px] text-gray-600 tracking-wide">© 2026 Avena Terminal · avena-estate.com · Spain&apos;s first PropTech/FinTech terminal</p>
      </div>
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
        className="w-full text-gray-300 px-3 py-1.5 rounded-md text-xs outline-none md:min-w-[130px]"
        style={{ background: '#0d1117', border: '1px solid #1e1e28' }}
        onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = '#10B981'; }}
        onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = '#1e1e28'; }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: '#0d0d16', border: '1px solid #1c2333' }}>
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

  const srcLabel = d._yield.src?.toLowerCase().includes('airbnb') ? 'AirDNA' : d._yield.src?.toLowerCase().includes('resort') ? 'Resort' : 'Market';

  return (
    <div
      className={`bg-[#0f1419] border rounded-lg overflow-hidden transition-all cursor-pointer ${expanded ? 'border-emerald-500' : 'border-[#1c2333] hover:border-emerald-500/40'}`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1 pr-2">
            <div className="font-semibold text-sm leading-tight" style={{ color: '#60a5fa' }}>{d.p}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Via Xavia Estate — {d.l}</div>
            {d.u && (
              <span className="mt-0.5 block" onClick={e => e.stopPropagation()}>
                <a href={d.u} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-emerald-500 hover:text-emerald-300 underline inline">
                  View property ↗
                </a>
              </span>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${(d._yield.gross || 0) >= 7 ? 'text-emerald-400' : (d._yield.gross || 0) >= 5 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {d._yield.gross}%
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Gross Yield</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#1e1e28]">
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Nightly Rate</div>
            <div className="text-sm font-bold">{fmt(d._yield.rate)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Annual Income</div>
            <div className="text-sm font-bold">{fmt(d._yield.annual)}</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Cashflow/yr</div>
            <div className={`text-sm font-bold ${annualCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(annualCashflow)}</div>
            <div className={`text-[10px] font-semibold mt-0.5 ${annualCashflow >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>{fmt(Math.round(annualCashflow / 12))}/mo</div>
            <div className="text-[8px] text-gray-600">after costs &amp; mortgage</div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">List Price</div>
            <div className="text-sm font-bold">{fmt(d.pf)}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          <div className="text-[9px] text-gray-600">
            {d.t} · {d.bd}bd · {d._yield.weeks}wk
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-gray-500">{srcLabel}</span>
            <span className="text-[9px] text-gray-600 truncate max-w-[100px]">{d._yield.src}</span>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[9px] text-gray-500">Net Yield</div>
            <div className="text-sm font-bold text-emerald-400">{netYield}%</div>
          </div>
        </div>

        {/* Calculator hint */}
        <div className={`mt-3 pt-2 border-t border-[#1e1e28] flex items-center justify-center gap-1.5 transition-all ${expanded ? 'opacity-0 h-0 overflow-hidden mt-0 pt-0 border-0' : ''}`}>
          <span className="text-emerald-500 text-[10px]">🧮</span>
          <span className="text-[10px] text-emerald-600 font-medium">Click to open mortgage &amp; cashflow calculator</span>
          <span className="text-emerald-700 text-[10px]">↓</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#1c2333] p-4 bg-[#0d0d14]" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-semibold text-emerald-400">Investment Calculator</div>
            <div className="text-[10px] text-gray-500">25yr term</div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Down Payment</span>
              <span className="text-emerald-400 font-bold">{downPct}%</span>
            </div>
            <input
              type="range" min={10} max={100} step={5} value={downPct}
              onChange={e => setDownPct(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 rounded cursor-pointer"
            />
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Interest Rate</span>
              <span className="text-emerald-400 font-bold">{interestPct.toFixed(2)}%</span>
            </div>
            <input
              type="range" min={1} max={8} step={0.25} value={interestPct}
              onChange={e => setInterestPct(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">Down Payment</div>
              <div className="text-sm font-bold text-emerald-400">{fmt(downPayment)}</div>
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

          <a href={`mailto:henrik@xaviaestate.com?subject=${encodeURIComponent(`Inquiry: ${d.p}`)}&body=${encodeURIComponent(`Hi Avena,\n\nI'm interested in:\n\n${d.p}\nLocation: ${d.l}\nPrice: €${d.pf?.toLocaleString()}\nRef: ${d.ref || ''}\n\nPlease send me more details.\n\nBest regards`)}`}
            className="mt-3 block text-center text-xs font-semibold py-2 rounded transition-colors hover:opacity-90" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
            Contact Avena Team
          </a>
        </div>
      )}
    </div>
  );
}

const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'EUR €', flag: '🇪🇺' },
  { code: 'NOK', symbol: 'kr', label: 'NOK kr', flag: '🇳🇴' },
  { code: 'GBP', symbol: '£', label: 'GBP £', flag: '🇬🇧' },
  { code: 'SEK', symbol: 'kr', label: 'SEK kr', flag: '🇸🇪' },
  { code: 'DKK', symbol: 'kr', label: 'DKK kr', flag: '🇩🇰' },
];

function YieldTab({ properties, isPaid, onUpgrade, onCurrencyChange }: { properties: Property[]; isPaid: boolean; onUpgrade: () => void; onCurrencyChange?: (c: string) => void }) {
  const [sortMode, setSortMode] = useState<'yield' | 'income' | 'price'>('yield');
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('avena_currency') || 'EUR';
    return 'EUR';
  });
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1, NOK: 11.8, GBP: 0.86, SEK: 11.4, DKK: 7.46 });
  const [fxLoading, setFxLoading] = useState(false);

  useEffect(() => {
    setFxLoading(true);
    fetch('https://open.er-api.com/v6/latest/EUR')
      .then(r => r.json())
      .then(data => {
        if (data?.rates) setRates({ EUR: 1, ...data.rates });
      })
      .catch(() => {
        // Keep default fallback rates on failure
      })
      .finally(() => setFxLoading(false));
  }, []);

  const handleCurrencyChange = (c: string) => {
    setCurrency(c);
    if (typeof window !== 'undefined') localStorage.setItem('avena_currency', c);
    onCurrencyChange?.(c);
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
    <div className="pt-4 px-3 pb-3 md:p-6">
      {/* Three info boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-5">
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-widest text-emerald-600 font-bold mb-2">How It Works</div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Each property is matched to <span className="text-white">real Airbnb/Booking.com data</span> from its exact area. Nightly rates are annual averages across high, mid, and low seasons — not just the peak summer price agents show you.
          </p>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-4">
          <div className="text-[9px] uppercase tracking-widest text-emerald-600 font-bold mb-2">What&apos;s Included in Net (−25%)</div>
          <ul className="text-[11px] text-gray-400 space-y-0.5">
            <li>Airbnb platform fee <span className="text-gray-500">(14%)</span></li>
            <li>Cleaning <span className="text-gray-500">(~€35/turnover)</span></li>
            <li>IBI property tax + Insurance</li>
            <li>Community fees</li>
            <li>Utilities <span className="text-gray-500">(water, electric)</span></li>
            <li>Maintenance <span className="text-gray-500">(~€500/yr)</span></li>
          </ul>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-4">
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
      <div className="flex flex-col gap-2 bg-[#0f1419] border border-[#1c2333] rounded-lg px-4 py-2 mb-4 md:flex-row md:justify-between md:items-center">
        <div className="text-[10px] text-gray-500 leading-relaxed">
          <span className="text-gray-400">Sources:</span> AirDNA, Airbtics, Vrbo, Booking.com (2025–2026) &bull;{' '}
          <span className="text-gray-400">Occupancy:</span> 16–24 wk/yr &bull;{' '}
          <span className="text-gray-400">Self-managed</span>
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          {([['yield', 'Yield %'], ['income', 'Income'], ['price', 'Price']] as ['yield' | 'income' | 'price', string][]).map(([key, label]) => (
            <button key={key} onClick={() => setSortMode(key)}
              className={`text-[10px] px-3 py-1.5 rounded border transition-all min-h-[36px] ${sortMode === key ? 'bg-emerald-600 border-emerald-600 text-black font-semibold' : 'border-[#1c2333] text-gray-400 hover:border-emerald-600/50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <h2 className="font-serif text-lg md:text-xl text-emerald-400">Estimated Rental Yield</h2>
          <a href="https://wise.com/invite/dic/henrikk267" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] hover:shadow-lg w-fit"
            style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#163300' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12.5 2L6.5 22h3l2-7h5l-1.5 7h3L22 8.5 12.5 2zm1 11h-3.5l2-7L17 10.5 13.5 13z" fill="#163300"/></svg>
            Transfer your funds fee-free with worldwide trusted Wise →
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Currency</span>
          <div className="flex gap-1 flex-wrap">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => handleCurrencyChange(c.code)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all ${
                  currency === c.code
                    ? 'bg-[#10B981]/15 border-[#10B981]/60 text-emerald-400'
                    : 'border-[#1c2333] text-gray-500 hover:border-[#10B981]/30'
                }`}
              >
                {c.flag} {c.code}
              </button>
            ))}
            {fxLoading && <span className="text-[9px] text-gray-600 ml-1 self-center">updating...</span>}
            {!fxLoading && currency !== 'EUR' && (
              <span className="text-[9px] text-gray-600 ml-1 self-center">
                1 EUR = {(rates[currency] || 1).toFixed(2)} {currency}
              </span>
            )}
          </div>
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
              <div className="mb-1"><Lock size={20} className="mx-auto" /></div>
              <div className="text-xs text-emerald-400 font-semibold">PRO Only</div>
            </div>
          </div>
        ))}
      </div>

      {/* Paywall CTA */}
      {!isPaid && sorted.length > FREE_YIELD_LIMIT && (
        <div className="mt-6 p-6 bg-[#0f1419] border border-emerald-500/30 rounded-xl text-center">
          <div className="text-emerald-400 font-serif text-lg mb-1">
            {sorted.length - FREE_YIELD_LIMIT} more yield analyses locked
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Subscribe to see full rental yield data, cash-on-cash returns, and investment calculator for all {sorted.length} properties.
          </p>
          <button onClick={onUpgrade}
            className="px-8 py-3 rounded-lg hover:opacity-90 transition-all text-sm tracking-wide font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
            Subscribe — €79/month
          </button>
        </div>
      )}
    </div>
  );
}

function MarketTab({ properties }: { properties: Property[] }) {
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
    <div className="pt-4 px-3 pb-3 md:p-6 space-y-3 md:space-y-4">
      <h2 className="font-serif text-lg md:text-xl text-emerald-400">Market Overview</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Listings', value: properties.length.toLocaleString() },
          { label: 'Avg Price', value: formatPrice(overallAvgPrice) },
          { label: 'Median Price', value: formatPrice(medianPrice) },
          { label: 'Avg €/m²', value: `€${overallAvgM2.toLocaleString()}` },
        ].map(s => (
          <div key={s.label} className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-serif text-emerald-400">{s.value}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Avg price by region */}
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Avg Price by Region</h3>
          {regionData.map(r => (
            <div key={r.region} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{regionLabel(r.region)}</span>
                <span className="text-emerald-400 font-semibold">{formatPrice(r.avgPrice)}</span>
              </div>
              <div className="h-5 bg-[#1e1e28] rounded overflow-hidden">
                <div className="h-full bg-emerald-500/50 rounded transition-all" style={{ width: `${maxAvgPrice ? (r.avgPrice / maxAvgPrice) * 100 : 0}%` }} />
              </div>
              {r.count > 0 ? (
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>Min {formatPrice(r.minPrice)}</span>
                  <span>Max {formatPrice(r.maxPrice)}</span>
                </div>
              ) : (
                <div className="text-[10px] text-gray-700 mt-0.5 italic">No listings yet</div>
              )}
            </div>
          ))}
        </div>

        {/* Avg €/m² by region */}
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
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
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
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
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
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

      {/* 5-Year Growth Forecast by Region */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">5-Year Growth Forecast by Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {regions.map(r => {
            const rate = growthRate5yr(r);
            const pct = (rate * 100).toFixed(1);
            const maxRate = 0.10;
            return (
              <div key={r} className="flex items-center gap-3">
                <div className="w-28 flex-shrink-0 text-xs text-gray-300">{regionLabel(r)}</div>
                <div className="flex-1 h-4 bg-[#1e1e28] rounded overflow-hidden">
                  <div className="h-full bg-emerald-400/50 rounded transition-all" style={{ width: `${(rate / maxRate) * 100}%` }} />
                </div>
                <div className="w-16 text-right text-xs font-semibold text-emerald-400">{pct}% / yr</div>
              </div>
            );
          })}
        </div>
        <div className="text-[9px] text-gray-600 mt-3">Annualised avg capital appreciation forecast. 5-yr cumulative shown in property detail view.</div>
      </div>

      {/* Price distribution */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Price Distribution</h3>
        <div className="flex items-end gap-1 md:gap-2 h-24">
          {bandData.map(b => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] md:text-[9px] text-emerald-400 font-semibold">{b.count}</span>
              <div className="w-full bg-emerald-500/50 rounded-t" style={{ height: `${maxBandCount ? (b.count / maxBandCount) * 72 : 0}px` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-1 md:gap-2 mt-1">
          {bandData.map(b => (
            <div key={b.label} className="flex-1 text-center text-[7px] md:text-[8px] text-gray-600 leading-tight">{b.label}</div>
          ))}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">By Status</h3>
        <div className="flex gap-4">
          {[
            { label: 'Off-Plan', count: totalOffPlan, color: 'bg-emerald-500' },
            { label: 'Under Construction', count: totalBuilding, color: 'bg-emerald-500' },
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

      {/* Top towns — table on desktop, cards on mobile */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Top Towns</h3>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-gray-600 border-b border-[#1c2333]">
                <th className="text-left pb-2">Town</th>
                <th className="text-right pb-2">Listings</th>
                <th className="text-right pb-2">Avg Price</th>
                <th className="text-right pb-2">Avg €/m²</th>
              </tr>
            </thead>
            <tbody>
              {topTowns.map(t => (
                <tr key={t.town} className="border-b border-[#1e1e28] hover:bg-[#0f1419]">
                  <td className="py-2 text-gray-300">{t.town}</td>
                  <td className="py-2 text-right text-blue-400">{t.count}</td>
                  <td className="py-2 text-right text-emerald-400">{formatPrice(t.avgPrice)}</td>
                  <td className="py-2 text-right text-emerald-400">€{t.avgM2.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {topTowns.map(t => (
            <div key={t.town} className="flex items-center justify-between bg-[#0f1419] rounded-lg px-3 py-2.5 border border-[#1c2333]">
              <div className="flex-1 min-w-0">
                <div className="text-gray-200 text-xs font-semibold truncate">{t.town}</div>
                <div className="text-blue-400 text-[10px]">{t.count} listings</div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-emerald-400 text-xs font-bold">{formatPrice(t.avgPrice)}</div>
                <div className="text-emerald-400 text-[10px]">€{t.avgM2.toLocaleString()}/m²</div>
              </div>
            </div>
          ))}
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
          <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
            <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-4">Developer Scorecard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devs.map((dev, i) => (
                <div key={dev.name} className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-sm font-semibold text-emerald-300 truncate">{dev.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{dev.count} propert{dev.count !== 1 ? 'ies' : 'y'}</div>
                    </div>
                    <span className={`text-xl font-extrabold font-serif flex-shrink-0 ${dev.avgScore >= 70 ? 'text-emerald-400' : dev.avgScore >= 40 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{dev.avgScore}
                    </span>
                  </div>
                  {/* Score bar */}
                  <div className="h-1.5 bg-[#0a0a0f] rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${dev.avgScore}%`, background: dev.avgScore >= 70 ? '#34d399' : dev.avgScore >= 40 ? '#f59e0b' : '#f87171' }} />
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
        <div className="mb-4"><BarChart3 size={40} className="mx-auto text-emerald-400" /></div>
        <div className="font-serif text-xl text-emerald-400 mb-2">Portfolio Simulator</div>
        <p className="text-gray-400 text-sm max-w-md mx-auto">Click the <span className="text-emerald-400 font-semibold">+ Portfolio</span> button on any property card or in the deals table to add properties to your portfolio.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-x-hidden w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-xl text-emerald-400">Portfolio Simulator</h2>
        <button onClick={exportPortfolioCSV}
          className="text-xs px-3 py-1.5 bg-[#0f1419] border border-[#1c2333] hover:border-emerald-500/50 text-gray-400 hover:text-emerald-400 rounded transition-all font-semibold">
          Export CSV ↓
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Investment', value: formatPrice(totalInvestment) },
          { label: 'Gross Rental Income', value: formatPrice(totalAnnualIncome) },
          { label: 'Blended Yield', value: `${blendedYield}%` },
          { label: 'Discount Saved', value: totalDiscountSaved > 0 ? formatPrice(totalDiscountSaved) : 'N/A' },
        ].map(s => (
          <div key={s.label} className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-serif text-emerald-400">{s.value}</div>
            <div className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Diversification */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Diversification Score</div>
          <div className="h-2 bg-[#1e1e28] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all" style={{ width: `${divScore * 10}%` }} />
          </div>
        </div>
        <div className="text-2xl font-extrabold font-serif text-emerald-400">{divScore}/10</div>
        <div className="text-xs text-gray-500">
          <div>{regions.size} region{regions.size !== 1 ? 's' : ''}</div>
          <div>{types.size} type{types.size !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Portfolio mortgage calculator */}
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-5">
        <div className="text-[11px] uppercase tracking-widest text-emerald-500 mb-4">Combined Mortgage Calculator</div>
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Down Payment</span><span className="text-emerald-400 font-bold">{downPct}%</span></div>
          <input type="range" min={10} max={100} step={5} value={downPct} onChange={e => setDownPct(Number(e.target.value))} className="w-full accent-emerald-500 h-1.5 rounded cursor-pointer" />
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Interest Rate</span><span className="text-emerald-400 font-bold">{interestPct.toFixed(2)}%</span></div>
          <input type="range" min={1} max={8} step={0.25} value={interestPct} onChange={e => setInterestPct(Number(e.target.value))} className="w-full accent-emerald-500 h-1.5 rounded cursor-pointer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {[
            { label: 'Total Down Payment', value: formatPrice(downPayment), color: 'text-emerald-400' },
            { label: 'Monthly Mortgage', value: formatPrice(totalMortgageMo), color: 'text-white' },
            { label: 'Annual Profit', value: formatPrice(annualCashflow), sub: `${formatPrice(Math.round(annualCashflow/12))}/mo`, color: annualCashflow >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#0f1419] rounded-lg p-3">
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
            <div key={p.ref || p.p} className="bg-[#0f1419] border border-[#1c2333] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-emerald-300 font-semibold text-sm leading-snug">{p.p}</div>
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

function AboutTab() {
  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-6">
        <h3 className="font-serif text-lg text-emerald-400 mb-3">How the AVENA Deal Score Works</h3>
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
    <div className="bg-[#0f1419] rounded-lg p-3">
      <h4 className="text-emerald-300 text-sm font-semibold mb-1">{title}</h4>
      <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function LegalTab() {
  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-3 md:space-y-4">
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-6">
        <h3 className="font-serif text-lg text-emerald-400 mb-3">Your Investment is Secured by Law</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          All new-build properties in Spain are protected under Spanish property law. As a buyer, your investment is secured through the <span className="text-white">Spanish Land Registry (Registro de la Propiedad)</span> — the official public record of all property ownership and encumbrances in Spain. Every transaction is registered, making ownership legally binding and publicly verifiable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">Bank Guarantee on Off-Plan Purchases</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Under Spanish Law 20/2015, developers must provide a <span className="text-white">bank guarantee or insurance policy</span> for all stage payments made before completion. If the developer fails to deliver, your deposits are 100% refunded. This is mandatory — not optional.
          </p>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">Notary & Registration Process</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Every property purchase in Spain is completed before a <span className="text-white">licensed Spanish Notary</span> who verifies the legality of the transaction. The title deed (Escritura) is then registered in the Land Registry, giving you full legal ownership.
          </p>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">NIE Number (Required for Foreign Buyers)</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Non-Spanish buyers need a <span className="text-white">NIE (Número de Identificación de Extranjero)</span> — a tax ID number. This is obtained at a Spanish consulate or police station in Spain. Xavia Estate assists all buyers with this process.
          </p>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">Independent Legal Advice</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            We recommend all buyers engage an <span className="text-white">independent Spanish lawyer (Abogado)</span> to review contracts, verify the developer&apos;s licenses, and confirm no debts exist on the property. Typical legal fees are 1% of purchase price.
          </p>
        </div>
      </div>

      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-6">
        <h4 className="text-emerald-300 font-semibold mb-3 text-sm">Typical Purchase Costs (Spain)</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'VAT (IVA)', value: '10%', note: 'New builds only' },
            { label: 'Stamp Duty (AJD)', value: '1.5%', note: 'On new builds' },
            { label: 'Notary & Registry', value: '~1%', note: 'Fixed cost' },
            { label: 'Legal Fees', value: '~1%', note: 'Recommended' },
          ].map(item => (
            <div key={item.label} className="bg-[#0f1419] rounded-lg p-3 text-center">
              <div className="text-emerald-400 font-bold text-lg">{item.value}</div>
              <div className="text-white text-xs font-semibold mt-0.5">{item.label}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{item.note}</div>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3">Total acquisition cost is typically <span className="text-gray-400">+13% on top of purchase price</span> for new builds in Spain. This is reflected in our investment calculator.</p>
      </div>

      <div className="bg-[#0f1419] border border-emerald-700/20 rounded-lg p-5">
        <h4 className="text-emerald-300 font-semibold mb-2 text-sm">About Avena Estate & Xavia Estate</h4>
        <p className="text-gray-400 text-xs leading-relaxed">
          Avena Estate is an independent investment analysis platform. Property listings are sourced from <span className="text-white">Xavia Estate</span>, a licensed Spanish real estate agency operating in Costa Blanca and Costa Cálida. All transactions are handled directly by Xavia Estate and their legal partners. Avena Estate does not hold client funds or act as a property agent.
        </p>
        <div className="mt-3 flex gap-4">
          <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-300 text-xs underline">Xavia Estate website →</a>
          <a href="mailto:Henrik@xaviaestate.com" className="text-emerald-500 hover:text-emerald-300 text-xs underline">Henrik@xaviaestate.com</a>
        </div>
      </div>
    </div>
  );
}

function ContactTab() {
  return (
    <div className="p-3 md:p-10 flex justify-center">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="relative bg-gradient-to-b from-[#18141f] to-[#0f0d15] border-2 border-[#10B981]/50 rounded-3xl overflow-hidden shadow-2xl shadow-[#10B981]/10">

          {/* Gold shimmer top bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #10B981, #34d399, #10B981, transparent)' }} />

          {/* Top accent glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#10B981' }} />

          <div className="px-5 md:px-8 pt-8 md:pt-10 pb-6 md:pb-8 relative">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-extrabold font-serif text-black shadow-xl shadow-[#10B981]/30"
                  style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                  HK
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-[#0f0d15] flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #10B981, #34d399)' }}>
                  ✦
                </div>
              </div>
            </div>

            {/* Name & title */}
            <div className="text-center mb-8">
              <div className="font-serif text-3xl font-bold mb-1" style={{ background: 'linear-gradient(90deg, #10B981, #34d399, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Henrik Kolstad
              </div>
              <div className="text-[11px] uppercase tracking-[4px] text-gray-500">Founder · Avena Terminal</div>
              <div className="mt-3 text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                Spain&apos;s new-build property intelligence platform. Helping investors find real value.
              </div>
            </div>

            {/* Contact links */}
            <div className="space-y-3 mb-8">
              <a href="mailto:Henrik@xaviaestate.com"
                className="flex items-center gap-4 rounded-2xl p-4 border border-[#10B981]/20 hover:border-[#10B981]/60 transition-all group"
                style={{ background: 'rgba(16,185,129,0.05)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10B98122, #10B98144)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Direct Email</div>
                  <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: '#34d399' }}>Henrik@xaviaestate.com</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl p-4 border border-[#10B981]/20 hover:border-[#10B981]/60 transition-all group"
                style={{ background: 'rgba(16,185,129,0.05)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10B98122, #10B98144)', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">Partner Agency</div>
                  <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: '#34d399' }}>www.xaviaestate.com</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-80 transition-opacity flex-shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>

            {/* Divider */}
            <div className="h-px w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)' }} />

            {/* Footer note */}
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[3px] text-gray-700 mb-2">Licensed Real Estate · Spain</div>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                All property transactions are handled by Xavia Estate and their certified legal partners operating across Costa Blanca &amp; Costa Cálida.
              </p>
            </div>
          </div>

          {/* Gold shimmer bottom bar */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #10B981, transparent)' }} />
        </div>
      </div>
    </div>
  );
}

function CryptoTab() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.includes('@') || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/email-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'crypto' }),
      });
      setSubmitted(true);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const gt = { background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties;
  const gBg = 'linear-gradient(135deg, #00b9ff, #9fe870)';
  const divider = <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #00b9ff40, #9fe87040, transparent)' }} />;

  const svgGrad = <defs><linearGradient id="cg" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#00b9ff"/><stop offset="100%" stopColor="#9fe870"/></linearGradient></defs>;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="px-4 md:px-10 pt-8 md:pt-14 pb-10 md:pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, #00b9ff 0%, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="inline-block px-3 py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-[3px] mb-4 md:mb-6 border" style={{ borderColor: 'rgba(0,185,255,0.3)', color: '#00b9ff', background: 'rgba(0,185,255,0.06)' }}>
            Coming 2026
          </div>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 leading-tight">
            <span className="text-white">Tokenized Real Estate</span><br />
            <span style={gt}>on Avena Terminal</span>
          </h2>
          <p className="text-gray-400 text-xs md:text-base max-w-2xl mx-auto leading-relaxed">
            Fractional ownership of scored Spanish new builds. Property-backed ERC-3643 security tokens
            on Polygon. Rental yield distributed in EURC stablecoin. Built for the MiCA era.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-[10px] md:text-[11px] text-gray-500">
            <span>Deloitte projects <span className="text-white font-semibold">$4T</span> tokenized RE by 2035</span>
            <span className="text-gray-700">|</span>
            <span>Spain&apos;s digital RE market: <span className="text-white font-semibold">$1.6B</span></span>
          </div>
        </div>
      </div>

      {divider}

      {/* Three pillars */}
      <div className="px-4 md:px-10 py-10 md:py-12" style={{ background: 'linear-gradient(180deg, #0d0d14 0%, #0f1419 100%)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {[
            {
              title: 'Fractional Ownership',
              desc: 'Invest from \u20AC100 in scored Spanish new builds. Each token represents shares in a Sociedad Limitada (S.L.) that holds legal title in the Registro de la Propiedad.',
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#cg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{svgGrad}<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
            },
            {
              title: 'Security Tokens',
              desc: 'ERC-3643 compliant tokens on Polygon with on-chain identity (ONCHAINID), KYC/AML verification, and automated transfer restrictions. The standard behind $32B+ in tokenized assets.',
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#cg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{svgGrad}<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
            },
            {
              title: 'On-Chain Yield',
              desc: 'Rental income collected, costs deducted, and net yield distributed automatically to token holders in EURC (Circle) stablecoin. Transparent, auditable, MiCA-compliant.',
              icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#cg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{svgGrad}<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
            },
          ].map((card) => (
            <div key={card.title} className="group relative rounded-2xl p-5 md:p-6 border border-[#1f1f2a] hover:border-[#00b9ff30] transition-all duration-300" style={{ background: 'linear-gradient(145deg, #13131d 0%, #0e0e16 100%)' }}>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(0,185,255,0.04) 0%, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="mb-3">{card.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-sm md:text-base text-white">{card.title}</h3>
                  <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(0,185,255,0.1)', color: '#00b9ff', border: '1px solid rgba(0,185,255,0.25)' }}>In Development</span>
                </div>
                <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {divider}

      {/* How it works — 4 steps */}
      <div className="px-4 md:px-10 py-10 md:py-12">
        <h3 className="text-base md:text-lg font-bold mb-8 text-center" style={gt}>How Tokenized Property Works</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { step: '01', title: 'Score & Select', desc: 'Avena\'s algorithm scores 1,867+ new builds on value, yield, location, quality, and risk. Only top properties qualify for tokenization.' },
            { step: '02', title: 'SPV & Legal', desc: 'A Spanish S.L. is created per property. Title registered at the Registro de la Propiedad. Tokens represent shares in the S.L. under EU securities law.' },
            { step: '03', title: 'Token Issuance', desc: 'ERC-3643 security tokens issued on Polygon. Identity verified via ONCHAINID. Full KYC/AML through SEPBLAC-compliant providers.' },
            { step: '04', title: 'Yield Payout', desc: 'Rental income collected monthly. Costs deducted (management, IBI, insurance, community). Net yield distributed in EURC to token holder wallets.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="text-2xl md:text-3xl font-bold mb-2" style={gt}>{item.step}</div>
              <h4 className="text-white font-semibold text-[11px] md:text-sm mb-1 md:mb-2">{item.title}</h4>
              <p className="text-gray-500 text-[10px] md:text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {divider}

      {/* Key metrics */}
      <div className="px-4 md:px-10 py-10 md:py-12" style={{ background: 'linear-gradient(180deg, #0d0d14 0%, #0f1419 100%)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {[
            { value: '$4T', label: 'Projected Market 2035', sub: 'Deloitte forecast' },
            { value: '1,867', label: 'Properties Scored', sub: 'Avena pipeline' },
            { value: '5\u20138%', label: 'Gross Yield Range', sub: 'Spanish coastal' },
            { value: '$32B+', label: 'ERC-3643 Assets', sub: 'Global standard' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-xl md:text-3xl font-bold mb-0.5" style={gt}>{stat.value}</div>
              <div className="text-white text-[10px] md:text-xs font-medium">{stat.label}</div>
              <div className="text-gray-600 text-[9px] md:text-[10px]">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {divider}

      {/* Regulatory & Legal */}
      <div className="px-4 md:px-10 py-10 md:py-12">
        <h3 className="text-base md:text-lg font-bold mb-6 text-center" style={gt}>EU Regulatory Framework</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {[
            { title: 'MiCA Regulation', desc: 'Fully applicable since December 2024. Property tokens classified as securities under MiFID II. Stablecoin distributions (EURC) regulated as e-money tokens under MiCA.' },
            { title: 'Spanish Securities Law', desc: 'CNMV authorization required for token issuance. Prospectus exemption available for offers under \u20AC8M per property per year. DLT securities issued under LMVSI (2023).' },
            { title: 'SPV Structure', desc: 'Each property held by a Sociedad Limitada (S.L.). Token holders own shares in the S.L. Legal title stays in the Registro de la Propiedad under the SPV name.' },
            { title: 'KYC/AML Compliance', desc: 'Regulated by SEPBLAC under Law 10/2010. All token holders complete identity verification before purchase. Ongoing transaction monitoring and suspicious activity reporting.' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl p-4 md:p-5 border border-[#1f1f2a]" style={{ background: '#0e0e16' }}>
              <h4 className="text-white font-semibold text-xs md:text-sm mb-2">{item.title}</h4>
              <p className="text-gray-500 text-[10px] md:text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {divider}

      {/* Market landscape */}
      <div className="px-4 md:px-10 py-10 md:py-12" style={{ background: 'linear-gradient(180deg, #0d0d14 0%, #0f1419 100%)' }}>
        <h3 className="text-base md:text-lg font-bold mb-6 text-center" style={gt}>Market Landscape</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {[
            { name: 'RealT', region: 'United States', stat: '970+ properties tokenized', detail: '65,000+ investors. $50 minimum. Weekly yield in USDC on Gnosis Chain. Delaware Series LLC per property.' },
            { name: 'Blocksquare', region: 'Europe', stat: '$200M+ tokenized', detail: 'White-label SaaS for marketplace operators. EU-compliant Luxembourg framework. Integrated with land registries.' },
            { name: 'OpenBrick', region: 'Spain', stat: 'BME/SIX-backed', detail: 'Founded by Grupo Lar + Renta 4 Banco. Will operate under EU DLT Pilot Regime via Iberclear. Madrid rental focus.' },
            { name: 'Brickken', region: 'Barcelona', stat: '$500M+ tokenized', detail: '150+ clients across 30 countries. Token Suite platform. 280% revenue growth 2025. EBITDA-positive.' },
          ].map((p) => (
            <div key={p.name} className="rounded-xl p-4 md:p-5 border border-[#1f1f2a] flex flex-col" style={{ background: '#0e0e16' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-bold text-sm">{p.name}</h4>
                <span className="text-[8px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,185,255,0.08)', color: '#00b9ff', border: '1px solid rgba(0,185,255,0.2)' }}>{p.region}</span>
              </div>
              <div className="text-xs font-semibold mb-1" style={gt}>{p.stat}</div>
              <p className="text-gray-500 text-[10px] md:text-xs leading-relaxed">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {divider}

      {/* Tech stack */}
      <div className="px-4 md:px-10 py-10 md:py-12">
        <h3 className="text-base md:text-lg font-bold mb-6 text-center" style={gt}>Infrastructure Stack</h3>
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8">
          {['Polygon PoS', 'ERC-3643 / T-REX', 'ONCHAINID', 'Chainlink Oracles', 'EURC (Circle)', 'Fireblocks Custody', 'SEPBLAC KYC/AML', 'Spanish S.L. SPV', 'CNMV Authorized'].map((tag) => (
            <span key={tag} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-xs font-medium border" style={{ borderColor: 'rgba(0,185,255,0.2)', color: '#9CA3AF', background: 'rgba(0,185,255,0.04)' }}>
              {tag}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { label: 'Token Standard', value: 'ERC-3643', desc: 'Modular compliance. Identity layer. Transfer restrictions. $32B+ deployed globally.' },
            { label: 'Network', value: 'Polygon', desc: 'Sub-cent gas fees. 420+ enterprise deployments. Ethereum security via checkpoints.' },
            { label: 'Yield Currency', value: 'EURC', desc: 'Circle\'s MiCA-compliant euro stablecoin. 41% euro stablecoin market share. No FX conversion.' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-4 border border-[#1f1f2a]" style={{ background: '#0e0e16' }}>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{item.label}</div>
              <div className="text-lg font-bold mb-1" style={gt}>{item.value}</div>
              <p className="text-gray-500 text-[10px] md:text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {divider}

      {/* Avena advantage */}
      <div className="px-4 md:px-10 py-10 md:py-12" style={{ background: 'linear-gradient(180deg, #0d0d14 0%, #0f1419 100%)' }}>
        <h3 className="text-base md:text-lg font-bold mb-6 text-center" style={gt}>The Avena Advantage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div className="rounded-xl p-5 border border-[#1f1f2a]" style={{ background: '#0e0e16' }}>
            <h4 className="text-white font-bold text-sm mb-3">Pre-Scored Pipeline</h4>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              No other Spanish tokenization platform has a ready pipeline of 1,867 investment-scored properties with rental yield data, sub-scores, and market benchmarks.
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Current Spanish projects are one-off deals. Avena can tokenize at scale from day one, selecting only top-scoring assets for maximum investor returns.
            </p>
          </div>
          <div className="rounded-xl p-5 border border-[#1f1f2a]" style={{ background: '#0e0e16' }}>
            <h4 className="text-white font-bold text-sm mb-3">Revenue Model</h4>
            <div className="space-y-2">
              {[
                ['Token issuance', '1\u20133% of property value'],
                ['Transaction fee', '0.5\u20132% per trade'],
                ['Management fee', '2\u20135% of gross rental'],
                ['Yield distribution', 'Automated via smart contract'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {divider}

      {/* Email capture */}
      <div className="px-4 md:px-10 py-12 md:py-14 text-center">
        <div className="mb-6">
          <div className="text-3xl md:text-4xl font-bold" style={{ color: '#10B981' }}>847</div>
          <div className="text-gray-500 text-xs uppercase tracking-wider">investors on the waitlist</div>
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Get Early Access</h3>
        <p className="text-gray-500 text-xs md:text-sm mb-6 max-w-md mx-auto">Be the first to invest in tokenized Spanish real estate when we launch.</p>
        {submitted ? (
          <div className="text-sm font-bold" style={gt}>You&apos;re on the list. We&apos;ll be in touch.</div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
              style={{ background: '#0a0a10', borderColor: '#1c2333' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00b9ff50'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1c2333'; }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-lg font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: gBg, color: '#0a0a10' }}
            >
              {submitting ? '...' : 'Notify Me'}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 md:px-10 py-6 text-center">
        <p className="text-[9px] md:text-[10px] text-gray-600 tracking-wide">Built on MiCA-compliant infrastructure &middot; EU regulated &middot; CNMV framework &middot; Avena Estate</p>
      </div>
    </div>
  );
}

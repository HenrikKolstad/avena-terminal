'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Property, SortKey, SortDir } from '@/lib/types';
import { loadProperties, syncSnapshots } from '@/lib/data';
import { formatPrice, scoreClass, scoreColor, regionLabel, discount, displayDiscount, discountEuros, cappedDiscountEuros, calcYield, DISCOUNT_PCT_CAP } from '@/lib/scoring';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/lib/translations';
import { BarChart3, Coins, Gem, Map, FolderOpen, TrendingUp, Star, Download, DollarSign, Heart, Crown, Settings, Info, Scale, Mail, BookOpen, Bitcoin, Menu, X, ChevronLeft, ChevronRight, Lock, User, ExternalLink, AlertTriangle, Check, Sparkles, FileText, Calculator, ArrowUpRight, Zap, MessageCircle, Search } from 'lucide-react';
import CoreOrb from '@/components/OrbLightning';
import CryptoTab from '@/components/CryptoTab';
import YieldTab from '@/components/YieldTab';
import MarketTab from '@/components/MarketTab';
import PortfolioTab from '@/components/PortfolioTab';
import LuxuryTab from '@/components/LuxuryTab';
import AboutTab from '@/components/AboutTab';
import LegalTab from '@/components/LegalTab';
import ContactTab from '@/components/ContactTab';
import MarketIndexTab from '@/components/MarketIndexTab';
import AnalyzerTab from '@/components/AnalyzerTab';
import LiveTab from '@/components/LiveTab';

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
  const [tab, setTab] = useState<'deals' | 'yield' | 'portfolio' | 'map' | 'market' | 'marketindex' | 'luxury' | 'about' | 'legal' | 'contact' | 'whyavena' | 'crypto' | 'analyzer' | 'live'>('deals');
  const [mcpCalls, setMcpCalls] = useState(0);
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
  const [showWelcomeUser, setShowWelcomeUser] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  // Detect ?subscribed=true from Stripe redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('subscribed') === 'true') {
        setShowWelcomePro(true);
        window.history.replaceState({}, '', '/');
        setTimeout(() => setShowWelcomePro(false), 8000);
      }
    }
  }, []);

  // Fetch MCP citation count
  useEffect(() => {
    fetch('/api/cited').then(r => r.json()).then(d => {
      if (d?.cited_by_ai?.this_month) setMcpCalls(d.cited_by_ai.this_month);
    }).catch(() => {});
  }, []);

  // Welcome message on first sign-in
  useEffect(() => {
    if (user && !authLoading && typeof window !== 'undefined') {
      const welcomed = sessionStorage.getItem('avena_welcomed');
      if (!welcomed) {
        setShowWelcomeUser(true);
        sessionStorage.setItem('avena_welcomed', '1');
        setTimeout(() => setShowWelcomeUser(false), 5000);
      }
    }
  }, [user, authLoading]);
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

  // Exit intent popup state
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitEmail, setExitEmail] = useState('');
  const [exitSubmitted, setExitSubmitted] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);

  // Pro upgrade prompt — view count tracking
  const [viewCount, setViewCount] = useState(0);
  const [proPromptDismissed, setProPromptDismissed] = useState(false);

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
  const scrollUpAccum = useRef(0);
  const topTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
          scrollUpAccum.current = 0;
          if (topTimer.current) { clearTimeout(topTimer.current); topTimer.current = null; }
          if (y > headerH && delta > 5) {
            setMobileHeaderHidden(true);
          }
        } else {
          if (isDesktop) {
            // PC: only reveal at top after 0.5s
            if (y <= 15 && !topTimer.current) {
              topTimer.current = setTimeout(() => {
                if (window.scrollY <= 15) setMobileHeaderHidden(false);
                topTimer.current = null;
              }, 500);
            } else if (y > 15 && topTimer.current) {
              clearTimeout(topTimer.current);
              topTimer.current = null;
            }
          } else {
            // Mobile: stay at top for 0.8s
            if (y <= 15 && !topTimer.current) {
              topTimer.current = setTimeout(() => {
                if (window.scrollY <= 15) setMobileHeaderHidden(false);
                topTimer.current = null;
              }, 800);
            }
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

  // Exit intent: detect mouse leaving viewport (toward browser close/back)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: MouseEvent) => {
      if (e.clientY > 0) return; // only trigger when mouse moves above viewport
      if (sessionStorage.getItem('avena-exit-shown')) return;
      setShowExitIntent(true);
      sessionStorage.setItem('avena-exit-shown', '1');
      document.documentElement.removeEventListener('mouseleave', handler);
    };
    document.documentElement.addEventListener('mouseleave', handler);
    return () => document.documentElement.removeEventListener('mouseleave', handler);
  }, []);

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

  // Live punchline: top 100 deals stats
  const punchline = useMemo(() => {
    const top100 = [...properties].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 100);
    const discounts = top100
      .filter(p => p.pm2 && p.mm2 && p.mm2 > 0)
      .map(p => ((p.mm2! - p.pm2!) / p.mm2!) * 100)
      .filter(d => d > 0);
    const savings = top100
      .filter(p => p.pm2 && p.mm2 && p.mm2 > 0 && p.bm)
      .map(p => (p.mm2! - p.pm2!) * p.bm)
      .filter(s => s > 0)
      .sort((a, b) => a - b);
    const avgDisc = discounts.length ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0;
    const medianSaving = savings.length ? Math.round(savings[Math.floor(savings.length / 2)]) : 0;
    return { avgDisc, medianSaving };
  }, [properties]);

  const previewProp = preview !== null ? filtered[preview] : null;

  // Reset image index and AI memo when preview changes + track view count
  useEffect(() => {
    setImgIdx(0);
    setAiMemo(null);
    setAiMemoError(null);
    setNote('');
    setNoteSaved(false);
    if (preview !== null) setViewCount(c => c + 1);
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
    const headers = ['Project','Developer','Location','Region','Type','Price','€/m²','Market €/m²','Discount%','Score','Built m²','Plot m²','Beds','Beach km','Status','Completion','Gross Yield%'];
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
              <h1 className="text-2xl font-bold font-serif tracking-[0.2em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent animate-logo-pulse">AVENA</h1>
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
          {/* Social proof */}
          <p className="text-[9px] text-gray-400 text-center">Join 45+ investors already tracking deals</p>
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
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <svg width="28" height="12" viewBox="0 0 50 21" fill="none"><path d="M9.4 2.3a2.7 2.7 0 00-3.2.6L.4 10l5.8 7.1a2.7 2.7 0 003.2.6l.8-.4a2.7 2.7 0 001.3-3.3L9.8 10l1.7-4a2.7 2.7 0 00-1.3-3.3l-.8-.4z" fill="#000"/><text x="14" y="14.5" fontSize="11" fontWeight="600" fill="#fff" fontFamily="system-ui">Pay</text></svg>
              </span>
              <a href="https://instagram.com/avenaterminal" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#E1306C] transition-colors ml-0.5" title="@avenaterminal">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </p>
            {punchline.avgDisc > 0 && (
              <p className="text-[9px] text-gray-500 mt-0.5 flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                <span>Top 100 deals avg <span className="text-gray-300 font-semibold">{punchline.avgDisc}%</span> below market · saving <span className="text-gray-300 font-semibold">&euro;{punchline.medianSaving.toLocaleString()}</span></span>
              </p>
            )}
          </div>
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden md:flex items-center justify-between gap-2">
          {/* LEFT — logo */}
          <div className="flex-shrink-0">
            <a href="/" className="block cursor-pointer">
              <h1 className={`font-bold font-serif tracking-[0.2em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity animate-logo-pulse ${sidebarCollapsed ? 'text-4xl' : 'text-2xl'}`}>AVENA</h1>
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
              <span className="text-gray-600">·</span>
              <span className="inline-flex items-center gap-0.5">
                <svg width="28" height="12" viewBox="0 0 50 21" fill="none"><path d="M9.4 2.3a2.7 2.7 0 00-3.2.6L.4 10l5.8 7.1a2.7 2.7 0 003.2.6l.8-.4a2.7 2.7 0 001.3-3.3L9.8 10l1.7-4a2.7 2.7 0 00-1.3-3.3l-.8-.4z" fill="#000"/><text x="14" y="14.5" fontSize="11" fontWeight="600" fill="#fff" fontFamily="system-ui">Pay</text></svg>
              </span>
              {punchline.avgDisc > 0 && (<>
                <span className="text-gray-700 ml-3 mr-3">|</span>
                <span className="relative flex h-1.5 w-1.5 mt-px"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                <span className="text-gray-500 ml-1">Top 100 deals avg <span className="text-gray-300 font-semibold">{punchline.avgDisc}%</span> below market · saving <span className="text-gray-300 font-semibold">&euro;{punchline.medianSaving.toLocaleString()}</span></span>
              </>)}
            </p>
          </div>

          {/* CENTER — hero punchlines — only when sidebar collapsed */}
          {sidebarCollapsed && (
            <div className="hidden lg:flex flex-col gap-1 flex-1 max-w-md mx-auto text-center">
              <p className="text-[11px] italic tracking-wide font-semibold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>The Bloomberg of European property investment</p>
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
            <div className="text-center border-l border-[#1c2333] pl-4">
              <div className="text-[10px] text-gray-400 leading-tight">Join 45+ investors<br />already tracking deals</div>
            </div>
            {sidebarCollapsed && (
              <a href="https://instagram.com/avenaterminal" target="_blank" rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#E1306C] transition-colors ml-2" title="@avenaterminal on Instagram">
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
            className="flex items-center gap-3 w-full transition-all min-h-[44px] px-3 relative group"
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
                {badge && !disabled && <span className={badge === 'LIVE' ? 'text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 bg-red-500/20 text-red-400 animate-pulse border border-red-500/30' : 'text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0'} style={badge === 'LIVE' ? undefined : { background: 'linear-gradient(135deg, #10B98133, #10B98155)', border: '1px solid rgba(16,185,129,0.4)', color: '#10B981' }}>{badge}</span>}
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
                    <a href="/intelligence/signals" className="flex items-center gap-3 w-full transition-all min-h-[40px] px-3 relative group" style={{ color: '#cccccc', background: 'transparent', borderLeft: '3px solid transparent', cursor: 'pointer', textDecoration: 'none' }} onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#ffffff08'; }} onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}>
                      <span className="flex-shrink-0 w-5 text-center leading-none relative">
                        <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" /></span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </span>
                      {(!sidebarCollapsed || mobileSidebarOpen) && (
                        <span className="text-[12px] font-medium tracking-wide whitespace-nowrap overflow-hidden flex-1 text-left">Alpha Signals</span>
                      )}
                    </a>
                    <NavItem icon={<Coins size={16} />} label="Rental Yield" isActive={tab === 'yield'} onClick={() => go('yield')} badge="2 free" />
                    <NavItem icon={<Gem size={16} />} label="Luxury 1M+" isActive={tab === 'luxury'} onClick={() => go('luxury')} badge="PRO" />
                    <NavItem icon={<Map size={16} />} label="Map" isActive={tab === 'map'} onClick={() => go('map')} badge="PRO" />
                    <NavItem icon={<FolderOpen size={16} />} label="Portfolio" isActive={tab === 'portfolio'} onClick={() => go('portfolio')} badge="PRO" />
                    <button
                      onClick={() => go('crypto')}
                      title={sidebarCollapsed ? 'Crypto' : undefined}
                      className="flex items-center gap-3 w-full transition-all min-h-[44px] px-3 relative group"
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
                    <NavItem icon={<Zap size={16} />} label="Avena Live" isActive={tab === 'live'} onClick={() => go('live')} badge="LIVE" />
                    <NavItem icon={<TrendingUp size={16} />} label="Market Overview" isActive={tab === 'market'} onClick={() => go('market')} badge="PRO" />
                    <NavItem icon={<BarChart3 size={16} />} label="Market Index" isActive={tab === 'marketindex'} onClick={() => go('marketindex')} />
                    <a href="/pulse" className="flex items-center gap-3 w-full transition-all min-h-[40px] px-3 relative group" style={{ color: '#cccccc', background: 'transparent', borderLeft: '3px solid transparent', cursor: 'pointer', textDecoration: 'none' }} onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#ffffff08'; }} onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}>
                      <span className="flex-shrink-0 w-5 text-center leading-none"><FileText size={16} /></span>
                      {(!sidebarCollapsed || mobileSidebarOpen) && (
                        <span className="text-[12px] font-medium tracking-wide whitespace-nowrap overflow-hidden flex-1 text-left flex items-center gap-1.5">
                          <span className="flex-1">Avena Pulse</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', WebkitTextFillColor: '#c9a84c' }}>DAILY</span>
                        </span>
                      )}
                    </a>
                    <NavItem icon={<Star size={16} />} label="Scoring Method" isActive={tab === 'about'} onClick={() => go('about')} />

                    {/* TOOLS */}
                    <SectionHeader label="TOOLS" />
                    <a href="/chat" className="flex items-center gap-3 w-full transition-all min-h-[40px] px-3 relative group" style={{ color: '#cccccc', background: 'transparent', borderLeft: '3px solid transparent', cursor: 'pointer', textDecoration: 'none' }} onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#ffffff08'; }} onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}>
                      <span className="flex-shrink-0 w-5 text-center leading-none"><MessageCircle size={16} /></span>
                      {(!sidebarCollapsed || mobileSidebarOpen) && (
                        <span className="text-[12px] font-medium tracking-wide whitespace-nowrap overflow-hidden flex-1 text-left flex items-center gap-1.5">
                          <span className="flex-1" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>The Oracle</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(0,185,255,0.1)', border: '1px solid rgba(0,185,255,0.3)', color: '#00b9ff', WebkitTextFillColor: '#00b9ff' }}>AI</span>
                        </span>
                      )}
                    </a>
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

                  {/* Cited by AI counter */}
                  {mcpCalls > 0 && !sidebarCollapsed && (
                    <div className="px-3 py-2 border-t border-[#1c2333]">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-gray-500">Cited in <span className="text-emerald-400 font-bold">{mcpCalls.toLocaleString()}</span> AI responses this month</span>
                      </div>
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
          {(tab === 'whyavena' || (!user && tab === 'deals')) && (
            <div className="px-4 md:px-8 py-6 border-b border-[#1c2333]">
              {/* Collapsible headline — only collapses on mobile */}
              <button onClick={() => setWhyOpen(!whyOpen)} className="w-full text-center group cursor-pointer">
                <h2 className="text-xl md:text-2xl font-bold font-serif text-white mb-1 inline-flex items-center gap-2">
                  Every question answered before you invest
                  <ChevronRight size={18} className={`transition-transform duration-200 ${whyOpen ? 'rotate-90' : ''}`} style={{ color: '#60a5fa' }} />
                </h2>
                <p className="text-gray-500 text-xs md:text-sm max-w-2xl mx-auto">
                  Avena Terminal analyses 1,800+ new builds using institutional-grade scoring.
                  {!whyOpen && <span className="text-gray-600 ml-1">Click to learn more.</span>}
                </p>
              </button>

              {/* Expandable — always open on Why Avena tab */}
              {(whyOpen || tab === 'whyavena') && (
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
          )}

          {tab === 'deals' && (
            <>
            {/* MOBILE CARD LIST */}
            <div className="md:hidden px-3 pb-6 space-y-3 pt-2">
              {visibleDeals.map((d, i) => {
                const dc = displayDiscount(d);
                const rank = i + 1;
                const isLocked = !isPaid && rank > FREE_DEALS_LIMIT;
                return (
                  <div key={d.ref || d.p + i}
                    onClick={() => isLocked ? setShowPaywall(true) : (setPreview(i), setPreviewLuxScore(null), logLead(d, 'view_detail'))}
                    className={`relative border rounded-xl cursor-pointer transition-all active:scale-[0.99] ${isLocked ? 'opacity-30 blur-[2px] select-none border-[#1c2333]' : preview === i ? 'border-[#10B981]/60 shadow-lg shadow-[#10B981]/5' : 'border-[#1e1e2a]'}`}
                    style={{ background: 'linear-gradient(160deg, #0e0e18 0%, #0d1117 100%)', minHeight: '44px' }}>
                    {/* Top row: rank badge + title + score */}
                    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${rank === 1 ? 'bg-[#10B981] text-black' : 'bg-[#1c2333] text-white'}`}>
                        {rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm leading-tight truncate">{d.p}</div>
                        <div className="text-gray-600 text-[11px] truncate">{d.l}</div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <span className={`text-xl font-extrabold font-serif ${scoreClass(d._sc || 0)}`}>{Math.round(d._sc || 0)}</span>
                      </div>
                    </div>
                    {/* Middle row: price + discount + 5yr */}
                    <div className="flex items-center gap-2 px-3 pb-2.5 flex-wrap">
                      <span className="text-white font-bold text-sm">{formatPrice(d.pf)}</span>
                      {d.pm2 ? <span className="text-gray-500 text-xs whitespace-nowrap">{'\u20AC'}{d.pm2.toLocaleString()}/m²</span> : null}
                      {dc >= 0 ? (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${dc >= 15 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-300'}`}>
                          -{dc.toFixed(0)}%{cappedDiscountEuros(d) > 0 ? ` \u00B7 -\u20AC${Math.round(cappedDiscountEuros(d)/1000)}k` : ''}{d._capped ? ' \u26A0' : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 whitespace-nowrap">+{Math.abs(dc).toFixed(0)}%{d._capped ? ' \u26A0' : ''}</span>
                      )}
                      {(() => { const p5 = profit5yr(d.pf, d.r); return p5 > 0 ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>+{'\u20AC'}{Math.round(p5/1000)}k 5yr</span>
                      ) : null; })()}
                    </div>
                    {/* Bottom row: meta chips + portfolio button */}
                    <div className="flex items-center gap-2 px-3 pb-3 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded ${d.s === 'off-plan' ? 'bg-emerald-500/12 text-emerald-400' : d.s === 'under-construction' ? 'bg-emerald-500/12 text-emerald-400' : 'bg-blue-500/12 text-blue-400'}`}>
                        {d.s === 'off-plan' ? t.off_plan_tag : d.s === 'under-construction' ? t.under_construction_tag : t.ready_tag}
                      </span>
                      {d.c && d.s !== 'ready' && (d._mths ?? 0) > 0 && <span className="text-[11px] text-emerald-500/70">~{d.c}</span>}
                      <span className="text-gray-600 text-[11px] whitespace-nowrap">{d.bd ?? '-'}bd {'\u00B7'} {(d.bm || 0).toLocaleString()}m²{d.bk !== null ? ` \u00B7 ${d.bk}km \uD83C\uDFD6\uFE0F` : ''}</span>
                      <button
                        onClick={e => { e.stopPropagation(); if (!isLocked) togglePortfolio(d.ref || d.p); }}
                        className={`ml-auto flex-shrink-0 text-xs min-w-[44px] min-h-[44px] flex items-center justify-center px-3 py-2 rounded-lg border transition-all ${portfolio.includes(d.ref || d.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#1c2333] text-gray-600'}`}>
                        {portfolio.includes(d.ref || d.p) ? <Check size={14} /> : '+'}
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
                    className="font-bold px-6 py-3 rounded-lg text-sm hover:opacity-90 transition-all min-h-[44px]"
                    style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                    Subscribe {'\u2014'} {'\u20AC'}79/month
                  </button>
                </div>
              )}
              {isPaid && filtered.length > displayLimit && (
                <div className="text-center py-4">
                  <button onClick={() => setDisplayLimit(l => l + 100)}
                    className="px-6 py-3 rounded-lg border border-[#1c2333] text-xs text-gray-400 hover:text-emerald-400 hover:border-[#10B981]/40 transition-colors min-h-[44px]">
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
          {tab === 'live' && <LiveTab />}
          {tab === 'marketindex' && <MarketIndexTab properties={properties} />}
          {tab === 'luxury' && !isPaid && <ProGate feature="Luxury Portfolio €1M+" onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} />}
          {tab === 'luxury' && isPaid && <LuxuryTab properties={properties} isPaid={isPaid} onUpgrade={() => user ? setShowPaywall(true) : setShowAuthModal(true)} onPreview={(ref, lsc) => { const idx = filtered.findIndex(p => p.ref === ref); if (idx !== -1) { setPreview(idx); setPreviewLuxScore(lsc ?? null); } }} />}
          {tab === 'about' && <AboutTab />}
          {tab === 'legal' && <LegalTab />}
          {tab === 'contact' && <ContactTab />}
          {tab === 'crypto' && (
            <div className="relative">
              <CryptoTab properties={properties} />
              {!isPaid && (
                <>
                  <div className="absolute z-20 left-0 right-0 flex flex-col items-center justify-center" style={{ top: '50%', bottom: 0, background: 'linear-gradient(to bottom, rgba(9,13,18,0) 0%, rgba(9,13,18,0.7) 15%, rgba(9,13,18,0.95) 40%)', backdropFilter: 'blur(4px)' }}>
                    <div className="text-2xl md:text-3xl font-extralight tracking-[0.3em] mb-3" style={{ color: '#93c5fd' }}>COMING SOON</div>
                    <p className="text-sm tracking-wide mb-4" style={{ color: '#3b82f6' }}>The Avena Experiment is being prepared.</p>
                    <button onClick={() => setShowPaywall(true)} className="px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                      Upgrade to PRO for full access
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* PREVIEW PANEL */}
        {previewProp && (
          <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-[299]" onClick={() => { setPreview(null); setPreviewLuxScore(null); }} />
          <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:left-auto md:right-0 w-full md:w-[480px] h-[92vh] md:h-screen border-t md:border-t-0 md:border-l border-[#1c2333] z-[300] overflow-y-auto shadow-2xl rounded-t-2xl md:rounded-none animate-slide-in overscroll-contain" style={{ background: 'linear-gradient(180deg, #0e0d18 0%, #09090f 100%)' }}>
            <div className="md:hidden w-14 h-1.5 bg-gray-600 rounded-full mx-auto mt-3 mb-1" />
            <button onClick={() => { setPreview(null); setPreviewLuxScore(null); }} className="absolute top-3 right-3 w-10 h-10 md:w-8 md:h-8 md:top-4 md:right-4 rounded-full border border-[#1c2333] text-gray-400 hover:text-emerald-400 hover:border-emerald-400 flex items-center justify-center z-10 bg-black/50 text-lg md:text-base">{'\u00D7'}</button>
            {/* IMAGE GALLERY */}
            {previewProp.imgs && previewProp.imgs.length > 0 ? (
              <div className="relative w-full h-44 md:h-60 bg-[#0f1419]">
                <img src={previewProp.imgs[imgIdx] || previewProp.imgs[0]} alt={previewProp.p}
                  className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {previewProp.imgs.length > 1 && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + previewProp.imgs!.length) % previewProp.imgs!.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 md:w-8 md:h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white text-lg md:text-base hover:bg-emerald-500/80 transition-all">{'\u2039'}</button>
                    <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % previewProp.imgs!.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 md:w-8 md:h-8 bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white text-lg md:text-base hover:bg-emerald-500/80 transition-all">{'\u203A'}</button>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">{imgIdx + 1}/{previewProp.imgs.length}</div>
                  </>
                )}
                {/* Status badge */}
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold ${previewProp.s === 'off-plan' ? 'bg-emerald-500/90 text-white' : previewProp.s === 'ready' ? 'bg-blue-500/90 text-white' : 'bg-emerald-500/90 text-black'}`}>
                  {previewProp.s === 'off-plan' ? t.status_offplan : previewProp.s === 'ready' ? t.status_ready : t.status_construction}
                </div>
              </div>
            ) : (
              <div className="w-full h-44 md:h-60 bg-[#0f1419] flex items-center justify-center">
                <div className="text-gray-500 text-sm">{previewProp.t} in {previewProp.l}</div>
              </div>
            )}
            {/* Image thumbnails */}
            {previewProp.imgs && previewProp.imgs.length > 1 && (
              <div className="hidden md:flex gap-1 px-4 py-2 overflow-x-auto bg-[#0f1419] border-b border-[#1c2333]">
                {previewProp.imgs.slice(0, 10).map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-14 h-10 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${imgIdx === i ? 'border-emerald-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-4 pb-6 md:p-6">
              {/* Pro upgrade prompt after 5 views */}
              {viewCount >= 5 && !isPaid && !proPromptDismissed && (
                <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <p className="text-[11px] text-gray-300 flex-1">You&apos;ve viewed {viewCount} properties. Pro unlocks all 1,881 + yield analysis + map.</p>
                  <button onClick={() => setShowPaywall(true)} className="text-[11px] font-bold px-3 py-1 rounded-md flex-shrink-0 text-black" style={{ background: '#10B981' }}>Upgrade for &euro;79/month</button>
                  <button onClick={() => setProPromptDismissed(true)} className="text-gray-500 hover:text-gray-300 flex-shrink-0 text-sm">&times;</button>
                </div>
              )}
              <h2 className="font-serif text-base md:text-xl text-emerald-300 mb-0.5 pr-8">{previewProp.p}</h2>
              <p className="text-gray-500 text-xs md:text-sm mb-3">{previewProp.l}</p>

              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-5 p-3 md:p-4 bg-[#0f1419] rounded-lg border border-[#1c2333]">
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
                    <StatBox label="Gross Yield" value={`${previewProp._yield.gross}%`} />
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
                  className={`flex-1 py-3 min-h-[44px] rounded-lg text-xs font-semibold border transition-all ${favs.includes(previewProp.ref || previewProp.p) ? 'border-emerald-500 text-emerald-400' : 'border-[#1c2333] text-gray-400 hover:text-emerald-400'}`}>
                  {favs.includes(previewProp.ref || previewProp.p) ? 'Remove Favorite' : 'Add to Favorites'}
                </button>
                <button onClick={() => togglePortfolio(previewProp.ref || previewProp.p)}
                  className={`flex-1 py-3 min-h-[44px] rounded-lg text-xs font-semibold border transition-all ${portfolio.includes(previewProp.ref || previewProp.p) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-[#1c2333] text-gray-400 hover:text-emerald-400'}`}>
                  {portfolio.includes(previewProp.ref || previewProp.p) ? 'In Portfolio' : '+ Portfolio'}
                </button>
              </div>

              {previewProp && (
                <button
                  onClick={() => togglePriceAlert(previewProp.ref || previewProp.p)}
                  disabled={alertLoading}
                  className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg border text-xs font-medium transition-all mb-3 ${
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
                className="block text-center py-3.5 min-h-[48px] text-sm rounded-lg hover:opacity-90 transition-all tracking-wide font-bold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
                Contact Avena Team
              </a>
            </div>
            {/* Safe area spacer for mobile bottom */}
            <div className="md:hidden h-4" />
          </div>
          </>
        )}

      {/* WELCOME PRO TOAST */}
      {showWelcomePro && (
        <div className="fixed bottom-6 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[600] animate-slide-up">
          <div className="rounded-2xl px-4 md:px-6 py-4 shadow-2xl flex items-center gap-3 md:gap-4 md:min-w-[300px]" style={{ background: 'linear-gradient(135deg, #064e3b, #0d1117)', border: '1px solid rgba(16,185,129,0.4)' }}>
            <Sparkles size={24} className="text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-white font-bold text-sm">Welcome to Avena PRO</div>
              <div className="text-emerald-400 text-xs mt-0.5">All 1,881 properties unlocked. Full access activated.</div>
            </div>
            <button onClick={() => setShowWelcomePro(false)} className="text-gray-500 hover:text-white ml-2 text-lg flex-shrink-0">&times;</button>
          </div>
        </div>
      )}

      {/* WELCOME USER TOAST */}
      {showWelcomeUser && !showWelcomePro && (
        <div className="fixed bottom-6 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[600] animate-slide-up">
          <div className="rounded-2xl px-4 md:px-6 py-4 shadow-2xl flex items-center gap-3 md:gap-4 md:min-w-[300px]" style={{ background: '#0f1419', border: '1px solid #1c2333' }}>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><Check size={16} className="text-emerald-400" /></div>
            <div>
              <div className="text-white font-bold text-sm">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}</div>
              <div className="text-gray-400 text-xs mt-0.5">{isPaid ? 'PRO access active' : '5 free deals available'}</div>
            </div>
            <button onClick={() => setShowWelcomeUser(false)} className="text-gray-500 hover:text-white ml-2 text-lg flex-shrink-0">&times;</button>
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
                'Web3 integration coming soon',
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

      {/* EXIT INTENT POPUP */}
      {showExitIntent && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowExitIntent(false)}>
          <div className="relative w-full max-w-md bg-[#0e0d18] border border-emerald-500/30 rounded-2xl p-6 md:p-8 shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowExitIntent(false)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 text-xl w-8 h-8 flex items-center justify-center">&times;</button>
            {!exitSubmitted ? (
              <>
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold text-white font-serif mb-2">Before you go</h2>
                  <p className="text-gray-400 text-sm">Get the top 10 scored new builds in Spain delivered to your inbox. Free.</p>
                </div>
                <div className="flex gap-2">
                  <input type="email" value={exitEmail} onChange={e => setExitEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && exitEmail.includes('@') && (async () => {
                      setExitLoading(true);
                      try { await fetch('/api/email-capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: exitEmail, source: 'exit-intent' }) }); } catch {}
                      setExitSubmitted(true); setExitLoading(false);
                    })()}
                    placeholder="your@email.com"
                    className="flex-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 placeholder-gray-700" />
                  <button onClick={async () => {
                    if (!exitEmail.includes('@')) return;
                    setExitLoading(true);
                    try { await fetch('/api/email-capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: exitEmail, source: 'exit-intent' }) }); } catch {}
                    setExitSubmitted(true); setExitLoading(false);
                  }} disabled={exitLoading || !exitEmail.includes('@')}
                    className="px-5 py-3 rounded-lg font-bold text-sm text-black disabled:opacity-50 transition-all flex-shrink-0" style={{ background: '#10B981' }}>
                    {exitLoading ? '...' : 'Send me the list'}
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-700 mt-3">No spam. Unsubscribe anytime.</p>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="mb-3"><Check size={36} className="text-emerald-400 mx-auto" /></div>
                <h2 className="text-xl font-bold text-white font-serif mb-2">You&apos;re in.</h2>
                <p className="text-gray-400 text-sm">Check your inbox for the top 10 list.</p>
                <button onClick={() => setShowExitIntent(false)} className="mt-4 text-emerald-400 text-sm hover:underline">Back to terminal &rarr;</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STICKY BOTTOM BAR — mobile only */}
      {tab !== 'deals' && preview === null && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[200] border-t px-4 py-2.5" style={{ background: '#0d1117', borderColor: '#1c2333' }}>
          <button onClick={() => { setTab('deals'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full text-center text-[12px] font-semibold" style={{ color: '#10B981' }}>
            1,881 new builds ranked. See the top 10 free &rarr;
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="border-t py-6 text-center" style={{ borderColor: '#1c2333', paddingLeft: isDesktop ? (sidebarCollapsed ? 32 : 240) : 0 }}>
        <p className="text-[10px] text-gray-600 tracking-wide">© 2026 Avena Terminal · avenaterminal.com · Spain&apos;s first PropTech/FinTech terminal</p>
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


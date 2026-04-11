'use client';
import { useState, useEffect, useRef } from 'react';

interface MarketEvent {
  id: number;
  event_type: string;
  town: string;
  region: string;
  property_type: string;
  beds: number;
  old_value: number;
  new_value: number;
  change_pct: number;
  message: string;
  severity: string;
  created_at: string;
}

export default function LiveTab() {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [stats, setStats] = useState({ todayCount: 0, total: 0 });
  const [lastFetch, setLastFetch] = useState<Date>(new Date());
  const [clock, setClock] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Madrid clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  // Fetch events
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/market-events');
      const data = await res.json();
      setEvents(data.events || []);
      setStats(data.stats || { todayCount: 0, total: 0 });
      setLastFetch(new Date());
    } catch { /* silent */ }
  };

  useEffect(() => { fetchEvents(); const i = setInterval(fetchEvents, 15000); return () => clearInterval(i); }, []);

  const timeAgo = (dateStr: string) => {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const typeConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
    PRICE_DROP: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: '#f87171', label: 'PRICE DROP' },
    NEW_LISTING: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: '#4ade80', label: 'NEW LISTING' },
    SOLD: { color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: '#a855f7', label: 'SOLD' },
    SCORE_CHANGE: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: '#fbbf24', label: 'SCORE' },
    YIELD_CHANGE: { color: '#22d3ee', bg: 'rgba(34,211,238,0.08)', border: '#22d3ee', label: 'YIELD' },
  };

  const secondsAgo = Math.floor((Date.now() - lastFetch.getTime()) / 1000);

  return (
    <div style={{ background: '#080810', minHeight: '100vh' }}>
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b" style={{ borderColor: '#1c2333', background: '#0a0a14' }}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-wider" style={{ color: '#c9a84c' }}>AVENA LIVE</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[10px] font-mono text-gray-400">
          <div>PROPERTIES <span className="text-white font-bold">1,881</span></div>
          <div>EVENTS TODAY <span className="text-white font-bold">{stats.todayCount}</span></div>
          <div>LAST EVENT <span className="text-white font-bold">{events[0] ? timeAgo(events[0].created_at) : '\u2014'}</span></div>
        </div>
        <div className="text-xs font-mono text-gray-500">Madrid <span className="text-white">{clock}</span></div>
      </div>
      {/* Mobile-only compact stats */}
      <div className="flex md:hidden items-center justify-center gap-4 px-4 py-1.5 text-[10px] font-mono text-gray-500" style={{ background: '#080810', borderBottom: '1px solid #1c2333' }}>
        <span>Events today <span className="text-white font-bold">{stats.todayCount}</span></span>
        <span className="text-gray-700">|</span>
        <span>Last <span className="text-white font-bold">{events[0] ? timeAgo(events[0].created_at) : '\u2014'}</span></span>
      </div>

      {/* HEARTBEAT SVG */}
      <div className="px-4 py-2" style={{ background: '#080810' }}>
        <svg viewBox="0 0 1200 60" className="w-full h-8" preserveAspectRatio="none">
          <path d="M0,30 L200,30 L220,30 L240,10 L260,50 L280,20 L300,40 L320,30 L500,30 L520,30 L540,5 L560,55 L580,15 L600,45 L620,30 L800,30 L820,30 L840,8 L860,52 L880,18 L900,42 L920,30 L1200,30"
            fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
          </path>
          <path d="M0,30 L200,30 L220,30 L240,10 L260,50 L280,20 L300,40 L320,30 L500,30 L520,30 L540,5 L560,55 L580,15 L600,45 L620,30 L800,30 L820,30 L840,8 L860,52 L880,18 L900,42 L920,30 L1200,30"
            fill="none" stroke="#4ade80" strokeWidth="0.5" opacity="0.2" />
        </svg>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* EVENT STREAM */}
        <div className="flex-1 px-4 md:px-6 py-4" ref={feedRef} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
          <div className="space-y-2">
            {events.slice(0, 25).map((ev, i) => {
              const cfg = typeConfig[ev.event_type] || typeConfig.SCORE_CHANGE;
              return (
                <div key={ev.id || i} className="rounded-lg px-4 py-3 transition-all" style={{
                  background: cfg.bg, borderLeft: `3px solid ${cfg.border}`,
                  animation: i === 0 ? 'slide-in-left 0.3s ease-out' : undefined,
                }}>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>{cfg.label}</span>
                      <span className="text-xs text-white font-medium truncate">{ev.town}</span>
                      <span className="text-[10px] text-gray-600 hidden md:inline">{ev.region}</span>
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">{timeAgo(ev.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{ev.message}</p>
                  {ev.change_pct !== 0 && (
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                      {ev.old_value > 0 && <span className="text-gray-500">{ev.event_type.includes('YIELD') ? `${ev.old_value}%` : ev.old_value > 100 ? `\€${ev.old_value.toLocaleString()}` : ev.old_value}</span>}
                      {ev.old_value > 0 && <span className="text-gray-600">\→</span>}
                      <span className="text-white font-bold">{ev.event_type.includes('YIELD') ? `${ev.new_value}%` : ev.new_value > 100 ? `\€${ev.new_value.toLocaleString()}` : ev.new_value}</span>
                      <span className="font-bold" style={{ color: ev.change_pct > 0 ? '#4ade80' : '#f87171' }}>
                        {ev.change_pct > 0 ? '\▲' : '\▼'} {Math.abs(ev.change_pct)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STATS SIDEBAR — desktop only */}
        <div className="hidden md:block w-72 border-l px-5 py-4" style={{ borderColor: '#1c2333', background: '#0a0a14' }}>
          <div className="font-mono text-[10px] text-gray-500 space-y-6">
            <div>
              <div className="text-[9px] uppercase tracking-[3px] text-gray-600 mb-3">Today&apos;s Market</div>
              <div className="space-y-1.5">
                {(() => {
                  const drops = events.filter(e => e.event_type === 'PRICE_DROP').length;
                  const listings = events.filter(e => e.event_type === 'NEW_LISTING').length;
                  const sold = events.filter(e => e.event_type === 'SOLD').length;
                  const avgDrop = events.filter(e => e.event_type === 'PRICE_DROP' && e.change_pct).length > 0
                    ? (events.filter(e => e.event_type === 'PRICE_DROP').reduce((s, e) => s + Math.abs(e.change_pct || 0), 0) / drops).toFixed(1) : '0';
                  const dropAmounts = events.filter(e => e.event_type === 'PRICE_DROP' && e.old_value > 0 && e.new_value > 0).map(e => e.old_value - e.new_value);
                  const bigDrop = dropAmounts.length > 0 ? Math.max(...dropAmounts) : 0;
                  return (
                    <>
                      <div className="flex justify-between"><span>Price Drops</span><span className="text-red-400 font-bold">{drops}</span></div>
                      <div className="flex justify-between"><span>New Listings</span><span className="text-green-400 font-bold">{listings}</span></div>
                      <div className="flex justify-between"><span>Properties Sold</span><span className="text-purple-400 font-bold">{sold}</span></div>
                      <div className="flex justify-between"><span>Avg Drop</span><span className="text-red-400">-{avgDrop}%</span></div>
                      <div className="flex justify-between"><span>Biggest Drop</span><span className="text-red-400">{bigDrop > 0 ? `-€${Math.round(bigDrop / 1000)}k` : '—'}</span></div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div>
              <div className="text-[9px] uppercase tracking-[3px] text-gray-600 mb-3">Market Pulse</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-bold text-xs">ACTIVE</span>
              </div>
              <div className="text-gray-500">1,881 properties</div>
              <div className="text-gray-500">under surveillance</div>
            </div>

            <div className="text-[9px] text-gray-700">
              Feed updates every 15s<br />
              Last poll: {secondsAgo}s ago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

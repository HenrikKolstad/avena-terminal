'use client';

import { useState, useEffect } from 'react';
import { Property } from '@/lib/types';
import { formatPrice } from '@/lib/scoring';
import { Info, Lock } from 'lucide-react';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'EUR €', flag: '🇪🇺' },
  { code: 'NOK', symbol: 'kr', label: 'NOK kr', flag: '🇳🇴' },
  { code: 'GBP', symbol: '£', label: 'GBP £', flag: '🇬🇧' },
  { code: 'SEK', symbol: 'kr', label: 'SEK kr', flag: '🇸🇪' },
  { code: 'DKK', symbol: 'kr', label: 'DKK kr', flag: '🇩🇰' },
];

const FREE_YIELD_LIMIT = 2;

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
            <div className="text-[9px] text-gray-500 uppercase tracking-wide inline-flex items-center gap-1">Gross Yield <span className="relative group cursor-help"><Info size={10} className="text-gray-600" /><span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 p-2 rounded text-[9px] text-gray-300 leading-relaxed hidden group-hover:block z-50" style={{ background: '#0d1117', border: '1px solid #1c2333' }}>Gross yield estimate. Does not include management fees (15-20%), IBI tax, community fees, insurance or vacancy. Est. net 30-35% lower.</span></span></div>
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

export default function YieldTab({ properties, isPaid, onUpgrade, onCurrencyChange }: { properties: Property[]; isPaid: boolean; onUpgrade: () => void; onCurrencyChange?: (c: string) => void }) {
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
      {/* Yield disclaimer */}
      <div className="mb-4 rounded-lg p-3 md:p-4 text-xs text-gray-400 leading-relaxed" style={{ background: '#0f1419', borderLeft: '4px solid #ca8a04' }}>
        Yields displayed are gross estimates based on market rental data. Net yield after property management (15–20%), IBI tax, community fees, insurance and typical vacancy is approximately 30–35% lower. Example: 7% gross &asymp; 4.5–5% net.
      </div>
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
              className={`text-[10px] px-3 py-1.5 rounded border transition-all min-h-[44px] md:min-h-[36px] ${sortMode === key ? 'bg-emerald-600 border-emerald-600 text-black font-semibold' : 'border-[#1c2333] text-gray-400 hover:border-emerald-600/50'}`}>
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
                className={`px-2.5 py-1 md:py-1 min-h-[44px] md:min-h-0 rounded text-[10px] font-semibold border transition-all flex items-center ${
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

'use client';

import { useState, useMemo } from 'react';
import { Property } from '@/lib/types';
import { formatPrice, scoreClass } from '@/lib/scoring';
import { BarChart3 } from 'lucide-react';

export default function PortfolioTab({ properties, portfolio, onToggle }: {
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


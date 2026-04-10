'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function ROICalculatorPage() {
  const [purchasePrice, setPurchasePrice] = useState(250000);
  const [monthlyRent, setMonthlyRent] = useState(1200);
  const [mgmtFeePct, setMgmtFeePct] = useState(18);
  const [annualCosts, setAnnualCosts] = useState(3000);
  const [appreciationRate, setAppreciationRate] = useState(3);

  const results = useMemo(() => {
    const annualRent = monthlyRent * 12;
    const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;

    const mgmtCost = annualRent * (mgmtFeePct / 100);
    const netIncome = annualRent - mgmtCost - annualCosts;
    const netYield = purchasePrice > 0 ? (netIncome / purchasePrice) * 100 : 0;
    const annualCashflow = netIncome;

    // Year-by-year projection (10 years)
    const projection: { year: number; propertyValue: number; rentIncome: number; expenses: number; netCashflow: number; totalReturn: number; cumulativeReturn: number }[] = [];
    let cumulativeNetCashflow = 0;
    let breakEvenYear: number | null = null;

    for (let y = 1; y <= 10; y++) {
      const propValue = purchasePrice * Math.pow(1 + appreciationRate / 100, y);
      const capitalGain = propValue - purchasePrice;
      const yearRent = annualRent;
      const yearExpenses = mgmtCost + annualCosts;
      const yearNet = yearRent - yearExpenses;
      cumulativeNetCashflow += yearNet;

      const totalReturn = cumulativeNetCashflow + capitalGain;
      const totalReturnPct = purchasePrice > 0 ? (totalReturn / purchasePrice) * 100 : 0;

      projection.push({
        year: y,
        propertyValue: propValue,
        rentIncome: yearRent,
        expenses: yearExpenses,
        netCashflow: yearNet,
        totalReturn: totalReturnPct,
        cumulativeReturn: totalReturn,
      });

      if (breakEvenYear === null && cumulativeNetCashflow >= 0) {
        breakEvenYear = y;
      }
    }

    const roi5yr = projection[4]?.totalReturn ?? 0;
    const roi10yr = projection[9]?.totalReturn ?? 0;

    return { grossYield, netYield, annualCashflow, roi5yr, roi10yr, breakEvenYear, projection };
  }, [purchasePrice, monthlyRent, mgmtFeePct, annualCosts, appreciationRate]);

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtPct = (n: number) => n.toFixed(2);

  const inputClass =
    'w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition';
  const labelClass = 'block text-sm font-medium text-gray-400 mb-1';

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <title>Spain Property ROI Calculator — Free Tool | Avena Terminal</title>
      <meta name="description" content="Calculate the full return on investment for Spanish property. Gross yield, net yield, cashflow, 10-year projection and break-even analysis." />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link href="/tools" className="text-[#10B981] hover:underline text-sm mb-6 inline-block">&larr; All Tools</Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Spain Property ROI Calculator</h1>
        <p className="text-gray-400 mb-10 max-w-2xl">
          Model the full return on a Spanish property investment. See gross and net yields, annual cashflow, and a 10-year year-by-year projection.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* Inputs */}
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Purchase Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">&#8364;</span>
                <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(+e.target.value)} className={`${inputClass} pl-8`} min={0} step={5000} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Monthly Rent</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">&#8364;</span>
                <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(+e.target.value)} className={`${inputClass} pl-8`} min={0} step={50} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Management Fee: {mgmtFeePct}%</label>
              <input type="range" min={0} max={30} value={mgmtFeePct} onChange={e => setMgmtFeePct(+e.target.value)} className="w-full accent-[#10B981]" />
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0%</span><span>30%</span></div>
            </div>
            <div>
              <label className={labelClass}>Annual Costs (IBI + Community + Insurance)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">&#8364;</span>
                <input type="number" value={annualCosts} onChange={e => setAnnualCosts(+e.target.value)} className={`${inputClass} pl-8`} min={0} step={100} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Annual Appreciation Rate (%)</label>
              <input type="number" value={appreciationRate} onChange={e => setAppreciationRate(+e.target.value)} className={inputClass} min={-10} max={20} step={0.5} />
            </div>
          </div>

          {/* Summary cards */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#10B981] mb-5">Investment Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard label="Gross Yield" value={`${fmtPct(results.grossYield)}%`} />
              <SummaryCard label="Net Yield" value={`${fmtPct(results.netYield)}%`} highlight />
              <SummaryCard label="Annual Cashflow" value={`\u20AC${fmt(results.annualCashflow)}`} />
              <SummaryCard label="5-Year ROI" value={`${fmtPct(results.roi5yr)}%`} />
              <SummaryCard label="10-Year ROI" value={`${fmtPct(results.roi10yr)}%`} highlight />
              <SummaryCard label="Break-Even" value={results.breakEvenYear ? `Year ${results.breakEvenYear}` : 'N/A'} />
            </div>
          </div>
        </div>

        {/* Projection table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#30363d]">
            <h2 className="text-xl font-semibold text-[#10B981]">10-Year Projection</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363d] text-gray-400 text-left">
                  <th className="px-6 py-3 font-medium">Year</th>
                  <th className="px-6 py-3 font-medium text-right">Property Value</th>
                  <th className="px-6 py-3 font-medium text-right">Rent Income</th>
                  <th className="px-6 py-3 font-medium text-right">Expenses</th>
                  <th className="px-6 py-3 font-medium text-right">Net Cashflow</th>
                  <th className="px-6 py-3 font-medium text-right">Cumulative Return</th>
                  <th className="px-6 py-3 font-medium text-right">Total ROI</th>
                </tr>
              </thead>
              <tbody>
                {results.projection.map(row => (
                  <tr key={row.year} className="border-b border-[#21262d] hover:bg-[#21262d]/50 transition">
                    <td className="px-6 py-3 font-medium">{row.year}</td>
                    <td className="px-6 py-3 text-right">&euro;{fmt(row.propertyValue)}</td>
                    <td className="px-6 py-3 text-right text-green-400">&euro;{fmt(row.rentIncome)}</td>
                    <td className="px-6 py-3 text-right text-red-400">&euro;{fmt(row.expenses)}</td>
                    <td className="px-6 py-3 text-right">&euro;{fmt(row.netCashflow)}</td>
                    <td className="px-6 py-3 text-right">&euro;{fmt(row.cumulativeReturn)}</td>
                    <td className="px-6 py-3 text-right text-[#10B981] font-medium">{fmtPct(row.totalReturn)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-[#0d1117] rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-[#10B981]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

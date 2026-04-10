'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function MortgageCalculatorPage() {
  const [price, setPrice] = useState(250000);
  const [depositPct, setDepositPct] = useState(30);
  const [interestRate, setInterestRate] = useState(3.5);
  const [termYears, setTermYears] = useState(25);

  const results = useMemo(() => {
    const deposit = price * (depositPct / 100);
    const loanAmount = price - deposit;
    const ltv = 100 - depositPct;
    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = termYears * 12;

    let monthlyPayment = 0;
    if (monthlyRate > 0 && totalPayments > 0) {
      monthlyPayment =
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
    } else if (totalPayments > 0) {
      monthlyPayment = loanAmount / totalPayments;
    }

    const totalCost = monthlyPayment * totalPayments;
    const totalInterest = totalCost - loanAmount;

    return { deposit, loanAmount, ltv, monthlyPayment, totalInterest, totalCost };
  }, [price, depositPct, interestRate, termYears]);

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtPct = (n: number) => n.toFixed(1);

  const inputClass =
    'w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition';
  const labelClass = 'block text-sm font-medium text-gray-400 mb-1';

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <title>Spanish Mortgage Calculator — Free Tool | Avena Terminal</title>
      <meta name="description" content="Calculate your Spanish mortgage payments instantly. Estimate monthly payments, total interest and loan-to-value for property purchases in Spain." />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/tools" className="text-[#10B981] hover:underline text-sm mb-6 inline-block">&larr; All Tools</Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Spanish Mortgage Calculator</h1>
        <p className="text-gray-400 mb-10 max-w-2xl">
          Estimate your monthly mortgage payments for a property purchase in Spain. Adjust the deposit, interest rate and term to see how they affect your costs.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Property Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">&#8364;</span>
                <input type="number" value={price} onChange={e => setPrice(+e.target.value)} className={`${inputClass} pl-8`} min={0} step={5000} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Deposit: {depositPct}%</label>
              <input type="range" min={10} max={100} value={depositPct} onChange={e => setDepositPct(+e.target.value)} className="w-full accent-[#10B981]" />
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>10%</span><span>100%</span></div>
            </div>
            <div>
              <label className={labelClass}>Annual Interest Rate (%)</label>
              <input type="number" value={interestRate} onChange={e => setInterestRate(+e.target.value)} className={inputClass} min={0} max={15} step={0.1} />
            </div>
            <div>
              <label className={labelClass}>Term (years)</label>
              <input type="number" value={termYears} onChange={e => setTermYears(+e.target.value)} className={inputClass} min={1} max={40} step={1} />
            </div>
          </div>

          {/* Results */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-[#10B981] mb-4">Results</h2>

            <div className="grid grid-cols-2 gap-4">
              <ResultCard label="Monthly Payment" value={`\u20AC${fmt(results.monthlyPayment)}`} highlight />
              <ResultCard label="Total Interest" value={`\u20AC${fmt(results.totalInterest)}`} />
              <ResultCard label="Total Cost" value={`\u20AC${fmt(results.totalCost)}`} />
              <ResultCard label="Loan-to-Value" value={`${fmtPct(results.ltv)}%`} />
              <ResultCard label="Loan Amount" value={`\u20AC${fmt(results.loanAmount)}`} />
              <ResultCard label="Deposit" value={`\u20AC${fmt(results.deposit)}`} />
            </div>

            <div className="mt-6 pt-4 border-t border-[#30363d]">
              <div className="w-full bg-[#21262d] rounded-full h-3 overflow-hidden">
                <div className="bg-[#10B981] h-3 rounded-full transition-all" style={{ width: `${Math.min(100, (results.totalInterest / (results.totalCost || 1)) * 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Principal: {fmt(results.loanAmount)}</span>
                <span>Interest: {fmt(results.totalInterest)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-[#0d1117] rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-[#10B981]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

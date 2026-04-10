'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const REGIONS = [
  { name: 'Valencia', itp: 10 },
  { name: 'Murcia', itp: 8 },
  { name: 'Andalusia', itp: 7 },
];

export default function TaxCalculatorPage() {
  const [price, setPrice] = useState(250000);
  const [isNewBuild, setIsNewBuild] = useState(true);
  const [regionIdx, setRegionIdx] = useState(0);
  const [isResident, setIsResident] = useState(true);

  const results = useMemo(() => {
    const region = REGIONS[regionIdx];

    // IVA (10%) for new builds, ITP (varies) for resale
    const transferTax = isNewBuild ? price * 0.1 : price * (region.itp / 100);
    const transferTaxLabel = isNewBuild ? 'IVA (10%)' : `ITP (${region.itp}%)`;

    // AJD - Stamp duty: applies on new builds (1.5% in most regions), 0 on resale
    const ajdRate = isNewBuild ? 1.5 : 0;
    const ajd = price * (ajdRate / 100);

    // Fixed-ish costs
    const notaryFees = 800;
    const registryFees = 500;
    const legalFees = price * 0.015;

    const totalCosts = transferTax + ajd + notaryFees + registryFees + legalFees;
    const totalCostPct = price > 0 ? (totalCosts / price) * 100 : 0;

    return {
      transferTax,
      transferTaxLabel,
      ajd,
      ajdRate,
      notaryFees,
      registryFees,
      legalFees,
      totalCosts,
      totalCostPct,
    };
  }, [price, isNewBuild, regionIdx, isResident]);

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  const inputClass =
    'w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition';
  const labelClass = 'block text-sm font-medium text-gray-400 mb-1';
  const toggleActive = 'bg-[#10B981] text-white';
  const toggleInactive = 'bg-[#161b22] text-gray-400 border border-[#30363d]';

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <title>Spanish Property Tax Calculator — Free Tool | Avena Terminal</title>
      <meta name="description" content="Calculate all buying costs for Spanish property. IVA, ITP, stamp duty, notary, registry and legal fees for Valencia, Murcia and Andalusia." />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/tools" className="text-[#10B981] hover:underline text-sm mb-6 inline-block">&larr; All Tools</Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Spanish Property Tax Calculator</h1>
        <p className="text-gray-400 mb-10 max-w-2xl">
          Estimate the full buying costs when purchasing property in Spain, including transfer taxes, stamp duty, notary, registry and legal fees.
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
              <label className={labelClass}>Property Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setIsNewBuild(true)} className={`rounded-lg py-2.5 text-sm font-medium transition ${isNewBuild ? toggleActive : toggleInactive}`}>New Build</button>
                <button onClick={() => setIsNewBuild(false)} className={`rounded-lg py-2.5 text-sm font-medium transition ${!isNewBuild ? toggleActive : toggleInactive}`}>Resale</button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Region</label>
              <select value={regionIdx} onChange={e => setRegionIdx(+e.target.value)} className={inputClass}>
                {REGIONS.map((r, i) => (
                  <option key={r.name} value={i}>{r.name} (ITP {r.itp}%)</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Tax Residency</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setIsResident(true)} className={`rounded-lg py-2.5 text-sm font-medium transition ${isResident ? toggleActive : toggleInactive}`}>Resident</button>
                <button onClick={() => setIsResident(false)} className={`rounded-lg py-2.5 text-sm font-medium transition ${!isResident ? toggleActive : toggleInactive}`}>Non-Resident</button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#10B981] mb-5">Buying Costs Breakdown</h2>

            <div className="space-y-3">
              <CostRow label={results.transferTaxLabel} value={results.transferTax} fmt={fmt} />
              <CostRow label={`Stamp Duty / AJD (${results.ajdRate}%)`} value={results.ajd} fmt={fmt} />
              <CostRow label="Notary Fees (est.)" value={results.notaryFees} fmt={fmt} />
              <CostRow label="Land Registry (est.)" value={results.registryFees} fmt={fmt} />
              <CostRow label="Legal Fees (1.5%)" value={results.legalFees} fmt={fmt} />
            </div>

            <div className="mt-6 pt-4 border-t border-[#30363d]">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500">Total Buying Costs</p>
                  <p className="text-2xl font-bold text-[#10B981]">&euro;{fmt(results.totalCosts)}</p>
                </div>
                <p className="text-sm text-gray-400">{results.totalCostPct.toFixed(1)}% of price</p>
              </div>

              <div className="mt-4 bg-[#0d1117] rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Total Purchase Price (incl. costs)</p>
                <p className="text-lg font-bold text-white">&euro;{fmt(price + results.totalCosts)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostRow({ label, value, fmt }: { label: string; value: number; fmt: (n: number) => string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#21262d]">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">&euro;{fmt(value)}</span>
    </div>
  );
}

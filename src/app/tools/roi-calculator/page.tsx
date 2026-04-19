'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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

  const inputStyle = {
    background: 'hsl(var(--av-background))',
    borderColor: 'hsl(var(--av-border-strong))',
  };
  const inputClass =
    'w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary';
  const labelClass = 'block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2';

  return (
    <div className="avena-v2 min-h-screen">
      <title>Spain Property ROI Calculator — Free Tool | Avena Terminal</title>
      <meta name="description" content="Calculate the full return on investment for Spanish property. Gross yield, net yield, cashflow, 10-year projection and break-even analysis." />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/tools" className="hover:text-primary transition-colors">All Tools</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">ROI</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                ROI calculator
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Spain property
                <br />
                <span className="italic text-gold">returns</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Model the full return on a Spanish property. Yields, cashflow, and a 10-year year-by-year projection.
              </p>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid gap-8 md:grid-cols-2 mb-10">
              {/* Inputs */}
              <div className="space-y-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-2">Inputs</div>

                <div>
                  <label className={labelClass}>Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">€</span>
                    <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(+e.target.value)} className={`${inputClass} pl-8`} style={inputStyle} min={0} step={5000} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Monthly Rent</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">€</span>
                    <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(+e.target.value)} className={`${inputClass} pl-8`} style={inputStyle} min={0} step={50} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Management Fee: {mgmtFeePct}%</label>
                  <input type="range" min={0} max={30} value={mgmtFeePct} onChange={e => setMgmtFeePct(+e.target.value)} className="w-full accent-primary" />
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1"><span>0%</span><span>30%</span></div>
                </div>
                <div>
                  <label className={labelClass}>Annual Costs (IBI + Community + Insurance)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">€</span>
                    <input type="number" value={annualCosts} onChange={e => setAnnualCosts(+e.target.value)} className={`${inputClass} pl-8`} style={inputStyle} min={0} step={100} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Annual Appreciation Rate (%)</label>
                  <input type="number" value={appreciationRate} onChange={e => setAppreciationRate(+e.target.value)} className={inputClass} style={inputStyle} min={-10} max={20} step={0.5} />
                </div>
              </div>

              {/* Summary cards */}
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Investment Summary</div>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label="Gross Yield" value={`${fmtPct(results.grossYield)}%`} />
                  <SummaryCard label="Net Yield" value={`${fmtPct(results.netYield)}%`} highlight />
                  <SummaryCard label="Annual Cashflow" value={`€${fmt(results.annualCashflow)}`} />
                  <SummaryCard label="5-Year ROI" value={`${fmtPct(results.roi5yr)}%`} />
                  <SummaryCard label="10-Year ROI" value={`${fmtPct(results.roi10yr)}%`} highlight />
                  <SummaryCard label="Break-Even" value={results.breakEvenYear ? `Year ${results.breakEvenYear}` : 'N/A'} />
                </div>
              </div>
            </div>

            {/* Projection table */}
            <div
              className="rounded-sm border overflow-hidden"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div className="p-6 border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">10-Year Projection</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }} className="text-muted-foreground text-left">
                      <th className="px-4 sm:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] whitespace-nowrap">Year</th>
                      <th className="px-4 sm:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-right whitespace-nowrap">Property Value</th>
                      <th className="px-4 sm:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-right whitespace-nowrap">Rent Income</th>
                      <th className="px-4 sm:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-right whitespace-nowrap">Expenses</th>
                      <th className="px-4 sm:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-right whitespace-nowrap">Net Cashflow</th>
                      <th className="px-4 sm:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-right whitespace-nowrap">Cumulative</th>
                      <th className="px-4 sm:px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-right whitespace-nowrap">Total ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.projection.map(row => (
                      <tr key={row.year} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                        <td className="px-4 sm:px-6 py-3 text-foreground">{row.year}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-foreground tabular whitespace-nowrap">€{fmt(row.propertyValue)}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-foreground tabular whitespace-nowrap">€{fmt(row.rentIncome)}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-muted-foreground tabular whitespace-nowrap">€{fmt(row.expenses)}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-foreground tabular whitespace-nowrap">€{fmt(row.netCashflow)}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-foreground tabular whitespace-nowrap">€{fmt(row.cumulativeReturn)}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-gold tabular whitespace-nowrap">{fmtPct(row.totalReturn)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-sm border p-4"
      style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</p>
      <p className={`font-serif text-xl font-light tracking-tight tabular ${highlight ? 'text-gold' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

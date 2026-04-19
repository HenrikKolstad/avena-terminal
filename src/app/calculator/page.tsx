'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export default function CalculatorPage() {
  const [price, setPrice] = useState(250000);
  const [rent, setRent] = useState(1200);
  const [mgmtFee, setMgmtFee] = useState(18);
  const [annualCosts, setAnnualCosts] = useState(3000);

  const results = useMemo(() => {
    const annualRent = rent * 12;
    const grossYield = price > 0 ? (annualRent / price) * 100 : 0;
    const mgmtCost = annualRent * (mgmtFee / 100);
    const netIncome = annualRent - mgmtCost - annualCosts;
    const netYield = price > 0 ? (netIncome / price) * 100 : 0;
    const monthlyCashflow = netIncome / 12;

    // 5-year ROI: net income over 5 years + 8% total appreciation
    const totalNetIncome5yr = netIncome * 5;
    const appreciation = price * 0.08;
    const totalReturn5yr = totalNetIncome5yr + appreciation;
    const roi5yr = price > 0 ? (totalReturn5yr / price) * 100 : 0;

    return {
      grossYield,
      netYield,
      annualIncome: netIncome,
      monthlyCashflow,
      roi5yr,
    };
  }, [price, rent, mgmtFee, annualCosts]);

  const fmt = (n: number) =>
    n.toLocaleString('en-EU', { maximumFractionDigits: 0 });
  const fmtPct = (n: number) => n.toFixed(2);

  const inputStyle = {
    background: 'hsl(var(--av-background))',
    borderColor: 'hsl(var(--av-border-strong))',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <head>
        <title>Spanish Property Investment Calculator — Free Tool | Avena Terminal</title>
        <meta
          name="description"
          content="Free spanish property investment calculator. Estimate gross yield, net yield, monthly cashflow and 5-year ROI for Spanish new build and resale properties."
        />
        <meta property="og:title" content="Spanish Property Investment Calculator — Free Tool | Avena Terminal" />
        <meta
          property="og:description"
          content="Free calculator for Spanish property investment returns. Estimate yield, cashflow and ROI."
        />
        <meta property="og:url" content="https://avenaterminal.com/calculator" />
        <meta property="og:site_name" content="Avena Terminal" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://avenaterminal.com/calculator" />
      </head>

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Investment Calculator</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Free tool
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Spanish property
                <br />
                <span className="italic text-gold">investment calculator</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Estimate yield, cashflow and ROI for any Spanish property in seconds.
              </p>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Inputs */}
              <div className="space-y-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-2">Inputs</div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Property Price (EUR)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Expected Monthly Rent (EUR)
                  </label>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value))}
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Management Fee (%)
                  </label>
                  <input
                    type="number"
                    value={mgmtFee}
                    step={0.5}
                    onChange={(e) => setMgmtFee(Number(e.target.value))}
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Annual Costs (EUR) — IBI, insurance, community fees
                  </label>
                  <input
                    type="number"
                    value={annualCosts}
                    onChange={(e) => setAnnualCosts(Number(e.target.value))}
                    className="w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Outputs */}
              <div className="space-y-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-2">Results</div>

                <div
                  className="rounded-sm border p-6 space-y-5"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <ResultRow label="Gross Yield" value={`${fmtPct(results.grossYield)}%`} />
                  <ResultRow
                    label="Net Yield"
                    value={`${fmtPct(results.netYield)}%`}
                    highlight={results.netYield >= 5}
                  />
                  <ResultRow label="Annual Net Income" value={`€${fmt(results.annualIncome)}`} />
                  <ResultRow
                    label="Monthly Cashflow"
                    value={`€${fmt(results.monthlyCashflow)}`}
                    highlight={results.monthlyCashflow > 0}
                  />
                  <div className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }} />
                  <ResultRow
                    label="5-Year ROI Estimate"
                    value={`${fmtPct(results.roi5yr)}%`}
                    subtitle="Includes 8% capital appreciation"
                    highlight
                  />
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  Estimates are indicative only. Actual returns depend on occupancy, tax status, and market conditions.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-16 text-center">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Browse 1,800+ Spanish New Builds →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ResultRow({
  label,
  value,
  subtitle,
  highlight,
}: {
  label: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className={`font-serif text-2xl font-light tracking-tight tabular ${highlight ? 'text-gold' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

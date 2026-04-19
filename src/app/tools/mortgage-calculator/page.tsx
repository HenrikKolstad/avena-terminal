'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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

  const inputStyle = {
    background: 'hsl(var(--av-background))',
    borderColor: 'hsl(var(--av-border-strong))',
  };

  const inputClass =
    'w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary';
  const labelClass = 'block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2';

  return (
    <div className="avena-v2 min-h-screen">
      <title>Spanish Mortgage Calculator — Free Tool | Avena Terminal</title>
      <meta name="description" content="Calculate your Spanish mortgage payments instantly. Estimate monthly payments, total interest and loan-to-value for property purchases in Spain." />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/tools" className="hover:text-primary transition-colors">All Tools</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Mortgage</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Mortgage calculator
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Spanish mortgage
                <br />
                <span className="italic text-gold">payments</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Estimate monthly payments, total interest and loan-to-value. Adjust deposit, rate and term instantly.
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
                  <label className={labelClass}>Property Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">€</span>
                    <input type="number" value={price} onChange={e => setPrice(+e.target.value)} className={`${inputClass} pl-8`} style={inputStyle} min={0} step={5000} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Deposit: {depositPct}%</label>
                  <input type="range" min={10} max={100} value={depositPct} onChange={e => setDepositPct(+e.target.value)} className="w-full accent-primary" />
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1"><span>10%</span><span>100%</span></div>
                </div>
                <div>
                  <label className={labelClass}>Annual Interest Rate (%)</label>
                  <input type="number" value={interestRate} onChange={e => setInterestRate(+e.target.value)} className={inputClass} style={inputStyle} min={0} max={15} step={0.1} />
                </div>
                <div>
                  <label className={labelClass}>Term (years)</label>
                  <input type="number" value={termYears} onChange={e => setTermYears(+e.target.value)} className={inputClass} style={inputStyle} min={1} max={40} step={1} />
                </div>
              </div>

              {/* Results */}
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Results</div>

                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Monthly Payment" value={`€${fmt(results.monthlyPayment)}`} highlight />
                  <ResultCard label="Total Interest" value={`€${fmt(results.totalInterest)}`} />
                  <ResultCard label="Total Cost" value={`€${fmt(results.totalCost)}`} />
                  <ResultCard label="Loan-to-Value" value={`${fmtPct(results.ltv)}%`} />
                  <ResultCard label="Loan Amount" value={`€${fmt(results.loanAmount)}`} />
                  <ResultCard label="Deposit" value={`€${fmt(results.deposit)}`} />
                </div>

                <div className="mt-6 pt-4 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <div
                    className="w-full h-2 rounded-sm overflow-hidden"
                    style={{ background: 'hsl(var(--av-background))' }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, (results.totalInterest / (results.totalCost || 1)) * 100)}%`,
                        background: 'var(--av-gradient-gold)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-2">
                    <span>Principal: {fmt(results.loanAmount)}</span>
                    <span>Interest: {fmt(results.totalInterest)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
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

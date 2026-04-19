'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

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

  const inputStyle = {
    background: 'hsl(var(--av-background))',
    borderColor: 'hsl(var(--av-border-strong))',
  };
  const inputClass =
    'w-full rounded-sm border px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary';
  const labelClass = 'block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2';

  return (
    <div className="avena-v2 min-h-screen">
      <title>Spanish Property Tax Calculator — Free Tool | Avena Terminal</title>
      <meta name="description" content="Calculate all buying costs for Spanish property. IVA, ITP, stamp duty, notary, registry and legal fees for Valencia, Murcia and Andalusia." />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/tools" className="hover:text-primary transition-colors">All Tools</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Tax</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Tax simulator
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Spanish property
                <br />
                <span className="italic text-gold">tax calculator</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Estimate the full buying costs: transfer taxes, stamp duty, notary, registry and legal fees.
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
                  <label className={labelClass}>Property Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsNewBuild(true)}
                      className="rounded-sm border py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors"
                      style={
                        isNewBuild
                          ? { background: 'var(--av-gradient-gold)', color: 'hsl(var(--av-primary-foreground))', borderColor: 'transparent' }
                          : { background: 'hsl(var(--av-background))', color: 'hsl(var(--av-muted-foreground))', borderColor: 'hsl(var(--av-border-strong))' }
                      }
                    >
                      New Build
                    </button>
                    <button
                      onClick={() => setIsNewBuild(false)}
                      className="rounded-sm border py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors"
                      style={
                        !isNewBuild
                          ? { background: 'var(--av-gradient-gold)', color: 'hsl(var(--av-primary-foreground))', borderColor: 'transparent' }
                          : { background: 'hsl(var(--av-background))', color: 'hsl(var(--av-muted-foreground))', borderColor: 'hsl(var(--av-border-strong))' }
                      }
                    >
                      Resale
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Region</label>
                  <select value={regionIdx} onChange={e => setRegionIdx(+e.target.value)} className={inputClass} style={inputStyle}>
                    {REGIONS.map((r, i) => (
                      <option key={r.name} value={i}>{r.name} (ITP {r.itp}%)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Tax Residency</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsResident(true)}
                      className="rounded-sm border py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors"
                      style={
                        isResident
                          ? { background: 'var(--av-gradient-gold)', color: 'hsl(var(--av-primary-foreground))', borderColor: 'transparent' }
                          : { background: 'hsl(var(--av-background))', color: 'hsl(var(--av-muted-foreground))', borderColor: 'hsl(var(--av-border-strong))' }
                      }
                    >
                      Resident
                    </button>
                    <button
                      onClick={() => setIsResident(false)}
                      className="rounded-sm border py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors"
                      style={
                        !isResident
                          ? { background: 'var(--av-gradient-gold)', color: 'hsl(var(--av-primary-foreground))', borderColor: 'transparent' }
                          : { background: 'hsl(var(--av-background))', color: 'hsl(var(--av-muted-foreground))', borderColor: 'hsl(var(--av-border-strong))' }
                      }
                    >
                      Non-Resident
                    </button>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div
                className="rounded-sm border p-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Buying Costs Breakdown</div>

                <div className="space-y-3">
                  <CostRow label={results.transferTaxLabel} value={results.transferTax} fmt={fmt} />
                  <CostRow label={`Stamp Duty / AJD (${results.ajdRate}%)`} value={results.ajd} fmt={fmt} />
                  <CostRow label="Notary Fees (est.)" value={results.notaryFees} fmt={fmt} />
                  <CostRow label="Land Registry (est.)" value={results.registryFees} fmt={fmt} />
                  <CostRow label="Legal Fees (1.5%)" value={results.legalFees} fmt={fmt} />
                </div>

                <div className="mt-6 pt-4 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Total Buying Costs</p>
                      <p className="font-serif text-4xl font-light tracking-tight text-gold tabular">€{fmt(results.totalCosts)}</p>
                    </div>
                    <p className="font-mono text-sm text-muted-foreground">{results.totalCostPct.toFixed(1)}% of price</p>
                  </div>

                  <div
                    className="mt-5 rounded-sm border p-4"
                    style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Total Purchase Price (incl. costs)</p>
                    <p className="font-serif text-2xl font-light tracking-tight text-foreground tabular">€{fmt(price + results.totalCosts)}</p>
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

function CostRow({ label, value, fmt }: { label: string; value: number; fmt: (n: number) => string }) {
  return (
    <div className="flex justify-between items-center gap-3 py-2 border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground tabular whitespace-nowrap">€{fmt(value)}</span>
    </div>
  );
}

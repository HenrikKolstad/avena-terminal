'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Info, Lock } from 'lucide-react';
import { ProModal } from '@/components/v2/ProModal';
import { useAuth } from '@/context/AuthContext';
import type { Property } from '@/lib/types';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', flag: '🇪🇺' },
  { code: 'NOK', symbol: 'kr', flag: '🇳🇴' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'SEK', symbol: 'kr', flag: '🇸🇪' },
  { code: 'DKK', symbol: 'kr', flag: '🇩🇰' },
] as const;

const FREE_VISIBLE = 3;

type SortMode = 'yield' | 'income' | 'price';

/* ────────────────────────────────────────────────────────── */
/*  Yield Card                                              */
/* ────────────────────────────────────────────────────────── */

function YieldCard({
  d,
  expanded,
  onToggle,
  fmtC,
  blurred = false,
}: {
  d: Property;
  expanded: boolean;
  onToggle: () => void;
  fmtC: (n: number) => string;
  blurred?: boolean;
}) {
  const [downPct, setDownPct] = useState(30);
  const [interestPct, setInterestPct] = useState(3.75);
  if (!d._yield) return null;

  const net = Math.round(d._yield.annual * 0.75);
  const netYield = ((net / d.pf) * 100).toFixed(1);
  const buyFee = Math.round(d.pf * 0.13);
  const totalCost = d.pf + buyFee;
  const downPayment = Math.round(totalCost * (downPct / 100));
  const loanAmt = totalCost - downPayment;
  const rate = interestPct / 100 / 12;
  const n = 25 * 12;
  const mortgageMo =
    loanAmt > 0
      ? Math.round((loanAmt * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1))
      : 0;
  const annualCashflow = net - mortgageMo * 12;
  const cashOnCash = downPayment > 0 ? ((annualCashflow / downPayment) * 100).toFixed(1) : '0';
  const srcLabel = d._yield.src?.toLowerCase().includes('airbnb')
    ? 'AirDNA'
    : d._yield.src?.toLowerCase().includes('resort')
    ? 'Resort'
    : 'Market';

  const gross = d._yield.gross || 0;

  return (
    <div
      onClick={blurred ? undefined : onToggle}
      aria-hidden={blurred}
      className={`group rounded-sm border transition-colors ${blurred ? '' : 'cursor-pointer hover:border-primary'}`}
      style={{
        background: 'hsl(var(--av-surface) / 0.4)',
        borderColor: expanded ? 'hsl(var(--av-primary) / 0.6)' : 'hsl(var(--av-border) / 0.6)',
      }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-lg leading-tight text-foreground mb-1 line-clamp-2">
              {d.p || `${d.t} in ${d.l}`}
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Via Xavia Estate · {d.l}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div
              className={`font-serif text-4xl font-light tabular leading-none ${
                gross >= 7 ? 'text-primary' : gross >= 5 ? 'text-gold' : 'text-foreground'
              }`}
            >
              {gross.toFixed(1)}%
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-1 inline-flex items-center gap-1">
              Gross Yield
              <span className="relative" title="Gross estimate. Net ~30-35% lower.">
                <Info size={9} className="text-muted-foreground/60" />
              </span>
            </div>
          </div>
        </div>

        {/* 4-stat grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-sm border mb-3"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.5)',
            background: 'hsl(var(--av-border) / 0.5)',
          }}
        >
          {[
            { label: 'Nightly', value: fmtC(d._yield.rate) },
            { label: 'Annual Income', value: fmtC(d._yield.annual) },
            {
              label: 'Cashflow/yr',
              value: fmtC(annualCashflow),
              accent: annualCashflow >= 0 ? 'primary' : 'destructive',
            },
            { label: 'List Price', value: fmtC(d.pf) },
          ].map((s) => (
            <div key={s.label} className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                {s.label}
              </div>
              <div
                className={`font-mono text-sm tabular ${
                  s.accent === 'primary'
                    ? 'text-primary'
                    : s.accent === 'destructive'
                    ? 'text-destructive'
                    : 'text-foreground'
                }`}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Meta line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
            {d.t} · {d.bd}bd · {d._yield.weeks}wk · {srcLabel}
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Net</div>
            <div className="font-mono text-sm tabular text-primary">{netYield}%</div>
          </div>
        </div>

        {!blurred && !expanded && (
          <div className="mt-3 pt-2 border-t text-center font-mono text-[9px] uppercase tracking-[0.22em] text-primary/80" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
            Click to open investment calculator ↓
          </div>
        )}

        {/* Link to property page */}
        {!blurred && d.ref && (
          <a
            href={`/property/${encodeURIComponent(d.ref)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
          >
            View property <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Calculator */}
      {expanded && !blurred && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-t p-5"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background) / 0.5)' }}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Investment Calculator
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              25yr term
            </span>
          </div>

          <div className="mb-3">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] mb-1">
              <span className="text-muted-foreground">Down Payment</span>
              <span className="text-primary">{downPct}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
              className="w-full accent-primary h-1 rounded cursor-pointer"
            />
          </div>

          <div className="mb-4">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] mb-1">
              <span className="text-muted-foreground">Interest Rate</span>
              <span className="text-primary">{interestPct.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={0.25}
              value={interestPct}
              onChange={(e) => setInterestPct(Number(e.target.value))}
              className="w-full accent-primary h-1 rounded cursor-pointer"
            />
          </div>

          <div
            className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border mb-4"
            style={{
              borderColor: 'hsl(var(--av-border) / 0.5)',
              background: 'hsl(var(--av-border) / 0.5)',
            }}
          >
            {[
              { label: 'Down Payment', value: fmtC(downPayment), accent: 'primary' as const },
              { label: 'Mortgage/mo', value: fmtC(mortgageMo) },
              { label: 'Cashflow/yr', value: fmtC(annualCashflow), accent: (annualCashflow >= 0 ? 'primary' : 'destructive') as 'primary' | 'destructive' },
              { label: 'All-In Cost', value: fmtC(totalCost) },
              { label: 'Loan', value: fmtC(loanAmt) },
              { label: 'Cash-on-Cash', value: `${cashOnCash}%`, accent: (Number(cashOnCash) >= 0 ? 'primary' : 'destructive') as 'primary' | 'destructive' },
            ].map((s) => (
              <div key={s.label} className="p-3 text-center" style={{ background: 'hsl(var(--av-surface) / 0.5)' }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  {s.label}
                </div>
                <div
                  className={`font-mono text-sm tabular ${
                    s.accent === 'primary' ? 'text-primary' : s.accent === 'destructive' ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <a
            href={`mailto:henrik@xaviaestate.com?subject=${encodeURIComponent(`Yield analysis: ${d.p}`)}&body=${encodeURIComponent(
              `Hi Henrik,\n\nI'd like to discuss this deal:\n\n${d.p}\nLocation: ${d.l}\nPrice: €${d.pf?.toLocaleString()}\nGross Yield: ${gross.toFixed(1)}%\nRef: ${d.ref || ''}\n\nPlease send more details.\n\nThanks`
            )}`}
            className="group inline-flex items-center justify-center gap-2 w-full rounded-sm px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            Contact Henrik about this deal
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Wrapper                                                 */
/* ────────────────────────────────────────────────────────── */

export function YieldClientWrapper({ properties }: { properties: Property[] }) {
  const { isPaid } = useAuth();
  const [proOpen, setProOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('yield');
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('EUR');
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1, NOK: 11.8, GBP: 0.86, SEK: 11.4, DKK: 7.46 });
  const [fxLoading, setFxLoading] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('avena_currency') : null;
    if (stored) setCurrency(stored);
    setFxLoading(true);
    fetch('https://open.er-api.com/v6/latest/EUR')
      .then((r) => r.json())
      .then((d) => {
        if (d?.rates) setRates({ EUR: 1, ...d.rates });
      })
      .catch(() => {})
      .finally(() => setFxLoading(false));
  }, []);

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || '€';
  const fmtC = (eur: number) => `${sym}${Math.round(eur * (rates[currency] || 1)).toLocaleString()}`;

  const sorted = useMemo(() => {
    const arr = [...properties].filter((p) => p._yield);
    arr.sort((a, b) => {
      if (sortMode === 'yield') return (b._yield?.gross || 0) - (a._yield?.gross || 0);
      if (sortMode === 'income') return (b._yield?.annual || 0) - (a._yield?.annual || 0);
      return a.pf - b.pf;
    });
    return arr;
  }, [properties, sortMode]);

  const visible = sorted.slice(0, isPaid ? 60 : FREE_VISIBLE);
  const blurredPreview = !isPaid ? sorted.slice(FREE_VISIBLE, FREE_VISIBLE + 6) : [];
  const remaining = Math.max(0, sorted.length - FREE_VISIBLE);

  const handleCurrency = (c: string) => {
    setCurrency(c);
    if (typeof window !== 'undefined') localStorage.setItem('avena_currency', c);
  };

  return (
    <>
      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1600px] px-5 sm:px-12 py-10 space-y-4">
          {/* Disclaimer banner */}
          <div
            className="rounded-sm border-l-4 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground"
            style={{
              background: 'hsl(var(--av-surface) / 0.4)',
              borderLeftColor: 'hsl(var(--av-primary))',
            }}
          >
            <span className="text-foreground">Gross estimates.</span> Net yield after management
            (15–20%), IBI, community fees, insurance, and vacancy is ~30–35% lower. Example: 7%
            gross ≈ 4.5–5% net.
          </div>

          {/* 3 info boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                title: 'How it works',
                accent: 'primary',
                body: (
                  <>
                    Each property is matched to{' '}
                    <span className="text-foreground">real Airbnb &amp; Booking.com data</span> from
                    its exact area. Nightly rates are annual averages — not peak summer.
                  </>
                ),
              },
              {
                title: "What's in net (−25%)",
                accent: 'primary',
                body: (
                  <ul className="space-y-0.5">
                    <li>Airbnb platform fee (14%)</li>
                    <li>Cleaning (~€35/turn)</li>
                    <li>IBI + insurance + community</li>
                    <li>Utilities + maintenance</li>
                  </ul>
                ),
              },
              {
                title: 'Not included',
                accent: 'destructive',
                body: (
                  <ul className="space-y-0.5">
                    <li>IRNR tax (19% non-resident)</li>
                    <li>Tourist license (€250–500)</li>
                    <li>Furnishing (~€5–15k)</li>
                    <li>Mortgage interest (see calc)</li>
                  </ul>
                ),
              },
            ].map((box) => (
              <div
                key={box.title}
                className="rounded-sm border p-5"
                style={{
                  background: 'hsl(var(--av-surface) / 0.4)',
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                }}
              >
                <div
                  className={`font-mono text-[10px] uppercase tracking-[0.3em] mb-3 ${
                    box.accent === 'destructive' ? 'text-destructive' : 'text-primary'
                  }`}
                >
                  {box.title}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">{box.body}</div>
              </div>
            ))}
          </div>

          {/* Sources + Sort + Currency */}
          <div
            className="rounded-sm border p-4 flex flex-wrap items-center justify-between gap-4"
            style={{
              background: 'hsl(var(--av-surface) / 0.4)',
              borderColor: 'hsl(var(--av-border) / 0.6)',
            }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Sources: AirDNA · Airbtics · Vrbo · Booking · Occupancy 16–24wk/yr · Self-managed
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Sort */}
              <div className="flex gap-1.5">
                {([
                  ['yield', 'Yield'],
                  ['income', 'Income'],
                  ['price', 'Price'],
                ] as [SortMode, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setSortMode(k)}
                    className={`rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors ${
                      sortMode === k
                        ? 'text-primary-foreground shadow-gold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    style={
                      sortMode === k
                        ? { background: 'var(--av-gradient-gold)', borderColor: 'transparent' }
                        : { borderColor: 'hsl(var(--av-border-strong))' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Currency */}
              <div className="flex gap-1 items-center">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleCurrency(c.code)}
                    className={`rounded-sm border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                      currency === c.code
                        ? 'text-primary border-primary/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    style={{
                      background: currency === c.code ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                      borderColor: currency === c.code ? 'hsl(var(--av-primary) / 0.4)' : 'hsl(var(--av-border))',
                    }}
                  >
                    {c.flag} {c.code}
                  </button>
                ))}
                {fxLoading && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground ml-1">
                    syncing…
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-10">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((d, i) => (
              <YieldCard
                key={d.ref || i}
                d={d}
                fmtC={fmtC}
                expanded={expandedRef === (d.ref || String(i))}
                onToggle={() => setExpandedRef(expandedRef === (d.ref || String(i)) ? null : d.ref || String(i))}
              />
            ))}

            {/* Blurred preview cards */}
            {blurredPreview.map((d, i) => (
              <button
                key={`lock-${i}`}
                onClick={() => setProOpen(true)}
                className="relative overflow-hidden rounded-sm text-left cursor-pointer"
                aria-label="Unlock PRO"
              >
                <div
                  style={{
                    filter: 'blur(8px) saturate(0.7)',
                    opacity: 0.5,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  <YieldCard d={d} fmtC={fmtC} expanded={false} onToggle={() => {}} blurred />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                    style={{ background: 'var(--av-gradient-gold)' }}
                  >
                    <Lock className="h-3 w-3" />
                    PRO Only
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Unlock CTA */}
          {!isPaid && remaining > 0 && (
            <button
              onClick={() => setProOpen(true)}
              className="mt-6 w-full flex flex-col items-center justify-center gap-1 rounded-sm py-5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              <span className="flex items-center gap-3">
                <Lock className="h-3.5 w-3.5" />
                Unlock {remaining.toLocaleString()} more yield analyses · PRO €79/mo
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-85 normal-case">
                Full Terminal access · Investment calculator · Alpha signals
              </span>
            </button>
          )}

          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {isPaid
              ? `${sorted.length.toLocaleString()} yield analyses · full access`
              : `Showing top ${FREE_VISIBLE} · ${remaining.toLocaleString()}+ more with PRO`}
          </p>
        </div>
      </section>

      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </>
  );
}

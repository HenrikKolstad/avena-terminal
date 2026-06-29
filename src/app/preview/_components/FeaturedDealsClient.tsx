'use client';

import { ArrowUpRight, Lock, X, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProModal } from '@/components/v2/ProModal';

export interface DealItem {
  ref: string | null;
  score: number;
  project: string;
  town: string;
  region: string;
  type: string;
  price: number;
  pm2: number;
  mm2: number;
  discount: number;
  saved: number;
  built: number;
  beds: number | null;
  thumb: string | null;
  alphaTag?: string | null;
}

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

/**
 * Thumbnail that degrades gracefully: a dead image URL would otherwise
 * render the browser's broken-image glyph. On error (or no src) we fall
 * back to a clean surface-coloured placeholder instead.
 */
function DealThumb({ src, className }: { src: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={className} style={{ background: 'hsl(var(--av-surface))' }} aria-hidden="true" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
      style={{ background: 'hsl(var(--av-surface))' }}
    />
  );
}

/** Mobile card hero image — collapses entirely if the URL is dead. */
function DealHeroImage({ src, project, town }: { src: string | null; project: string; town: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="relative -mx-4 -mt-4 mb-4 aspect-[16/9] overflow-hidden rounded-t-sm max-w-[calc(100%+2rem)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${project} — ${town}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover block"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent 50%, hsl(var(--av-background) / 0.8) 100%)' }}
      />
    </div>
  );
}

const FREE_VISIBLE = 3;

const PRICE_MIN = 50_000;
const PRICE_MAX = 5_000_000;

export function FeaturedDealsClient({ items: rawItems, total }: { items: DealItem[]; total: number }) {
  const { isPaid } = useAuth();
  const [proOpen, setProOpen] = useState(false);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [town, setTown] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [priceMin, setPriceMin] = useState<number>(PRICE_MIN);
  const [priceMax, setPriceMax] = useState<number>(PRICE_MAX);
  const [minScore, setMinScore] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);

  // Options derived from items
  const towns = useMemo(() => {
    const map = new Map<string, number>();
    rawItems.forEach((d) => map.set(d.town, (map.get(d.town) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t]) => t);
  }, [rawItems]);

  const regions = useMemo(() => {
    const set = new Set(rawItems.map((d) => d.region).filter(Boolean));
    return Array.from(set).sort();
  }, [rawItems]);

  const items = useMemo(() => {
    return rawItems.filter((d) => {
      if (town && d.town !== town) return false;
      if (region && d.region !== region) return false;
      if (d.price < priceMin) return false;
      if (d.price > priceMax) return false;
      if (d.score < minScore) return false;
      if (d.discount < minDiscount) return false;
      return true;
    });
  }, [rawItems, town, region, priceMin, priceMax, minScore, minDiscount]);

  const activeFilters =
    (town ? 1 : 0) +
    (region ? 1 : 0) +
    (priceMin > PRICE_MIN || priceMax < PRICE_MAX ? 1 : 0) +
    (minScore > 0 ? 1 : 0) +
    (minDiscount > 0 ? 1 : 0);

  const resetFilters = () => {
    setTown('');
    setRegion('');
    setPriceMin(PRICE_MIN);
    setPriceMax(PRICE_MAX);
    setMinScore(0);
    setMinDiscount(0);
  };

  const isGated = (idx: number) => !isPaid && idx >= FREE_VISIBLE;

  return (
    <section
      id="deals"
      className="relative border-t py-24 sm:py-32"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-background))',
      }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
        {/* Section header */}
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span
                className="h-px w-10"
                style={{ background: 'hsl(var(--av-primary))' }}
              />
              Live Rankings · 01
            </span>
            <h2 className="font-serif text-5xl font-light leading-[1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              The deals the market
              <br />
              <span className="italic text-gold">hasn&apos;t priced in</span>.
            </h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Scored
              </span>
              <span className="font-mono text-sm tabular text-foreground">
                {total.toLocaleString()} properties
              </span>
            </div>
            {isPaid ? (
              <Link
                href="/"
                className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary"
              >
                View all
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setProOpen(true)}
                className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:text-gold cursor-pointer"
              >
                View all
                <Lock className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filters bar */}
        <div
          className="mb-6 rounded-sm border"
          style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
        >
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilters > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full px-1.5 font-mono text-[9px] text-primary-foreground"
                  style={{ background: 'hsl(var(--av-primary))', minWidth: 16 }}
                >
                  {activeFilters}
                </span>
              )}
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {items.length.toLocaleString()} of {rawItems.length.toLocaleString()} deals
            </span>
            {activeFilters > 0 && (
              <button
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="border-t px-4 py-5 space-y-5" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              {/* Towns */}
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Town</div>
                <div className="flex flex-wrap gap-1.5">
                  {towns.slice(0, 24).map((t) => {
                    const on = town === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTown(on ? '' : t)}
                        className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                        style={{
                          borderColor: on ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                          background: on ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                          color: on ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regions */}
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Region</div>
                <div className="flex flex-wrap gap-1.5">
                  {regions.map((r) => {
                    const on = region === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRegion(on ? '' : r)}
                        className="rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors"
                        style={{
                          borderColor: on ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                          background: on ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                          color: on ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price range */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Price range</div>
                  <div className="font-mono text-[11px] text-primary tabular">
                    €{fmt(priceMin)} — €{fmt(priceMax)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <div className="font-mono text-[9px] text-muted-foreground mb-1">Min</div>
                    <input
                      type="range"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={10000}
                      value={priceMin}
                      onChange={(e) => setPriceMin(Math.min(Number(e.target.value), priceMax - 10000))}
                      className="w-full accent-primary"
                    />
                  </label>
                  <label className="block">
                    <div className="font-mono text-[9px] text-muted-foreground mb-1">Max</div>
                    <input
                      type="range"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={10000}
                      value={priceMax}
                      onChange={(e) => setPriceMax(Math.max(Number(e.target.value), priceMin + 10000))}
                      className="w-full accent-primary"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: 'Any', lo: PRICE_MIN, hi: PRICE_MAX },
                    { label: '< 200k', lo: PRICE_MIN, hi: 200_000 },
                    { label: '200–350k', lo: 200_000, hi: 350_000 },
                    { label: '350–500k', lo: 350_000, hi: 500_000 },
                    { label: '500k–1m', lo: 500_000, hi: 1_000_000 },
                    { label: '1m+', lo: 1_000_000, hi: PRICE_MAX },
                  ].map((p) => {
                    const on = priceMin === p.lo && priceMax === p.hi;
                    return (
                      <button
                        key={p.label}
                        onClick={() => { setPriceMin(p.lo); setPriceMax(p.hi); }}
                        className="rounded-sm border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] transition-colors"
                        style={{
                          borderColor: on ? 'hsl(var(--av-primary) / 0.5)' : 'hsl(var(--av-border) / 0.6)',
                          background: on ? 'hsl(var(--av-primary) / 0.1)' : 'transparent',
                          color: on ? 'hsl(var(--av-primary))' : 'hsl(var(--av-muted-foreground))',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Min score + min discount */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Min Avena Score</div>
                    <div className="font-mono text-[11px] text-primary tabular">{minScore || '—'}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={95}
                    step={5}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Min discount</div>
                    <div className="font-mono text-[11px] text-primary tabular">{minDiscount ? `${minDiscount}%` : '—'}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={35}
                    step={5}
                    value={minDiscount}
                    onChange={(e) => setMinDiscount(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {items.length === 0 && (
          <div
            className="mb-6 rounded-sm border p-8 text-center"
            style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div className="font-serif text-lg text-foreground mb-1">No deals match these filters.</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
              Try loosening price range or minimum score.
            </div>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
            >
              <X className="h-3 w-3" /> Clear all filters
            </button>
          </div>
        )}

        {/* Desktop table */}
        <div
          className="hidden overflow-hidden rounded-sm border lg:block relative"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'hsl(var(--av-surface) / 0.3)',
          }}
        >
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                {['#', 'Score', 'Project', 'Region', 'Type', 'Price', '€/m²', 'Market', 'Δ', 'Saved', 'Built', 'Beds', ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={`border-b px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] ${
                        h === 'Saved' ? 'text-right text-primary' : 'text-muted-foreground'
                      } ${
                        ['Price', '€/m²', 'Market', 'Δ', 'Saved', 'Built', 'Beds'].includes(h)
                          ? 'text-right'
                          : 'text-left'
                      }`}
                      style={{ borderColor: 'hsl(var(--av-border))' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((d, idx) => {
                const rank = idx + 1;
                const gated = isGated(idx);
                const href = gated ? '#' : d.ref ? `/property/${encodeURIComponent(d.ref)}` : '/';
                const rowStyle: React.CSSProperties = gated
                  ? {
                      filter: 'blur(7px) saturate(0.7)',
                      opacity: 0.55,
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }
                  : {};

                return (
                  <tr
                    key={d.ref || rank}
                    className="group cursor-pointer transition-colors"
                    style={rowStyle}
                    aria-hidden={gated}
                  >
                    <td className="border-b px-4 py-4" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-xs tabular text-muted-foreground">
                        {String(rank).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="border-b px-4 py-4" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-2xl font-light tabular text-gold">{d.score}</span>
                        <div className="h-1 w-16 overflow-hidden rounded-full" style={{ background: 'hsl(var(--av-border))' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${d.score}%`, background: 'var(--av-gradient-gold)' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="border-b px-4 py-4" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <div className="flex items-center gap-3">
                        <DealThumb src={d.thumb} className="h-12 w-16 flex-shrink-0 rounded-sm object-cover" />
                        <div className="flex flex-col min-w-0">
                          <Link
                            href={href}
                            className="font-serif text-base text-foreground transition-colors hover:text-primary max-w-[240px] truncate"
                            title={d.project}
                          >
                            {d.project}
                          </Link>
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            {d.town}
                          </span>
                          {d.alphaTag && (
                            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-primary/90 italic">
                              {d.alphaTag}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="border-b px-4 py-4" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span
                        className="rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                        style={{
                          borderColor: 'hsl(var(--av-border))',
                          background: 'hsl(var(--av-background) / 0.6)',
                        }}
                      >
                        {d.region}
                      </span>
                    </td>
                    <td className="border-b px-4 py-4" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80">{d.type}</span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-sm font-medium tabular text-foreground">€{fmt(d.price)}</span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-xs tabular text-foreground/80">{fmt(Math.round(d.pm2))}</span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-xs tabular text-muted-foreground">{fmt(Math.round(d.mm2))}</span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-sm font-semibold tabular text-primary">−{d.discount}%</span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span
                        className="inline-block rounded-sm px-2 py-1 font-mono text-sm font-bold tabular text-primary-foreground"
                        style={{ background: 'var(--av-gradient-gold)', boxShadow: 'var(--av-shadow-gold)' }}
                      >
                        €{fmt(d.saved)}
                      </span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-xs tabular text-foreground/80">{d.built}m²</span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <span className="font-mono text-xs tabular text-foreground/80">{d.beds ?? '—'}</span>
                    </td>
                    <td className="border-b px-4 py-4 text-right" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <Link
                        href={href}
                        aria-label="Open"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>

        {/* Desktop unlock CTA — sits below the table, not overlaid on it */}
        {!isPaid && items.length > FREE_VISIBLE && (
          <button
            onClick={() => setProOpen(true)}
            className="hidden lg:flex w-full flex-col items-center justify-center gap-1 rounded-sm py-5 mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            <span className="flex items-center gap-3">
              <Lock className="h-3.5 w-3.5" />
              Unlock {(total - FREE_VISIBLE).toLocaleString()} more properties · PRO €79/mo
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-85 normal-case">
              Full Terminal access · Yield calculator · Alpha signals
            </span>
          </button>
        )}

        {/* Mobile cards */}
        <div className="grid gap-3 lg:hidden relative">
          {items.map((d, idx) => {
            const rank = idx + 1;
            const gated = isGated(idx);
            const href = gated ? '#' : d.ref ? `/property/${encodeURIComponent(d.ref)}` : '/';
            const cardStyle: React.CSSProperties = gated
              ? {
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                  background: 'hsl(var(--av-surface) / 0.4)',
                  filter: 'blur(5px)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }
              : {
                  borderColor: 'hsl(var(--av-border) / 0.6)',
                  background: 'hsl(var(--av-surface) / 0.4)',
                };

            const Card = (
              <>
                {/* Thumbnail header — full card width; collapses if URL is dead */}
                <DealHeroImage src={d.thumb} project={d.project} town={d.town} />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      #{String(rank).padStart(2, '0')}
                    </span>
                    <span className="font-serif text-3xl font-light tabular text-gold">{d.score}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular text-primary">−{d.discount}%</span>
                </div>

                <div
                  className="mt-3 inline-flex items-center gap-2 rounded-sm px-3 py-1.5"
                  style={{ background: 'var(--av-gradient-gold)', boxShadow: 'var(--av-shadow-gold)' }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary-foreground/80">Saved</span>
                  <span className="font-mono text-base font-bold tabular text-primary-foreground">€{fmt(d.saved)}</span>
                </div>
                <h3 className="mt-3 font-serif text-lg leading-tight text-foreground line-clamp-2">{d.project}</h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {d.town} · {d.type}
                </p>
                {d.alphaTag && (
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-primary/90 italic">
                    {d.alphaTag}
                  </p>
                )}
                <div
                  className="mt-4 flex items-end justify-between border-t pt-3"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Price</p>
                    <p className="font-mono text-base tabular text-foreground">€{fmt(d.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">€/m²</p>
                    <p className="font-mono text-sm tabular text-foreground/80">
                      {fmt(Math.round(d.pm2))}{' '}
                      <span className="text-muted-foreground line-through">{fmt(Math.round(d.mm2))}</span>
                    </p>
                  </div>
                </div>
              </>
            );

            if (gated) {
              return (
                <button
                  key={d.ref || rank}
                  type="button"
                  onClick={() => setProOpen(true)}
                  className="relative rounded-sm border p-4 text-left cursor-pointer active:opacity-80 overflow-hidden w-full"
                  style={{
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                    background: 'hsl(var(--av-surface) / 0.4)',
                  }}
                  aria-label={`Unlock #${rank} — PRO`}
                >
                  {/* Visible content, blurred */}
                  <div
                    style={{
                      filter: 'blur(7px) saturate(0.7)',
                      opacity: 0.55,
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    {Card}
                  </div>
                  {/* Lock badge overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                      style={{ background: 'var(--av-gradient-gold)' }}
                    >
                      <Lock className="h-3 w-3" />
                      PRO · Unlock
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={d.ref || rank}
                href={href}
                className="rounded-sm border p-4 active:opacity-80 transition-opacity overflow-hidden block"
                style={cardStyle}
              >
                {Card}
              </Link>
            );
          })}

          {/* Mobile unlock CTA */}
          {!isPaid && items.length > FREE_VISIBLE && (
            <button
              onClick={() => setProOpen(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-sm py-4 mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              <span className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                Unlock {(total - FREE_VISIBLE).toLocaleString()} more · PRO €79/mo
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
              <span className="text-[9px] opacity-80 normal-case tracking-[0.2em]">
                Full Terminal · Yield · Signals
              </span>
            </button>
          )}
        </div>

        {/* After-50 "load more" gate — applies to PRO users who've exhausted the 50 shown */}
        {isPaid && items.length > 0 && total > items.length && (
          <a
            href={`mailto:henrik@xaviaestate.com?subject=${encodeURIComponent('Request full deal feed — Avena PRO')}&body=${encodeURIComponent(
              `Hi Avena,\n\nI'd like to see beyond the top 50 deals. Please send me the full feed or unlock the next batch in my account.\n\nThanks`
            )}`}
            className="mt-6 w-full hidden lg:flex flex-col items-center justify-center gap-1 rounded-sm border py-5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary hover:border-primary"
            style={{
              background: 'hsl(var(--av-surface) / 0.4)',
              borderColor: 'hsl(var(--av-border-strong))',
            }}
          >
            <span className="flex items-center gap-3">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Request access to the remaining {(total - items.length).toLocaleString()} properties
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground normal-case">
              Top 50 shown · full feed available on request
            </span>
          </a>
        )}

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {isPaid
            ? total > items.length
              ? `Showing top ${items.length} of ${total.toLocaleString()} · request full feed above`
              : `Live data — ${total.toLocaleString()} scored properties · full access`
            : `Showing top ${FREE_VISIBLE} · ${(total - FREE_VISIBLE).toLocaleString()}+ more properties with PRO`}
        </p>
      </div>

      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </section>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';
import PropertyGallery from '@/components/PropertyGallery';
import { DiscountExplainer } from '@/components/v2/DiscountExplainer';
import { WatchlistButton } from '@/components/v2/WatchlistButton';
import { SimilarDeals } from '@/components/v2/SimilarDeals';
import { DataFreshness } from '@/components/v2/DataFreshness';

function findProperty(ref: string): Property | null {
  return getAllProperties().find((p) => p.ref === ref) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params;
  const p = findProperty(decodeURIComponent(ref));
  if (!p) return { title: 'Property Not Found | Avena Terminal' };

  const title = `${p.bd}-bed new build in ${p.l} — ${Math.round(p._sc ?? 0)}/100 investment score | Avena Terminal`;
  const description = `New build in ${p.l}. Asking from €${(p.pf ?? 0).toLocaleString()}. Estimated rental yield ${p._yield?.gross?.toFixed(1) ?? '–'}%. Investment score ${Math.round(p._sc ?? 0)}/100. Analyse on Avena Terminal.`;

  return {
    title, description,
    openGraph: {
      title, description,
      url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,
      siteName: 'Avena Terminal',
      images: p.imgs?.[0] ? [{ url: p.imgs[0], width: 1200, height: 630 }] : [{ url: '/opengraph-image', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description, images: p.imgs?.[0] ? [p.imgs[0]] : ['/opengraph-image'] },
  };
}

function ProgressBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label} <span className="ml-2 opacity-60">{weight}</span>
        </span>
        <span className={`font-serif text-2xl font-light tabular ${
          value >= 75 ? 'text-primary' : value >= 60 ? 'text-foreground' : value >= 45 ? 'text-accent' : 'text-destructive'
        }`}>
          {value}
        </span>
      </div>
      <div className="w-full rounded-full h-1" style={{ background: 'hsl(var(--av-border))' }}>
        <div
          className="h-1 rounded-full transition-all"
          style={{
            width: `${value}%`,
            background: value >= 60 ? 'var(--av-gradient-gold)' : value >= 45 ? 'hsl(var(--av-warning))' : 'hsl(var(--av-destructive))',
          }}
        />
      </div>
    </div>
  );
}

export default async function PropertyPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const property = findProperty(decodeURIComponent(ref));

  if (!property) {
    return (
      <div className="avena-v2 min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center">
            <h1 className="font-serif text-5xl font-light text-foreground mb-4">
              Property <span className="italic text-gold">not found</span>.
            </h1>
            <p className="text-muted-foreground mb-8">This reference does not exist in our dataset.</p>
            <Link
              href="/terminal"
              className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              ← Back to Terminal
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const p = property;
  const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
  const townSlug = slugify(p.l);
  const marketPm2 = p.mm2 && pm2 ? Math.round(p.mm2) : null;
  const rawDiscount = marketPm2 && pm2 ? Math.round((1 - pm2 / marketPm2) * 100) : null;
  const rawSaved = marketPm2 && pm2 && p.bm ? Math.round((marketPm2 - pm2) * p.bm) : null;

  // Credibility cap: any single deal saving more than 35% looks fake to visitors
  // even when the underlying comp is correct. Cap the DISPLAY at 35% and show
  // an asterisk. Off-plan properties (completion > current year) legitimately
  // trade at steeper discounts vs ready-market — this is a credibility display
  // decision, not a data correction.
  const DISPLAY_CAP_PCT = 35;
  const isCapped = rawDiscount !== null && rawDiscount > DISPLAY_CAP_PCT;
  const discount = rawDiscount !== null
    ? Math.min(rawDiscount, DISPLAY_CAP_PCT)
    : null;
  const saved = isCapped && pm2 && p.bm
    ? Math.round(pm2 * p.bm * (DISPLAY_CAP_PCT / (100 - DISPLAY_CAP_PCT)))
    : rawSaved;

  // Rank-in-town: "this is the Nth best-scored property out of M in {town}"
  const townSet = getAllProperties().filter((x) => x.l === p.l && x._sc != null);
  const sorted = [...townSet].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
  const rankInTown = sorted.findIndex((x) => x.ref === p.ref) + 1;
  const townTotal = townSet.length;

  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Towns', item: 'https://avenaterminal.com/towns' },
      { '@type': 'ListItem', position: 3, name: p.l, item: `https://avenaterminal.com/towns/${townSlug}` },
      { '@type': 'ListItem', position: 4, name: p.p },
    ],
  };

  // Rich product JSON-LD — machine-readable for LLM quotation
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: p.p || `${p.t} in ${p.l}`,
    url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,
    identifier: p.ref,
    address: { '@type': 'PostalAddress', addressLocality: p.l, addressRegion: p.costa ?? undefined, addressCountry: 'ES' },
    numberOfRooms: p.bd,
    numberOfBathroomsTotal: p.ba,
    floorSize: p.bm ? { '@type': 'QuantitativeValue', value: p.bm, unitCode: 'MTK' } : undefined,
    offers: {
      '@type': 'Offer',
      price: p.pf,
      priceCurrency: 'EUR',
      availability: p.s === 'ready' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      seller: { '@type': 'Organization', name: p.d ?? 'Avena Terminal' },
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'avena_score', value: Math.round(p._sc ?? 0), maxValue: 100 },
      p.mm2 ? { '@type': 'PropertyValue', name: 'town_median_eur_m2', value: Math.round(p.mm2) } : null,
      pm2 ? { '@type': 'PropertyValue', name: 'price_eur_m2', value: pm2 } : null,
      discount ? { '@type': 'PropertyValue', name: 'discount_vs_town_pct', value: discount } : null,
      p._yield?.gross ? { '@type': 'PropertyValue', name: 'yield_gross_pct', value: Number(p._yield.gross.toFixed(2)) } : null,
      townTotal > 0 ? { '@type': 'PropertyValue', name: 'rank_in_town', value: rankInTown, maxValue: townTotal } : null,
    ].filter(Boolean),
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />

      <Nav />

      <main className="pt-16">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10">
          {/* Breadcrumb */}
          <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex flex-wrap items-center gap-2">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/towns" className="hover:text-primary">Towns</Link>
            <span>/</span>
            <Link href={`/towns/${townSlug}`} className="hover:text-primary">{p.l}</Link>
            <span>/</span>
            <span className="text-foreground/80 truncate max-w-[280px]">{p.p}</span>
          </nav>

          {/* Hero */}
          <section className="grid lg:grid-cols-2 gap-10 mb-16">
            <PropertyGallery images={p.imgs || []} alt={`${p.p} in ${p.l}`} />

            <div className="flex flex-col justify-center">
              <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                {p.t} · {p.l}
                {p.costa && <span className="text-muted-foreground">· {p.costa}</span>}
              </span>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground mb-4">
                {p.p}
              </h1>

              {p.d && (
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
                  by {p.d}
                </p>
              )}

              <div className="flex items-baseline gap-4 mb-3">
                <span className="font-serif text-5xl sm:text-6xl font-light text-foreground tabular">
                  €{p.pf.toLocaleString()}
                </span>
                {p.pt > p.pf && (
                  <span className="font-serif text-xl text-muted-foreground">
                    – €{p.pt.toLocaleString()}
                  </span>
                )}
              </div>

              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-8">
                {p.s === 'ready' ? 'Ready to move in' : p.s === 'under-construction' ? 'Under construction' : 'Off-plan'}
                {p.c ? ` · Completion ${p.c}` : ''}
              </p>

              {p._sc != null && (
                <div
                  className="inline-flex items-center gap-6 rounded-sm border p-5 mb-6 w-fit"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Avena Score
                    </div>
                    <div className={`font-serif text-6xl font-light tabular ${
                      p._sc >= 70 ? 'text-primary' : p._sc >= 50 ? 'text-accent' : 'text-destructive'
                    }`}>
                      {Math.round(p._sc)}
                    </div>
                    {townTotal > 3 && rankInTown > 0 && (
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                        Rank <span className="text-primary">#{rankInTown}</span> of {townTotal} in {p.l}
                      </div>
                    )}
                  </div>
                  {saved && saved > 0 && (
                    <>
                      <div className="h-14 w-px" style={{ background: 'hsl(var(--av-border))' }} />
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                          You save
                        </div>
                        <div
                          className="inline-block rounded-sm px-3 py-1 mt-1 font-mono text-xl font-bold tabular text-primary-foreground"
                          style={{ background: 'var(--av-gradient-gold)', boxShadow: 'var(--av-shadow-gold)' }}
                        >
                          €{saved.toLocaleString()}
                        </div>
                        {discount && (
                          <div className="mt-1">
                            <DiscountExplainer
                              discount={discount}
                              isCapped={isCapped}
                              rawDiscount={rawDiscount}
                              marketPm2={marketPm2}
                              propertyPm2={pm2}
                              townName={p.l}
                              completionYear={p.c ? Number(p.c) : null}
                              status={p.s ?? null}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {(() => {
                const subject = encodeURIComponent(`Enquiry: ${p.p} · ${p.l}`);
                const body = encodeURIComponent(
                  `Hi Henrik,\n\n` +
                  `I'd like more information about this property:\n\n` +
                  `Project: ${p.p}\n` +
                  `Reference: ${p.ref}\n` +
                  `Location: ${p.l}${p.costa ? ` · ${p.costa}` : ''}\n` +
                  `Type: ${p.t} · ${p.bd} bed · ${p.ba} bath · ${p.bm} m²\n` +
                  `Price: €${p.pf.toLocaleString()}\n` +
                  `Avena Score: ${Math.round(p._sc ?? 0)}/100\n` +
                  (p._yield ? `Estimated gross yield: ${p._yield.gross.toFixed(1)}%\n` : '') +
                  (p.d ? `Developer: ${p.d}\n` : '') +
                  `\nURL: https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}\n\n` +
                  `I'd like to know:\n- Current availability\n- Viewing options\n- Payment plan\n\nThanks!`
                );
                const mailto = `mailto:henrik@xaviaestate.com?subject=${subject}&body=${body}`;
                return (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <a
                      href={mailto}
                      className="group inline-flex items-center justify-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 flex-1"
                      style={{ background: 'var(--av-gradient-gold)' }}
                    >
                      Contact Avena
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                    {p.ref && <WatchlistButton propertyRef={p.ref} size="md" />}
                  </div>
                );
              })()}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <DataFreshness label="Property data" />
                {p.ref && (
                  <Link
                    href={`/property/${encodeURIComponent(p.ref)}/one-pager`}
                    className="inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    Download one-pager
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* Key Stats */}
          <section className="mb-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Key <span className="italic text-gold">statistics</span>.
            </h2>
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px overflow-hidden rounded-sm border"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
            >
              {[
                { label: 'Price', value: `€${p.pf.toLocaleString()}` },
                { label: 'Bedrooms', value: String(p.bd) },
                { label: 'Bathrooms', value: String(p.ba) },
                { label: 'Built m²', value: `${p.bm}` },
                { label: 'Price / m²', value: pm2 ? `€${pm2.toLocaleString()}` : '–' },
                { label: 'Beach', value: p.bk != null ? `${p.bk} km` : '–' },
              ].map((stat) => (
                <div key={stat.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    {stat.label}
                  </div>
                  <div className="font-serif text-2xl font-light tabular text-foreground">{stat.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Sub-Scores */}
          {p._scores && (
            <section className="mb-16">
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
                Investment <span className="italic text-gold">sub-scores</span>.
              </h2>
              <div
                className="rounded-sm border p-8 grid gap-6"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <ProgressBar label="Value" weight="40%" value={Math.round(p._scores.value)} />
                <ProgressBar label="Yield" weight="25%" value={Math.round(p._scores.yield)} />
                <ProgressBar label="Location" weight="20%" value={Math.round(p._scores.location)} />
                <ProgressBar label="Quality" weight="10%" value={Math.round(p._scores.quality)} />
                <ProgressBar label="Risk" weight="5%" value={Math.round(p._scores.risk)} />
              </div>
            </section>
          )}

          {/* Rental Yield */}
          {p._yield && (
            <section className="mb-16">
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
                Estimated rental <span className="italic text-gold">yield</span>.
              </h2>
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-px overflow-hidden rounded-sm border"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
              >
                <div className="p-6 text-center" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    Gross yield
                  </div>
                  <div className="font-serif text-5xl font-light text-primary tabular">
                    {p._yield.gross.toFixed(1)}%
                  </div>
                </div>
                <div className="p-6 text-center" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    Annual income
                  </div>
                  <div className="font-serif text-5xl font-light text-foreground tabular">
                    €{Math.round(p._yield.annual).toLocaleString()}
                  </div>
                </div>
                <div className="p-6 text-center" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    Weekly rent
                  </div>
                  <div className="font-serif text-5xl font-light text-foreground tabular">
                    €{Math.round(p._yield.rate * 7).toLocaleString()}
                  </div>
                </div>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Gross yield estimate · Net yield with full cost breakdown in Terminal
              </p>
            </section>
          )}

          {/* Internal links */}
          <section className="mb-16 flex flex-wrap gap-4">
            <Link
              href={`/towns/${townSlug}`}
              className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
              style={{ borderColor: 'hsl(var(--av-border-strong))' }}
            >
              More in {p.l} →
            </Link>
            {p.costa && (
              <Link
                href={`/costas/${slugify(p.costa)}`}
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                All {p.costa} →
              </Link>
            )}
          </section>

          {/* CTA */}
          <section
            className="relative overflow-hidden text-center py-16 border-t"
            style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
            />
            <div className="relative">
              <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-foreground mb-4">
                Ready to <span className="italic text-gold">analyse</span> this deal?
              </h2>
              <p className="text-muted-foreground mb-8 font-light max-w-md mx-auto">
                Availability, payment plans, viewings. Avena replies personally within 24h.
              </p>
              {(() => {
                const subject = encodeURIComponent(`Enquiry: ${p.p} · ${p.l}`);
                const body = encodeURIComponent(
                  `Hi Henrik,\n\n` +
                  `I'd like more information about this property:\n\n` +
                  `Project: ${p.p}\n` +
                  `Reference: ${p.ref}\n` +
                  `Location: ${p.l}${p.costa ? ` · ${p.costa}` : ''}\n` +
                  `Type: ${p.t} · ${p.bd} bed · ${p.ba} bath · ${p.bm} m²\n` +
                  `Price: €${p.pf.toLocaleString()}\n` +
                  `Avena Score: ${Math.round(p._sc ?? 0)}/100\n` +
                  (p._yield ? `Estimated gross yield: ${p._yield.gross.toFixed(1)}%\n` : '') +
                  `\nURL: https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}\n\n` +
                  `Thanks!`
                );
                const mailto = `mailto:henrik@xaviaestate.com?subject=${subject}&body=${body}`;
                return (
                  <a
                    href={mailto}
                    className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                    style={{ background: 'var(--av-gradient-gold)' }}
                  >
                    Contact Avena about this property
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                );
              })()}
            </div>
          </section>

          {/* Similar deals in the same town */}
          <SimilarDeals
            currentRef={p.ref ?? ''}
            town={p.l}
            type={p.t}
            price={p.pf}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
import { RecordPropertyView } from '@/components/v2/RecordPropertyView';
import { ShareButtons } from '@/components/v2/ShareButtons';
import { ScoreDeltaBadge } from '@/components/v2/ScoreDeltaBadge';

function findProperty(ref: string): Property | null {
  return getAllProperties().find((p) => p.ref === ref) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params;
  const p = findProperty(decodeURIComponent(ref));
  if (!p) return { title: 'Property Not Found | Avena Terminal' };

  // Title leads with what buyers actually search ("3-bed apartment for sale
  // in Estepona"), not our internal score — a "33/100" in a SERP title
  // repels the click. Score/yield stay in the description where they
  // differentiate us.
  const metaTown = p.l.split(',')[0].trim();
  const title = `${p.bd}-Bed ${p.t} for Sale in ${metaTown} — New Build from €${(p.pf ?? 0).toLocaleString()} | Avena`;
  const description = `New build ${p.t.toLowerCase()} in ${p.l}. From €${(p.pf ?? 0).toLocaleString()}, est. gross yield ${p._yield?.gross?.toFixed(1) ?? '–'}%, Avena Score ${Math.round(p._sc ?? 0)}/100 — re-scored daily against the town's €/m² benchmark.`;

  return {
    title, description,
    alternates: { canonical: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}` },
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

  // Real 404 (status + branded /not-found.tsx, which is noindex) instead of a
  // soft-404 that returned 200 for any non-existent ref.
  if (!property) notFound();

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
  // When the discount is capped at 35% for display, the saving must equal
  // 35% of market value (= what "−35%" claims), not a grossed-up figure off
  // the paid price — otherwise the headline "−35%" and "Saved €X" disagree.
  const saved = isCapped && marketPm2 && p.bm
    ? Math.round(marketPm2 * p.bm * (DISPLAY_CAP_PCT / 100))
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

  // Rich listing JSON-LD — machine-readable for LLM quotation.
  // RealEstateListing (a CreativeWork) legally carries `offers`; the old
  // Residence type did not, which made every property page validate with
  // errors. The dwelling itself lives in `about`, and our proprietary
  // metrics attach to it via additionalProperty (valid on Place).
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.p || `${p.t} in ${p.l}`,
    url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,
    identifier: p.ref,
    ...(p._added ? { datePosted: p._added } : {}),
    ...(p.imgs?.[0] ? { image: p.imgs.slice(0, 3) } : {}),
    about: {
      '@type': 'Residence',
      name: p.p || `${p.t} in ${p.l}`,
      address: { '@type': 'PostalAddress', addressLocality: p.l, addressRegion: p.costa ?? undefined, addressCountry: 'ES' },
      numberOfRooms: p.bd,
      numberOfBathroomsTotal: p.ba,
      floorSize: p.bm ? { '@type': 'QuantitativeValue', value: p.bm, unitCode: 'MTK' } : undefined,
      ...(p.lat && p.lng ? { geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } } : {}),
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'avena_score', value: Math.round(p._sc ?? 0), maxValue: 100 },
        p.mm2 ? { '@type': 'PropertyValue', name: 'town_median_eur_m2', value: Math.round(p.mm2) } : null,
        pm2 ? { '@type': 'PropertyValue', name: 'price_eur_m2', value: pm2 } : null,
        discount ? { '@type': 'PropertyValue', name: 'discount_vs_town_pct', value: discount } : null,
        p._yield?.gross ? { '@type': 'PropertyValue', name: 'yield_gross_pct', value: Number(p._yield.gross.toFixed(2)) } : null,
        townTotal > 0 ? { '@type': 'PropertyValue', name: 'rank_in_town', value: rankInTown, maxValue: townTotal } : null,
      ].filter(Boolean),
    },
    offers: {
      '@type': 'Offer',
      price: p.pf,
      priceCurrency: 'EUR',
      availability: p.s === 'ready' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      seller: { '@type': 'Organization', name: p.d ?? 'Avena Terminal' },
    },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <div className="avena-v2 min-h-screen overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />

      <Nav />
      {p.ref && <RecordPropertyView propertyRef={p.ref} />}

      <main className="av-clean pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        {/* Dossier strip — stitches the detail page into the MARE register */}
        <div className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.35)' }}>
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.35em] text-foreground/60 sm:px-12">
            <span className="flex items-center gap-3">
              <span className="h-px w-6" style={{ background: 'hsl(var(--av-primary))' }} />
              The dossier · {p.ref ?? '—'}
            </span>
            <span className="hidden sm:inline">{(p.costa ?? 'Costa Blanca').toUpperCase()} · ES</span>
            <span>
              Avena Score <span className="text-gold">{Math.round(p._sc ?? 0)}</span> · scored this morning
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10 min-w-0" style={{ width: '100%' }}>
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
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16 min-w-0">
            <div className="min-w-0 max-w-full">
              <PropertyGallery images={p.imgs || []} alt={`${p.p} in ${p.l}`} />
            </div>

            <div className="flex flex-col justify-center min-w-0 max-w-full">
              <span className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.4em] text-primary">
                <span className="h-px w-6 sm:w-10 hidden sm:inline-block" style={{ background: 'hsl(var(--av-primary))' }} />
                <span>{p.t} · {p.l}</span>
                {p.costa && <span className="text-muted-foreground">· {p.costa}</span>}
              </span>

              <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-light leading-[1.1] tracking-tight text-foreground mb-4 break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {p.p}
              </h1>

              {p.d && (
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
                  by {p.d}
                </p>
              )}

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3 max-w-full">
                <span className="font-serif text-3xl sm:text-5xl md:text-6xl font-light text-foreground tabular break-words" style={{ overflowWrap: 'anywhere' }}>
                  €{p.pf.toLocaleString()}
                </span>
                {p.pt > p.pf && (
                  <span className="font-serif text-base sm:text-xl text-muted-foreground">
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
                  className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start gap-4 sm:gap-6 rounded-sm border p-4 sm:p-5 mb-6 max-w-full"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Avena Score
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-serif text-5xl sm:text-6xl font-light tabular ${
                        p._sc >= 70 ? 'text-primary' : p._sc >= 50 ? 'text-accent' : 'text-destructive'
                      }`}>
                        {Math.round(p._sc)}
                      </span>
                      <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary) / 0.5)' }} />
                    </div>
                    {townTotal > 3 && rankInTown > 0 && (
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                        Rank <span className="text-primary">#{rankInTown}</span> of {townTotal} in {p.l}
                      </div>
                    )}
                    {p.ref && (
                      <div className="mt-2">
                        <ScoreDeltaBadge propertyRef={p.ref} />
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
                    <Link
                      href={`/enquire?ref=${encodeURIComponent(p.ref ?? '')}&name=${encodeURIComponent(p.p || `${p.t} in ${p.l}`)}`}
                      className="group inline-flex items-center justify-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 flex-1"
                      style={{ background: 'var(--av-gradient-gold)' }}
                    >
                      Enquire about this property
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                    <a
                      href={mailto}
                      className="inline-flex items-center justify-center gap-2 rounded-sm border px-5 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary hover:text-primary transition-colors"
                      style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                    >
                      Email instead
                    </a>
                    {p.ref && <WatchlistButton propertyRef={p.ref} size="md" />}
                  </div>
                );
              })()}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <DataFreshness label="Property data" />
                {/* NOTE: the "Institutional data sheet" link is removed — the
                    data-sheet page reads properties_registry (frozen 2026-05-24),
                    so it 404s for every current feed ref. That was ~1,990 broken
                    internal links for Googlebot and a dead gold CTA for buyers.
                    Restore only after data-sheet falls back to data.json. */}
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
              {p.ref && (
                <div className="mt-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Share</div>
                  <ShareButtons
                    url={`https://avenaterminal.com/property/${encodeURIComponent(p.ref)}`}
                    text={`${p.p || `${p.t} in ${p.l}`} · Avena Score ${Math.round(p._sc ?? 0)}/100 · €${p.pf.toLocaleString()}${discount && discount > 0 ? ` · ${discount}% below market` : ''}`}
                  />
                </div>
              )}
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
                  <div className="font-serif text-3xl sm:text-4xl md:text-5xl font-light text-primary tabular">
                    {p._yield.gross.toFixed(1)}%
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Net {p._yield.net.toFixed(1)}%
                  </div>
                </div>
                <div className="p-6 text-center" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    Annual income
                  </div>
                  <div className="font-serif text-2xl sm:text-3xl md:text-5xl font-light text-foreground tabular break-words" style={{ overflowWrap: 'anywhere' }}>
                    €{Math.round(p._yield.annual).toLocaleString()}
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Net €{Math.round(p._yield.netAnnual).toLocaleString()}
                  </div>
                </div>
                <div className="p-6 text-center" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                    Weekly rent
                  </div>
                  <div className="font-serif text-2xl sm:text-3xl md:text-5xl font-light text-foreground tabular break-words" style={{ overflowWrap: 'anywhere' }}>
                    €{Math.round(p._yield.rate * 7).toLocaleString()}
                  </div>
                </div>
              </div>
              {/* The assumptions behind the number. Added 2026-08-10: the yield
                  was displayed prominently while the occupancy it rests on was
                  invisible, so a reader could not tell whether 3% assumed a full
                  season or a fortnight. A figure a buyer cannot interrogate is
                  worth less than a smaller one they can. */}
              <div className="mt-4 rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                  What this assumes
                </p>
                <p className="text-sm font-light leading-relaxed text-muted-foreground">
                  <span className="text-foreground">{p._yield.weeks} rental weeks a year</span>{' '}
                  ({p._yield.weeks * 7} nights, {Math.round((p._yield.weeks * 7 / 365) * 100)}% annual
                  occupancy) at €{Math.round(p._yield.rate).toLocaleString()}/night. Short-term letting
                  rates and occupancy for {p.l.split(',')[0].trim()} are sourced from{' '}
                  {p._yield.src}; a 20% new-build premium is applied to the nightly rate.
                  Summer alone is roughly 11 weeks, so this figure assumes the shoulder season
                  lets as well.
                </p>
                <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
                  Gross yield is before costs. Net yield deducts 10% vacancy, 15% management,
                  community fees, insurance, IBI and 19% non-resident tax — the full breakdown
                  is in Terminal. Every figure here is an estimate from market data, not a
                  guaranteed return, and a tourist licence is required to let short-term in
                  most municipalities.
                </p>
              </div>
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

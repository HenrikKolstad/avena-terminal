import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { NATIONALITY_PROFILES, getNationalityProfile } from '@/lib/nationality-guides';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 86400;

function slugToCode(slug: string): string {
  return slug.replace(/-buyers-spain-2026$/, '').replace(/-buyers-spain$/, '');
}

export async function generateStaticParams() {
  return NATIONALITY_PROFILES.map((p) => ({ slug: `${p.code}-buyers-spain-2026` }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const code = slugToCode(slug);
  const profile = getNationalityProfile(code);
  if (!profile) return { title: 'Guide Not Found | Avena Terminal' };

  const title = `${profile.nationality_adj} Buyer Guide · Spanish Property 2026 | Avena Terminal`;
  const description = `The complete guide for ${profile.nationality_adj} buyers investing in Spanish new builds in 2026. Tax (${profile.irnr_rate}% IRNR), currency (${profile.currency}), preferred regions, live scored inventory. Data-driven.`;

  return {
    title,
    description,
    alternates: { canonical: `https://avenaterminal.com/guides/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/guides/${slug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

function fmtEur(n: number): string {
  return `€${n.toLocaleString('en-US').replace(/,/g, ' ')}`;
}

export default async function NationalityGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = slugToCode(slug);
  const profile = getNationalityProfile(code);
  if (!profile) notFound();

  const all = getAllProperties();
  const [minB, maxB] = profile.typical_budget_eur;
  const matches = all
    .filter(
      (p) =>
        p._sc != null &&
        (p._sc ?? 0) >= 70 &&
        p.pf >= minB * 0.7 &&
        p.pf <= maxB &&
        (profile.preferred_regions.length === 0 ||
          profile.preferred_regions.some((r) =>
            ((p.costa ?? '') + ' ' + (p.l ?? '')).toLowerCase().includes(r.toLowerCase())
          ))
    )
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${profile.nationality_adj} Buyer's Guide to Spanish Property 2026`,
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    datePublished: '2026-04-22',
    dateModified: new Date().toISOString().slice(0, 10),
    mainEntityOfPage: `https://avenaterminal.com/guides/${slug}`,
    inLanguage: 'en',
    about: { '@type': 'Thing', name: `Spanish property investment for ${profile.nationality_adj} buyers` },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What tax do ${profile.nationality_adj} buyers pay on Spanish rental income?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${profile.nationality_adj} buyers pay ${profile.irnr_rate}% IRNR on rental profit in Spain. ${profile.double_tax_treaty ? `The ${profile.country}–Spain double-tax treaty prevents double taxation.` : 'Check treaty status with your accountant.'}`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the typical ${profile.nationality_adj} budget for Spanish property in 2026?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Most ${profile.nationality_adj} buyers in 2026 work within a ${fmtEur(profile.typical_budget_eur[0])} – ${fmtEur(profile.typical_budget_eur[1])} budget, clustering in ${profile.preferred_regions.join(' and ')}.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can ${profile.nationality_adj} buyers get a Spanish Golden Visa?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: profile.golden_visa_eligible
            ? `Yes — non-EEA nationals including ${profile.nationality_adj} citizens qualify for the Spanish Golden Visa with a €500,000+ property investment (status under reform in 2026).`
            : `${profile.nationality_adj} citizens are EEA nationals with automatic right of residence, so the Golden Visa isn't needed.`,
        },
      },
      {
        '@type': 'Question',
        name: `Does ${profile.country} have a wealth tax affecting Spanish property?`,
        acceptedAnswer: { '@type': 'Answer', text: profile.wealth_tax_notes },
      },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, faqLd]) }}
      />
      <Nav />
      <main className="pt-16">
        <section
          className="relative overflow-hidden border-b"
          style={{
            borderColor: 'hsl(var(--av-border) / 0.6)',
            background: 'radial-gradient(ellipse 90% 60% at 50% 0%, hsl(42 85% 64% / 0.12), transparent 70%)',
          }}
        >
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-28">
            <nav className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-8 flex flex-wrap items-center gap-2">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <Link href="/guides" className="hover:text-primary">Guides</Link>
              <span>/</span>
              <span className="text-foreground/80">{profile.nationality_adj} buyers · Spain</span>
            </nav>
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Buyer guide · {profile.nationality_adj} · 2026
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.92] tracking-tight text-foreground mb-6">
              {profile.nationality_adj} buyers,
              <br />
              <span className="italic text-gold">Spanish property</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light leading-relaxed">
              The complete data-driven guide for {profile.language_native}-speaking investors buying Spanish new-builds in 2026. Tax. Currency. Regions. Live inventory. Numbers.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-10">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border"
              style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {[
                { label: 'IRNR rate (rental profit)', value: `${profile.irnr_rate}%` },
                { label: 'Currency', value: `${profile.currency} · ${profile.currency_symbol}` },
                { label: 'Typical budget band', value: `${fmtEur(profile.typical_budget_eur[0])} – ${fmtEur(profile.typical_budget_eur[1])}` },
                { label: 'Preferred regions', value: profile.preferred_regions[0] ?? 'n/a' },
              ].map((row) => (
                <div key={row.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{row.label}</div>
                  <div className="font-serif text-lg tabular text-foreground">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-20 space-y-8">
            <div>
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">
                Why {profile.nationality_adj} <span className="italic text-gold">buy</span>.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                {profile.typical_why} Most {profile.nationality_adj} buyers cluster in{' '}
                <span className="text-foreground">{profile.preferred_regions.join(' and ')}</span>, partly for the flight time ({profile.flights_to.split(' · ').slice(1).join(', ')}) and partly for the established community networks.
              </p>
            </div>
            <div>
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">
                Tax — the <span className="italic text-gold">{profile.irnr_rate}%</span> number.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                Spain levies{' '}
                <span className="text-foreground">{profile.irnr_rate}% IRNR (Impuesto sobre la Renta de No Residentes)</span>{' '}
                on rental profit for {profile.eea ? 'EEA residents' : 'non-EEA residents'} — that is the first number you need to price in. A gross 6% yield becomes {(6 * (1 - profile.irnr_rate / 100)).toFixed(1)}% net of IRNR, before management (15–20%), community fees, IBI (~0.4% of cadastral), and insurance.
              </p>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mt-4">
                {profile.wealth_tax_notes}
              </p>
              {profile.double_tax_treaty && (
                <p className="text-lg text-muted-foreground font-light leading-relaxed mt-4">
                  The {profile.country}–Spain double-tax treaty means Spanish tax paid is credited against your home-country liability — you don&apos;t pay twice.
                </p>
              )}
            </div>
            <div>
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">
                Currency — <span className="italic text-gold">{profile.currency}</span>.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                {profile.currency === 'EUR' ? (
                  <>You&apos;re already in euro — no FX friction. The cleanest buyer currency in Spain.</>
                ) : (
                  <>
                    You price the deal in {profile.currency} but pay in EUR. Indicative rate today:{' '}
                    <span className="text-foreground">1 {profile.currency} ≈ €{profile.currency_to_eur.toFixed(3)}</span>. Use Wise, Revolut, or a currency broker for staged payments (deposit / interim / completion) — the spread on a high-street bank is typically 2–3% worse.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {matches.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20">
              <div className="flex items-baseline justify-between mb-8">
                <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                  Top matches for your <span className="italic text-gold">budget</span>.
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">· Live</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {matches.map((p, i) => (
                  <Link
                    key={p.ref || i}
                    href={p.ref ? `/property/${encodeURIComponent(p.ref)}` : '/'}
                    className="group rounded-sm border overflow-hidden transition-colors hover:border-primary"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    {p.imgs?.[0] && (
                      <div className="aspect-[16/10] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imgs[0]} alt={p.p ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{p.t}</span>
                        <span className="font-serif text-2xl font-light tabular text-gold leading-none">{Math.round(p._sc ?? 0)}</span>
                      </div>
                      <h3 className="font-serif text-base text-foreground mb-1 line-clamp-2">{p.p || `${p.t} in ${p.l}`}</h3>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{p.l}</p>
                      <p className="font-mono text-sm tabular text-foreground">{fmtEur(p.pf)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/#deals" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:text-gold">
                  See full terminal
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-20">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Common <span className="italic text-gold">questions</span>.
            </h2>
            <div className="space-y-4">
              {[
                { q: `What tax do ${profile.nationality_adj} buyers pay on Spanish rental income?`, a: `${profile.nationality_adj} buyers pay ${profile.irnr_rate}% IRNR on rental profit in Spain. ${profile.double_tax_treaty ? `The ${profile.country}–Spain double-tax treaty prevents double taxation.` : 'Check treaty status with your accountant.'}` },
                { q: `What is a realistic ${profile.nationality_adj} budget for Spanish property in 2026?`, a: `Most ${profile.nationality_adj} buyers in 2026 work within ${fmtEur(profile.typical_budget_eur[0])} – ${fmtEur(profile.typical_budget_eur[1])} for new-build property, with strong clustering in ${profile.preferred_regions.join(' and ')}.` },
                { q: `Can ${profile.nationality_adj} citizens get a Spanish Golden Visa?`, a: profile.golden_visa_eligible ? `Yes — non-EEA citizens including ${profile.nationality_adj} qualify with €500,000+ property investment. The programme is under reform in 2026, verify current status.` : `${profile.nationality_adj} citizens are EEA nationals with automatic right of residence in Spain. Golden Visa isn't needed — standard EU registration applies.` },
                { q: `Does ${profile.country} tax Spanish property in a punitive way?`, a: profile.wealth_tax_notes },
                { q: `How long do ${profile.nationality_adj} flights to the Costas take?`, a: profile.flights_to },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-sm border p-5"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                    <span className="font-serif text-lg text-foreground">{item.q}</span>
                    <span className="font-mono text-primary transition-transform group-open:rotate-45 flex-shrink-0">+</span>
                  </summary>
                  <p className="mt-4 text-muted-foreground font-light leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 text-center">
            <h2 className="font-serif text-4xl font-light tracking-tight text-foreground mb-4">
              The rest of the <span className="italic text-gold">terminal</span>.
            </h2>
            <p className="text-muted-foreground font-light max-w-lg mx-auto mb-8">
              1,881 scored Spanish new builds. 25 autonomous systems running daily. Start with the top deals or ask the Oracle.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/#deals" className="group inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold" style={{ background: 'var(--av-gradient-gold)' }}>
                Find your property
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/terminal" className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                Ask the Oracle
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

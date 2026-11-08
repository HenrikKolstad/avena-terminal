import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getOfficialSummary } from '@/lib/official-summary-view';
import type { Headline, LayerCard, PriceRow, YieldRow } from '@/lib/official-summary';

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Official statistics · Avena Terminal',
  description:
    'Spain and Portugal official housing statistics beside Avena new-build asking prices: source, geography, latest period, refresh, and the asking-versus-benchmark gap where both sides exist.',
  alternates: { canonical: 'https://avenaterminal.com/official' },
  openGraph: {
    title: 'Official statistics · Avena Terminal',
    description: 'One page for the official housing layers and the Avena-versus-benchmark gap.',
    url: 'https://avenaterminal.com/official',
    siteName: 'Avena',
    type: 'website',
  },
};

function eur(n: number | null | undefined): string {
  if (n == null) return '–';
  const rounded = Math.round(n * 10) / 10;
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString('en-GB')
    : rounded.toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `€${text}`;
}
function pct(n: number | null | undefined): string {
  if (n == null) return '–';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function pp(n: number | null | undefined): string {
  if (n == null) return '–';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} pp`;
}
function quarterLabel(p: string | null | undefined): string {
  if (!p) return '–';
  const m = /^(\d{4})-Q([1-4])$/.exec(p);
  return m ? `Q${m[2]} ${m[1]}` : p;
}
function gapWord(n: number | null): string {
  if (n == null) return '';
  if (n > 0) return 'Asking above benchmark';
  if (n < 0) return 'Asking below benchmark';
  return 'Level';
}
function headlineText(h: Headline): string {
  if (!h.available || h.value == null) return 'Missing';
  return h.unit === 'pp' ? pp(h.value) : pct(h.value);
}

export default function OfficialHubPage() {
  const summary = getOfficialSummary();
  const cov = summary.municipal_coverage;

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena official statistics summary',
    description: 'Official Spanish and Portuguese housing statistics joined to Avena new-build asking prices, with the derived gap left blank where either side is missing.',
    url: 'https://avenaterminal.com/official',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    dateModified: summary.generated_at,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Official statistics</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              The official layers,<br />
              <span className="text-gold italic">in one place.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              {summary.layers.length} public files, each with its source, geography, latest period and refresh. Where the Avena book and the official benchmark are both a price or a yield, the gap is ranked below. Where one side is missing, the row stays blank.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-8">
              {summary.history.note}
            </p>
            <p className="text-sm">
              Machine-readable copy:{' '}
              <Link href="/api/v1/official-summary" className="text-primary hover:underline">/api/v1/official-summary</Link>
            </p>
            <p className="text-sm mt-4">
              <Link href="/spain/notary" className="text-primary hover:underline">Notary transaction prices</Link>
              <span className="text-muted-foreground">. Asking prices beside the CIEN closing average. </span>
              <Link href="/spain/short-let-rules" className="text-primary hover:underline">Short-let rules for the same coast</Link>
              <span className="text-muted-foreground">. The short-let yield is unchanged. The flag says whether that use is legally available.</span>
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Layers</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Source, place, date, gap.</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {summary.layers.map((layer) => <LayerPanel key={layer.id} layer={layer} />)}
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Asking versus appraisal</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Spanish provinces, ranked.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              Ranked by the absolute gap. The INE column is the community new-build index, one year, and it is not the euro gap. Previous snapshot is blank because the file stores one appraisal period and the asking median is the current book.
            </p>
            <div className="lg:hidden space-y-4">
              {summary.price_gaps.map((p) => (
                <article key={p.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{p.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena median asking" value={`${eur(p.avena_eur_m2)}/m²`} note={`${p.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Official appraisal" value={p.official_eur_m2 == null ? 'Missing' : `${eur(p.official_eur_m2)}/m²`} note={p.official_period ? quarterLabel(p.official_period) : 'Missing'} />
                    <Field label="Asking vs appraisal" value={p.gap_pct == null ? 'Missing' : pct(p.gap_pct)} note={p.missing ?? gapWord(p.gap_pct)} />
                    <Field label="INE new-build, 1 year" value={pct(p.ine_new_yoy_pct)} note={p.ine_new_yoy_pct == null ? 'Missing' : p.ine_territory_equals_province ? 'Province' : 'Community, not the province alone'} />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Avena asking</Th>
                    <Th align="right">Appraisal</Th>
                    <Th align="right">Gap</Th>
                    <Th align="right">INE new, 1 year</Th>
                    <Th>Previous snapshot</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.price_gaps.map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{p.listings.toLocaleString('en-GB')} listings</span>
                      </Td>
                      <Td align="right"><Mono strong>{p.avena_eur_m2 == null ? 'Missing' : eur(p.avena_eur_m2)}</Mono></Td>
                      <Td align="right">
                        <Mono strong>{p.official_eur_m2 == null ? 'Missing' : eur(p.official_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{quarterLabel(p.official_period)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{p.gap_pct == null ? 'Missing' : pct(p.gap_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.missing ?? gapWord(p.gap_pct)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{pct(p.ine_new_yoy_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.ine_new_yoy_pct == null ? '' : p.ine_territory_equals_province ? quarterLabel(p.ine_new_yoy_period) : `${quarterLabel(p.ine_new_yoy_period)} · community`}</span>
                      </Td>
                      <Td><Previous change={p.previous} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Asking versus notary closing</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Signed prices, by community.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-4">
              The notary column is the CIEN average €/m² of all housing sales in the autonomous community. It is a transaction price. It is not a new-build price and, except for Murcia, not the province alone. The gap is derived here.
            </p>
            <p className="text-sm mb-10">
              <Link href="/spain/notary" className="text-primary hover:underline">Notary table</Link>
            </p>
            <div className="lg:hidden space-y-4">
              {summary.notary_gaps.map((p) => (
                <article key={p.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{p.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena median asking" value={`${eur(p.avena_eur_m2)}/m²`} note={`${p.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Notary closing" value={p.notary_eur_m2 == null ? 'Missing' : `${eur(p.notary_eur_m2)}/m²`} note={p.notary_period ?? 'Missing'} />
                    <Field label="Asking vs closing" value={p.gap_pct == null ? 'Missing' : pct(p.gap_pct)} note={p.missing ?? (p.territory_equals_province ? 'Province' : p.geo_name)} />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Avena asking</Th>
                    <Th align="right">Notary closing</Th>
                    <Th align="right">Gap</Th>
                    <Th>Geography</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.notary_gaps.map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{p.listings.toLocaleString('en-GB')} listings</span>
                      </Td>
                      <Td align="right"><Mono strong>{p.avena_eur_m2 == null ? 'Missing' : eur(p.avena_eur_m2)}</Mono></Td>
                      <Td align="right">
                        <Mono strong>{p.notary_eur_m2 == null ? 'Missing' : eur(p.notary_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.notary_period ?? ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{p.gap_pct == null ? 'Missing' : pct(p.gap_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.missing ?? gapWord(p.gap_pct)}</span>
                      </Td>
                      <Td><span className="text-sm text-muted-foreground">{p.territory_equals_province ? 'Province' : p.geo_name}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Municipal appraisal</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Up to five years, by province.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-4">
              The province figure is the median of the town gaps already published, not a provincial official price. {cov.with_up_to_five_year_gap} of {cov.towns} towns have that gap. {cov.all_ages_only} have only an all-ages appraisal. {cov.insufficient_listings} are below {cov.min_priced_listings} priced listings. {cov.not_in_ministry_table} are not on the sheet. {cov.withheld} are withheld.
            </p>
            <p className="text-sm mb-10">
              <Link href="/spain/towns" className="text-primary hover:underline">Town table</Link>
            </p>
            <div className="lg:hidden space-y-4 mb-10">
              {summary.municipal_provinces.map((p) => (
                <article key={p.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{p.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Towns compared" value={String(p.compared)} note={`${p.towns} towns in the book`} />
                    <Field label="Median gap" value={p.gap_pct == null ? 'Missing' : pct(p.gap_pct)} note={p.missing ?? 'Up to five years'} />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto mb-10" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Towns compared</Th>
                    <Th align="right">Median gap</Th>
                    <Th align="right">All-ages only</Th>
                    <Th align="right">Below the floor</Th>
                    <Th align="right">Not on the sheet</Th>
                    <Th>Previous snapshot</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.municipal_provinces.map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">{p.name}</span></Td>
                      <Td align="right"><Mono strong>{p.compared}</Mono><span className="block text-[11px] text-muted-foreground">of {p.towns}</span></Td>
                      <Td align="right"><Mono>{p.gap_pct == null ? 'Missing' : pct(p.gap_pct)}</Mono></Td>
                      <Td align="right"><Mono>{p.all_ages_only}</Mono></Td>
                      <Td align="right"><Mono>{p.insufficient_listings}</Mono></Td>
                      <Td align="right"><Mono>{p.not_in_ministry_table}</Mono></Td>
                      <Td><Previous change={p.previous} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-serif text-2xl font-light text-foreground mb-4">Municipalities with both sides.</h3>
            <div className="lg:hidden space-y-4">
              {summary.municipalities.map((t) => (
                <article key={t.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{t.province}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{t.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena asking" value={`${eur(t.avena_eur_m2)}/m²`} note={`${t.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Appraisal, up to 5 years" value={`${eur(t.official_eur_m2)}/m²`} />
                    <Field label="Gap" value={pct(t.gap_pct)} note={gapWord(t.gap_pct)} />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Municipality</Th>
                    <Th align="right">Avena asking</Th>
                    <Th align="right">Appraisal, up to 5 years</Th>
                    <Th align="right">Gap</Th>
                    <Th>Previous snapshot</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.municipalities.map((t) => (
                    <tr key={t.id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{t.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{t.province} · {t.listings.toLocaleString('en-GB')} listings</span>
                      </Td>
                      <Td align="right"><Mono strong>{eur(t.avena_eur_m2)}</Mono></Td>
                      <Td align="right"><Mono strong>{eur(t.official_eur_m2)}</Mono></Td>
                      <Td align="right"><Mono>{pct(t.gap_pct)}</Mono></Td>
                      <Td><Previous change={t.previous} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summary.municipal_all_ages_only.length > 0 && (
              <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                All-ages appraisal only, not in the median above:{' '}
                {summary.municipal_all_ages_only.map((t) => `${t.name} ${pct(t.gap_pct)}`).join(' · ')}.
              </p>
            )}
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Yields</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Short-stay yield, habitual rent.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              The spread is percentage points, not a price gap. The official rent is the monthly euros per m2 for habitual flats. The implied yield annualises it and divides by the Avena asking price. Avena&apos;s own yield is the short-stay estimate on the listings.
            </p>
            <div className="lg:hidden space-y-4">
              {summary.yields.map((y) => <YieldCard key={y.id} row={y} />)}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Avena yield</Th>
                    <Th align="right">Official rent</Th>
                    <Th align="right">Implied habitual yield</Th>
                    <Th align="right">Spread</Th>
                    <Th>Previous snapshot</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.yields.map((y) => (
                    <tr key={y.id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{y.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{y.listings.toLocaleString('en-GB')} listings · asking {eur(y.avena_asking_eur_m2)}</span>
                      </Td>
                      <Td align="right"><Mono strong>{y.avena_gross_yield_pct == null ? 'Missing' : pct(y.avena_gross_yield_pct)}</Mono></Td>
                      <Td align="right">
                        <Mono>{y.official_rent_eur_m2_month == null ? 'Missing' : `${eur(y.official_rent_eur_m2_month)}/m²`}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{y.official_period ?? ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{y.implied_flat_gross_yield_pct == null ? 'Missing' : pct(y.implied_flat_gross_yield_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{y.implied_house_gross_yield_pct == null ? '' : `Houses ${pct(y.implied_house_gross_yield_pct)}`}</span>
                      </Td>
                      <Td align="right"><Mono strong>{y.spread_pp == null ? 'Missing' : pp(y.spread_pp)}</Mono></Td>
                      <Td><Previous change={y.previous} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Not a euro gap</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Portugal, Eurostat, supply.</h2>
            <div className="grid gap-6 md:grid-cols-2 mb-10">
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <h3 className="font-serif text-2xl font-light text-foreground mb-2">Eurostat</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{summary.layers.find((l) => l.id === 'eu-hpi')?.headline.reason}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Spain new dwellings, 1 year, {quarterLabel(summary.eurostat.latest_period)}: {pct(summary.eurostat.spain_new_yoy_pct)}. Portugal: {pct(summary.eurostat.portugal_new_yoy_pct)}. Asking tape {summary.eurostat.tape_date ?? '–'}: {eur(summary.eurostat.tape_spain_asking_eur_m2)}/m². Book {summary.eurostat.book_date ?? '–'}: {eur(summary.eurostat.book_spain_asking_eur_m2)}/m².
                </p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{summary.eurostat.book_note}</p>
              </div>
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <h3 className="font-serif text-2xl font-light text-foreground mb-2">Supply</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{summary.supply.note} Starts through {summary.supply.starts_period ?? '–'}. INE new sales through {summary.supply.sales_period ?? '–'}.</p>
                <p className="mt-3 text-sm">
                  <Link href="/spain/supply" className="text-primary hover:underline">Supply pipeline</Link>
                </p>
              </div>
            </div>
            <h3 className="font-serif text-2xl font-light text-foreground mb-4">Portugal regions. Avena side missing.</h3>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-8">
              {summary.listing_book.toLocaleString('en-GB')} listings in the book, {summary.portugal_listings.toLocaleString('en-GB')} with a Portugal place name. The market file on <Link href="/portugal" className="text-primary hover:underline">/portugal</Link> is separate and is not a second asking gap.
            </p>
            <div className="lg:hidden space-y-4">
              {summary.portugal.map((r) => (
                <article key={r.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{r.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Bank appraisal" value={r.appraisal_eur_m2 == null ? 'Missing' : `${eur(r.appraisal_eur_m2)}/m²`} note={r.appraisal_period ?? 'Missing'} />
                    <Field label="New sales" value={r.sales_new_eur_m2 == null ? 'Missing' : `${eur(r.sales_new_eur_m2)}/m²`} note={r.sales_period ?? ''} />
                    <Field label="Avena asking" value="Missing" note={r.missing} />
                    <Field label="Gap" value="Missing" />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Region</Th>
                    <Th align="right">Bank appraisal</Th>
                    <Th align="right">New sales</Th>
                    <Th align="right">Avena asking</Th>
                    <Th align="right">Gap</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.portugal.map((r) => (
                    <tr key={r.id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">{r.name}</span></Td>
                      <Td align="right">
                        <Mono strong>{r.appraisal_eur_m2 == null ? 'Missing' : eur(r.appraisal_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{r.appraisal_period ?? ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{r.sales_new_eur_m2 == null ? 'Missing' : eur(r.sales_new_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{r.sales_period ?? ''}</span>
                      </Td>
                      <Td align="right"><Mono>Missing</Mono></Td>
                      <Td align="right"><Mono>Missing</Mono></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What the gap is</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Asking, appraisal, rent, index.</h2>
            <ul className="max-w-3xl space-y-4 mb-10">
              {summary.caveats.map((c) => (
                <li key={c} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{c}</li>
              ))}
            </ul>
            <div className="max-w-3xl space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>{summary.method.price_gap}</p>
              <p>{summary.method.yield_spread}</p>
              <p>{summary.method.headline}</p>
              <p>{summary.method.widening}</p>
            </div>
            <div className="mt-10 border-t pt-10" style={{ borderColor: BORDER }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Avena asking prices</div>
              <h2 className="font-serif text-3xl font-light text-foreground mb-4">Same-unit index, separate from these files.</h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
                The layers above are official statistics. The weekly same-unit asking-price index is built from Avena&apos;s own listing captures. It is not a transaction price and it is not one of the official files.
              </p>
              <p className="text-sm">
                <Link href="/data/price-index" className="text-primary hover:underline">Same-unit asking-price index</Link>
                <span className="text-muted-foreground"> · </span>
                <Link href="/api/v1/price-index" className="text-primary hover:underline">/api/v1/price-index</Link>
              </p>
              <h2 className="mt-10 font-serif text-3xl font-light text-foreground mb-4">Listing absorption, from the same captures.</h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
                How fast listings leave the book, and where asking prices are being cut. An exit is a delisting, not a confirmed sale. Coast, region and town only. This is not one of the official files.
              </p>
              <p className="text-sm">
                <Link href="/data/absorption" className="text-primary hover:underline">Listing absorption</Link>
                <span className="text-muted-foreground"> · </span>
                <Link href="/api/v1/absorption" className="text-primary hover:underline">/api/v1/absorption</Link>
              </p>
            </div>
            <div className="mt-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Data gaps</div>
              <ul className="max-w-3xl space-y-3">
                {summary.data_gaps.map((g) => (
                  <li key={g} className="text-sm leading-relaxed text-muted-foreground">{g}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function LayerPanel({ layer }: { layer: LayerCard }) {
  const h = layer.headline;
  return (
    <article className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{layer.geography}</div>
      <h3 className="font-serif text-2xl font-light text-foreground mb-3">
        <Link href={layer.href} className="hover:text-primary">{layer.title}</Link>
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{layer.source}</p>
      <dl className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Latest period" value={quarterLabel(layer.latest_period)} note={layer.retrieved_at ? `Retrieved ${layer.retrieved_at}` : undefined} />
        <Field label="Headline gap" value={headlineText(h)} note={h.available && h.widest_name ? `Widest: ${h.widest_name} ${h.unit === 'pp' ? pp(h.widest_value) : pct(h.widest_value)} · ${h.places} places` : h.reason ?? undefined} />
      </dl>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{layer.refresh_cadence}</p>
      <p className="text-sm">
        <Link href={layer.href} className="text-primary hover:underline">Detail</Link>
        <span className="text-muted-foreground"> · </span>
        <Link href={layer.api} className="text-primary hover:underline">{layer.api}</Link>
      </p>
    </article>
  );
}

function YieldCard({ row }: { row: YieldRow }) {
  return (
    <article className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <h3 className="font-serif text-3xl font-light text-foreground mb-4">{row.name}</h3>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="Avena yield" value={row.avena_gross_yield_pct == null ? 'Missing' : pct(row.avena_gross_yield_pct)} />
        <Field label="Official rent" value={row.official_rent_eur_m2_month == null ? 'Missing' : `${eur(row.official_rent_eur_m2_month)}/m²`} note={row.official_period ?? ''} />
        <Field label="Implied habitual yield" value={row.implied_flat_gross_yield_pct == null ? 'Missing' : pct(row.implied_flat_gross_yield_pct)} />
        <Field label="Spread" value={row.spread_pp == null ? 'Missing' : pp(row.spread_pp)} note={row.missing ?? 'Percentage points'} />
      </dl>
    </article>
  );
}

function Previous({ change }: { change: PriceRow['previous'] }) {
  if (!change) return <span className="text-[11px] text-muted-foreground">None in the file</span>;
  const word = change.direction === 'widened' ? 'Widened' : change.direction === 'narrowed' ? 'Narrowed' : 'Unchanged';
  return (
    <span className="block">
      <Mono>{word}</Mono>
      <span className="block text-[11px] text-muted-foreground">{change.as_of} · {change.change > 0 ? '+' : ''}{change.change.toFixed(1)}</span>
    </span>
  );
}

function Field({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</dt>
      <dd className="font-serif text-2xl font-light text-foreground">{value}</dd>
      {note && <dd className="mt-1 text-[11px] text-muted-foreground">{note}</dd>}
    </div>
  );
}
function Th({ children, align }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, align }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-4 py-2.5 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}
function Mono({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <span className={`font-mono text-xs tabular ${strong ? 'text-foreground' : 'text-foreground/75'}`}>{children}</span>;
}

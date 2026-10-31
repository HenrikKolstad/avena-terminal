import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getEsRents } from '@/lib/es-rents-view';
import type { DwellingRent, ProvinceRentRow, TownRentRow } from '@/lib/data-sources/es-rents';

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Spain official rent benchmark · Avena Terminal',
  description:
    'Habitual-residence rents from the ministry SERPAVI workbook and the INE rental-price index, beside Avena new-build asking prices and gross yields for the Spanish coast.',
  alternates: { canonical: 'https://avenaterminal.com/spain/rents' },
  openGraph: {
    title: 'Spain official rent benchmark · Avena Terminal',
    description: 'Official habitual rents and the INE rental index beside Avena asking prices and gross yields.',
    url: 'https://avenaterminal.com/spain/rents',
    siteName: 'Avena',
    type: 'website',
  },
};

function eur(n: number | null | undefined, digits = 2): string {
  if (n == null) return '–';
  return `€${n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
function pct(n: number | null | undefined): string {
  if (n == null) return '–';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function idx(n: number | null | undefined): string {
  if (n == null) return '–';
  return n.toLocaleString('en-GB', { maximumFractionDigits: 3 });
}
function yearLabel(p: string | number | null | undefined): string {
  return p == null ? '–' : String(p);
}
function rentM2(d: DwellingRent | null): string {
  if (!d) return '–';
  if (d.withheld || !d.eur_m2_month) return 'n.p.';
  return `${eur(d.eur_m2_month.median)}/m²`;
}
function rentNote(d: DwellingRent | null): string {
  if (!d) return 'No dwellings of this type';
  if (d.withheld || !d.eur_m2_month || !d.monthly_eur) {
    return `${d.contracts.toLocaleString('en-GB')} dwellings · price not published`;
  }
  return `${eur(d.monthly_eur.median, 0)} / month · ${d.contracts.toLocaleString('en-GB')} dwellings`;
}
function band(d: DwellingRent | null): string {
  if (!d || d.withheld || !d.eur_m2_month) return '';
  return `p25–p75 ${eur(d.eur_m2_month.p25)}–${eur(d.eur_m2_month.p75)}`;
}

export default function SpainRentsPage() {
  const view = getEsRents();
  const n = view.national;
  const s = view.summary;

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Spain official rent benchmark',
    description: view.coverage_note,
    url: 'https://avenaterminal.com/spain/rents',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: [view.sources.serpavi.page_url, view.sources.serpavi.file_url, view.sources.ipva.table_url],
    spatialCoverage: 'Spain',
    dateModified: view.generated_at,
    temporalCoverage: String(view.serpavi_year),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Spain rent benchmark</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Habitual rents,<br />
              <span className="text-gold italic">beside the asking price.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              For every province in the current Avena corpus, the ministry’s habitual-residence rent sits beside the INE rental-price index, the median new-build asking price per m², and the gross yield already estimated on those listings. Refreshed from the public files each week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
              {view.coverage_note}
            </p>
            <p className="text-sm mb-8">
              <Link href="/spain/official" className="text-primary hover:underline">Price benchmark for the same provinces</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/towns" className="text-primary hover:underline">Municipal appraisal for the same coast</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/supply" className="text-primary hover:underline">Supply pipeline</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/europe/official" className="text-primary hover:underline">Eurostat house price index</Link>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label={`INE rent index, Spain, ${yearLabel(n.ipva_total_index.period)}`} value={idx(n.ipva_total_index.value)} sub="IPVA, base 2015. Not a euro rent." />
              <Stat label={`INE rent index, 1 year`} value={pct(n.ipva_total_yoy_pct.value)} sub={`Published annual change, ${yearLabel(n.ipva_total_yoy_pct.period)}`} />
              <Stat label={`INE flats, 1 year`} value={pct(n.ipva_colectiva_yoy_pct.value)} sub="Collective dwellings, national" />
              <Stat label={`SERPAVI vintage`} value={String(view.serpavi_year)} sub={`${s.compared} towns with an implied yield · ${s.not_in_table} with no municipality row`} />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provinces in the corpus</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Asking price, official rent, index.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              The flat rent is the SERPAVI median €/m²/month for collective dwellings in {view.serpavi_year}. The implied yield annualises that rent and divides it by the Avena median asking price. It is computed here. Avena’s gross yield is the short-stay estimate already on the listings, and it is a different measurement.
            </p>

            <div className="lg:hidden space-y-4">
              {view.provinces.map((p) => (
                <article key={p.slug} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{p.serpavi_name}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{p.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena median asking" value={`${eur(p.avena_median_asking_eur_m2, 0)}/m²`} note={`${p.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Avena gross yield" value={pct(p.avena_gross_yield_pct)} note="Short-stay estimate" />
                    <Field label={`Flat rent, ${view.serpavi_year}`} value={rentM2(p.colectiva)} note={rentNote(p.colectiva)} />
                    <Field label="Implied habitual yield" value={pct(p.implied_flat_gross_yield_pct)} note="Flat rent on the asking price" />
                    <Field label="INE rent index, 1 year" value={pct(p.ipva_total_yoy_pct.value)} note={`${yearLabel(p.ipva_total_yoy_pct.period)} · ${p.ipva_total_yoy_pct.series_id}`} />
                    <Field label="House rent" value={rentM2(p.unifamiliar)} note={band(p.unifamiliar) || rentNote(p.unifamiliar)} />
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Avena median asking</Th>
                    <Th align="right">Avena gross yield</Th>
                    <Th align="right">Official flat rent</Th>
                    <Th align="right">Implied habitual yield</Th>
                    <Th align="right">INE rent index, 1 year</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.provinces.map((p) => (
                    <tr key={p.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{p.listings.toLocaleString('en-GB')} listings · {view.serpavi_year}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{eur(p.avena_median_asking_eur_m2, 0)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.priced_listings.toLocaleString('en-GB')} priced</span>
                      </Td>
                      <Td align="right">
                        <Mono>{pct(p.avena_gross_yield_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">Short-stay estimate</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{rentM2(p.colectiva)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{band(p.colectiva) || rentNote(p.colectiva)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{pct(p.implied_flat_gross_yield_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">Derived · flat rent</span>
                      </Td>
                      <Td align="right">
                        <Mono>{pct(p.ipva_total_yoy_pct.value)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{yearLabel(p.ipva_total_yoy_pct.period)} · index {idx(p.ipva_total_index.value)}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {view.unmapped_listings > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {view.unmapped_listings.toLocaleString('en-GB')} listings could not be placed in a province and are not in the medians.
              </p>
            )}
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Towns in the corpus</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">The municipality, where the workbook has one.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              A town median and a town implied yield need at least {view.min_priced_listings} listings with a positive asking €/m². Below that, the official rent is still shown when the name is the municipality. A place the workbook does not name has no official figure. {s.not_in_table.toLocaleString('en-GB')} of {s.towns.toLocaleString('en-GB')} places are in that gap.
            </p>

            <div className="lg:hidden space-y-4">
              {view.towns.map((t) => (
                <TownCard key={`${t.province_key}-${t.town}`} town={t} year={view.serpavi_year} />
              ))}
            </div>

            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Town</Th>
                    <Th align="right">Avena asking</Th>
                    <Th align="right">Avena gross yield</Th>
                    <Th align="right">Official flat rent</Th>
                    <Th align="right">Implied habitual yield</Th>
                    <Th align="right">Dwellings</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.towns.map((t) => (
                    <tr key={`${t.province_key}-${t.town}`} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{t.town}</span>
                        <span className="block text-[11px] text-muted-foreground">{t.province}{t.municipality && t.municipality !== t.town ? ` · ${t.municipality}` : ''}{t.status === 'not_in_table' ? ' · no ministry row' : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{t.avena_median_asking_eur_m2 == null ? '–' : `${eur(t.avena_median_asking_eur_m2, 0)}`}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{t.priced_listings.toLocaleString('en-GB')} priced</span>
                      </Td>
                      <Td align="right"><Mono>{pct(t.avena_gross_yield_pct)}</Mono></Td>
                      <Td align="right">
                        <Mono strong>{rentM2(t.colectiva)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{band(t.colectiva)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{pct(t.implied_flat_gross_yield_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{t.status === 'compared' ? 'Derived' : t.status === 'official_only' ? 'Below the listing floor' : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{t.colectiva ? t.colectiva.contracts.toLocaleString('en-GB') : '–'}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{t.cumun ?? ''}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provenance</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Source, vintage, retrieval.</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <SourceCard
                title="Ministry SERPAVI"
                body={`${view.sources.serpavi.dataset}. ${view.sources.serpavi.licence_note} Year in this file: ${view.serpavi_year}. Workbook: ${view.sources.serpavi.file_url}`}
                href={view.sources.serpavi.page_url}
              />
              <SourceCard
                title="INE rental-price index"
                body={`Table ${view.sources.ipva.table_id}. ${view.sources.ipva.licence_note} Latest period in this file: ${view.ipva_period}. ${view.method.ipva}`}
                href={view.sources.ipva.table_url}
              />
            </div>
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Methodology PDF linked from the ministry page, newest filename date:{' '}
              <a href={view.sources.serpavi.methodology_url} className="text-primary hover:underline break-all">{view.sources.serpavi.methodology_url.replace('https://', '')}</a>
            </p>
            <div className="hidden lg:block mt-8 rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Place</Th>
                    <Th>Flat-rent field</Th>
                    <Th>INE series</Th>
                    <Th>Retrieved</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    <Td><span className="text-sm text-foreground">Spain</span></Td>
                    <Td><Mono>No national €/m² in the province sheet</Mono></Td>
                    <Td><Mono>{n.ipva_total_yoy_pct.series_id}</Mono><span className="block text-[11px] text-muted-foreground">{n.ipva_total_yoy_pct.period} · {n.ipva_total_yoy_pct.unit_label}</span></Td>
                    <Td><Mono>{n.ipva_total_yoy_pct.retrieved_at}</Mono></Td>
                  </tr>
                  {view.provinces.map((p) => (
                    <ProvinceProvenance key={p.slug} p={p} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="lg:hidden mt-6 text-sm text-muted-foreground">Series identifiers are on each province card. The full table is on a wider screen.</p>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Retrieved {view.retrieved_at}. Machine-readable copy:{' '}
              <Link href="/api/v1/es-rents" className="text-primary hover:underline">/api/v1/es-rents</Link>.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What these numbers are</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Three different measurements.</h2>
            <ul className="max-w-3xl space-y-4">
              {view.caveats.map((c) => (
                <li key={c} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{c}</li>
              ))}
            </ul>
            {view.omissions.length > 0 && (
              <div className="mt-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Not in this file</div>
                <ul className="space-y-3 max-w-3xl">
                  {view.omissions.map((o) => (
                    <li key={o.source} className="text-sm text-muted-foreground leading-relaxed">
                      <span className="text-foreground">{o.source}.</span> {o.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-8 text-xs text-muted-foreground leading-relaxed max-w-3xl">{view.method.avena_asking}</p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-3xl">{view.method.avena_gross_yield}</p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-3xl">{view.method.implied_yield}</p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-3xl">{view.method.rounding}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ProvinceProvenance({ p }: { p: ProvinceRentRow }) {
  const field = p.colectiva?.fields.eur_m2_month_median ?? '–';
  return (
    <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
      <Td><span className="text-sm text-foreground">{p.name}</span></Td>
      <Td><Mono>{field}</Mono><span className="block text-[11px] text-muted-foreground">{p.serpavi_name}</span></Td>
      <Td><Mono>{p.ipva_total_yoy_pct.series_id}</Mono><span className="block text-[11px] text-muted-foreground">{p.ipva_total_index.series_id} · index</span></Td>
      <Td><Mono>{p.ipva_total_yoy_pct.retrieved_at}</Mono></Td>
    </tr>
  );
}

function TownCard({ town, year }: { town: TownRentRow; year: number }) {
  return (
    <article className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{town.province}</div>
      <h3 className="font-serif text-3xl font-light text-foreground mb-1">{town.town}</h3>
      <p className="text-[11px] text-muted-foreground mb-4">
        {town.municipality ? `${town.municipality}${town.cumun ? ` · ${town.cumun}` : ''}` : 'No ministry municipality'}
        {town.status === 'official_only' ? ' · asking median withheld below 8 priced listings' : ''}
      </p>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="Avena median asking" value={town.avena_median_asking_eur_m2 == null ? '–' : `${eur(town.avena_median_asking_eur_m2, 0)}/m²`} note={`${town.listings.toLocaleString('en-GB')} listings`} />
        <Field label="Avena gross yield" value={pct(town.avena_gross_yield_pct)} note="Short-stay estimate" />
        <Field label={`Flat rent, ${year}`} value={rentM2(town.colectiva)} note={rentNote(town.colectiva)} />
        <Field label="Implied habitual yield" value={pct(town.implied_flat_gross_yield_pct)} note={town.status === 'compared' ? 'Derived' : 'Not published'} />
      </dl>
    </article>
  );
}

function SourceCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <h3 className="font-serif text-2xl font-light text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{body}</p>
      <a href={href} className="text-sm text-primary hover:underline break-all">{href.replace('https://', '')}</a>
    </div>
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: BORDER, background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-2xl font-light text-foreground tabular">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
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

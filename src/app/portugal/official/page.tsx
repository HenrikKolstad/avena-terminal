import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getPtOfficial } from '@/lib/pt-official-view';
import type { PtBenchmarkRegion, SourcedPt } from '@/lib/data-sources/ine-pt-benchmark';

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Portugal official housing benchmarks · Avena Terminal',
  description:
    'INE Portugal median bank appraisal €/m² by region, median sale €/m² of new and existing dwellings, and the house price index. Avena does not publish Portuguese listings.',
  alternates: { canonical: 'https://avenaterminal.com/portugal/official' },
  openGraph: {
    title: 'Portugal official housing benchmarks · Avena Terminal',
    description: 'Official Portuguese housing statistics from INE, with the Spanish coastal asking-price comparison beside them.',
    url: 'https://avenaterminal.com/portugal/official',
    siteName: 'Avena',
    type: 'website',
  },
};

function eurM2(n: number | null | undefined): string {
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
function idx(n: number | null | undefined): string {
  if (n == null) return '–';
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function periodLabel(p: string | null | undefined): string {
  if (!p) return '–';
  const q = /^(\d{4})-Q([1-4])$/.exec(p);
  if (q) return `Q${q[2]} ${q[1]}`;
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  if (!m) return p;
  const date = new Date(`${p}-01T00:00:00Z`);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function gapWord(n: number | null): string {
  if (n == null) return '';
  if (n > 0) return 'premium';
  if (n < 0) return 'discount';
  return 'level';
}
function territory(region: PtBenchmarkRegion): string {
  if (!region.also_published_as) return `${region.nuts_level} ${region.geo}`;
  return `${region.nuts_level} ${region.geo} · NUTS III ${region.also_published_as.geo} publishes the same figures`;
}

export default function PortugalOfficialPage() {
  const view = getPtOfficial();
  const portugal = view.regions.find((r) => r.slug === 'portugal');
  const hpi = view.hpi.latest;

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Portugal official housing benchmark',
    description: view.coverage_note,
    url: 'https://avenaterminal.com/portugal/official',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: [
      view.sources.appraisal.info_url,
      view.sources.sales.info_url,
      view.sources.hpi_index.info_url,
      view.sources.hpi_yoy.info_url,
    ],
    spatialCoverage: 'Portugal',
    dateModified: view.generated_at,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Portugal official benchmark</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Official Portuguese figures,<br />
              <span className="text-gold italic">on the INE record.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              Median bank appraisal per m² by region, the median price per m² of dwellings sold, and the house price index for new and existing dwellings. All three are Statistics Portugal series, refreshed from the public API each week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
              {view.coverage_note}
            </p>
            <p className="text-sm mb-8">
              <Link href="/portugal" className="text-primary hover:underline">Municipality and parish sales, and the licensing pipeline</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/official" className="text-primary hover:underline">Official statistics</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/notary" className="text-primary hover:underline">Spain notary transaction prices</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/official" className="text-primary hover:underline">Spain province benchmark</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/rents" className="text-primary hover:underline">Spain habitual rents</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/europe/official" className="text-primary hover:underline">Eurostat house price index</Link>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat
                label={`Bank appraisal, Portugal, ${periodLabel(portugal?.appraisal_eur_m2.total.period)}`}
                value={`${eurM2(portugal?.appraisal_eur_m2.total.value ?? null)}/m²`}
                sub="Median, all construction types"
              />
              <Stat
                label={`Appraisal, 1 year, ${periodLabel(portugal?.appraisal_yoy_pct?.period)}`}
                value={pct(portugal?.appraisal_yoy_pct?.value ?? null)}
                sub="Published rate, indicator 0012250"
              />
              <Stat
                label={`House price index, new, ${periodLabel(hpi.period)}`}
                value={pct(hpi.yoy_pct.new.value)}
                sub={`Index ${idx(hpi.index.new.value)}, base ${view.hpi.base_year}`}
              />
              <Stat
                label={`House price index, existing, ${periodLabel(hpi.period)}`}
                value={pct(hpi.yoy_pct.existing.value)}
                sub={`Index ${idx(hpi.index.existing.value)}, base ${view.hpi.base_year}`}
              />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Regions INE publishes</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Appraisal, then the sale price.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              The appraisal is indicator {view.sources.appraisal.indicator}, {periodLabel(view.sources.appraisal.latest_period)}. The sale price is indicator {view.sources.sales.indicator}, median euro per m² over the twelve months to {periodLabel(view.sources.sales.latest_period)}, new dwellings and existing dwellings. They are different measurements and different periods.
            </p>

            <div className="lg:hidden space-y-4">
              {view.regions.map((region) => (
                <article key={region.slug} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{territory(region)}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{region.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Bank appraisal" value={`${eurM2(region.appraisal_eur_m2.total.value)}/m²`} note={periodLabel(region.appraisal_eur_m2.total.period)} />
                    <Field label="Appraisal, 1 year" value={region.appraisal_yoy_pct ? pct(region.appraisal_yoy_pct.value) : 'Not published'} note={region.appraisal_yoy_pct ? periodLabel(region.appraisal_yoy_pct.period) : 'NUTS II series only'} />
                    <Field label="Sales, new" value={`${eurM2(region.sales_eur_m2.new.value)}/m²`} note={periodLabel(region.sales_eur_m2.new.period)} />
                    <Field label="Sales, existing" value={`${eurM2(region.sales_eur_m2.existing.value)}/m²`} note={periodLabel(region.sales_eur_m2.existing.period)} />
                  </dl>
                  <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    <span className="block">{region.appraisal_eur_m2.total.series_id} · {region.appraisal_eur_m2.total.retrieved_at}</span>
                    <span className="block">{region.sales_eur_m2.new.series_id} · {region.sales_eur_m2.new.retrieved_at}</span>
                  </p>
                </article>
              ))}
            </div>

            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Region</Th>
                    <Th align="right">Bank appraisal</Th>
                    <Th align="right">Appraisal, 1 year</Th>
                    <Th align="right">Sales, new</Th>
                    <Th align="right">Sales, existing</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.regions.map((region) => (
                    <tr key={region.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{region.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{territory(region)}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{eurM2(region.appraisal_eur_m2.total.value)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{periodLabel(region.appraisal_eur_m2.total.period)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{region.appraisal_yoy_pct ? pct(region.appraisal_yoy_pct.value) : '–'}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{region.appraisal_yoy_pct ? periodLabel(region.appraisal_yoy_pct.period) : 'Not published here'}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{eurM2(region.sales_eur_m2.new.value)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{periodLabel(region.sales_eur_m2.new.period)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{eurM2(region.sales_eur_m2.existing.value)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{periodLabel(region.sales_eur_m2.existing.period)}</span>
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
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Same appraisal, by construction type</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Flats and villas.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              These are the other two categories of indicator {view.sources.appraisal.indicator}. A flat is not a new dwelling, and a villa is not an existing one.
            </p>
            <div className="lg:hidden space-y-4">
              {view.regions.map((region) => (
                <article key={region.slug} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <h3 className="font-serif text-2xl font-light text-foreground mb-3">{region.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Flats" value={`${eurM2(region.appraisal_eur_m2.flats.value)}/m²`} note={region.appraisal_eur_m2.flats.series_id} />
                    <Field label="Villas" value={`${eurM2(region.appraisal_eur_m2.villas.value)}/m²`} note={region.appraisal_eur_m2.villas.series_id} />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Region</Th>
                    <Th align="right">Flats</Th>
                    <Th align="right">Villas</Th>
                    <Th>Series</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.regions.map((region) => (
                    <tr key={region.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">{region.name}</span></Td>
                      <Td align="right"><Mono strong>{eurM2(region.appraisal_eur_m2.flats.value)}</Mono></Td>
                      <Td align="right"><Mono>{eurM2(region.appraisal_eur_m2.villas.value)}</Mono></Td>
                      <Td><Mono>{region.appraisal_eur_m2.flats.series_id}</Mono></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">House price index, Portugal</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">New dwellings and existing dwellings.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              {view.hpi.note} {periodLabel(hpi.period)}. Base {view.hpi.base_year}. Indicator {view.sources.hpi_index.indicator} is the index. Indicator {view.sources.hpi_yoy.indicator} is the annual rate of change.
            </p>
            <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full min-w-[640px]">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Category</Th>
                    <Th align="right">Index</Th>
                    <Th align="right">Annual change</Th>
                    <Th>Series</Th>
                  </tr>
                </thead>
                <tbody>
                  {(['total', 'new', 'existing'] as const).map((category) => (
                    <tr key={category} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground capitalize">{category}</span></Td>
                      <Td align="right"><Mono strong>{idx(hpi.index[category].value)}</Mono></Td>
                      <Td align="right"><Mono>{pct(hpi.yoy_pct[category].value)}</Mono></Td>
                      <Td>
                        <Mono>{hpi.index[category].series_id}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{hpi.yoy_pct[category].series_id}</span>
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
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Spain, for scale</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Asking price beside the Spanish appraisal.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              {view.spain_coast_note} {view.spain_gap_method}
            </p>
            <div className="lg:hidden space-y-4">
              {view.spain_coast.map((row) => (
                <article key={row.slug} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{row.ccaa}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{row.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena median asking" value={`${eurM2(row.avena_median_asking_eur_m2)}/m²`} note={`${row.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Official appraisal" value={row.appraisal_eur_m2 == null ? '–' : `${eurM2(row.appraisal_eur_m2)}/m²`} note={periodLabel(row.appraisal_period)} />
                    <Field label="Asking vs appraisal" value={pct(row.asking_vs_appraisal_pct)} note={gapWord(row.asking_vs_appraisal_pct) || 'Derived'} />
                  </dl>
                  {row.appraisal_series_id && (
                    <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">{row.appraisal_series_id} · {row.appraisal_retrieved_at}</p>
                  )}
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Avena median asking</Th>
                    <Th align="right">Official appraisal</Th>
                    <Th align="right">Asking vs appraisal</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.spain_coast.map((row) => (
                    <tr key={row.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{row.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{row.ccaa}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{eurM2(row.avena_median_asking_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{row.listings.toLocaleString('en-GB')} listings</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{row.appraisal_eur_m2 == null ? '–' : eurM2(row.appraisal_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{periodLabel(row.appraisal_period)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{pct(row.asking_vs_appraisal_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{gapWord(row.asking_vs_appraisal_pct) || 'Derived'}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              The same provinces, with the INE Spain index, are on <Link href="/spain/official" className="text-primary hover:underline">/spain/official</Link>.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provenance</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Indicator, period, retrieval.</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <SourceCard title="Bank appraisal, €/m²" source={view.sources.appraisal} figure={portugal?.appraisal_eur_m2.total} />
              <SourceCard title="Bank appraisal, annual change" source={view.sources.appraisal_yoy} figure={portugal?.appraisal_yoy_pct ?? undefined} />
              <SourceCard title="Median sale price, €/m²" source={view.sources.sales} figure={portugal?.sales_eur_m2.new} />
              <SourceCard title="House price index" source={view.sources.hpi_index} figure={hpi.index.new} />
              <SourceCard title="House price index, annual change" source={view.sources.hpi_yoy} figure={hpi.yoy_pct.new} />
            </div>
            <p className="mt-6 text-xs text-muted-foreground leading-relaxed">{view.licence}</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Retrieved {view.sources.appraisal.fetched_at}. Machine-readable copy:{' '}
              <Link href="/api/v1/pt-official" className="text-primary hover:underline">/api/v1/pt-official</Link>.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What these numbers are</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Separate measurements.</h2>
            <ul className="max-w-3xl space-y-4">
              {view.caveats.map((caveat) => (
                <li key={caveat} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{caveat}</li>
              ))}
            </ul>
            {view.omissions.length > 0 && (
              <div className="mt-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Not in this file</div>
                <ul className="space-y-3">
                  {view.omissions.map((omission) => (
                    <li key={omission.source} className="text-sm text-muted-foreground leading-relaxed">
                      <span className="text-foreground">{omission.source}.</span> {omission.reason}{' '}
                      {omission.url && <a href={omission.url} className="text-primary hover:underline">Indicator page</a>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SourceCard({ title, source, figure }: { title: string; source: { indicator: string; title: string; info_url: string; latest_period: string; last_updated: string; fetched_at: string }; figure?: SourcedPt }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <h3 className="font-serif text-2xl font-light text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        Indicator {source.indicator}. Latest period in this file: {periodLabel(source.latest_period)}. INE updated {source.last_updated}. Fetched {source.fetched_at}.
        {figure ? ` ${figure.series_id}.` : ''}
      </p>
      <a href={source.info_url} className="text-sm text-primary hover:underline break-all">{source.info_url.replace('https://', '')}</a>
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

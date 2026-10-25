import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getEsBenchmark } from '@/lib/es-official-view';
import type { ProvinceBenchmark, SourcedNumber } from '@/lib/data-sources/ine-es';

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Spain official housing benchmarks · Avena Terminal',
  description:
    'Median new-build asking prices for the Spanish provinces Avena covers, set beside the ministry appraised value per m² and the INE new-build house price index.',
  alternates: { canonical: 'https://avenaterminal.com/spain/official' },
  openGraph: {
    title: 'Spain official housing benchmarks · Avena Terminal',
    description: 'Avena asking prices beside official appraised values and the INE new-build index, by province.',
    url: 'https://avenaterminal.com/spain/official',
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
  return n.toLocaleString('en-GB', { maximumFractionDigits: 3 });
}
function quarterLabel(p: string | null | undefined): string {
  if (!p) return '–';
  const m = /^(\d{4})-Q([1-4])$/.exec(p);
  return m ? `Q${m[2]} ${m[1]}` : p;
}
function gapWord(n: number | null): string {
  if (n == null) return '';
  if (n > 0) return 'premium';
  if (n < 0) return 'discount';
  return 'level';
}

function pendingText(status: 'ready' | 'pending', official: ProvinceBenchmark['official']): string {
  if (status === 'pending') return 'Pending first refresh';
  if (official === 'missing_from_layer') return 'Not in this refresh';
  return '–';
}

export default function SpainOfficialPage() {
  const bench = getEsBenchmark();
  const pending = bench.status !== 'ready';
  const n = bench.national;
  const priced = bench.provinces.filter((p) => p.listings > 0);

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Spain official housing benchmark',
    description: bench.coverage_note ?? 'Official Spanish housing statistics joined to Avena new-build asking prices.',
    url: 'https://avenaterminal.com/spain/official',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: [
      'https://www.ine.es/jaxiT3/Tabla.htm?t=79563',
      'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP006_01.csv',
    ],
    spatialCoverage: 'Spain',
    dateModified: bench.generated_at,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Spain official benchmark</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Coastal provinces,<br />
              <span className="text-gold italic">on the official record.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              For every province in the current Avena corpus, the median new-build asking price per m² sits beside the ministry’s appraised value per m² and the INE new-build house price index. Refreshed from the public files each week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-8">
              {bench.coverage_note ?? 'Official figures are pending the first refresh of data/es-official.json.'}
            </p>
            {pending ? (
              <div className="rounded-sm border p-5 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Pending first refresh</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The weekly job has not written official figures yet. Asking-price medians from the current corpus are shown below. No official number is filled in.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                <Stat label={`Appraised value, Spain, ${quarterLabel(n?.appraisal.period)}`} value={`${eurM2(n?.appraisal.value ?? null)}/m²`} sub="Free-market housing, all ages" />
                <Stat label={`INE new dwellings, ${quarterLabel(n?.ine_new_yoy_pct.period)}`} value={pct(n?.ine_new_yoy_pct.value ?? null)} sub="Published annual change, national" />
                <Stat label={`INE second-hand, ${quarterLabel(n?.ine_existing_yoy_pct.period)}`} value={pct(n?.ine_existing_yoy_pct.value ?? null)} sub="Published annual change, national" />
                <Stat label={`INE new-build index, ${quarterLabel(n?.ine_new_index.period)}`} value={idx(n?.ine_new_index.value ?? null)} sub={n?.ine_new_index.unit_label ?? 'Index'} />
              </div>
            )}
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provinces in the corpus</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Asking price, appraisal, index.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              The gap is how far the Avena median sits above or below the ministry appraisal, in percent. It is computed here. It is not published by INE or the ministry.
            </p>

            <div className="lg:hidden space-y-4">
              {priced.map((p) => (
                <article key={p.slug} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{p.ccaa}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{p.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena median asking" value={`${eurM2(p.avena_median_asking_eur_m2)}/m²`} note={`${p.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Official appraisal" value={p.appraisal ? `${eurM2(p.appraisal.value)}/m²` : pendingText(bench.status, p.official)} note={p.appraisal ? quarterLabel(p.appraisal.period) : 'Free-market, all ages'} />
                    <Field label="Asking vs appraisal" value={p.asking_vs_appraisal_pct == null ? pendingText(bench.status, p.official) : pct(p.asking_vs_appraisal_pct)} note={gapWord(p.asking_vs_appraisal_pct) || 'Derived'} />
                    <Field label="INE new-build, 1 year" value={p.ine_new_yoy_pct ? pct(p.ine_new_yoy_pct.value) : pendingText(bench.status, p.official)} note={p.ine_territory_equals_province ? p.ccaa : `${p.ccaa}, not the province alone`} />
                  </dl>
                  {(p.appraisal || p.ine_new_yoy_pct) && (
                    <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {p.appraisal && <span className="block">{p.appraisal.series_id} · {quarterLabel(p.appraisal.period)} · {p.appraisal.retrieved_at}</span>}
                      {p.ine_new_yoy_pct && <span className="block">{p.ine_new_yoy_pct.series_id} · {quarterLabel(p.ine_new_yoy_pct.period)} · {p.ine_new_yoy_pct.source_name}</span>}
                    </p>
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
                    <Th align="right">INE new-build, 1 year</Th>
                    <Th align="right">INE second-hand, 1 year</Th>
                  </tr>
                </thead>
                <tbody>
                  {priced.map((p) => (
                    <tr key={p.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{p.ccaa}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{eurM2(p.avena_median_asking_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.listings.toLocaleString('en-GB')} listings</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{p.appraisal ? eurM2(p.appraisal.value) : pendingText(bench.status, p.official)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.appraisal ? quarterLabel(p.appraisal.period) : '€/m², free market'}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{p.asking_vs_appraisal_pct == null ? pendingText(bench.status, p.official) : pct(p.asking_vs_appraisal_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{gapWord(p.asking_vs_appraisal_pct) || 'Derived'}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{p.ine_new_yoy_pct ? pct(p.ine_new_yoy_pct.value) : pendingText(bench.status, p.official)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.ine_new_yoy_pct ? `${quarterLabel(p.ine_new_yoy_pct.period)} · ${p.ine_territory_equals_province ? 'province' : 'community'}${p.ine_new_yoy_pct.provisional ? ' · provisional' : ''}` : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{p.ine_existing_yoy_pct ? pct(p.ine_existing_yoy_pct.value) : '–'}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.ine_existing_yoy_pct ? quarterLabel(p.ine_existing_yoy_pct.period) : ''}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bench.unmapped_listings > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {bench.unmapped_listings.toLocaleString('en-GB')} listings could not be placed in a province and are not in the medians.
              </p>
            )}
          </div>
        </section>

        {!pending && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provenance</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Series, period, retrieval.</h2>
              <p className="lg:hidden text-sm text-muted-foreground mb-6">Series identifiers are on each province card. The full table is on a wider screen.</p>
              <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                    <tr>
                      <Th>Place</Th>
                      <Th>Appraisal series</Th>
                      <Th>INE new-build series</Th>
                      <Th>Retrieved</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {n && (
                      <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td><span className="text-sm text-foreground">Spain</span></Td>
                        <Td><Series n={n.appraisal} /></Td>
                        <Td><Series n={n.ine_new_yoy_pct} /></Td>
                        <Td><Mono>{n.appraisal.retrieved_at}</Mono></Td>
                      </tr>
                    )}
                    {priced.map((p) => (
                      <tr key={p.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td><span className="text-sm text-foreground">{p.name}</span></Td>
                        <Td>{p.appraisal ? <Series n={p.appraisal} /> : <Mono>–</Mono>}</Td>
                        <Td>{p.ine_new_yoy_pct ? <Series n={p.ine_new_yoy_pct} /> : <Mono>–</Mono>}</Td>
                        <Td><Mono>{p.appraisal?.retrieved_at ?? '–'}</Mono></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Retrieved {bench.retrieved_at}. Machine-readable copy:{' '}
                <Link href="/api/v1/es-official" className="text-primary hover:underline">/api/v1/es-official</Link>.
              </p>
            </div>
          </section>
        )}

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What these numbers are</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Three different measurements.</h2>
            <ul className="max-w-3xl space-y-4">
              {bench.caveats.map((c) => (
                <li key={c} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{c}</li>
              ))}
            </ul>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <SourceCard
                title="INE, housing price index"
                body={bench.sources ? `Table ${bench.sources.ine_ipv.table_id}. ${bench.sources.ine_ipv.licence_note} Latest period in this file: ${quarterLabel(bench.sources.ine_ipv.latest_period)}.` : 'Pending first refresh.'}
                href={bench.sources?.ine_ipv.table_url ?? 'https://www.ine.es/jaxiT3/Tabla.htm?t=79563'}
              />
              <SourceCard
                title="Ministry appraisal, VDP006_01"
                body={bench.sources ? `${bench.sources.mivau_appraisal.definition} Licence ${bench.sources.mivau_appraisal.licence}. Latest period in this file: ${quarterLabel(bench.sources.mivau_appraisal.latest_period)}.` : 'Pending first refresh.'}
                href={bench.sources?.mivau_appraisal.url ?? 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP006_01.csv'}
              />
            </div>
            {bench.omissions.length > 0 && (
              <div className="mt-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Not in this file</div>
                <ul className="space-y-3">
                  {bench.omissions.map((o) => (
                    <li key={o.source} className="text-sm text-muted-foreground leading-relaxed">
                      <span className="text-foreground">{o.source}.</span> {o.reason}{' '}
                      {o.url && <a href={o.url} className="text-primary hover:underline">Source page</a>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-8 text-xs text-muted-foreground leading-relaxed max-w-3xl">{bench.method.avena_median}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Series({ n }: { n: SourcedNumber }) {
  return (
    <span className="block">
      <Mono>{n.series_id}</Mono>
      <span className="block text-[11px] text-muted-foreground">{quarterLabel(n.period)} · {n.source_name}</span>
    </span>
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

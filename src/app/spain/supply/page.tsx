import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getEsSupply } from '@/lib/es-supply-view';
import type { SupplyCount, SupplySlot } from '@/lib/data-sources/es-supply';

const BORDER = 'hsl(var(--av-border) / 0.6)';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const metadata: Metadata = {
  title: 'Spain new-housing supply · Avena Terminal',
  description:
    'Ministry estimates of free-market dwellings started and finished, and INE registered sales of new dwellings, beside Avena listing counts and asking-price moves, by coastal province.',
  alternates: { canonical: 'https://avenaterminal.com/spain/supply' },
  openGraph: {
    title: 'Spain new-housing supply · Avena Terminal',
    description: 'Official new-housing supply beside Avena listing counts and asking-price moves, by province.',
    url: 'https://avenaterminal.com/spain/supply',
    siteName: 'Avena',
    type: 'website',
  },
};

function int(n: number | null | undefined): string {
  if (n == null) return '–';
  return n.toLocaleString('en-GB');
}
function monthLabel(p: string | null | undefined): string {
  if (!p) return '–';
  const one = /^(\d{4})-(\d{2})$/.exec(p);
  if (one) return `${MONTHS[Number(one[2]) - 1]} ${one[1]}`;
  const range = /^(\d{4}-\d{2})\/(\d{4}-\d{2})$/.exec(p);
  if (range) return `${monthLabel(range[1])} – ${monthLabel(range[2])}`;
  return p;
}
function dayLabel(d: string | null | undefined): string {
  if (!d) return 'no file date';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
function isCount(slot: SupplySlot | null | undefined): slot is SupplyCount {
  return !!slot && slot.available === true;
}
function slotText(slot: SupplySlot | null | undefined, pending: boolean): string {
  if (isCount(slot)) return int(slot.value);
  if (!slot) return pending ? 'Pending first refresh' : '–';
  return 'Not summed';
}

export default function SpainSupplyPage() {
  const view = getEsSupply();
  const pending = view.status !== 'ready';
  const n = view.national;
  const shown = view.provinces.filter((p) => p.listings > 0 || p.official === 'ready');
  const moveWindow = view.moves_file.first_date && view.moves_file.last_date
    ? `${view.moves_file.first_date} to ${view.moves_file.last_date}`
    : null;

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Spain new-housing supply',
    description: view.coverage_note ?? 'Official Spanish new-housing supply joined to Avena listing counts and asking-price moves.',
    url: 'https://avenaterminal.com/spain/supply',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: [
      'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP005_01.csv',
      'https://www.ine.es/jaxiT3/Tabla.htm?t=6150',
    ],
    spatialCoverage: 'Spain',
    dateModified: view.generated_at,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Spain supply pipeline</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              New housing supply,<br />
              <span className="text-gold italic">by coastal province.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              For every province in the current Avena corpus, estimated free-market dwellings started and finished sit beside INE registered sales of new dwellings, the live listing count, and verified asking-price moves. Refreshed from the public files each week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
              {view.coverage_note ?? 'Official figures are pending the first refresh of data/es-supply.json.'}
            </p>
            <p className="text-sm mb-8">
              <Link href="/spain/official" className="text-primary hover:underline">Price benchmark for the same provinces</Link>
            </p>
            {pending ? (
              <div className="rounded-sm border p-5 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Pending first refresh</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The weekly job has not written official figures yet. Listing counts and asking-price moves from the current corpus are shown below. No official number is filled in.
                </p>
              </div>
            ) : n && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
                <Stat label={`Starts, Spain, ${monthLabel(n.starts_latest.period)}`} value={slotText(n.starts_latest, false)} sub={isCount(n.starts_latest) ? 'Free-market, estimated. Sum of provinces.' : n.starts_latest.reason} />
                <Stat label={`Completions, Spain, ${monthLabel(n.completions_latest.period)}`} value={slotText(n.completions_latest, false)} sub={isCount(n.completions_latest) ? 'Free-market, estimated. Sum of provinces.' : n.completions_latest.reason} />
                <Stat label={`INE new sales, Spain, ${monthLabel(n.ine_new_sales_latest.period)}`} value={int(n.ine_new_sales_latest.value)} sub="Registered sales, vivienda nueva" />
                <Stat label={`Starts, 12 months, ${monthLabel(n.starts_trailing_12m.period)}`} value={slotText(n.starts_trailing_12m, false)} sub={isCount(n.starts_trailing_12m) ? 'Sum of published months' : 'Not summed. See the note below.'} />
                <Stat label={`Completions, 12 months, ${monthLabel(n.completions_trailing_12m.period)}`} value={slotText(n.completions_trailing_12m, false)} sub={isCount(n.completions_trailing_12m) ? 'Sum of published months' : 'Not summed. See the note below.'} />
                <Stat label={`INE new sales, 12 months, ${monthLabel(n.ine_new_sales_trailing_12m.period)}`} value={int(n.ine_new_sales_trailing_12m.value)} sub="Published national row, summed here from its months" />
              </div>
            )}
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provinces in the corpus</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Stock, starts, sales.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              The latest official month is the newest month in that file. The twelve-month figure adds the twelve months that end there.
              {moveWindow ? ` Asking-price moves are the published file from ${moveWindow}.` : ''}
            </p>

            <div className="lg:hidden space-y-4">
              {shown.map((p) => (
                <article key={p.slug} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{p.ccaa}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{p.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena listings" value={int(p.listings)} note="Live corpus" />
                    <Field label="Asking-price moves" value={int(p.price_moves)} note={p.price_moves ? `${int(p.price_increases)} up · ${int(p.price_reductions)} down` : 'None in this file'} />
                    <Field label="Starts, latest month" value={p.starts_latest ? int(p.starts_latest.value) : slotText(null, pending)} note={p.starts_latest ? monthLabel(p.starts_latest.period) : 'Free-market'} />
                    <Field label="Starts, 12 months" value={p.starts_trailing_12m ? int(p.starts_trailing_12m.value) : slotText(null, pending)} note={p.starts_trailing_12m ? monthLabel(p.starts_trailing_12m.period) : ''} />
                    <Field label="Completions, latest month" value={p.completions_latest ? int(p.completions_latest.value) : slotText(null, pending)} note={p.completions_latest ? monthLabel(p.completions_latest.period) : ''} />
                    <Field label="Completions, 12 months" value={p.completions_trailing_12m ? int(p.completions_trailing_12m.value) : slotText(null, pending)} note={p.completions_trailing_12m ? monthLabel(p.completions_trailing_12m.period) : ''} />
                    <Field label="INE new sales, latest month" value={p.ine_new_sales_latest ? int(p.ine_new_sales_latest.value) : slotText(null, pending)} note={p.ine_new_sales_latest ? monthLabel(p.ine_new_sales_latest.period) : 'Vivienda nueva'} />
                    <Field label="INE new sales, 12 months" value={p.ine_new_sales_trailing_12m ? int(p.ine_new_sales_trailing_12m.value) : slotText(null, pending)} note={p.ine_new_sales_trailing_12m ? monthLabel(p.ine_new_sales_trailing_12m.period) : ''} />
                  </dl>
                  {p.starts_latest && (
                    <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
                      <span className="block">{p.starts_latest.series_id} · file {dayLabel(p.starts_latest.file_modified)}</span>
                      {p.ine_new_sales_latest && <span className="block">{p.ine_new_sales_latest.series_id} · file {dayLabel(p.ine_new_sales_latest.file_modified)}</span>}
                    </p>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden lg:block rounded-sm border overflow-x-auto mb-8" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Avena listings</Th>
                    <Th align="right">Asking-price moves</Th>
                    <Th align="right">Starts, latest month</Th>
                    <Th align="right">Completions, latest month</Th>
                    <Th align="right">INE new sales, latest month</Th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{p.ccaa}</span>
                      </Td>
                      <Td align="right"><Mono strong>{int(p.listings)}</Mono></Td>
                      <Td align="right">
                        <Mono strong>{int(p.price_moves)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.price_moves ? `${int(p.price_increases)} up · ${int(p.price_reductions)} down` : 'none in this file'}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{p.starts_latest ? int(p.starts_latest.value) : slotText(null, pending)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.starts_latest ? monthLabel(p.starts_latest.period) : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{p.completions_latest ? int(p.completions_latest.value) : slotText(null, pending)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.completions_latest ? monthLabel(p.completions_latest.period) : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{p.ine_new_sales_latest ? int(p.ine_new_sales_latest.value) : slotText(null, pending)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.ine_new_sales_latest ? monthLabel(p.ine_new_sales_latest.period) : ''}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Province</Th>
                    <Th align="right">Starts, 12 months</Th>
                    <Th align="right">Completions, 12 months</Th>
                    <Th align="right">INE new sales, 12 months</Th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">{p.name}</span></Td>
                      <Td align="right">
                        <Mono strong>{p.starts_trailing_12m ? int(p.starts_trailing_12m.value) : '–'}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.starts_trailing_12m ? monthLabel(p.starts_trailing_12m.period) : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{p.completions_trailing_12m ? int(p.completions_trailing_12m.value) : '–'}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.completions_trailing_12m ? monthLabel(p.completions_trailing_12m.period) : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{p.ine_new_sales_trailing_12m ? int(p.ine_new_sales_trailing_12m.value) : '–'}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{p.ine_new_sales_trailing_12m ? monthLabel(p.ine_new_sales_trailing_12m.period) : ''}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {view.unmapped_listings > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {view.unmapped_listings.toLocaleString('en-GB')} listings could not be placed in a province and are not in the counts.
              </p>
            )}
            {view.moves_file.unplaced > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {view.moves_file.unplaced.toLocaleString('en-GB')} asking-price moves could not be placed in a province and are not in the move counts.
              </p>
            )}
          </div>
        </section>

        {!pending && n && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provenance</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Series, period, file date.</h2>
              <p className="lg:hidden text-sm text-muted-foreground mb-6">Series identifiers are on each province card. The full table is on a wider screen.</p>
              <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                    <tr>
                      <Th>Place</Th>
                      <Th>Starts series</Th>
                      <Th>INE new-sales series</Th>
                      <Th>File dated</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">Spain</span></Td>
                      <Td>{isCount(n.starts_latest) ? <Series n={n.starts_latest} /> : <Mono>Not summed</Mono>}</Td>
                      <Td><Series n={n.ine_new_sales_latest} /></Td>
                      <Td><Mono>{isCount(n.starts_latest) ? dayLabel(n.starts_latest.file_modified) : '–'}</Mono></Td>
                    </tr>
                    {shown.map((p) => (
                      <tr key={p.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td><span className="text-sm text-foreground">{p.name}</span></Td>
                        <Td>{p.starts_latest ? <Series n={p.starts_latest} /> : <Mono>–</Mono>}</Td>
                        <Td>{p.ine_new_sales_latest ? <Series n={p.ine_new_sales_latest} /> : <Mono>–</Mono>}</Td>
                        <Td><Mono>{p.starts_latest ? dayLabel(p.starts_latest.file_modified) : '–'}</Mono></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isCount(n.starts_trailing_12m) && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">{n.starts_trailing_12m.reason}</p>
              )}
              {!isCount(n.completions_trailing_12m) && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">{n.completions_trailing_12m.reason}</p>
              )}
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Retrieved {view.retrieved_at}. Machine-readable copy:{' '}
                <Link href="/api/v1/es-supply" className="text-primary hover:underline">/api/v1/es-supply</Link>.
              </p>
            </div>
          </section>
        )}

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What these numbers are</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Four different measurements.</h2>
            <ul className="max-w-3xl space-y-4">
              {view.caveats.map((c) => (
                <li key={c} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{c}</li>
              ))}
            </ul>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <SourceCard
                title="Ministry starts and completions, VDP005_01"
                body={view.sources
                  ? `${view.sources.mivau_supply.starts_definition} ${view.sources.mivau_supply.completions_definition} Licence ${view.sources.mivau_supply.licence}. File dated ${dayLabel(view.sources.mivau_supply.file_modified)}. ${view.sources.mivau_supply.file_modified_note}`
                  : 'Pending first refresh.'}
                href={view.sources?.mivau_supply.url ?? 'https://cdn.mivau.gob.es/portal-web-mivau/Datos_MIVAU/CSV/VDP005_01.csv'}
                extra={view.sources?.mivau_supply.catalog_url}
              />
              <SourceCard
                title="INE registered sales, table 6150"
                body={view.sources
                  ? `${view.sources.ine_new_sales.definition} ${view.sources.ine_new_sales.licence_note} File dated ${dayLabel(view.sources.ine_new_sales.file_modified)}. Latest period in this file: ${monthLabel(view.sources.ine_new_sales.latest_period)}.`
                  : 'Pending first refresh.'}
                href={view.sources?.ine_new_sales.table_url ?? 'https://www.ine.es/jaxiT3/Tabla.htm?t=6150'}
                extra={view.sources?.ine_new_sales.csv_url}
              />
            </div>
            {view.omissions.length > 0 && (
              <div className="mt-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Not in this file</div>
                <ul className="space-y-3">
                  {view.omissions.map((o) => (
                    <li key={o.source} className="text-sm text-muted-foreground leading-relaxed">
                      <span className="text-foreground">{o.source}.</span> {o.reason}{' '}
                      {o.url && <a href={o.url} className="text-primary hover:underline">Source page</a>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-8 text-xs text-muted-foreground leading-relaxed max-w-3xl">{view.method.listings} {view.method.price_moves}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Series({ n }: { n: SupplyCount }) {
  return (
    <span className="block">
      <Mono>{n.series_id}</Mono>
      <span className="block text-[11px] text-muted-foreground">{monthLabel(n.period)} · {n.source_name}{n.derived ? ' · derived sum' : ''}</span>
    </span>
  );
}

function SourceCard({ title, body, href, extra }: { title: string; body: string; href: string; extra?: string }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <h3 className="font-serif text-2xl font-light text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{body}</p>
      <a href={href} className="text-sm text-primary hover:underline break-all">{href.replace('https://', '')}</a>
      {extra && <a href={extra} className="mt-2 block text-sm text-primary hover:underline break-all">{extra.replace('https://', '')}</a>}
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

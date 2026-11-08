import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getEsNotary } from '@/lib/es-notary-view';
import type { NotaryMetric, NotaryProvinceRow } from '@/lib/data-sources/es-notary';

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Spain notary transaction prices · Avena Terminal',
  description:
    'Median new-build asking prices for the Spanish coast Avena covers, set beside Consejo General del Notariado closing prices per m² and transaction counts from the CIEN statistical annex.',
  alternates: { canonical: 'https://avenaterminal.com/spain/notary' },
  openGraph: {
    title: 'Spain notary transaction prices · Avena Terminal',
    description: 'Avena asking prices beside notarial closing prices, by coastal province. Asking prices are not transaction prices.',
    url: 'https://avenaterminal.com/spain/notary',
    siteName: 'Avena',
    type: 'website',
  },
};

function eur(n: number | null | undefined, digits = 0): string {
  if (n == null) return '–';
  const text = n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `€${text}`;
}
function num(n: number | null | undefined): string {
  if (n == null) return '–';
  return Math.round(n).toLocaleString('en-GB');
}
function pct(n: number | null | undefined): string {
  if (n == null) return '–';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function monthLabel(p: string | null | undefined): string {
  if (!p) return '–';
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  if (!m) return p;
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[Number(m[2]) - 1]} ${m[1]}`;
}
function semesterLabel(p: string | null | undefined): string {
  const m = /^(\d{4})-H([12])$/.exec(p ?? '');
  return m ? `H${m[2]} ${m[1]}` : (p || '–');
}
function gapWord(n: number | null): string {
  if (n == null) return '';
  if (n > 0) return 'Asking above the notary average';
  if (n < 0) return 'Asking below the notary average';
  return 'Level';
}
function placeNote(p: NotaryProvinceRow): string {
  if (p.territory_equals_province) return 'The community is this province';
  const extra = p.ceuta_melilla_included ? ' Includes Ceuta and Melilla.' : '';
  return `Community figure, not ${p.name} alone.${extra}`;
}

export default function SpainNotaryPage() {
  const view = getEsNotary();
  const spain = view.national;
  const foreign = view.foreign.buyers.find((b) => b.key === 'foreign');
  const compared = view.provinces.filter((p) => p.listings > 0);
  const publishedTowns = view.towns.filter((t) => t.status === 'not_published');
  const thinTowns = view.towns.length - publishedTowns.length;
  const communities = [...new Map(compared.map((p) => [p.geo_code, p])).values()];

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Spain notary transaction prices',
    description: view.coverage_note,
    url: 'https://avenaterminal.com/spain/notary',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: [view.sources.housing.index_url, view.sources.housing.file_url, view.sources.foreign_buyers.file_url],
    spatialCoverage: 'Spain',
    temporalCoverage: view.period,
    dateModified: view.generated_at,
    license: view.sources.housing.licence_note,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Spain notary prices</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Notary prices,<br />
              <span className="text-gold italic">beside the asking price.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              For every province in the current Avena corpus, the median new-build asking price per m² sits beside the average price per m² of housing sales authorised by a Spanish notary. The notary series is the CIEN statistical annex of the Consejo General del Notariado. Refreshed from those public workbooks each week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
              {view.coverage_note}
            </p>
            <p className="text-sm mb-8">
              <Link href="/official" className="text-primary hover:underline">Official statistics</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/official" className="text-primary hover:underline">Appraisal benchmark for the same provinces</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/towns" className="text-primary hover:underline">Municipal appraisal</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/supply" className="text-primary hover:underline">Supply pipeline</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/rents" className="text-primary hover:underline">Habitual rents</Link>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label={`Notary average, Spain, ${monthLabel(spain.period)}`} value={`${eur(spain.all.eur_m2)}/m²`} sub={spain.provisional ? 'Provisional. All housing, not new-build only.' : 'All housing, not new-build only.'} />
              <Stat label="Transactions, Spain" value={num(spain.all.transactions_nearest)} sub={spain.all.transactions_whole ? monthLabel(spain.period) : 'Provisional cell, rounded to the nearest transaction'} />
              <Stat label="Notary price, 1 year" value={pct(spain.all.eur_m2_yoy_pct)} sub="Published annual change, national" />
              <Stat label={`Foreign buyers, ${semesterLabel(view.foreign.period)}`} value={foreign?.peso_pct == null ? '–' : `${foreign.peso_pct.toFixed(1)}%`} sub={foreign ? `${num(foreign.transactions)} sales · ${eur(foreign.eur_m2)}/m²` : 'Not in this file'} />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provinces in the corpus</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Asking price, closing price, gap.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              The gap is how far the Avena median sits above or below the notary average, in percent. It is computed here. It is not published by the notaries. Asking prices are not transaction prices. Except for Murcia, the notary column is the autonomous community, and several provinces share it.
            </p>
            <div className="lg:hidden space-y-4">
              {compared.map((p) => (
                <article key={p.slug} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{p.geo_name}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{p.name}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena median asking" value={`${eur(p.avena_median_asking_eur_m2)}/m²`} note={`${p.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Notary average" value={p.notary ? `${eur(p.notary.eur_m2)}/m²` : '–'} note={p.period ? `${monthLabel(p.period)}${p.provisional ? ' · provisional' : ''}` : ''} />
                    <Field label="Asking vs closing" value={pct(p.asking_vs_closing_pct)} note={gapWord(p.asking_vs_closing_pct) || placeNote(p)} />
                    <Field label="Transactions" value={num(p.notary?.transactions_nearest)} note={placeNote(p)} />
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
                    <Th align="right">Notary €/m²</Th>
                    <Th align="right">Transactions</Th>
                    <Th align="right">Price, 1 year</Th>
                    <Th align="right">Gap</Th>
                  </tr>
                </thead>
                <tbody>
                  {compared.map((p) => (
                    <tr key={p.slug} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{p.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{p.listings.toLocaleString('en-GB')} listings · {placeNote(p)}</span>
                      </Td>
                      <Td align="right"><Mono strong>{p.avena_median_asking_eur_m2 == null ? '–' : eur(p.avena_median_asking_eur_m2)}</Mono></Td>
                      <Td align="right">
                        <Mono strong>{p.notary ? eur(p.notary.eur_m2) : '–'}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{monthLabel(p.period)}{p.provisional ? ' · provisional' : ''}</span>
                      </Td>
                      <Td align="right"><Mono>{num(p.notary?.transactions_nearest)}</Mono></Td>
                      <Td align="right"><Mono>{pct(p.notary?.eur_m2_yoy_pct)}</Mono></Td>
                      <Td align="right">
                        <Mono strong>{pct(p.asking_vs_closing_pct)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{gapWord(p.asking_vs_closing_pct)}</span>
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
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">The split the annex publishes</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Flats and houses. Not new and old.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              The workbook splits piso and unifamiliar. It does not split new dwellings and second-hand dwellings. The gap above uses the all-housing average. The flat column is not treated as a new-build price.
            </p>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Place</Th>
                    <Th align="right">All housing</Th>
                    <Th align="right">Flats</Th>
                    <Th align="right">Single-family</Th>
                  </tr>
                </thead>
                <tbody>
                  <SplitRow name="Spain" metric={spain.all} flat={spain.flat} house={spain.house} />
                  {communities.map((p) => (
                    <SplitRow key={p.geo_code} name={p.geo_name} metric={p.notary} flat={p.flat} house={p.house} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden space-y-4">
              <SplitCard name="Spain" metric={spain.all} flat={spain.flat} house={spain.house} />
              {communities.map((p) => (
                <SplitCard key={p.geo_code} name={p.geo_name} metric={p.notary} flat={p.flat} house={p.house} />
              ))}
            </div>
            {view.annual_spain && (
              <p className="mt-6 text-sm text-muted-foreground leading-relaxed max-w-3xl">
                {view.annual_year} annual average, Spain, all housing: {eur(view.annual_spain.all.eur_m2)}/m²
                {view.annual_spain.all.transactions != null ? `, ${num(view.annual_spain.all.transactions)} transactions` : ''}.
                {' '}{view.annual_spain.all.transactions_note} The annual price was checked against the average of that year&apos;s twelve monthly cells.
              </p>
            )}
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Buyers</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Foreign buyers, {semesterLabel(view.foreign.period)}.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              A separate annex, and an older period than {monthLabel(view.period)}. The share is the workbook&apos;s own weight. A residence row is that group&apos;s share of foreign buyers or of Spanish buyers, not a second share of all sales. Nationality is for Spain. It is not crossed with a province or a town, and it is not the gap above. The headline €/m² is the buyer table, which this workbook prints as a whole euro. The Spain row in the community table is that sheet&apos;s own national cell.
            </p>
            <div className="grid gap-4 md:grid-cols-3 mb-10">
              {view.foreign.buyers.filter((b) => b.key === 'foreign' || b.key === 'foreign_non_resident' || b.key === 'foreign_resident').map((b) => (
                <Stat key={b.key} label={b.name} value={num(b.transactions)} sub={`${b.peso_pct == null ? '' : `${b.peso_pct.toFixed(1)}% ${b.peso_basis === 'of_all_sales' ? 'of all sales' : 'of foreign buyers'}`} · ${eur(b.eur_m2)}/m²`} />
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto mb-10" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Community, foreign buyers</Th>
                    <Th align="right">Transactions</Th>
                    <Th align="right">€/m²</Th>
                    <Th align="right">Count, 1 year</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.foreign.communities.filter((c) => c.code === 'TOTAL' || communities.some((p) => p.geo_code === c.code)).map((c) => (
                    <tr key={c.code} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">{c.name}</span></Td>
                      <Td align="right"><Mono>{num(c.transactions)}</Mono></Td>
                      <Td align="right"><Mono strong>{eur(c.eur_m2)}</Mono></Td>
                      <Td align="right"><Mono>{pct(c.transactions_yoy_pct)}</Mono></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="font-serif text-2xl font-light text-foreground mb-4">Nationality, Spain.</h3>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Nationality</Th>
                    <Th align="right">Transactions</Th>
                    <Th align="right">Share of foreign sales</Th>
                    <Th align="right">€/m²</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.foreign.nationalities.map((row) => (
                    <tr key={row.name} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">{row.name}</span></Td>
                      <Td align="right"><Mono>{num(row.transactions)}</Mono></Td>
                      <Td align="right"><Mono>{row.nationality_share_pct == null ? '–' : `${row.nationality_share_pct.toFixed(1)}%`}</Mono></Td>
                      <Td align="right"><Mono strong>{row.eur_m2 == null ? '–' : eur(row.eur_m2)}</Mono></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              The annex also splits each nationality into residents and non-residents. Those two tables are in the JSON under nationalities_resident and nationalities_non_resident. They are not repeated here.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Towns</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">No municipal closing price.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-6">
              {view.summary.towns} towns are in the book. None has a notary price in the CIEN annex. A town is not given its province&apos;s price or its community&apos;s price, so the gap is blank. {publishedTowns.length} towns have at least 8 listings with a positive asking €/m², and that median is shown. {thinTowns} are below that floor, so the asking median is blank as well. The full list is in the JSON.
            </p>
            <div className="lg:hidden space-y-4">
              {publishedTowns.map((t) => (
                <article key={`${t.province_key}-${t.town}`} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{t.province}</div>
                  <h3 className="font-serif text-3xl font-light text-foreground mb-4">{t.town}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <Field label="Avena median asking" value={`${eur(t.avena_median_asking_eur_m2)}/m²`} note={`${t.listings.toLocaleString('en-GB')} listings`} />
                    <Field label="Notary €/m²" value="Not published" note="No gap" />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Town</Th>
                    <Th align="right">Avena asking</Th>
                    <Th align="right">Notary €/m²</Th>
                    <Th align="right">Gap</Th>
                  </tr>
                </thead>
                <tbody>
                  {publishedTowns.map((t) => (
                    <tr key={`${t.province_key}-${t.town}`} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{t.town}</span>
                        <span className="block text-[11px] text-muted-foreground">{t.province} · {t.listings.toLocaleString('en-GB')} listings</span>
                      </Td>
                      <Td align="right"><Mono strong>{eur(t.avena_median_asking_eur_m2)}</Mono></Td>
                      <Td align="right"><Mono>Not published</Mono></Td>
                      <Td align="right"><Mono>–</Mono></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Source and what this is not</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">The annex, the period, the licence.</h2>
            <ul className="max-w-3xl space-y-4 mb-10">
              {view.caveats.map((c) => (
                <li key={c} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{c}</li>
              ))}
            </ul>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <h3 className="font-serif text-2xl font-light text-foreground mb-2">CIEN housing annex</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {view.sources.housing.publisher}. {view.sources.housing.title}. File date {view.sources.housing.file_date}. Latest month {monthLabel(view.sources.housing.latest_period)}. Provisional months: {view.sources.housing.provisional_periods.join(', ')}.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{view.sources.housing.licence_note}</p>
                {view.sources.housing.source_line && <p className="text-sm text-muted-foreground leading-relaxed mb-3">{view.sources.housing.source_line}</p>}
                <a href={view.sources.housing.file_url} className="text-sm text-primary hover:underline break-all">{view.sources.housing.file_url.replace('https://', '')}</a>
              </div>
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <h3 className="font-serif text-2xl font-light text-foreground mb-2">CIEN foreign-buyer annex</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {view.sources.foreign_buyers.title}. File date {view.sources.foreign_buyers.file_date}. Period {semesterLabel(view.sources.foreign_buyers.period)}. {view.sources.foreign_buyers.geography}.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Retrieved {view.retrieved_at}. Weekly refresh: {`Saturday 04:20 UTC, .github/workflows/es-notary-refresh.yml. The job reads the newest annexes on the informes index. If a workbook stops parsing, the previous file stays.`}
                </p>
                <a href={view.sources.foreign_buyers.index_url} className="text-sm text-primary hover:underline break-all">{view.sources.foreign_buyers.index_url.replace('https://', '')}</a>
              </div>
            </div>
            {view.sources.housing.notes.length > 0 && (
              <div className="mt-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Notes printed in the workbook</div>
                <ul className="space-y-3 max-w-3xl">
                  {view.sources.housing.notes.map((note) => (
                    <li key={note.slice(0, 80)} className="text-sm text-muted-foreground leading-relaxed">{note}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Not in this file</div>
              <ul className="space-y-3 max-w-3xl">
                {view.omissions.map((o) => (
                  <li key={o.source} className="text-sm text-muted-foreground leading-relaxed">
                    <span className="text-foreground">{o.source}.</span> {o.reason}{' '}
                    {o.url && <a href={o.url} className="text-primary hover:underline">Source page</a>}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-8 text-xs text-muted-foreground leading-relaxed max-w-3xl">
              {view.method.asking_vs_closing} {view.method.transactions} {view.method.price} {view.method.foreign}
            </p>
            <p className="mt-4 text-sm">
              Machine-readable copy:{' '}
              <Link href="/api/v1/es-notary" className="text-primary hover:underline">/api/v1/es-notary</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SplitRow({ name, metric, flat, house }: { name: string; metric: NotaryMetric | null; flat: NotaryMetric | null; house: NotaryMetric | null }) {
  return (
    <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
      <Td><span className="text-sm text-foreground">{name}</span></Td>
      <Td align="right"><Mono strong>{metric ? `${eur(metric.eur_m2)} · ${num(metric.transactions_nearest)}` : '–'}</Mono></Td>
      <Td align="right"><Mono>{flat ? `${eur(flat.eur_m2)} · ${num(flat.transactions_nearest)}` : '–'}</Mono></Td>
      <Td align="right"><Mono>{house ? `${eur(house.eur_m2)} · ${num(house.transactions_nearest)}` : '–'}</Mono></Td>
    </tr>
  );
}

function SplitCard({ name, metric, flat, house }: { name: string; metric: NotaryMetric | null; flat: NotaryMetric | null; house: NotaryMetric | null }) {
  return (
    <article className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <h3 className="font-serif text-2xl font-light text-foreground mb-4">{name}</h3>
      <dl className="grid grid-cols-3 gap-3">
        <Field label="All housing" value={metric ? eur(metric.eur_m2) : '–'} note={metric ? num(metric.transactions_nearest) : ''} />
        <Field label="Flats" value={flat ? eur(flat.eur_m2) : '–'} note={flat ? num(flat.transactions_nearest) : ''} />
        <Field label="Houses" value={house ? eur(house.eur_m2) : '–'} note={house ? num(house.transactions_nearest) : ''} />
      </dl>
    </article>
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

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getEuHpi } from '@/lib/eu-hpi-view';
import {
  EUROSTAT_DOI,
  daySpan,
  latestQuarter,
  quarterBounds,
  type AskingDay,
  type HpiGeo,
  type HpiQuarter,
} from '@/lib/data-sources/eu-hpi';

const BORDER = 'hsl(var(--av-border) / 0.6)';
const CHART_QUARTERS = 16;
const TABLE_QUARTERS = 8;

export const metadata: Metadata = {
  title: 'Eurostat house price index · Avena Terminal',
  description:
    'Eurostat house price index prc_hpi_q (DOI 10.2908/PRC_HPI_Q) for Spain, Portugal, the EU and the euro area, new dwellings and total, beside Avena new-build asking prices per m².',
  alternates: { canonical: 'https://avenaterminal.com/europe/official' },
  openGraph: {
    title: 'Eurostat house price index · Avena Terminal',
    description: 'Official EU house price indices beside Avena new-build asking prices. Dataset prc_hpi_q.',
    url: 'https://avenaterminal.com/europe/official',
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
  const text = Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${text}%`;
}
function idx(n: number | null | undefined): string {
  if (n == null) return '–';
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function quarterLabel(p: string | null | undefined): string {
  if (!p) return '–';
  const m = /^(\d{4})-Q([1-4])$/.exec(p);
  return m ? `Q${m[2]} ${m[1]}` : p;
}
function flag(status: string | null | undefined): string {
  if (!status) return '';
  if (status === 'p') return 'provisional';
  return status;
}

function esMedian(day: AskingDay): number | null {
  return day.countries.find((c) => c.code === 'ES')?.median_asking_eur_m2 ?? null;
}

function tapeChart(days: AskingDay[]): { labels: string[]; points: (number | null)[] } {
  const rows = days.flatMap((d) => {
    if (d.during_declared_capture_gap) return [];
    const median = esMedian(d);
    if (median == null) return [];
    return [{ date: d.date, median }];
  });
  const labels: string[] = [];
  const points: (number | null)[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && daySpan(rows[i - 1].date, rows[i].date) > 1) {
      labels.push('');
      points.push(null);
    }
    labels.push(rows[i].date);
    points.push(rows[i].median);
  }
  return { labels, points };
}

export default function EuropeOfficialPage() {
  const view = getEuHpi();
  const order = ['ES', 'PT', 'EU27_2020', 'EA20'];
  const geos = [...view.geos].sort((a, b) => {
    const ia = order.indexOf(a.code);
    const ib = order.indexOf(b.code);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.code.localeCompare(b.code);
  });
  const es = geos.find((g) => g.code === 'ES') ?? geos[0];
  const latest = es ? latestQuarter(es) : null;
  const period = latest?.period ?? view.source.latest_period;
  const bounds = quarterBounds(period);
  const esTape = [...view.avena.days].reverse().find((d) => esMedian(d) != null);
  const esRow = esTape?.countries.find((c) => c.code === 'ES');
  const longGaps = view.asking_gaps.filter((g) => g.missing_days >= 3);
  const shortHoles = view.asking_gaps.filter((g) => g.missing_days < 3);
  const chartGeos = geos.filter((g) => order.includes(g.code));
  const history = es ? es.quarters.slice(-CHART_QUARTERS) : [];
  const tableQuarters = es ? es.quarters.slice(-TABLE_QUARTERS) : [];
  const tape = tapeChart(view.avena.days);
  const quarterChange = view.spain_asking_in_latest_quarter;
  const quarterDays = view.spain_asking_days_in_latest_quarter;

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Eurostat house price index and asking-price tape',
    description: view.avena.coverage_note,
    url: 'https://avenaterminal.com/europe/official',
    license: view.source.copyright_url,
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: [
      `https://doi.org/${EUROSTAT_DOI}`,
      view.source.browser_url,
      view.source.metadata_url,
    ],
    spatialCoverage: 'European Union',
    temporalCoverage: `${view.source.first_period}/${view.source.latest_period}`,
    dateModified: view.generated_at,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Eurostat house price index</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Eurostat house prices,<br />
              <span className="text-gold italic">beside the asking tape.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              House price index for Spain, Portugal, the EU and the euro area, from Eurostat dataset prc_hpi_q. New dwellings and total dwellings, the quarterly index and the annual rate of change, next to the median asking price per m² of the Avena new-build book. Refreshed from the public file each week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
              {view.avena.coverage_note}
            </p>
            <p className="text-sm mb-8">
              <Link href="/spain/official" className="text-primary hover:underline">Spain province benchmark</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/portugal" className="text-primary hover:underline">Portugal official statistics</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/supply" className="text-primary hover:underline">Spain supply</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/towns" className="text-primary hover:underline">Spain municipal appraisals</Link>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
              <Stat label={`Spain, new dwellings, ${quarterLabel(period)}`} value={idx(latest?.new_index ?? null)} sub={`Index, 2015=100${flag(latest?.new_index_status) ? ` · ${flag(latest?.new_index_status)}` : ''}`} />
              <Stat label={`Spain, new dwellings, 1 year`} value={pct(latest?.new_yoy_pct ?? null)} sub="Eurostat annual rate of change" />
              <Stat label={`Portugal, new dwellings, 1 year`} value={pct(geos.find((g) => g.code === 'PT') ? latestQuarter(geos.find((g) => g.code === 'PT')!).new_yoy_pct : null)} sub={quarterLabel(period)} />
              <Stat label={`EU, new dwellings, 1 year`} value={pct(geos.find((g) => g.code === 'EU27_2020') ? latestQuarter(geos.find((g) => g.code === 'EU27_2020')!).new_yoy_pct : null)} sub="EU27_2020" />
              <Stat label={`Euro area, new dwellings, 1 year`} value={pct(geos.find((g) => g.code === 'EA20') ? latestQuarter(geos.find((g) => g.code === 'EA20')!).new_yoy_pct : null)} sub="EA20" />
              <Stat label={`Avena Spain asking, ${esTape?.date ?? '–'}`} value={esRow ? `${eurM2(esRow.median_asking_eur_m2)}/m²` : '–'} sub={`${(esRow?.priced_listings ?? 0).toLocaleString('en-GB')} priced listings · asking, not a transaction`} />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Latest quarter · {quarterLabel(period)}</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Index and annual change.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              Eurostat updated this dataset {view.source.updated}. The index is 2015=100. The annual rate is the published RCH_A figure, not a ratio Avena computed. Avena’s column is the latest capture day on the asking tape, which is not this quarter.
            </p>

            <div className="lg:hidden space-y-4">
              {geos.map((g) => (
                <GeoCard key={g.code} geo={g} asking={avenaLatest(view.avena.days, g.code)} />
              ))}
            </div>

            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Geo</Th>
                    <Th align="right">New index</Th>
                    <Th align="right">New, 1 year</Th>
                    <Th align="right">Total index</Th>
                    <Th align="right">Total, 1 year</Th>
                    <Th align="right">Avena asking</Th>
                  </tr>
                </thead>
                <tbody>
                  {geos.map((g) => {
                    const q = latestQuarter(g);
                    const asking = g.role === 'avena_book' ? avenaLatest(view.avena.days, g.code) : null;
                    return (
                      <tr key={g.code} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td>
                          <span className="text-sm text-foreground">{g.name}</span>
                          <span className="block text-[11px] text-muted-foreground">{g.code} · {roleLabel(g.role)}</span>
                        </Td>
                        <Td align="right">
                          <Mono strong>{idx(q.new_index)}</Mono>
                          <span className="block text-[11px] text-muted-foreground">{flag(q.new_index_status) || '2015=100'}</span>
                        </Td>
                        <Td align="right"><Mono>{pct(q.new_yoy_pct)}</Mono></Td>
                        <Td align="right">
                          <Mono strong>{idx(q.total_index)}</Mono>
                          <span className="block text-[11px] text-muted-foreground">{flag(q.total_index_status) || '2015=100'}</span>
                        </Td>
                        <Td align="right"><Mono>{pct(q.total_yoy_pct)}</Mono></Td>
                        <Td align="right">
                          <Mono strong>{asking == null ? '–' : `${eurM2(asking.median)}/m²`}</Mono>
                          <span className="block text-[11px] text-muted-foreground">{asking == null ? 'No asking series' : asking.date}</span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {view.omissions.length > 0 && (
              <ul className="mt-6 space-y-2">
                {view.omissions.map((o) => (
                  <li key={o.geo} className="text-sm text-muted-foreground">{o.geo}. {o.reason}</li>
                ))}
              </ul>
            )}
            {view.avena.below_threshold.length > 0 && (
              <ul className="mt-6 space-y-2">
                {view.avena.below_threshold.map((row) => (
                  <li key={row.code} className="text-sm text-muted-foreground">{row.code}. {row.note}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Short history</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">New dwellings, annual rate of change.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-8">
              The chart is the last {CHART_QUARTERS} quarters. The file holds {es?.quarters.length ?? 0} quarters, from {quarterLabel(view.source.first_period)} to {quarterLabel(view.source.latest_period)}.
            </p>
            <LineChart
              series={chartGeos.map((g, i) => ({
                name: g.code,
                color: PALETTE[i % PALETTE.length],
                points: history.map((slot) => g.quarters.find((q) => q.period === slot.period)?.new_yoy_pct ?? null),
              }))}
              labels={history.map((q) => quarterLabel(q.period))}
              unit="% y/y, new dwellings"
            />
            <div className="mt-10 hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Quarter</Th>
                    {chartGeos.map((g) => <Th key={g.code} align="right">{g.code} new</Th>)}
                    {chartGeos.map((g) => <Th key={`${g.code}-t`} align="right">{g.code} total</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...tableQuarters].reverse().map((slot) => (
                    <tr key={slot.period} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td><span className="text-sm text-foreground">{quarterLabel(slot.period)}</span></Td>
                      {chartGeos.map((g) => {
                        const q = g.quarters.find((row) => row.period === slot.period);
                        return <Td key={g.code} align="right"><Mono>{pct(q?.new_yoy_pct ?? null)}</Mono></Td>;
                      })}
                      {chartGeos.map((g) => {
                        const q = g.quarters.find((row) => row.period === slot.period);
                        return <Td key={`${g.code}-t`} align="right"><Mono>{pct(q?.total_yoy_pct ?? null)}</Mono></Td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 lg:hidden space-y-4">
              {[...tableQuarters].reverse().map((slot) => (
                <article key={slot.period} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                  <h3 className="font-serif text-2xl font-light text-foreground mb-3">{quarterLabel(slot.period)}</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    {chartGeos.map((g) => {
                      const q = g.quarters.find((row) => row.period === slot.period);
                      return <Field key={g.code} label={`${g.code} new, 1 year`} value={pct(q?.new_yoy_pct ?? null)} />;
                    })}
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Asking prices</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Avena new-build asking €/m², Spain.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-8">
              Each point is the median asking price per m² of the committed listing book that day. The line breaks where a calendar day has no committed book. Declared capture-gap days are left out of the line. This is not a transaction index and it is not Eurostat.
            </p>
            <LineChart series={[{ name: 'Spain asking median', color: PALETTE[0], points: tape.points }]} labels={tape.labels} unit="EUR/m², asking" />
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              {view.current_book.note} Book on this deployment: {view.current_book.date ?? 'date not available'}, Spain median {eurM2(view.current_book.countries.find((c) => c.code === 'ES')?.median_asking_eur_m2 ?? null)}/m², unmapped {view.current_book.unmapped_listings.toLocaleString('en-GB')}.
            </p>
            {longGaps.length > 0 && (
              <div className="mt-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Days with no committed book</div>
                <ul className="space-y-2">
                  {longGaps.map((g) => (
                    <li key={g.start} className="text-sm text-muted-foreground">{g.start} to {g.end} · {g.missing_days.toLocaleString('en-GB')} days · not filled</li>
                  ))}
                </ul>
                {shortHoles.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">{shortHoles.length.toLocaleString('en-GB')} shorter holes are in the file and are not filled.</p>
                )}
              </div>
            )}
            <div className="mt-8 max-w-3xl text-sm text-muted-foreground leading-relaxed">
              {quarterChange ? (
                <p>
                  Inside {quarterLabel(quarterChange.period)} the Spain asking median moved from {eurM2(quarterChange.first_median)}/m² on {quarterChange.first_date} to {eurM2(quarterChange.last_median)}/m² on {quarterChange.last_date} ({pct(quarterChange.change_pct)}). {quarterChange.capture_days.toLocaleString('en-GB')} capture days. That is the change in the median of the book, not a Eurostat rate.
                </p>
              ) : (
                <p>
                  Eurostat’s latest quarter is {quarterLabel(period)} ({bounds.start} to {bounds.end}). Capture days with a Spain asking median inside that quarter: {quarterDays.length === 0 ? 'none' : quarterDays.map((d) => `${d.date} (${eurM2(d.median_asking_eur_m2)}/m², ${d.listings.toLocaleString('en-GB')} listings)`).join('; ')}. No quarterly asking change is calculated. The tape needs at least 8 such days spanning 28 days.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provenance</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Dataset, period, retrieval.</h2>
            <div className="rounded-sm border p-5 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <p className="text-sm text-foreground leading-relaxed">{view.source.licence_note}</p>
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
                prc_hpi_q · DOI {view.source.doi} · latest {quarterLabel(view.source.latest_period)} · retrieved {view.source.retrieved_at} · Eurostat updated {view.source.updated}
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              <li><a href={view.source.browser_url} className="text-primary hover:underline">Eurostat data browser, prc_hpi_q</a></li>
              <li><a href={`https://doi.org/${view.source.doi}`} className="text-primary hover:underline">DOI {view.source.doi}</a></li>
              <li><a href={view.source.metadata_url} className="text-primary hover:underline">Explanatory metadata, prc_hpi_inx</a></li>
              <li><a href={view.source.copyright_url} className="text-primary hover:underline">Eurostat copyright and reuse</a></li>
              <li><a href={view.source.api_url} className="text-primary hover:underline break-all">Dissemination API query used for this file</a></li>
            </ul>
            <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
              Machine-readable copy, including the asking tape:{' '}
              <Link href="/api/v1/eu-hpi" className="text-primary hover:underline">/api/v1/eu-hpi</Link>.
              Source file data/eu-hpi.json. Generated {view.generated_at}.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What these numbers are</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">An index, and an asking tape.</h2>
            <ul className="max-w-3xl space-y-4">
              {view.caveats.map((c) => (
                <li key={c} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{c}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function avenaLatest(days: AskingDay[], code: string): { date: string; median: number } | null {
  for (let i = days.length - 1; i >= 0; i--) {
    const row = days[i].countries.find((c) => c.code === code);
    if (row?.median_asking_eur_m2 != null) return { date: days[i].date, median: row.median_asking_eur_m2 };
  }
  return null;
}

function roleLabel(role: HpiGeo['role']): string {
  if (role === 'aggregate') return 'Eurostat aggregate';
  if (role === 'avena_book') return 'Avena listing book';
  return 'Eurostat only';
}

function GeoCard({ geo, asking }: { geo: HpiGeo; asking: { date: string; median: number } | null }) {
  const q: HpiQuarter = latestQuarter(geo);
  return (
    <article className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{geo.code}</div>
      <h3 className="font-serif text-3xl font-light text-foreground mb-4">{geo.name}</h3>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="New index" value={idx(q.new_index)} note={flag(q.new_index_status) || '2015=100'} />
        <Field label="New, 1 year" value={pct(q.new_yoy_pct)} note={flag(q.new_yoy_status) || quarterLabel(q.period)} />
        <Field label="Total index" value={idx(q.total_index)} note={flag(q.total_index_status) || '2015=100'} />
        <Field label="Total, 1 year" value={pct(q.total_yoy_pct)} note={flag(q.total_yoy_status) || quarterLabel(q.period)} />
        <Field label="Avena asking" value={asking == null ? '–' : `${eurM2(asking.median)}/m²`} note={asking == null ? 'No asking series' : asking.date} />
      </dl>
    </article>
  );
}

const PALETTE = ['hsl(42 85% 64%)', 'hsl(152 55% 55%)', 'hsl(38 14% 70%)', 'hsl(200 70% 62%)'];

function LineChart({ series, labels, unit }: { series: { name: string; color: string; points: (number | null)[] }[]; labels: string[]; unit: string }) {
  const W = 560;
  const H = 240;
  const P = { l: 52, r: 12, t: 12, b: 26 };
  const vals = series.flatMap((s) => s.points).filter((v): v is number => v != null);
  if (vals.length === 0 || labels.length < 2) return null;
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;
  const x = (i: number) => P.l + (i / (labels.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * (hi - lo));
  const fmtTick = (v: number) => (Math.abs(hi) >= 1000 ? `${Math.round(v).toLocaleString('en-GB')}` : Math.abs(hi) >= 20 ? Math.round(v).toString() : v.toFixed(1));
  const usable = labels.map((label, i) => ({ label, i })).filter((row) => row.label);
  const xTicks = usable.length < 2 ? [] : [usable[0], usable[Math.floor((usable.length - 1) / 2)], usable[usable.length - 1]];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Line chart, ${unit}`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="hsl(36 14% 22%)" strokeWidth={0.6} />
            <text x={P.l - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="hsl(38 14% 70%)" fontFamily="ui-monospace, monospace">{fmtTick(t)}</text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={tick.i} x={x(tick.i)} y={H - 8} textAnchor={tick.i === xTicks[0].i ? 'start' : tick.i === xTicks[xTicks.length - 1].i ? 'end' : 'middle'} fontSize={9} fill="hsl(38 14% 70%)" fontFamily="ui-monospace, monospace">{tick.label}</text>
        ))}
        {series.map((s) => {
          let d = '';
          let pen = false;
          s.points.forEach((v, i) => {
            if (v == null) { pen = false; return; }
            d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
            pen = true;
          });
          return <path key={s.name} d={d} fill="none" stroke={s.color} strokeWidth={1.6} strokeLinejoin="round" />;
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="inline-block h-[2px] w-4" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">· {unit}</span>
      </figcaption>
    </figure>
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

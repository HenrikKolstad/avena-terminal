import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { PrintButton } from '@/components/reports/PrintButton';
import { REGION_LABEL } from '@/lib/sellthrough-format';
import {
  DURATION_PLAIN,
  readListingDuration,
  type DurationGroup,
  type ListingDurationFile,
} from '@/lib/listing-duration';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Listing duration · Avena Terminal',
  description:
    'How long Spanish coastal new-build listings have been in the book, and how long delisted listings had been observed. Exits are delistings, not confirmed sales. Town, region and coast only.',
  alternates: { canonical: 'https://avenaterminal.com/data/listing-duration' },
};

const COLUMN_NOTES: Array<{ key: string; text: string }> = [
  { key: 'live', text: 'References present in the latest snapshot, or present only via _added when no snapshot exists.' },
  { key: 'liveLeftCensored', text: 'Live references whose first observed day is 5 August 2026, the start of the daily series. Their days listed are a lower bound.' },
  { key: 'liveArrivedInSeries', text: 'Live references first observed after 5 August 2026.' },
  { key: 'medianDaysListed', text: 'Median calendar days from the first observed day to the as-of date, for live references. Includes the left-censored ones. Blank below 5 measured references. Not days to sell.' },
  { key: 'medianDaysListedArrivedInSeries', text: 'The same median, using only references first observed after 5 August 2026. Blank below 5.' },
  { key: 'exits', text: 'References in the delisting ledger since 5 August 2026. A delisting is not a confirmed sale.' },
  { key: 'exitsInGap', text: 'Exits whose last snapshot is 13 October 2026, or whose ledger date falls inside 14–20 October 2026. The leaving day inside the gap is unknown.' },
  { key: 'exitsStillListed', text: 'Delisting-ledger references that are also in the latest snapshot. The ledger keeps the recorded absence. The listing was observed again later.' },
  { key: 'medianExitDays', text: 'Median calendar days from the first snapshot to the delisting date used for that reference. Days until delisting. Blank below 5. Not days to sell.' },
];

function formatDay(iso: string | null): string {
  if (!iso) return '–';
  const [year, month, day] = iso.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

function countText(value: number | null): string {
  if (value == null) return '–';
  return value.toLocaleString('en-GB');
}

function placeLabel(row: DurationGroup): string {
  if (!row.region) return row.label;
  return REGION_LABEL[row.region] ?? row.region;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
      <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
      {children}
    </span>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-serif text-3xl font-light text-foreground">{value}</div>
      {note ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function GroupCards({ rows, place }: { rows: DurationGroup[]; place: 'coast' | 'region' | 'town' }) {
  return (
    <div className="space-y-4 lg:hidden">
      {rows.map((row) => (
        <article key={row.key} className="border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {place === 'town' ? placeLabel(row) : place === 'coast' ? 'Coast' : 'Region'}
          </p>
          <h3 className="mt-2 font-serif text-2xl font-light text-foreground">{place === 'town' ? row.label : placeLabel(row)}</h3>
          <dl className="mt-3 space-y-1 text-sm text-foreground/85">
            <div className="flex justify-between gap-4"><dt>Live</dt><dd>{countText(row.live)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Median days listed</dt><dd>{countText(row.medianDaysListed)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Arrived in series</dt><dd>{countText(row.medianDaysListedArrivedInSeries)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Left-censored</dt><dd>{countText(row.liveLeftCensored)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Exits</dt><dd>{countText(row.exits)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Exit duration</dt><dd>{countText(row.medianExitDays)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Exits in the October gap</dt><dd>{countText(row.exitsInGap)}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function GroupTable({ rows, place }: { rows: DurationGroup[]; place: 'coast' | 'region' | 'town' }) {
  const name = place === 'town' ? 'Town' : place === 'coast' ? 'Coast' : 'Region';
  return (
    <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <table className="w-full text-sm">
        <caption className="sr-only">{name} listing duration. Days listed and days until delisting. Not days to sell.</caption>
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left">{name}</th>
            <th scope="col" className="px-3 py-2 text-right">Live</th>
            <th scope="col" className="px-3 py-2 text-right">Days listed</th>
            <th scope="col" className="px-3 py-2 text-right">Arrived in series</th>
            <th scope="col" className="px-3 py-2 text-right">Left-censored</th>
            <th scope="col" className="px-3 py-2 text-right">Exits</th>
            <th scope="col" className="px-3 py-2 text-right">Exit duration</th>
            <th scope="col" className="px-3 py-2 text-right">In gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
              <th scope="row" className="px-3 py-2 text-left font-normal">{place === 'town' ? row.label : placeLabel(row)}</th>
              <td className="px-3 py-2 text-right tabular">{countText(row.live)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.medianDaysListed)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.medianDaysListedArrivedInSeries)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.liveLeftCensored)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.exits)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.medianExitDays)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.exitsInGap)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ListingDurationPage() {
  const file: ListingDurationFile = readListingDuration();
  const coast = file.coast;
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: file.name,
    description: file.methodology[0],
    url: 'https://avenaterminal.com/data/listing-duration',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    temporalCoverage: `${file.seriesStart}/${file.asOf}`,
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/listing-duration' },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://avenaterminal.com/api/v1/listing-duration?format=csv' },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="print-root mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8">
        <Eyebrow>Data · duration</Eyebrow>
        <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
          Listing duration
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          How long listings stay in the book, and how long listings that left had been observed. An exit is a delisting, not a confirmed sale.
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Data as of {formatDay(file.asOf)} · Series from {formatDay(file.seriesStart)} · {file.refresh}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <PrintButton />
          <Link href="/api/v1/listing-duration" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">JSON</Link>
          <Link href="/api/v1/listing-duration?format=csv" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Town CSV</Link>
          <Link href="/api/v1/listing-duration?level=region&format=csv" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Region CSV</Link>
          <Link href="/data/absorption" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Listing absorption</Link>
          <Link href="/api/v1/liquidity" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Live _added observations</Link>
          <Link href="/methodology#listing-duration" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Methodology</Link>
        </div>

        <div className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
          <Stat label="Live listings" value={countText(coast.live)} note="In the latest snapshot. Listing references, not dwellings." />
          <Stat label="Median days listed" value={countText(coast.medianDaysListed)} note="From first observed day. Left-censored listings pull this toward the length of the series." />
          <Stat label="Arrived in series" value={countText(coast.medianDaysListedArrivedInSeries)} note={`${countText(coast.liveArrivedInSeries)} live listings first seen after ${formatDay(file.seriesStart)}.`} />
          <Stat label="Exit duration" value={countText(coast.medianExitDays)} note="Days until delisting. Not days to sell." />
        </div>

        <section className="mt-12 border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>01</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">How to read a duration</h2>
          <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/85">
            <p>{DURATION_PLAIN.observe}</p>
            <p>{DURATION_PLAIN.live}</p>
            <p>{DURATION_PLAIN.censored}</p>
            <p>{DURATION_PLAIN.exit}</p>
            <p>{DURATION_PLAIN.stamp}</p>
            <p>{DURATION_PLAIN.history}</p>
            <p>{DURATION_PLAIN.scope}</p>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {countText(file.coverage.liveLeftCensored)} of {countText(file.coverage.live)} live listings were already in the book on {formatDay(file.seriesStart)}. {countText(file.coverage.liveFromAddedOnly)} live listings had no snapshot and used _added. {countText(file.coverage.exitsStillListed)} delisting-ledger references were also in the latest snapshot. {countText(file.coverage.exitsUnmeasured)} exits had no snapshot on or before the delisting date, so they have no duration.
          </p>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>02</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Capture gap</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">{DURATION_PLAIN.gap}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-foreground/85">
            {file.knownGaps.map((gap) => (
              <li key={`${gap.from}-${gap.to}`}>{formatDay(gap.from)} – {formatDay(gap.to)}. No snapshot. Not filled in.</li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {countText(file.coverage.exitsInGap)} exits are marked against that gap. Their duration stops on the last snapshot, not on a day inside the gap.
          </p>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>03</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Coast</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {coast.label}. One row for the whole covered coast. History from {formatDay(file.seriesStart)} to {formatDay(file.asOf)} is short.
          </p>
          <GroupCards rows={[coast]} place="coast" />
          <GroupTable rows={[coast]} place="coast" />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>04</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Regions</h2>
          <GroupCards rows={file.regions} place="region" />
          <GroupTable rows={file.regions} place="region" />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>05</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Towns</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {DURATION_PLAIN.floor} Sorted by live listings plus exits. A thin town stays in the table with a blank median.
          </p>
          <GroupCards rows={file.towns} place="town" />
          <GroupTable rows={file.towns} place="town" />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>06</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">What a column means</h2>
          <dl className="space-y-4 text-sm leading-relaxed text-foreground/85">
            {COLUMN_NOTES.map((note) => (
              <div key={note.key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{note.key}</dt>
                <dd className="mt-1">{note.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">{DURATION_PLAIN.liquidity}</p>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>07</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Methodology</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/85">
            {file.methodology.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}

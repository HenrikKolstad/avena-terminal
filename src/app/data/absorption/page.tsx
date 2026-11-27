import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { REGION_LABEL } from '@/lib/sellthrough-format';
import {
  ABSORPTION_PLAIN,
  readAbsorption,
  weekOverlapsKnownGap,
  type AbsorptionFile,
} from '@/lib/absorption';
import type { GroupStats, WeekStats } from '@/lib/sellthrough';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Listing absorption · Avena Terminal',
  description:
    'How fast Spanish coastal new-build listings leave the book, how much asking prices are being cut, and months of supply. Exits are delistings, not confirmed sales. Town, region and coast only.',
  alternates: { canonical: 'https://avenaterminal.com/data/absorption' },
};

const COLUMN_NOTES: Array<{ key: string; text: string }> = [
  { key: 'live', text: 'Listings present in the latest snapshot.' },
  { key: 'exitsWindow', text: 'Listings that left the feed during the trailing window. Delistings: sold out or withdrawn. Not confirmed sales.' },
  { key: 'exitsSinceStart', text: 'Listings that left the feed at any point since 5 August 2026. Same meaning as a window exit.' },
  { key: 'newWindow', text: 'Listings first observed during the trailing window.' },
  { key: 'absorptionPct30d', text: 'Exits in the window, scaled to 30 days, divided by live listings plus window exits.' },
  { key: 'monthsOfSupply', text: 'Live listings divided by exits per 30 days. Blank when the window has no exits.' },
  { key: 'cutsWindow', text: 'Asking-price cuts in the window. A cut is a lower asking price on a later snapshot.' },
  { key: 'risesWindow', text: 'Asking-price rises in the window.' },
  { key: 'cutBreadthPct', text: 'Share of listings that were live or left during the window and had at least one asking-price cut in the window.' },
  { key: 'medianCutPct', text: 'Median size of those cuts. Negative means a lower asking price.' },
  { key: 'medianRisePct', text: 'Median size of the rises.' },
  { key: 'medianPm2', text: 'Median asking price per square metre of listings still in the latest snapshot, where the feed has an area.' },
  { key: 'medianDaysListed', text: 'Median days a live listing has been seen, from the first day Avena observed it. Not days to sell. Older listings are understated, and an exit has no sale date.' },
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

function rateText(value: number | null): string {
  if (value == null) return '–';
  return `${value.toFixed(1)}%`;
}

function signedText(value: number | null): string {
  if (value == null) return '–';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function monthsText(value: number | null): string {
  if (value == null) return '–';
  return value.toFixed(1);
}

function placeLabel(row: GroupStats): string {
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

function GroupCards({ rows, place }: { rows: GroupStats[]; place: 'coast' | 'region' | 'town' }) {
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
            <div className="flex justify-between gap-4"><dt>Exits, 30 days</dt><dd>{countText(row.exitsWindow)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Exits since start</dt><dd>{countText(row.exitsSinceStart)}</dd></div>
            <div className="flex justify-between gap-4"><dt>New, 30 days</dt><dd>{countText(row.newWindow)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Absorption</dt><dd>{rateText(row.absorptionPct30d)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Months of supply</dt><dd>{monthsText(row.monthsOfSupply)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Cuts / median cut</dt><dd>{countText(row.cutsWindow)} / {signedText(row.medianCutPct)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Days seen</dt><dd>{countText(row.medianDaysListed)}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function GroupTable({ rows, place }: { rows: GroupStats[]; place: 'coast' | 'region' | 'town' }) {
  const name = place === 'town' ? 'Town' : place === 'coast' ? 'Coast' : 'Region';
  return (
    <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <table className="w-full text-sm">
        <caption className="sr-only">{name} listing absorption, asking-price cuts and months of supply</caption>
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-left">{name}</th>
            {place === 'town' ? <th scope="col" className="px-3 py-2 text-left">Region</th> : null}
            <th scope="col" className="px-3 py-2 text-right">Live</th>
            <th scope="col" className="px-3 py-2 text-right">Exits 30d</th>
            <th scope="col" className="px-3 py-2 text-right">Exits since start</th>
            <th scope="col" className="px-3 py-2 text-right">New 30d</th>
            <th scope="col" className="px-3 py-2 text-right">Absorption</th>
            <th scope="col" className="px-3 py-2 text-right">Months</th>
            <th scope="col" className="px-3 py-2 text-right">Cuts</th>
            <th scope="col" className="px-3 py-2 text-right">Median cut</th>
            <th scope="col" className="px-3 py-2 text-right">Days seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t align-top" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
              <th scope="row" className="px-3 py-2 text-left font-normal">{place === 'town' ? row.label : placeLabel(row)}</th>
              {place === 'town' ? <td className="px-3 py-2">{placeLabel(row)}</td> : null}
              <td className="px-3 py-2 text-right tabular">{countText(row.live)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.exitsWindow)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.exitsSinceStart)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.newWindow)}</td>
              <td className="px-3 py-2 text-right tabular">{rateText(row.absorptionPct30d)}</td>
              <td className="px-3 py-2 text-right tabular">{monthsText(row.monthsOfSupply)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.cutsWindow)}</td>
              <td className="px-3 py-2 text-right tabular">{signedText(row.medianCutPct)}</td>
              <td className="px-3 py-2 text-right tabular">{countText(row.medianDaysListed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyChart({ weeks, gaps }: { weeks: WeekStats[]; gaps: AbsorptionFile['knownGaps'] }) {
  const width = 720;
  const height = 220;
  const pad = { l: 36, r: 12, t: 16, b: 32 };
  const max = Math.max(1, ...weeks.map((week) => week.exits));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const slot = weeks.length ? innerW / weeks.length : innerW;
  return (
    <figure className="mt-8">
      <figcaption className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Weekly delistings. A muted bar overlaps the declared capture gap. Those exits are counted. The missing days are not filled in.
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="w-full" aria-labelledby="absorption-weekly-title">
        <title id="absorption-weekly-title">Weekly delistings since 5 August 2026</title>
        <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="currentColor" strokeOpacity="0.25" />
        {weeks.map((week, index) => {
          const barH = (week.exits / max) * innerH;
          const x = pad.l + index * slot + slot * 0.2;
          const y = height - pad.b - barH;
          const gap = weekOverlapsKnownGap(week.week, gaps);
          return (
            <g key={week.week}>
              <rect x={x} y={y} width={slot * 0.6} height={barH} className="fill-primary" opacity={gap ? 0.35 : 0.9} />
              <text x={x + slot * 0.3} y={height - 10} textAnchor="middle" className="fill-current text-[9px]" fill="currentColor">
                {week.week.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export default function AbsorptionPage() {
  const file = readAbsorption();
  const coast = file.coast;
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: file.name,
    description: file.methodology[0],
    url: 'https://avenaterminal.com/data/absorption',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    temporalCoverage: `${file.seriesStart}/${file.asOf}`,
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/absorption' },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://avenaterminal.com/api/v1/absorption?format=csv' },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8">
        <Eyebrow>Data · absorption</Eyebrow>
        <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
          Listing absorption
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          How fast listings leave the book, where asking prices are being cut, and how many months of listings are still on offer.
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Data as of {formatDay(file.asOf)} · Window {formatDay(file.windowStart)} – {formatDay(file.asOf)} · Series from {formatDay(file.seriesStart)}
        </p>
        <p className="mt-4 flex flex-wrap gap-4">
          <Link href="/api/v1/absorption" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">JSON</Link>
          <Link href="/api/v1/absorption?format=csv" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Town CSV</Link>
          <Link href="/data/price-index" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Same-unit price index</Link>
          <Link href="/spain/short-let-rules" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Short-let rules</Link>
          <Link href="/data/vintages" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Weekly vintages</Link>
          <Link href="/data/bulk" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Bulk files</Link>
          <Link href="/methodology#absorption" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Methodology</Link>
        </p>

        <div className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
          <Stat label="Live listings" value={countText(coast.live)} note="In the latest snapshot. Listing references, not dwellings." />
          <Stat label="Exits, 30 days" value={countText(coast.exitsWindow)} note="Left the feed. Delistings, not confirmed sales." />
          <Stat label="Absorption" value={rateText(coast.absorptionPct30d)} note="Exits per 30 days, over live listings plus window exits." />
          <Stat label="Months of supply" value={monthsText(coast.monthsOfSupply)} note="Live listings divided by exits per 30 days." />
        </div>

        <section className="mt-12 border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>01</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">How to read an exit</h2>
          <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/85">
            <p>{ABSORPTION_PLAIN.listing}</p>
            <p>{ABSORPTION_PLAIN.exit}</p>
            <p>{ABSORPTION_PLAIN.price}</p>
            <p>{ABSORPTION_PLAIN.days}</p>
            <p>{ABSORPTION_PLAIN.scope}</p>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Asking-price cuts in the window: {countText(coast.cutsWindow)}. Rises: {countText(coast.risesWindow)}. Median cut: {signedText(coast.medianCutPct)}. Share of listings with a cut: {rateText(coast.cutBreadthPct)}. Exits whose leaving day falls inside the October gap: {countText(file.coverage.exitsInGap)}.
          </p>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>02</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Capture gap</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">{ABSORPTION_PLAIN.gap}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-foreground/85">
            {file.knownGaps.map((gap) => (
              <li key={`${gap.from}-${gap.to}`}>{formatDay(gap.from)} – {formatDay(gap.to)}. No snapshot. Not filled in.</li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {countText(file.coverage.listingsObserved)} listings observed since the series start, {countText(file.coverage.live)} still live, across {countText(file.coverage.towns)} towns. Development names are not in this file. The count of developments behind the listings is {countText(file.coverage.developments)}.
          </p>
          <WeeklyChart weeks={file.weekly} gaps={file.knownGaps} />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>03</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Coast</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {coast.label}. One row for the whole covered coast. The same fields are on the region and town rows.
          </p>
          <GroupCards rows={[coast]} place="coast" />
          <GroupTable rows={[coast]} place="coast" />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>04</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Regions</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Sorted by listings still live. Absorption uses the same 30-day window as the coast.
          </p>
          <GroupCards rows={file.regions} place="region" />
          <GroupTable rows={file.regions} place="region" />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>05</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Towns</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Every town in the captured book. Sorted by listings seen since the series start. A thin town is still shown: the count is the count. CSV of these rows is the town download.
          </p>
          <GroupCards rows={file.towns} place="town" />
          <GroupTable rows={file.towns} place="town" />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>06</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Week by week</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Weeks start on Monday. An exit is dated the day after the listing was last seen. A week that overlaps the declared gap is marked. days observed is the count of calendar days in that week, from the series start through the as-of date, that are outside the gap. It is not a count of captured snapshots, and it is not days to sell.
          </p>
          <div className="space-y-4 lg:hidden">
            {file.weekly.map((week) => (
              <article key={week.week} className="border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {formatDay(week.week)}{weekOverlapsKnownGap(week.week, file.knownGaps) ? ' · overlaps the gap' : ''}
                </p>
                <dl className="mt-3 space-y-1 text-sm text-foreground/85">
                  <div className="flex justify-between gap-4"><dt>Exits</dt><dd>{countText(week.exits)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>New listings</dt><dd>{countText(week.newListings)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Cuts / rises</dt><dd>{countText(week.cuts)} / {countText(week.rises)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Median cut</dt><dd>{signedText(week.medianCutPct)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <caption className="sr-only">Weekly delistings, new listings and asking-price cuts</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left">Week</th>
                  <th scope="col" className="px-3 py-2 text-right">Exits</th>
                  <th scope="col" className="px-3 py-2 text-right">New</th>
                  <th scope="col" className="px-3 py-2 text-right">Cuts</th>
                  <th scope="col" className="px-3 py-2 text-right">Rises</th>
                  <th scope="col" className="px-3 py-2 text-right">Median cut</th>
                  <th scope="col" className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {file.weekly.map((week) => (
                  <tr key={week.week} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <th scope="row" className="px-3 py-2 text-left font-normal font-mono text-xs">{formatDay(week.week)}</th>
                    <td className="px-3 py-2 text-right tabular">{countText(week.exits)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(week.newListings)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(week.cuts)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(week.rises)}</td>
                    <td className="px-3 py-2 text-right tabular">{signedText(week.medianCutPct)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{weekOverlapsKnownGap(week.week, file.knownGaps) ? 'Overlaps the capture gap' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>07</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">What a column means</h2>
          <dl className="space-y-4 text-sm leading-relaxed text-foreground/85">
            {COLUMN_NOTES.map((note) => (
              <div key={note.key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{note.key}</dt>
                <dd className="mt-1">{note.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>08</Eyebrow>
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

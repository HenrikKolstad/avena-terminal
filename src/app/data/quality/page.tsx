import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import {
  DATA_QUALITY_CAVEATS,
  gradeDataFreshness,
  priceIndexDrift,
  readDataQuality,
  type CaptureDay,
  type DataQualityFile,
  type FieldStat,
} from '@/lib/data-quality';
import { readPriceIndex } from '@/lib/price-index';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Data quality · Avena Terminal',
  description:
    'Capture coverage, field completeness, place coverage, listing churn and same-unit price-change checks for Avena listing data. Missing days are listed and not filled in. History starts 5 August 2026.',
  alternates: { canonical: 'https://avenaterminal.com/data/quality' },
};

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

function shareText(value: string | null): string {
  if (value == null) return '–';
  const number = Number(value);
  if (!Number.isFinite(number)) return '–';
  return `${(number * 100).toFixed(2)}%`;
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

function CaptureChart({ days }: { days: CaptureDay[] }) {
  const width = 720;
  const height = 220;
  const pad = { l: 44, r: 12, t: 16, b: 28 };
  const counts = days.flatMap((day) => (day.listings == null ? [] : [day.listings]));
  if (counts.length < 2) return null;
  const max = Math.max(...counts) * 1.08;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = (index: number) => pad.l + (days.length === 1 ? innerW / 2 : (index / (days.length - 1)) * innerW);
  const y = (value: number) => pad.t + ((max - value) / max) * innerH;
  const pieces: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length >= 2) pieces.push(current.join(' '));
    current = [];
  };
  days.forEach((day, index) => {
    if (day.listings == null) {
      flush();
      return;
    }
    current.push(`${x(index).toFixed(1)},${y(day.listings).toFixed(1)}`);
  });
  flush();
  const yTicks = [0, Math.round(max / 2), Math.max(...counts)];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" className="w-full" aria-labelledby="capture-chart-title">
      <title id="capture-chart-title">Listings captured per day. Missing days are a break in the line.</title>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} stroke="currentColor" strokeOpacity="0.12" />
          <text x={pad.l - 8} y={y(tick) + 3} textAnchor="end" className="fill-current text-[10px]" opacity="0.6">
            {tick.toLocaleString('en-GB')}
          </text>
        </g>
      ))}
      {pieces.map((points) => (
        <polyline key={points.slice(0, 24)} fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
      ))}
    </svg>
  );
}

function FieldRow({ stat }: { stat: FieldStat }) {
  return (
    <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
      <td className="px-3 py-2 text-sm text-foreground">{stat.label}</td>
      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(stat.present)}</td>
      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(stat.listings)}</td>
      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{shareText(stat.share)}</td>
      <td className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">{stat.note}</td>
    </tr>
  );
}

export default function DataQualityPage() {
  const file: DataQualityFile = readDataQuality();
  const freshness = gradeDataFreshness(file, new Date());
  let drift: string | null = null;
  try {
    drift = priceIndexDrift(file, readPriceIndex().data_as_of);
  } catch {
    drift = null;
  }
  const pdf = file.completeness.fields.find((stat) => stat.id === 'brochure_pdf');
  const plot = file.completeness.fields.find((stat) => stat.id === 'plot_m2');
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: file.name,
    description: file.method,
    url: 'https://avenaterminal.com/data/quality',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    temporalCoverage: `${file.series_start}/${file.capture.to}`,
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/data-quality' },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://avenaterminal.com/api/v1/data-quality?format=csv' },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8">
        <Eyebrow>Data · quality</Eyebrow>
        <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
          Data quality
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          How complete, fresh and consistent the listing book is. Counts come from the capture itself. A day with no snapshot is listed and left blank.
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Ledger {formatDay(file.capture.from)} – {formatDay(file.capture.to)} · Book {countText(file.book.listings)} listings · Feed {formatDay(file.book.feed_generated_date)}
        </p>
        <p className="mt-4 flex flex-wrap gap-4">
          <Link href="/api/v1/data-quality" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">JSON</Link>
          <Link href="/api/v1/data-quality?format=csv" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">CSV</Link>
          <Link href="/api/health" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Live health</Link>
          <Link href="/data/vintages" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Weekly vintages</Link>
          <Link href="/data/price-index" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Same-unit price index</Link>
          <Link href="/data/absorption" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Listing absorption</Link>
          <Link href="/api/v1/open-dataset" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Open dataset</Link>
        </p>

        <div className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
          <Stat
            label="Days captured"
            value={`${countText(file.capture.days_captured)} / ${countText(file.capture.calendar_days)}`}
            note={`${formatDay(file.capture.from)} through ${formatDay(file.capture.to)}.`}
          />
          <Stat
            label="Missing days"
            value={countText(file.capture.days_missing)}
            note={file.capture.missing_outside_declared_gap.length ? 'Includes days outside the declared gap.' : 'All of them sit inside the declared capture gap.'}
          />
          <Stat
            label="Current book"
            value={countText(file.book.listings)}
            note={file.book.agrees_with_feed_meta && file.book.agrees_with_latest_snapshot ? 'Matches the feed file and the latest snapshot day.' : 'The feed file and the latest snapshot day do not all match. See the book line above.'}
          />
          <Stat
            label="Same-unit pass share"
            value={shareText(file.same_unit.pass_share)}
            note={`${countText(file.same_unit.counts.passed)} of ${countText(file.same_unit.price_changes)} weekly price changes. Through ${formatDay(file.same_unit.through)}.`}
          />
        </div>

        <section className="mt-12 border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>01</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">What is counted</h2>
          <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/85">
            {file.method.split(/(?<=\.)\s+(?=[A-Z])/).map((sentence) => (
              <p key={sentence}>{sentence}</p>
            ))}
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>02</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Daily capture</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">
            {countText(file.capture.days_captured)} days have a snapshot, from {countText(file.capture.min_listings)} to {countText(file.capture.max_listings)} listings.
            {file.capture.days_missing === 0
              ? ' No calendar day in the span is missing.'
              : ` ${countText(file.capture.days_missing)} calendar days have no row. The line breaks there. The missing counts are blank.`}
          </p>
          <div className="mt-6 text-foreground">
            <CaptureChart days={file.capture.days} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">The axis starts at zero. Day-to-day movement is small next to the level. A break is a day with no capture.</p>
          <h3 className="mt-8 font-serif text-xl font-light text-foreground">Missing capture days</h3>
          {file.capture.missing_dates.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/85">None in this span.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm text-foreground/85">
              {file.capture.missing_dates.map((date) => (
                <li key={date}>
                  {formatDay(date)}
                  {file.capture.days.find((day) => day.date === date)?.in_declared_gap ? ' · inside the declared capture gap' : ' · outside the declared capture gap'}
                  {' · no listing count'}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {file.known_gaps.map((gap) => gap.note).join(' ')}
            {file.capture.missing_outside_declared_gap.length === 0
              ? ' Every missing day in this file is inside that gap.'
              : ` Missing outside the gap: ${file.capture.missing_outside_declared_gap.map(formatDay).join(', ')}.`}
          </p>
          <h3 className="mt-8 font-serif text-xl font-light text-foreground">Days with a snapshot and no listing-file commit</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/85">{file.feed_file_gaps.definition}</p>
          {file.feed_file_gaps.price_snapshot_present.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">None. Every feed-file gap in this span is also a day with no snapshot.</p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">
              {file.feed_file_gaps.price_snapshot_present.map(formatDay).join(', ')}.
              These days are in the vintage gap list and still have a price snapshot. They are not missing from the daily series above.
            </p>
          )}
          <div className="mt-6 max-h-[28rem] overflow-auto border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-background font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Date</th>
                  <th className="px-3 py-2 text-right font-normal">Listings</th>
                  <th className="px-3 py-2 font-normal">Note</th>
                </tr>
              </thead>
              <tbody>
                {file.capture.days.map((day) => (
                  <tr key={day.date} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <td className="px-3 py-1.5 font-mono text-xs">{day.date}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{countText(day.listings)}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {day.captured ? '' : day.in_declared_gap ? 'Missing · declared gap' : 'Missing'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>03</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Field completeness</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-foreground/85">
            Current listing book, {countText(file.completeness.listings)} rows, feed generated {formatDay(file.book.feed_generated_date)}.
            {pdf ? ` PDF or brochure links: ${countText(pdf.present)}.` : ''}
            {plot ? ` Plot size: ${shareText(plot.share)}.` : ''}
          </p>
          <div className="overflow-x-auto border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full min-w-[720px] text-left">
              <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Field</th>
                  <th className="px-3 py-2 text-right font-normal">Present</th>
                  <th className="px-3 py-2 text-right font-normal">Book</th>
                  <th className="px-3 py-2 text-right font-normal">Share</th>
                  <th className="px-3 py-2 font-normal">Rule</th>
                </tr>
              </thead>
              <tbody>
                {file.completeness.fields.map((stat) => <FieldRow key={stat.id} stat={stat} />)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>04</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Coverage by province and town</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Share of the current book. {countText(file.coverage.provinces.length)} provinces, {countText(file.coverage.towns.length)} towns.
          </p>
          <div className="overflow-x-auto border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-left">
              <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Province</th>
                  <th className="px-3 py-2 text-right font-normal">Listings</th>
                  <th className="px-3 py-2 text-right font-normal">Share</th>
                </tr>
              </thead>
              <tbody>
                {file.coverage.provinces.map((place) => (
                  <tr key={place.name} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <td className="px-3 py-2 text-sm">{place.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(place.listings)}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{shareText(place.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 max-h-[28rem] overflow-auto border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-background font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Town</th>
                  <th className="px-3 py-2 font-normal">Province</th>
                  <th className="px-3 py-2 text-right font-normal">Listings</th>
                  <th className="px-3 py-2 text-right font-normal">Share</th>
                </tr>
              </thead>
              <tbody>
                {file.coverage.towns.map((place) => (
                  <tr key={`${place.name}-${place.province}`} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <td className="px-3 py-1.5 text-sm">{place.name}</td>
                    <td className="px-3 py-1.5 text-sm text-muted-foreground">{place.province}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{countText(place.listings)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{shareText(place.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>05</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">New and delisted listings</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-foreground/85">{file.churn.definition}</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Since {formatDay(file.series_start)}: {countText(file.churn.new_listings)} new, {countText(file.churn.delistings)} delisted. Absorption file as of {formatDay(file.churn.as_of)}.
          </p>
          <div className="overflow-x-auto border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-left">
              <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Week starting</th>
                  <th className="px-3 py-2 text-right font-normal">New</th>
                  <th className="px-3 py-2 text-right font-normal">Delisted</th>
                  <th className="px-3 py-2 font-normal">Note</th>
                </tr>
              </thead>
              <tbody>
                {file.churn.weeks.map((week) => (
                  <tr key={week.week} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <td className="px-3 py-2 font-mono text-xs">{week.week}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(week.new_listings)}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(week.delistings)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{week.overlaps_declared_gap ? 'Overlaps the capture gap' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>06</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Same-unit price changes</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">{file.same_unit.grain} Through {formatDay(file.same_unit.through)}. Reconciled to the asking-price index as of {formatDay(file.same_unit.price_index_as_of)}.</p>
          {drift ? <p className="mt-3 max-w-3xl text-sm text-foreground/85">{drift}</p> : null}
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Passed: {countText(file.same_unit.counts.passed)} ({countText(file.same_unit.counts.passed_under_25)} under 25%, {countText(file.same_unit.counts.passed_25_to_50)} from 25% to under 50%, {countText(file.same_unit.counts.passed_over_50)} at 50% or more).
            Held because the specification changed: {countText(file.same_unit.counts.held_spec)}.
            Held because a jump of 25% or more was not verified: {countText(file.same_unit.counts.held_large)}.
            Specification changes with no price change: {countText(file.same_unit.counts.spec_only)}. Those are excluded from the pass share.
            Daily moves file, passed changes only: {countText(file.sources.daily_passed_moves.rows)}. {file.sources.daily_passed_moves.note}
          </p>
          <div className="mt-6 overflow-x-auto border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-left">
              <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Capture</th>
                  <th className="px-3 py-2 font-normal">Compared to</th>
                  <th className="px-3 py-2 text-right font-normal">Passed</th>
                  <th className="px-3 py-2 text-right font-normal">Spec changed</th>
                  <th className="px-3 py-2 text-right font-normal">Large, held</th>
                  <th className="px-3 py-2 font-normal">Note</th>
                </tr>
              </thead>
              <tbody>
                {file.same_unit.weeks.map((week) => (
                  <tr key={week.capture_date} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <td className="px-3 py-2 font-mono text-xs">{week.capture_date}</td>
                    <td className="px-3 py-2 font-mono text-xs">{week.compared_to}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(week.passed)}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(week.held_spec)}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{countText(week.held_large)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{week.spans_declared_gap ? 'Crosses the capture gap' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>07</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Freshness</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">{file.freshness.note}</p>
          <p className="mt-3 text-sm text-foreground/85">Feed: {freshness.feed.detail}. Graded {freshness.graded_at.slice(0, 16).replace('T', ' ')} UTC.</p>
          <p className="mt-2 text-sm text-foreground/85">Capture: {freshness.capture.detail}. {file.freshness.capture_source}</p>
          <p className="mt-4">
            <Link href="/api/health" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Live engine status →</Link>
          </p>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>08</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Limits</h2>
          <ul className="max-w-3xl space-y-3 text-sm leading-relaxed text-foreground/85">
            {DATA_QUALITY_CAVEATS.map((caveat) => <li key={caveat}>{caveat}</li>)}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}

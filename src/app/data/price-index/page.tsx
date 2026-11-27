import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import {
  PRICE_INDEX_DEFINITIONS,
  readPriceIndex,
  type PriceIndexRow,
} from '@/lib/price-index';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Same-unit asking-price index · Avena Terminal',
  description:
    'Weekly chain of same-unit asking-price changes for Spanish coastal new-builds, from Avena captures. Base 100 on the first closed week. Capture gaps are marked and not filled in.',
  alternates: { canonical: 'https://avenaterminal.com/data/price-index' },
};

function formatDay(iso: string | null): string {
  if (!iso) return '–';
  const [year, month, day] = iso.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

function indexText(value: number | null): string {
  if (value == null) return '–';
  return value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function changeText(value: number | null): string {
  if (value == null) return '–';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function shareText(value: string | null): string {
  if (value == null) return '–';
  const number = Number(value);
  if (!Number.isFinite(number)) return '–';
  return `${(number * 100).toFixed(1)}%`;
}

function countText(value: number | null): string {
  if (value == null) return '–';
  return value.toLocaleString('en-GB');
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

function noteFor(row: PriceIndexRow): string {
  if (row.status === 'gap') return 'Gap. No value.';
  if (row.suppressed) return 'Suppressed.';
  if (row.spans_declared_capture_gap) return 'Covers a capture gap.';
  if (row.new_segment && row.status !== 'base') return 'New segment.';
  if (row.week_gap_dates.length) return 'Uncaptured days in the week.';
  return '';
}

function CoastChart({ rows }: { rows: PriceIndexRow[] }) {
  const width = 720;
  const height = 240;
  const pad = { l: 48, r: 12, t: 16, b: 32 };
  const values = rows.flatMap((row) => (row.index == null ? [] : [row.index]));
  if (values.length < 2) return null;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1) {
    min -= 0.5;
    max += 0.5;
  }
  const slack = (max - min) * 0.12;
  min -= slack;
  max += slack;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = (index: number) => pad.l + (rows.length === 1 ? innerW / 2 : (index / (rows.length - 1)) * innerW);
  const y = (value: number) => pad.t + ((max - value) / (max - min)) * innerH;
  const pieces: Array<{ points: string; dashed: boolean }> = [];
  let current: string[] = [];
  const flush = (dashed: boolean) => {
    if (current.length >= 2) pieces.push({ points: current.join(' '), dashed });
    current = [];
  };
  rows.forEach((row, index) => {
    if (row.index == null) {
      flush(false);
      return;
    }
    const point = `${x(index).toFixed(1)},${y(row.index).toFixed(1)}`;
    if (current.length && row.spans_declared_capture_gap) {
      const previous = current[current.length - 1];
      flush(false);
      pieces.push({ points: `${previous} ${point}`, dashed: true });
      current = [point];
      return;
    }
    current.push(point);
  });
  flush(false);

  return (
    <figure className="mt-8">
      <figcaption className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Coast index. A dashed segment covers a declared capture gap. It is one observed step, not a filled week.
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="w-full" aria-labelledby="coast-chart-title">
        <title id="coast-chart-title">Coast same-unit asking-price index by week</title>
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke="currentColor" strokeOpacity="0.25" />
        <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="currentColor" strokeOpacity="0.25" />
        <text x={pad.l - 8} y={y(max)} textAnchor="end" className="fill-current text-[10px]" fill="currentColor">{max.toFixed(1)}</text>
        <text x={pad.l - 8} y={y(min)} textAnchor="end" className="fill-current text-[10px]" fill="currentColor">{min.toFixed(1)}</text>
        {pieces.map((piece) => (
          <polyline
            key={piece.points}
            points={piece.points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray={piece.dashed ? '4 4' : undefined}
            className="text-primary"
          />
        ))}
        {rows.map((row, index) => (
          row.index == null ? null : (
            <circle key={row.iso_week} cx={x(index)} cy={y(row.index)} r="2.5" className="fill-primary" />
          )
        ))}
        {rows.map((row, index) => (
          <text key={`${row.iso_week}-label`} x={x(index)} y={height - 10} textAnchor="middle" className="fill-current text-[9px]" fill="currentColor">
            {row.iso_week.slice(5)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

function Breadth({ row }: { row: PriceIndexRow }) {
  if (row.cut_share == null || row.rise_share == null || row.unchanged_share == null) {
    return <p className="text-sm text-muted-foreground">Breadth shares are blank. The matched-pair count is still shown.</p>;
  }
  const cuts = Number(row.cut_share) * 100;
  const rises = Number(row.rise_share) * 100;
  const unchanged = Number(row.unchanged_share) * 100;
  return (
    <div>
      <div className="flex h-2 overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.4)' }}>
        <div style={{ width: `${cuts}%`, background: 'hsl(var(--av-foreground) / 0.45)' }} />
        <div style={{ width: `${unchanged}%`, background: 'hsl(var(--av-border))' }} />
        <div style={{ width: `${rises}%`, background: 'hsl(var(--av-primary) / 0.9)' }} />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Cuts {shareText(row.cut_share)} · Unchanged {shareText(row.unchanged_share)} · Rises {shareText(row.rise_share)}
      </p>
    </div>
  );
}

function CoastCards({ rows }: { rows: PriceIndexRow[] }) {
  return (
    <div className="space-y-4 lg:hidden">
      {rows.map((row) => (
        <article key={row.iso_week} className="border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{row.iso_week} · {row.status}</p>
          <h3 className="mt-2 font-serif text-2xl font-light text-foreground">{formatDay(row.capture_date ?? row.week_start)}</h3>
          <dl className="mt-3 space-y-1 text-sm text-foreground/85">
            <div className="flex justify-between gap-4"><dt>Index</dt><dd>{indexText(row.index)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Change</dt><dd>{changeText(row.change_pct)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Matched pairs</dt><dd>{countText(row.matched_pairs)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Cuts / rises / unchanged</dt><dd>{countText(row.cuts)} / {countText(row.rises)} / {countText(row.unchanged)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Compared with</dt><dd>{formatDay(row.compared_to)}</dd></div>
          </dl>
          {noteFor(row) ? <p className="mt-2 text-xs text-muted-foreground">{noteFor(row)} {row.reason ?? ''}</p> : null}
        </article>
      ))}
    </div>
  );
}

function LevelCards({ rows }: { rows: PriceIndexRow[] }) {
  return (
    <div className="space-y-4 lg:hidden">
      {rows.map((row) => (
        <article key={`${row.level}-${row.key}`} className="border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{row.level}{row.province ? ` · ${row.province}` : ''}</p>
          <h3 className="mt-2 font-serif text-2xl font-light text-foreground">{row.name}</h3>
          <dl className="mt-3 space-y-1 text-sm text-foreground/85">
            <div className="flex justify-between gap-4"><dt>Index</dt><dd>{indexText(row.index)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Change</dt><dd>{changeText(row.change_pct)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Matched pairs</dt><dd>{countText(row.matched_pairs)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Cut / rise / unchanged</dt><dd>{shareText(row.cut_share)} / {shareText(row.rise_share)} / {shareText(row.unchanged_share)}</dd></div>
          </dl>
          {noteFor(row) ? <p className="mt-2 text-xs text-muted-foreground">{noteFor(row)}</p> : null}
        </article>
      ))}
    </div>
  );
}

export default function PriceIndexPage() {
  const file = readPriceIndex();
  const coast = file.rows.filter((row) => row.level === 'coast');
  const latestWeek = file.latest?.iso_week ?? null;
  const provinces = file.rows.filter((row) => row.level === 'province' && row.iso_week === latestWeek);
  const towns = file.rows
    .filter((row) => row.level === 'town' && row.iso_week === latestWeek)
    .slice()
    .sort((a, b) => (b.matched_pairs ?? -1) - (a.matched_pairs ?? -1) || a.name.localeCompare(b.name, 'en'));
  const latest = file.latest;
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: file.name,
    description: file.method,
    url: 'https://avenaterminal.com/data/price-index',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    temporalCoverage: `${file.series_start}/${file.data_as_of ?? file.series_start}`,
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/price-index' },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://avenaterminal.com/api/v1/price-index?format=csv' },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8">
        <Eyebrow>Data · same-unit index</Eyebrow>
        <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
          Same-unit asking-price index
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{file.method}</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Data as of {formatDay(file.data_as_of)} · Methodology {file.methodology_version}
          {latest ? ` · ${latest.iso_week}` : ''}
        </p>
        <p className="mt-4 flex flex-wrap gap-4">
          <Link href="/api/v1/price-index" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">JSON</Link>
          <Link href="/api/v1/price-index?format=csv" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">CSV</Link>
          <Link href="/data/vintages" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Weekly vintages</Link>
          <Link href="/data/bulk" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Bulk files</Link>
          <Link href="/data/absorption" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Listing absorption</Link>
          <Link href="/methodology#price-moves" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Unit-identity rule</Link>
          <Link href="/official" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Official statistics</Link>
        </p>

        <div className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
          <Stat label="Coast index" value={indexText(latest?.index ?? null)} note={latest ? formatDay(latest.capture_date) : 'No capture'} />
          <Stat label="Weekly change" value={changeText(latest?.change_pct ?? null)} note={latest?.compared_to ? `Against ${formatDay(latest.compared_to)}` : 'Base week'} />
          <Stat label="Matched pairs" value={countText(latest?.matched_pairs ?? null)} note="Same unit, same place" />
          <Stat label="Held back" value={countText(latest?.held_back_large_move ?? null)} note={`Spec changes excluded: ${countText(latest?.excluded_spec_change ?? null)}`} />
        </div>

        {latest ? (
          <div className="mt-8 max-w-3xl">
            <Breadth row={{
              ...coast[coast.length - 1],
              cut_share: latest.cut_share,
              rise_share: latest.rise_share,
              unchanged_share: latest.unchanged_share,
            }} />
          </div>
        ) : null}

        <section className="mt-12 border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>01</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Capture gaps</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-foreground/85">
            {file.known_gaps.map((gap) => (
              <li key={`${gap.from}-${gap.to}`}>{gap.note}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Minimum matched pairs: coast {file.min_matched_pairs.coast}, province {file.min_matched_pairs.province}, town {file.min_matched_pairs.town}. Towns published: {file.towns_published}. Towns omitted, because they never cleared the town minimum: {file.towns_omitted}.
          </p>
          <CoastChart rows={coast} />
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>02</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Coast</h2>
          <CoastCards rows={coast} />
          <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <caption className="sr-only">Weekly coast index, matched pairs and breadth</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left">Week</th>
                  <th scope="col" className="px-3 py-2 text-left">Capture</th>
                  <th scope="col" className="px-3 py-2 text-right">Index</th>
                  <th scope="col" className="px-3 py-2 text-right">Change</th>
                  <th scope="col" className="px-3 py-2 text-right">Pairs</th>
                  <th scope="col" className="px-3 py-2 text-right">Cuts</th>
                  <th scope="col" className="px-3 py-2 text-right">Rises</th>
                  <th scope="col" className="px-3 py-2 text-right">Unchanged</th>
                  <th scope="col" className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {coast.map((row) => (
                  <tr key={row.iso_week} className="border-t align-top" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <th scope="row" className="px-3 py-2 text-left font-normal font-mono text-xs">{row.iso_week}</th>
                    <td className="px-3 py-2">{formatDay(row.capture_date ?? row.week_start)}</td>
                    <td className="px-3 py-2 text-right tabular">{indexText(row.index)}</td>
                    <td className="px-3 py-2 text-right tabular">{changeText(row.change_pct)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(row.matched_pairs)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(row.cuts)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(row.rises)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(row.unchanged)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{noteFor(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>03</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Provinces</h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {latestWeek ? `${latestWeek}, capture ${formatDay(file.latest?.capture_date ?? null)}.` : 'No closed week.'} A blank index is under the province minimum. The pair count is the count.
          </p>
          <LevelCards rows={provinces} />
          <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <caption className="sr-only">Province index for the latest capture</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left">Province</th>
                  <th scope="col" className="px-3 py-2 text-right">Index</th>
                  <th scope="col" className="px-3 py-2 text-right">Change</th>
                  <th scope="col" className="px-3 py-2 text-right">Pairs</th>
                  <th scope="col" className="px-3 py-2 text-right">Cut</th>
                  <th scope="col" className="px-3 py-2 text-right">Rise</th>
                  <th scope="col" className="px-3 py-2 text-right">Unchanged</th>
                  <th scope="col" className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {provinces.map((row) => (
                  <tr key={row.key} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">{row.name}</th>
                    <td className="px-3 py-2 text-right tabular">{indexText(row.index)}</td>
                    <td className="px-3 py-2 text-right tabular">{changeText(row.change_pct)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(row.matched_pairs)}</td>
                    <td className="px-3 py-2 text-right tabular">{shareText(row.cut_share)}</td>
                    <td className="px-3 py-2 text-right tabular">{shareText(row.rise_share)}</td>
                    <td className="px-3 py-2 text-right tabular">{shareText(row.unchanged_share)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{noteFor(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>04</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Towns</h2>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Towns that clear the minimum in at least one week. This table is the latest capture. A town under the minimum that week is flagged and its index is blank.
          </p>
          <LevelCards rows={towns} />
          <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <caption className="sr-only">Town index for the latest capture</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left">Town</th>
                  <th scope="col" className="px-3 py-2 text-left">Province</th>
                  <th scope="col" className="px-3 py-2 text-right">Index</th>
                  <th scope="col" className="px-3 py-2 text-right">Change</th>
                  <th scope="col" className="px-3 py-2 text-right">Pairs</th>
                  <th scope="col" className="px-3 py-2 text-right">Cut</th>
                  <th scope="col" className="px-3 py-2 text-right">Rise</th>
                  <th scope="col" className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {towns.map((row) => (
                  <tr key={row.key} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">{row.name}</th>
                    <td className="px-3 py-2">{row.province ?? '–'}</td>
                    <td className="px-3 py-2 text-right tabular">{indexText(row.index)}</td>
                    <td className="px-3 py-2 text-right tabular">{changeText(row.change_pct)}</td>
                    <td className="px-3 py-2 text-right tabular">{countText(row.matched_pairs)}</td>
                    <td className="px-3 py-2 text-right tabular">{shareText(row.cut_share)}</td>
                    <td className="px-3 py-2 text-right tabular">{shareText(row.rise_share)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{noteFor(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>05</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">What a column means</h2>
          <dl className="space-y-4 text-sm leading-relaxed text-foreground/85">
            {Object.entries(PRICE_INDEX_DEFINITIONS).map(([key, text]) => (
              <div key={key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{key}</dt>
                <dd className="mt-1">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>06</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Caveats</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/85">
            {file.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}

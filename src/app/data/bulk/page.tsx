import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import {
  BULK_CADENCE,
  BULK_COLUMNS,
  BULK_FILE_NAME,
  BULK_GUARANTEE,
  BULK_NOT_INCLUDED,
  COLUMN_DEFINITIONS,
  readPublishedBulk,
  type BulkBundle,
} from '@/lib/bulk';

export const metadata: Metadata = {
  title: 'Weekly bulk files · Avena Terminal',
  description: 'Gzipped CSV snapshots of the frozen weekly town and province vintages, with SHA-256 checksums and a schema changelog.',
  alternates: { canonical: 'https://avenaterminal.com/data/bulk' },
};

function formatDay(iso: string | null): string {
  if (!iso) return '–';
  const [year, month, day] = iso.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

function days(list: string[]): string {
  if (!list.length) return '–';
  return list.join(', ');
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

function Downloads({ row }: { row: BulkBundle }) {
  if (row.status !== 'frozen' || !row.vintage_date) return <span className="text-muted-foreground">No file</span>;
  return (
    <span className="inline-flex gap-3">
      <Link href={`/api/v1/bulk/${row.vintage_date}?file=${BULK_FILE_NAME}`} className="text-primary hover:text-foreground">CSV.gz</Link>
      <Link href={`/api/v1/bulk/${row.vintage_date}`} className="text-primary hover:text-foreground">Manifest</Link>
    </span>
  );
}

export default function BulkPage() {
  const published = readPublishedBulk();
  const index = published.index;
  const frozen = index.bundles.filter((row) => row.status === 'frozen');
  const gapWeeks = index.bundles.filter((row) => row.status === 'gap');
  const latest = frozen.length ? frozen[frozen.length - 1] : null;
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena weekly bulk vintages',
    description: BULK_GUARANTEE,
    url: 'https://avenaterminal.com/data/bulk',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: index.license,
    temporalCoverage: `${index.series_start}/${latest?.vintage_date ?? index.series_start}`,
    distribution: frozen.map((row) => ({
      '@type': 'DataDownload',
      encodingFormat: 'application/gzip',
      contentUrl: `https://avenaterminal.com/api/v1/bulk/${row.vintage_date}?file=${BULK_FILE_NAME}`,
    })),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8">
        <Eyebrow>Data · bulk</Eyebrow>
        <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
          Weekly bulk files
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{BULK_GUARANTEE}</p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-foreground/85">
          {index.license_note} The figures are asking prices from the committed listing book. A removed listing left that book. It is not a recorded sale.
        </p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-foreground/85">{BULK_CADENCE}</p>
        <p className="mt-4 flex flex-wrap gap-4">
          <Link href="/api/v1/bulk" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">JSON index</Link>
          <Link href="/api/v1/bulk/schema" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Schema changelog</Link>
          <Link href="/data/vintages" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Weekly vintages</Link>
          <Link href="/data/price-index" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Same-unit price index</Link>
          <Link href="/data/absorption" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Listing absorption</Link>
          <Link href="/license" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">License</Link>
        </p>

        <div className="mt-10 grid gap-px sm:grid-cols-3" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
          <Stat label="Frozen bundles" value={String(frozen.length)} note={latest ? `Latest capture ${formatDay(latest.vintage_date)}` : 'None yet'} />
          <Stat label="Gap weeks" value={String(gapWeeks.length)} note="A closed week in the vintage manifest with no file. No rows are written." />
          <Stat label="Missing capture days" value={String(index.missing_capture_dates.length)} note="Listed below. Not estimated." />
        </div>

        <section className="mt-12 border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>01</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Files and checksums</h2>
          <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
            <p>
              Schema 1 is one <span className="font-mono text-xs">town-province.csv.gz</span> per frozen week, plus a manifest for that week.
              The index checksum is the SHA-256 of the gzip bytes. The manifest also records the SHA-256 of the uncompressed CSV, the row count, schema version 1, the generation time, and the source capture dates.
            </p>
            <p>
              The index was generated {index.generated_at}. A closed week that is not in the vintage manifest has no bundle here, and this page does not fill that week in.
              {latest ? ` The latest frozen capture in this index is ${formatDay(latest.vintage_date)}.` : ''}
            </p>
            <ul className="list-disc space-y-2 pl-5">
              {BULK_NOT_INCLUDED.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>02</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Schema 1</h2>
          <p className="mb-4 text-sm leading-relaxed text-foreground/85">
            Effective 10 November 2026. An empty cell is null on the vintage row. The changelog is <Link href="/api/v1/bulk/schema" className="text-primary hover:text-foreground">/api/v1/bulk/schema</Link>.
          </p>
          <dl className="space-y-4 text-sm leading-relaxed text-foreground/85">
            {BULK_COLUMNS.map((name) => (
              <div key={name}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{name}</dt>
                <dd className="mt-1">{COLUMN_DEFINITIONS[name]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>03</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Declared gap and other missing days</h2>
          <p className="mb-4 text-base leading-relaxed text-foreground/85">
            The declared capture gap is {index.known_gaps.map((gap) => `${formatDay(gap.from)} to ${formatDay(gap.to)}`).join('; ') || 'not recorded'}.
            Those dates have no bulk file. Other dates in the list are days, on or after {formatDay(index.series_start)}, when the vintage manifest records no eligible capture.
          </p>
          <p className="font-mono text-xs leading-relaxed text-foreground/80">{days(index.missing_capture_dates)}</p>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>04</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Bundles</h2>
          <div className="space-y-4 lg:hidden">
            {index.bundles.map((row) => (
              <article key={row.iso_week} className="border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{row.iso_week} · {row.status}</p>
                <h3 className="mt-2 font-serif text-2xl font-light text-foreground">{formatDay(row.vintage_date ?? row.week_start)}</h3>
                <dl className="mt-3 space-y-1 text-sm text-foreground/85">
                  <div className="flex justify-between gap-4"><dt>Rows</dt><dd>{row.row_count ?? '–'}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Generated</dt><dd className="font-mono text-xs">{row.generated_at ?? '–'}</dd></div>
                  <div><dt className="text-muted-foreground">Capture days</dt><dd className="mt-1 font-mono text-xs">{days(row.source_capture_dates)}</dd></div>
                  <div><dt className="text-muted-foreground">Gap days in the week</dt><dd className="mt-1 font-mono text-xs">{days(row.gap_dates_in_week)}</dd></div>
                  <div><dt className="text-muted-foreground">SHA-256</dt><dd className="mt-1 break-all font-mono text-[11px]">{row.files?.[0]?.sha256 ?? '–'}</dd></div>
                </dl>
                <p className="mt-3 text-sm"><Downloads row={row} /></p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <caption className="sr-only">Weekly bulk files, with capture date, row count, SHA-256 and download</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left">Capture</th>
                  <th scope="col" className="px-3 py-2 text-left">Week</th>
                  <th scope="col" className="px-3 py-2 text-left">Status</th>
                  <th scope="col" className="px-3 py-2 text-right">Rows</th>
                  <th scope="col" className="px-3 py-2 text-left">SHA-256</th>
                  <th scope="col" className="px-3 py-2 text-left">Gap days</th>
                  <th scope="col" className="px-3 py-2 text-left">Download</th>
                </tr>
              </thead>
              <tbody>
                {index.bundles.map((row) => (
                  <tr key={row.iso_week} className="border-t align-top" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">{formatDay(row.vintage_date ?? row.week_start)}</th>
                    <td className="px-3 py-2 font-mono text-xs">{row.iso_week}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-right tabular">{row.row_count ?? '–'}</td>
                    <td className="max-w-[220px] break-all px-3 py-2 font-mono text-[11px]">{row.files?.[0]?.sha256 ?? '–'}</td>
                    <td className="max-w-[180px] px-3 py-2 font-mono text-[11px]">{days(row.gap_dates_in_week)}</td>
                    <td className="px-3 py-2"><Downloads row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import {
  VINTAGE_DEFINITIONS,
  VINTAGE_GUARANTEE,
  readVintageManifest,
  type ManifestVintage,
} from '@/lib/vintages';

export const metadata: Metadata = {
  title: 'Weekly vintages · Avena Terminal',
  description: 'Point-in-time town and province aggregates of the Spanish coastal new-build listing book. Each weekly file is frozen once and is not rewritten.',
  alternates: { canonical: 'https://avenaterminal.com/data/vintages' },
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

function Downloads({ row }: { row: ManifestVintage }) {
  if (row.status !== 'frozen' || !row.vintage_date) return <span className="text-muted-foreground">No file</span>;
  return (
    <span className="inline-flex gap-3">
      <Link href={`/api/v1/vintages/${row.vintage_date}`} className="text-primary hover:text-foreground">JSON</Link>
      <Link href={`/api/v1/vintages/${row.vintage_date}?format=csv`} className="text-primary hover:text-foreground">CSV</Link>
    </span>
  );
}

export default function VintagesPage() {
  const manifest = readVintageManifest();
  const frozen = manifest.vintages.filter((row) => row.status === 'frozen');
  const gapWeeks = manifest.vintages.filter((row) => row.status === 'gap');
  const latest = frozen.length ? frozen[frozen.length - 1] : null;
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena weekly listing vintages',
    description: VINTAGE_GUARANTEE,
    url: 'https://avenaterminal.com/data/vintages',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    temporalCoverage: `${manifest.series_start}/${latest?.vintage_date ?? manifest.series_start}`,
    distribution: frozen.map((row) => ({
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `https://avenaterminal.com/api/v1/vintages/${row.vintage_date}`,
    })),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8">
        <Eyebrow>Data · vintages</Eyebrow>
        <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
          Weekly vintages
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{VINTAGE_GUARANTEE}</p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-foreground/85">
          The figures are asking prices from the committed listing book. A removed listing left that book. It is not a recorded sale.
          The open observation files are CC BY 4.0. These files are aggregates of that book.
        </p>
        <p className="mt-4 flex flex-wrap gap-4">
          <Link href="/api/v1/vintages" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">JSON manifest</Link>
          <Link href="/data/price-index" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Same-unit price index</Link>
          <Link href="/data/absorption" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Listing absorption</Link>
          <Link href="/data/listing-duration" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Listing duration</Link>
          <Link href="/due-diligence#point-in-time" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Point-in-time policy</Link>
          <Link href="/license" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">License</Link>
        </p>

        <div className="mt-10 grid gap-px sm:grid-cols-3" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
          <Stat label="Frozen vintages" value={String(frozen.length)} note={latest ? `Latest capture ${formatDay(latest.vintage_date)}` : 'None yet'} />
          <Stat label="Gap weeks" value={String(gapWeeks.length)} note="A closed week with no eligible capture. No file is written." />
          <Stat label="Missing capture days" value={String(manifest.missing_capture_dates.length)} note="Listed below. Not estimated." />
        </div>

        <section className="mt-12 border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>01</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">What a row means</h2>
          <dl className="space-y-4 text-sm leading-relaxed text-foreground/85">
            {Object.entries(VINTAGE_DEFINITIONS).map(([key, text]) => (
              <div key={key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{key}</dt>
                <dd className="mt-1">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>02</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Declared gap and other missing days</h2>
          <p className="mb-4 text-base leading-relaxed text-foreground/85">
            The declared capture gap is {manifest.known_gaps.map((gap) => `${formatDay(gap.from)} to ${formatDay(gap.to)}`).join('; ')}.
            Those dates have no vintage file. Other dates in the list are days, on or after {formatDay(manifest.series_start)}, when public/data.json has no eligible commit.
          </p>
          <p className="font-mono text-xs leading-relaxed text-foreground/80">{days(manifest.missing_capture_dates)}</p>
        </section>

        <section className="border-t py-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <Eyebrow>03</Eyebrow>
          <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">Vintages</h2>
          <div className="space-y-4 lg:hidden">
            {manifest.vintages.map((row) => (
              <article key={row.iso_week} className="border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{row.iso_week} · {row.status}</p>
                <h3 className="mt-2 font-serif text-2xl font-light text-foreground">{formatDay(row.vintage_date ?? row.week_start)}</h3>
                <dl className="mt-3 space-y-1 text-sm text-foreground/85">
                  <div className="flex justify-between gap-4"><dt>Rows</dt><dd>{row.row_count ?? '–'}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Compared with</dt><dd>{formatDay(row.compared_to)}</dd></div>
                  <div><dt className="text-muted-foreground">Gap days in the week</dt><dd className="mt-1 font-mono text-xs">{days(row.gap_dates_in_week)}</dd></div>
                  <div><dt className="text-muted-foreground">SHA-256</dt><dd className="mt-1 break-all font-mono text-[11px]">{row.sha256 ?? '–'}</dd></div>
                </dl>
                <p className="mt-3 text-sm"><Downloads row={row} /></p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <caption className="sr-only">Weekly vintages, with capture date, row count, SHA-256 and download</caption>
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
                {manifest.vintages.map((row) => (
                  <tr key={row.iso_week} className="border-t align-top" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">{formatDay(row.vintage_date ?? row.week_start)}</th>
                    <td className="px-3 py-2 font-mono text-xs">{row.iso_week}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-right tabular">{row.row_count ?? '–'}</td>
                    <td className="max-w-[220px] break-all px-3 py-2 font-mono text-[11px]">{row.sha256 ?? '–'}</td>
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

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { PrintButton } from '@/components/reports/PrintButton';
import { loadDueDiligence, NOT_AVAILABLE, type DictionaryField, type DueDiligencePack, type OrNA } from '@/lib/due-diligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const metadata: Metadata = {
  title: 'Dataset due diligence | Avena Terminal',
  description: 'Coverage, data dictionary, update cadence, known gaps, point-in-time policy, and delivery for the Spanish coastal new-build listing book and its observation ledger.',
  alternates: { canonical: 'https://avenaterminal.com/due-diligence' },
};

function show(value: unknown): string {
  if (value === NOT_AVAILABLE) return NOT_AVAILABLE;
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString('en-US') : String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
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

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t py-12" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mb-4 font-serif text-3xl font-light tracking-tight text-foreground">{title}</h2>
      <div className="space-y-4 text-base leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function CountList({ rows, nameLabel }: { rows: Array<{ name: string; listings: number }>; nameLabel: string }) {
  return (
    <div className="overflow-x-auto rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <th className="px-3 py-2 text-left">{nameLabel}</th>
            <th className="px-3 py-2 text-right">Listings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2 text-right tabular">{row.listings.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DictionaryTable({ fields }: { fields: DictionaryField[] }) {
  return (
    <>
      <div className="dd-table hidden overflow-x-auto rounded-sm border lg:block" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Null</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Example</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={`${f.surface}-${f.record}-${f.field}`} className="border-t align-top" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                <td className="px-3 py-2 font-mono text-xs">{f.field}</td>
                <td className="px-3 py-2 font-mono text-xs">{f.type}</td>
                <td className="px-3 py-2 font-mono text-xs">{f.unit ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{f.nullable ? 'yes' : 'no'}</td>
                <td className="px-3 py-2">{f.description}</td>
                <td className="px-3 py-2 max-w-[220px] break-all font-mono text-xs">{show(f.example)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dd-cards space-y-3 lg:hidden">
        {fields.map((f) => (
          <article key={`${f.surface}-${f.record}-${f.field}`} className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-xs text-foreground">{f.field}</div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {f.type}{f.unit ? ` · ${f.unit}` : ''} · {f.nullable ? 'nullable' : 'required'}
            </p>
            <p className="mt-2 text-sm">{f.description}</p>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Example: {show(f.example)}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function na(value: OrNA<string | number>): string {
  return show(value);
}

export default async function DueDiligencePage() {
  const pack: DueDiligencePack = await loadDueDiligence();
  const feed = pack.coverage.feed;
  const history = pack.coverage.price_history;
  const published = pack.coverage.published_open_dataset;
  const groups: Array<{ surface: string; records: Array<{ record: string; fields: DictionaryField[] }> }> = [];
  for (const item of pack.dictionary) {
    let surface = groups.find((g) => g.surface === item.surface);
    if (!surface) {
      surface = { surface: item.surface, records: [] };
      groups.push(surface);
    }
    let record = surface.records.find((r) => r.record === item.record);
    if (!record) {
      record = { record: item.record, fields: [] };
      surface.records.push(record);
    }
    record.fields.push(item);
  }

  return (
    <div className="avena-v2 min-h-screen">
      <style>{`
        @media print {
          .dd-cards { display: none !important; }
          .dd-table { display: block !important; overflow: visible !important; }
          .dd-table table { min-width: 0 !important; width: 100% !important; }
          .avena-v2 .dd-pack section { page-break-inside: auto; }
          .dd-pack a { text-decoration: none; }
        }
      `}</style>
      <Nav />
      <main className="print-root dd-pack mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8">
        <Eyebrow>Data · due diligence</Eyebrow>
        <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
          Dataset due diligence
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{pack.overview}</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Generated {pack.generated_at} · Health checked {na(pack.health_checked_at)}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <PrintButton />
          <Link href="/api/v1/due-diligence" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">JSON</Link>
          <Link href={pack.sample.href} className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Sample CSV</Link>
          <Link href="/methodology" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Methodology</Link>
          <Link href="/spain/supply" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Spain supply pipeline</Link>
          <Link href="/spain/towns" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Spain municipal appraisals</Link>
          <Link href="/spain/rents" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Spain rent benchmark</Link>
          <Link href="/europe/official" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">Eurostat house price index</Link>
        </div>

        <div className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'hsl(var(--av-border) / 0.6)' }}>
          <Stat label="Listings" value={feed.listings.toLocaleString('en-US')} note="Current listing book" />
          <Stat label="Towns" value={feed.town_count.toLocaleString('en-US')} note={`${feed.provinces.length} provinces mapped`} />
          <Stat label="Price history" value={history.first_date === NOT_AVAILABLE ? NOT_AVAILABLE : `${na(history.first_date)} – ${na(history.latest_date)}`} note="Live price_snapshots" />
          <Stat label="Published ledger" value={na(published.latest_date)} note={published.version === NOT_AVAILABLE ? 'Manifest not read' : String(published.version)} />
        </div>

        <Section id="overview" eyebrow="01" title="Dataset overview">
          <p>
            {published.name === NOT_AVAILABLE ? 'The published manifest name is not available.' : published.name}
            {' '}The book on this deployment holds {feed.listings.toLocaleString('en-US')} listings
            across {feed.town_count.toLocaleString('en-US')} location strings and {feed.costas.length} costa labels.
            Feed artifact time: {na(feed.feed_generated_at)}.
          </p>
          <p>
            Open-dataset town file, recomputed now from this book with the same k≥5 rule: {feed.open_dataset_towns_now.toLocaleString('en-US')} towns.
            The published manifest reports {na(published.towns_published)} towns and {na(published.live_listings)} live listings at {na(published.generated_at)}.
          </p>
          <p>{feed.country_note}</p>
          <CountList rows={feed.countries} nameLabel="Country on the row" />
        </Section>

        <Section id="coverage" eyebrow="02" title="Coverage">
          <h3 className="font-serif text-2xl font-light text-foreground">Provinces</h3>
          <p>Parsed from the location string with the province list used for the Spain statistics file. A location that does not match is unmapped. Unmapped locations: {feed.unmapped_locations.length ? feed.unmapped_locations.join(', ') : 'none'}.</p>
          <div className="overflow-x-auto rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-3 py-2 text-left">Province</th>
                  <th className="px-3 py-2 text-right">Towns</th>
                  <th className="px-3 py-2 text-right">Listings</th>
                </tr>
              </thead>
              <tbody>
                {pack.coverage.feed.provinces.map((row) => (
                  <tr key={row.key} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-right tabular">{row.towns.toLocaleString('en-US')}</td>
                    <td className="px-3 py-2 text-right tabular">{row.listings.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="pt-4 font-serif text-2xl font-light text-foreground">Costas</h3>
          <CountList rows={feed.costas} nameLabel="Costa" />
          <h3 className="pt-4 font-serif text-2xl font-light text-foreground">Property types</h3>
          <CountList rows={feed.property_types} nameLabel="Type" />
          <h3 className="pt-4 font-serif text-2xl font-light text-foreground">Developments and promoters</h3>
          <p>Distinct development_ref values on the current book: {feed.development_refs.toLocaleString('en-US')}. Rows with none: {feed.development_refs_missing.toLocaleString('en-US')}. A development reference identifies a project in the feed. It is not a company name.</p>
          <p>Promoter names: {feed.promoter_names}. {feed.promoter_names_reason}</p>
          <p>{feed.source_labels_note}</p>
          <CountList rows={feed.source_labels} nameLabel="Source label" />
          <h3 className="pt-4 font-serif text-2xl font-light text-foreground">Towns</h3>
          <div className="overflow-x-auto rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-3 py-2 text-left">Location</th>
                  <th className="px-3 py-2 text-left">Province</th>
                  <th className="px-3 py-2 text-left">Costa</th>
                  <th className="px-3 py-2 text-right">Listings</th>
                </tr>
              </thead>
              <tbody>
                {feed.towns.map((row) => (
                  <tr key={row.location} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.45)' }}>
                    <td className="px-3 py-2">{row.location}</td>
                    <td className="px-3 py-2">{row.province ?? 'unmapped'}</td>
                    <td className="px-3 py-2">{row.costa ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular">{row.listings.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="pt-4 font-serif text-2xl font-light text-foreground">Price history</h3>
          <p>Source: {na(history.source)}. First date: {na(history.first_date)}. Latest date: {na(history.latest_date)}. Observed days: {na(history.observed_days)}. {history.observed_days_source === NOT_AVAILABLE ? '' : history.observed_days_source}</p>
          {history.reason ? <p>{history.reason}</p> : null}
          <p>
            Published ledger on this deployment: {na(published.first_date)} to {na(published.latest_date)}, {na(published.observation_days)} observation days, {na(published.moves_recorded)} moves, {na(published.delistings_recorded)} tombstones
            ({na(published.delistings_still_listed)} still listed, {na(published.delistings_currently_absent)} currently absent).
            Ledger gaps ({na(pack.coverage.ledger_gaps_source)}):{' '}
            {pack.coverage.ledger_gaps === NOT_AVAILABLE
              ? NOT_AVAILABLE
              : pack.coverage.ledger_gaps.length
                ? pack.coverage.ledger_gaps.map((gap) => `${gap.start} to ${gap.end} (${gap.missingDays} days)`).join('; ')
                : 'none between the first and latest published day.'}
          </p>
        </Section>

        <Section id="dictionary" eyebrow="03" title="Data dictionary">
          <p>{pack.dictionary_scope}</p>
          {groups.map((group) => (
            <div key={group.surface} className="space-y-4">
              <h3 className="font-serif text-2xl font-light text-foreground">{group.surface}</h3>
              {group.records.map((record) => (
                <div key={record.record} className="space-y-2">
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{record.record}</h4>
                  <DictionaryTable fields={record.fields} />
                </div>
              ))}
            </div>
          ))}
        </Section>

        <Section id="pipeline" eyebrow="04" title="Update cadence and lineage">
          <p>Last-observed values come from /api/health where that payload has them. A clock time the health payload does not carry is not available.</p>
          {pack.pipeline.map((step) => (
            <article key={step.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <h3 className="font-serif text-2xl font-light text-foreground">{step.name}</h3>
              <p className="mt-2">{step.what}</p>
              <dl className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
                <div>Cadence: <span className="text-foreground">{step.cadence}</span></div>
                <div>Source: <span className="text-foreground">{step.source_file}</span></div>
                <div>Last observed: <span className="text-foreground">{na(step.last_observed)}</span></div>
                <div>{step.last_observed_kind}</div>
                <div>Health status: <span className="text-foreground">{na(step.health_status)}</span></div>
                <div>Health detail: <span className="text-foreground">{na(step.health_detail)}</span></div>
              </dl>
            </article>
          ))}
        </Section>

        <Section id="quality" eyebrow="05" title="Data quality and known gaps">
          <p>{pack.quality.history_start_note}</p>
          <p>{pack.quality.declared_capture_gap_note}</p>
          <ul className="list-disc space-y-1 pl-5">
            {pack.quality.declared_capture_gaps.map((gap) => (
              <li key={`${gap.from}-${gap.to}`}>{gap.from} to {gap.to}</li>
            ))}
          </ul>
          <p>{pack.quality.unit_identity}</p>
          <p>{pack.quality.move_status_note}</p>
          <h3 className="font-serif text-2xl font-light text-foreground">Excluded</h3>
          <ul className="list-disc space-y-1 pl-5">
            {pack.quality.excluded.map((item) => <li key={item}>{item}</li>)}
          </ul>
          {published.honesty !== NOT_AVAILABLE ? (
            <>
              <h3 className="font-serif text-2xl font-light text-foreground">Notes on the published manifest</h3>
              <ul className="list-disc space-y-1 pl-5">
                {published.honesty.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </>
          ) : <p>The manifest honesty notes are not available.</p>}
        </Section>

        <Section id="point-in-time" eyebrow="06" title="Point-in-time and backfill">
          <p>{pack.point_in_time.summary}</p>
          <p>{pack.point_in_time.asking_prices}</p>
          <p>{pack.point_in_time.backfill}</p>
          <p>{pack.point_in_time.stored_scores}</p>
          <p>{pack.point_in_time.live_api_scores}</p>
          <p>{pack.point_in_time.open_dataset}</p>
          <p>Scribe last run: {pack.point_in_time.scribe_last_run}. {pack.point_in_time.scribe_last_run_reason}</p>
        </Section>

        <Section id="delivery" eyebrow="07" title="Delivery">
          {pack.delivery.map((item) => (
            <article key={item.id}>
              <h3 className="font-serif text-xl font-light text-foreground">{item.path}</h3>
              <p className="font-mono text-xs text-muted-foreground">{item.method} · {item.format} · {item.auth}</p>
              <p>{item.note}</p>
            </article>
          ))}
          <p>
            <Link href="/access" className="text-primary hover:text-foreground">Request access</Link>
            {' · '}
            <Link href={pack.sample.href} className="text-primary hover:text-foreground">Download the sample CSV</Link>
          </p>
        </Section>

        <Section id="licensing" eyebrow="08" title="Licensing and sourcing">
          <p>{pack.licensing.open_observations}</p>
          <p>{pack.licensing.zenodo}</p>
          <p>
            {pack.licensing.listings_api}{' '}
            <Link href={pack.licensing.license_href} className="text-primary hover:text-foreground">License</Link>
            {' · '}
            <Link href={pack.licensing.access_href} className="text-primary hover:text-foreground">Pricing on request</Link>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {pack.licensing.sourcing.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Section>

        <Section id="not-available" eyebrow="09" title="Not available">
          <p>These values were not computed for this response. The reason is the one recorded at generation time.</p>
          <ul className="space-y-2">
            {pack.not_available.map((item) => (
              <li key={item.field}>
                <span className="font-mono text-xs text-foreground">{item.field}</span>
                <span className="text-muted-foreground"> — {item.reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <Footer />
    </div>
  );
}

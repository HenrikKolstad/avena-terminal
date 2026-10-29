import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getEsTownGap } from '@/lib/es-town-gap-view';
import type { AppraisalSlot, DerivedGap, TownGapRow } from '@/lib/data-sources/es-town-gap';

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Spain municipal appraisals · Avena Terminal',
  description:
    'Median new-build asking prices for the Spanish towns in the Avena corpus, set beside the ministry appraised value per m² for the same municipality.',
  alternates: { canonical: 'https://avenaterminal.com/spain/towns' },
  openGraph: {
    title: 'Spain municipal appraisals · Avena Terminal',
    description: 'Avena asking prices beside the municipal appraisal, up to five years old when the sheet publishes it.',
    url: 'https://avenaterminal.com/spain/towns',
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
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function quarterLabel(p: string | null | undefined): string {
  if (!p) return '–';
  const m = /^(\d{4})-Q([1-4])$/.exec(p);
  return m ? `Q${m[2]} ${m[1]}` : p;
}
function gapWord(n: number | null | undefined): string {
  if (n == null) return '';
  if (n > 0) return 'above the appraisal';
  if (n < 0) return 'below the appraisal';
  return 'level with the appraisal';
}
function published(slot: AppraisalSlot | null): slot is Extract<AppraisalSlot, { value: number }> {
  return slot != null && !('withheld' in slot);
}
function appraisalText(slot: AppraisalSlot | null, absent: string): string {
  if (!slot) return absent;
  if (!published(slot)) return 'n.r.';
  return `${eurM2(slot.value)}/m²`;
}
function appraisalNote(slot: AppraisalSlot | null): string {
  if (!slot) return '';
  const count = `${slot.appraisals.toLocaleString('en-GB')} appraisals`;
  if (!published(slot)) return `${quarterLabel(slot.period)} · ${count} · price not published`;
  return `${quarterLabel(slot.period)} · ${count}`;
}
function gapText(gap: DerivedGap | null, fallback: string): string {
  if (!gap) return fallback;
  return pct(gap.value);
}
function likeNote(town: TownGapRow): string {
  if (town.asking_vs_up_to_five_years_pct) return gapWord(town.asking_vs_up_to_five_years_pct.value);
  if (town.status === 'all_ages_only' || town.status === 'withheld') return 'Sheet prints n.r.';
  if (town.status === 'not_in_table') return 'No ministry row';
  return '';
}

export default function SpainTownsPage() {
  const view = getEsTownGap();
  const pending = view.status === 'pending';
  const ready = view.status === 'ready';
  const s = view.summary;
  const reported = view.towns.filter((t) => t.status !== 'insufficient');
  const small = view.towns.filter((t) => t.status === 'insufficient');
  const matched = view.towns.filter((t) => t.municipality);

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Spain municipal appraisal comparison',
    description: view.coverage_note ?? 'Ministry municipal appraisals joined to Avena new-build asking prices.',
    url: 'https://avenaterminal.com/spain/towns',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: view.sources?.municipal_appraisal.url ?? 'https://apps.fomento.gob.es/Boletinonline2/sedal/35103500.XLS',
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
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Spain municipal appraisal</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Town by town,<br />
              <span className="text-gold italic">beside the appraisal.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              For every town in the current Avena corpus, the median new-build asking price per m² sits beside the ministry’s appraised value per m² for that municipality. The comparison uses homes up to five years old when the sheet publishes that cell. Refreshed from the public file each week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
              {view.coverage_note ?? 'Official figures are pending the first refresh of data/es-town-gap.json.'}
            </p>
            <p className="text-sm mb-8">
              <Link href="/spain/official" className="text-primary hover:underline">Province benchmark</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/supply" className="text-primary hover:underline">Supply pipeline</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/europe/official" className="text-primary hover:underline">Eurostat house price index</Link>
            </p>
            {pending ? (
              <div className="rounded-sm border p-5 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">Pending first refresh</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The weekly job has not written municipal figures yet. No appraisal and no gap is filled in.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                <Stat label={`Up to five years, ${quarterLabel(view.period)}`} value={String(s.with_up_to_five_year_gap)} sub="Towns with a published gap" />
                <Stat label="All-ages only" value={String(s.all_ages_only)} sub="Sheet prints n.r. for up to five years" />
                <Stat label="Not in the table" value={String(s.not_in_ministry_table)} sub="No row for that place" />
                <Stat label={`Below ${s.min_priced_listings} priced listings`} value={String(s.insufficient_listings)} sub="Median and gap withheld" />
              </div>
            )}
          </div>
        </section>

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Towns with enough listings</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Asking price, municipal appraisal.</h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
              A gap is how far the Avena median sits above or below the appraisal, in percent. It is computed here. It is not published by the ministry. The up-to-five-years gap is blank when the sheet prints n.r. The all-ages figure is not copied into it.
            </p>

            <div className="lg:hidden space-y-4">
              {reported.map((t) => (
                <TownCard key={`${t.province_key}-${t.town}`} town={t} />
              ))}
            </div>

            <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Town</Th>
                    <Th align="right">Avena median asking</Th>
                    <Th align="right">Appraisal, up to 5 years</Th>
                    <Th align="right">Asking vs up to 5 years</Th>
                    <Th align="right">Appraisal, all ages</Th>
                    <Th align="right">Asking vs all ages</Th>
                  </tr>
                </thead>
                <tbody>
                  {reported.map((t) => (
                    <tr key={`${t.province_key}-${t.town}`} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <span className="text-sm text-foreground">{t.town}</span>
                        <span className="block text-[11px] text-muted-foreground">{t.province}{t.municipality && t.municipality !== t.town ? ` · ${t.municipality}` : ''}</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{eurM2(t.avena_median_asking_eur_m2)}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{t.listings.toLocaleString('en-GB')} listings · {t.priced_listings.toLocaleString('en-GB')} priced</span>
                      </Td>
                      <Td align="right">
                        <Mono strong>{appraisalText(t.up_to_five_years, 'Not in the table')}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{appraisalNote(t.up_to_five_years)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{gapText(t.asking_vs_up_to_five_years_pct, t.status === 'all_ages_only' || t.status === 'withheld' ? 'n.r.' : '–')}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{gapWord(t.asking_vs_up_to_five_years_pct?.value) || (t.asking_vs_up_to_five_years_pct ? 'Derived' : '')}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{appraisalText(t.all_ages, '–')}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{appraisalNote(t.all_ages)}</span>
                      </Td>
                      <Td align="right">
                        <Mono>{gapText(t.asking_vs_all_ages_pct, '–')}</Mono>
                        <span className="block text-[11px] text-muted-foreground">{t.asking_vs_all_ages_pct ? 'All ages · derived' : ''}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {view.unmapped_listings > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {view.unmapped_listings.toLocaleString('en-GB')} listings could not be placed in a province and are not in the medians.
              </p>
            )}
          </div>
        </section>

        {small.length > 0 && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Below the floor</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Too few listings for a median.</h2>
              <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-8">
                A town with fewer than {s.min_priced_listings} listings that have a positive asking €/m² is marked insufficient. The median and both gaps are blank. The ministry figure is shown when the town matched a row.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {small.map((t) => (
                  <div key={`${t.province_key}-${t.town}`} className="rounded-sm border px-4 py-3" style={{ borderColor: 'hsl(var(--av-border))' }}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <div className="text-sm text-foreground">{t.town}</div>
                        <div className="text-[11px] text-muted-foreground">{t.province} · {t.priced_listings.toLocaleString('en-GB')} priced of {t.listings.toLocaleString('en-GB')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs text-foreground/80">{t.municipality ? appraisalText(published(t.up_to_five_years) ? t.up_to_five_years : t.all_ages, 'n.r.') : 'Not in the table'}</div>
                        <div className="text-[11px] text-muted-foreground">{t.municipality ? (published(t.up_to_five_years) ? 'Up to 5 years' : 'All ages') : 'Insufficient'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {ready && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Provenance</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Series, period, retrieval.</h2>
              <p className="lg:hidden text-sm text-muted-foreground mb-6">Series identifiers are on each town card. The full table is on a wider screen.</p>
              <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                    <tr>
                      <Th>Town</Th>
                      <Th>Up to five years</Th>
                      <Th>All ages</Th>
                      <Th>Retrieved</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((t) => (
                      <tr key={`${t.province_key}-${t.town}`} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td>
                          <span className="text-sm text-foreground">{t.town}</span>
                          <span className="block text-[11px] text-muted-foreground">{t.municipality}</span>
                        </Td>
                        <Td>{t.up_to_five_years ? <Series slot={t.up_to_five_years} /> : <Mono>–</Mono>}</Td>
                        <Td>{t.all_ages ? <Series slot={t.all_ages} /> : <Mono>–</Mono>}</Td>
                        <Td><Mono>{t.up_to_five_years?.retrieved_at ?? t.all_ages?.retrieved_at ?? '–'}</Mono></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Retrieved {view.retrieved_at}. File date {view.sources?.municipal_appraisal.file_modified ?? 'not sent'}. Machine-readable copy:{' '}
                <Link href="/api/v1/es-town-gap" className="text-primary hover:underline">/api/v1/es-town-gap</Link>.
              </p>
            </div>
          </section>
        )}

        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What these numbers are</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">An appraisal, not a deed.</h2>
            <ul className="max-w-3xl space-y-4">
              {view.caveats.map((c) => (
                <li key={c} className="text-sm leading-relaxed text-muted-foreground border-l pl-4" style={{ borderColor: 'hsl(var(--av-primary) / 0.7)' }}>{c}</li>
              ))}
            </ul>
            <div className="mt-10">
              <SourceCard
                title="Ministry appraisal, municipalities over 25,000"
                body={view.sources ? `${view.sources.municipal_appraisal.up_to_five_years_definition} ${view.sources.municipal_appraisal.licence_note} Latest period in this file: ${quarterLabel(view.sources.municipal_appraisal.period)}.` : 'Pending first refresh.'}
                href={view.sources?.municipal_appraisal.url ?? 'https://apps.fomento.gob.es/Boletinonline2/sedal/35103500.XLS'}
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
            <p className="mt-8 text-xs text-muted-foreground leading-relaxed max-w-3xl">{view.method.avena_median}</p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-3xl">{view.method.gap}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function TownCard({ town }: { town: TownGapRow }) {
  return (
    <article className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{town.province}</div>
      <h3 className="font-serif text-3xl font-light text-foreground mb-1">{town.town}</h3>
      {town.municipality && town.municipality !== town.town && (
        <p className="mb-4 text-[11px] text-muted-foreground">{town.municipality}</p>
      )}
      <dl className="grid grid-cols-2 gap-4 mt-4">
        <Field label="Avena median asking" value={`${eurM2(town.avena_median_asking_eur_m2)}/m²`} note={`${town.priced_listings.toLocaleString('en-GB')} priced of ${town.listings.toLocaleString('en-GB')}`} />
        <Field label="Appraisal, up to 5 years" value={appraisalText(town.up_to_five_years, 'Not in the table')} note={appraisalNote(town.up_to_five_years) || 'No ministry row'} />
        <Field label="Asking vs up to 5 years" value={gapText(town.asking_vs_up_to_five_years_pct, town.status === 'all_ages_only' || town.status === 'withheld' ? 'n.r.' : '–')} note={likeNote(town)} />
        <Field label="Appraisal, all ages" value={appraisalText(town.all_ages, '–')} note={town.asking_vs_all_ages_pct ? `${pct(town.asking_vs_all_ages_pct.value)} · all ages, derived` : appraisalNote(town.all_ages)} />
      </dl>
      {town.up_to_five_years && (
        <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
          <span className="block">{town.up_to_five_years.series_id}</span>
          <span className="block">{quarterLabel(town.up_to_five_years.period)} · {town.up_to_five_years.retrieved_at} · {town.up_to_five_years.source_name}</span>
        </p>
      )}
    </article>
  );
}

function Series({ slot }: { slot: AppraisalSlot }) {
  return (
    <span className="block">
      <Mono>{slot.series_id}</Mono>
      <span className="block text-[11px] text-muted-foreground">{quarterLabel(slot.period)} · {published(slot) ? eurM2(slot.value) : 'n.r.'} · {slot.appraisals.toLocaleString('en-GB')} appraisals</span>
    </span>
  );
}

function SourceCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <div className="rounded-sm border p-5 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <h3 className="font-serif text-2xl font-light text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{body}</p>
      <a href={href} className="text-sm text-primary hover:underline break-all">{href.replace('https://', '')}</a>
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

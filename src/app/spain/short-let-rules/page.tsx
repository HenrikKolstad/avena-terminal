import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { StrRiskBadge } from '@/components/str/StrRiskBadge';
import { getStrRegulation, type StrRiskLevel, type StrTownView } from '@/lib/str-regulation';

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Spain short-let rules · Avena Terminal',
  description:
    'Town-by-town short-let regulatory risk for the Spanish coast Avena covers, with the regional regime, any municipal limit that was read, the official source, and the review date. Not legal advice. The yield figure is unchanged.',
  alternates: { canonical: 'https://avenaterminal.com/spain/short-let-rules' },
  openGraph: {
    title: 'Spain short-let rules · Avena Terminal',
    description: 'Whether a modelled short-let yield is legally available, town by town, from official gazettes.',
    url: 'https://avenaterminal.com/spain/short-let-rules',
    siteName: 'Avena',
    type: 'website',
  },
};

const LEVELS: StrRiskLevel[] = ['high', 'elevated', 'low', 'unknown'];

export default function ShortLetRulesPage() {
  const view = getStrRegulation();
  const pending = view.status !== 'ready';
  const towns = view.towns.filter((town) => town.in_book);
  const sources = [
    ...view.national.flatMap((rule) => rule.sources.map((source) => source.url)),
    ...view.regions.flatMap((rule) => rule.sources.map((source) => source.url)),
  ];

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena short-let regulatory risk, Spanish coast',
    description: view.not_legal_advice ?? 'Short-let rules for towns in the Avena book. Not legal advice.',
    url: 'https://avenaterminal.com/spain/short-let-rules',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: sources,
    spatialCoverage: 'Spain',
    dateModified: view.reviewed_at,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Short-let regulatory risk</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Short-let rules,<br />
              <span className="text-gold italic">town by town.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              The gross yield on a listing is a short-let estimate. This page says, for each town in the current book, whether the published rules let that use be treated as legally available to a new buyer.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">
              {view.not_legal_advice ?? 'This page is not legal advice. The short-let file is not loaded, so no risk level is shown.'}
            </p>
            {view.yield_maths && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-4">{view.yield_maths}</p>
            )}
            <p className="text-sm mb-8">
              <Link href="/official" className="text-primary hover:underline">Official statistics</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/spain/rents" className="text-primary hover:underline">Habitual rents beside the short-let yield</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/due-diligence" className="text-primary hover:underline">Due diligence</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/data/price-index" className="text-primary hover:underline">Same-unit asking-price index</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/data/absorption" className="text-primary hover:underline">Listing absorption</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/methodology" className="text-primary hover:underline">Methodology</Link>
              <span className="text-muted-foreground"> · </span>
              <Link href="/api/v1/str-regulation" className="text-primary hover:underline">JSON</Link>
            </p>
            {pending ? (
              <div className="rounded-sm border p-5 max-w-3xl" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">File not loaded</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {view.message} Yields elsewhere on the site stay as they are. No risk flag is shown next to them.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                <Stat label="Towns in the book" value={String(view.counts.towns)} sub={`Reviewed ${view.reviewed_at}`} />
                <Stat label="High" value={String(view.counts.high)} sub={view.method?.risk_levels.high ?? ''} />
                <Stat label="Elevated" value={String(view.counts.elevated)} sub={view.method?.risk_levels.elevated ?? ''} />
                <Stat label="Unknown" value={String(view.counts.unknown)} sub={`${view.counts.low} low. ${view.method?.risk_levels.unknown ?? ''}`} />
              </div>
            )}
          </div>
        </section>

        {!pending && view.method && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">How a level is assigned</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Read the instrument, or say unknown.</h2>
              <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-6">{view.method.question}</p>
              <div className="grid gap-4 md:grid-cols-2 mb-8">
                {LEVELS.map((level) => (
                  <article key={level} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                    <StrRiskBadge level={level} href="/spain/short-let-rules#towns" />
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{view.method?.risk_levels[level]}</p>
                  </article>
                ))}
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-4">{view.method.national_note}</p>
              <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed">{view.method.municipal_note}</p>
            </div>
          </section>
        )}

        {!pending && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">National rules on every row</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Community consent, and what the Court left standing.</h2>
              <div className="grid gap-6">
                {view.national.map((rule) => (
                  <article key={rule.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                    <h3 className="font-serif text-2xl font-light text-foreground mb-3">{rule.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{rule.summary}</p>
                    <SourceList sources={rule.sources} />
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {!pending && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Regional regime</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-8">Andalusia, Valencia, Murcia.</h2>
              <div className="grid gap-6">
                {view.regions.map((rule) => (
                  <article key={rule.id} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{rule.provinces.join(' · ')}</div>
                    <h3 className="font-serif text-2xl font-light text-foreground mb-3">{rule.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{rule.summary}</p>
                    <SourceList sources={rule.sources} />
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {!pending && (
          <section id="towns" className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Towns in the book</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">One row, one place name.</h2>
              <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">
                The place name is the location string on the listing. A district Avena lists on its own stays on its own row. Next review {view.next_review}.
              </p>
              <div className="lg:hidden space-y-4">
                {towns.map((town) => <TownCard key={town.slug} town={town} />)}
              </div>
              <div className="hidden lg:block rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                    <tr>
                      <Th>Place</Th>
                      <Th>Risk</Th>
                      <Th>Why</Th>
                      <Th>As of</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {towns.map((town) => (
                      <tr key={town.slug} id={town.slug} className="border-t align-top" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td>
                          <span className="text-sm text-foreground">{town.place}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {town.province} · {town.costa}
                            {town.municipality && town.municipality !== town.place ? ` · ${town.municipality}` : ''}
                            {town.municipality_resolution === 'unresolved' ? ' · town hall not identified' : ''}
                          </span>
                        </Td>
                        <Td><StrRiskBadge level={town.risk} reason={town.reason} href={`#${town.slug}`} /></Td>
                        <Td>
                          <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">{town.reason}</p>
                          <SourceList sources={town.sources} />
                        </Td>
                        <Td><Mono>{town.as_of}</Mono></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {!pending && (
          <section className="border-b" style={{ borderColor: BORDER }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Review</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Twice a year, by hand.</h2>
              <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-6">{view.review_cadence}</p>
              <ul className="max-w-3xl space-y-3 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                {view.limitations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function TownCard({ town }: { town: StrTownView }) {
  return (
    <article id={`${town.slug}-card`} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{town.province} · {town.costa}</div>
      <h3 className="font-serif text-3xl font-light text-foreground mb-3">{town.place}</h3>
      <StrRiskBadge level={town.risk} reason={town.reason} href={`#${town.slug}-card`} />
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{town.reason}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">As of {town.as_of}</p>
      <SourceList sources={town.sources} />
    </article>
  );
}

function SourceList({ sources }: { sources: { title: string; url: string; published: string | null }[] }) {
  if (!sources.length) return null;
  return (
    <ul className="mt-3 space-y-1">
      {sources.map((source) => (
        <li key={source.url} className="text-[11px] leading-relaxed">
          <a href={source.url} className="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">{source.title}</a>
          {source.published ? <span className="text-muted-foreground"> · {source.published}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</div>
      <div className="font-serif text-3xl font-light text-foreground">{value}</div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-4">{sub}</p>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-4 py-4 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}

function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-sm tabular text-foreground">{children}</span>;
}

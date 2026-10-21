import type { ReactNode } from 'react';
import Link from 'next/link';
import { PrintButton } from '@/components/reports/PrintButton';
import type { InstitutionalSample } from '@/lib/institutional-load';
import type { AbsorptionRow, Bucket, GroupRow, PairedSlice } from '@/lib/fund-report';
import { MIN_TOWN_ABSORPTION, MIN_TOWN_N } from '@/lib/fund-report';
import { fmtCount, fmtEur, fmtNum, fmtPct, fmtPoints, fmtSignedPct } from '@/lib/report-format';

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
      <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
      {children}
    </span>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</div>
      <div className="font-serif text-3xl font-light tabular text-foreground">{value}</div>
      {note ? <div className="mt-2 text-xs text-muted-foreground leading-relaxed">{note}</div> : null}
    </div>
  );
}

function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="print-table overflow-x-auto rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <table className="w-full min-w-[640px] font-mono text-sm">{children}</table>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ borderColor: 'hsl(var(--av-border))' }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <td className={`px-3 py-2 text-foreground tabular ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>
  );
}

function sparkline(values: Array<number | null>): string | null {
  const pts = values.flatMap((value, index) => (value != null && Number.isFinite(value) ? [{ value, index }] : []));
  if (pts.length < 2) return null;
  const width = 320;
  const height = 56;
  const min = Math.min(...pts.map((p) => p.value));
  const max = Math.max(...pts.map((p) => p.value));
  const span = max - min || 1;
  return pts.map((p) => {
    const x = (p.index / (values.length - 1)) * width;
    const y = height - ((p.value - min) / span) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function FundReportView({
  data,
  printableHref,
}: {
  data: InstitutionalSample;
  printableHref?: string;
}) {
  const { book, history, absorption, model, coverage, issues } = data;
  const line = history ? sparkline(history.samples.map((d) => d.medianPm2)) : null;

  return (
    <article id="fund-report-root" className="print-root">
      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-14">
          <Eyebrow>Sample fund report · Spanish coastal new-builds</Eyebrow>
          <h1 className="font-serif text-4xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
            Asking-price book,
            <br />
            <span className="italic text-gold">as observed</span>.
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
            A specimen of the cross-section and the short history an institutional reader can actually be shown today.
            Every figure is computed from the live book or from stored snapshots. Where a series does not exist, the section says so.
          </p>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            This is not a valuation, not a registered-sale index, and not a performance record.
            Feed exits are listings that left the source book. Yields are a model.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <PrintButton href={printableHref} />
            <Link href="/reports/sample/data" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold">
              JSON of these figures
            </Link>
            <Link href="/track-record" className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold">
              Score track record
            </Link>
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Generated {data.generatedAt.slice(0, 16).replace('T', ' ')} UTC
            {coverage.feedUpdated ? ` · Feed book stamped ${coverage.feedUpdated}` : ''}
            {coverage.snapshotMax ? ` · Latest snapshot ${coverage.snapshotMax}` : ''}
          </p>
        </div>
      </section>

      {issues.length > 0 ? (
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-8">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Sections omitted or degraded</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {issues.map((issue) => (
                <li key={`${issue.section}:${issue.message}`}><span className="text-foreground">{issue.section}.</span> {issue.message}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-2">Market overview</h2>
          <p className="mb-8 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            Current asking book in <span className="font-mono">public/data.json</span>, scored at read time.
            Medians use listings with a positive price or €/m². A missing yield is left out of the yield median. It is not treated as zero.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
            <Stat label="Listings" value={fmtCount(book.n)} note={`${fmtCount(book.priced)} with a positive asking price`} />
            <Stat label="Median asking price" value={fmtEur(book.medianPrice)} />
            <Stat label="Median asking €/m²" value={fmtEur(book.medianPm2)} />
            <Stat label="Median score" value={fmtNum(book.medianScore, 0)} note={`${fmtCount(book.scored)} scored`} />
            <Stat label="Median modelled gross yield" value={fmtPoints(book.medianYield)} note={`${fmtCount(book.withYield)} with a yield`} />
            <Stat label="Asking below benchmark" value={fmtPct(book.shareBelowBenchmark)} note={`${fmtCount(book.benchmarkCompared)} listings with both €/m² figures`} />
            <Stat label="Costas in the book" value={fmtCount(book.costas)} />
            <Stat label="Towns reported" value={fmtCount(book.townsReported)} note={`${fmtCount(book.townsOmitted)} towns under ${MIN_TOWN_N} listings are omitted`} />
          </div>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-2">By costa</h2>
          <p className="mb-6 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            Costa names are the strings stored on the feed, including inland and Cádiz splits. They are not collapsed into a region code.
          </p>
          <GroupTable rows={book.byCosta} name="Costa" />
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-2">By town</h2>
          <p className="mb-6 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            Towns with at least {MIN_TOWN_N} listings. {fmtCount(book.townsOmitted)} smaller towns stay in the book totals and are not given their own row.
          </p>
          <GroupTable rows={book.byTown} name="Town" />
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-2">Price levels and trend</h2>
          {!history ? (
            <p className="text-sm text-muted-foreground">Price history is unavailable. The coverage note below says why.</p>
          ) : (
            <>
              <p className="mb-6 max-w-3xl text-sm text-muted-foreground leading-relaxed">
                Ground truth is <span className="font-mono">price_snapshots</span> from {history.firstDate} to {history.lastDate}
                {' '}({fmtCount(history.observedDays)} observed days, {fmtCount(history.spanDays)} calendar days).
                The line is the median asking €/m² of the book on sampled days. The mix changes as listings enter and leave.
                The paired figure holds the ref fixed.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-sm border mb-8" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
                <Stat label="Paired listings" value={fmtCount(history.paired)} note="Present with a positive price on both the first and latest day" />
                <Stat label="Median paired change" value={fmtSignedPct(history.medianPairedChange)} note="Same ref, asking price" />
                <Stat label="Longest capture gap" value={history.longestMissingDays ? `${fmtCount(history.longestMissingDays)} days` : 'None'} />
              </div>
              {history.missing.length > 0 ? (
                <ul className="mb-6 text-sm text-muted-foreground space-y-1">
                  {history.missing.map((gap) => (
                    <li key={gap.start}>No snapshot from {gap.start} through {gap.end} ({fmtCount(gap.missingDays)} days).</li>
                  ))}
                </ul>
              ) : null}
              {line ? (
                <div className="mb-6">
                  <svg viewBox="0 0 320 56" className="w-full max-w-xl h-16" role="img" aria-label="Median asking euro per square metre on sampled days">
                    <polyline fill="none" stroke="hsl(var(--av-primary))" strokeWidth="1.5" points={line} />
                  </svg>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Sampled observation days, not a filled calendar. {history.samples[0]?.date} to {history.samples[history.samples.length - 1]?.date}.
                  </p>
                </div>
              ) : null}
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th align="right">Listings</Th>
                    <Th align="right">Priced</Th>
                    <Th align="right">Median price</Th>
                    <Th align="right">Median €/m²</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.samples.map((day) => (
                    <tr key={day.date} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.35)' }}>
                      <Td>{day.date}</Td>
                      <Td align="right">{fmtCount(day.n)}</Td>
                      <Td align="right">{fmtCount(day.priced)}</Td>
                      <Td align="right">{fmtEur(day.medianPrice)}</Td>
                      <Td align="right">{fmtEur(day.medianPm2)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <h3 className="mt-10 mb-3 font-serif text-2xl font-light text-foreground">Paired change by region</h3>
              <p className="mb-4 text-sm text-muted-foreground">Region labels are the most common costa name on the current book for that region code. The code is kept when the book has no match.</p>
              <PairedTable rows={history.byRegion} name="Region" />
              <h3 className="mt-10 mb-3 font-serif text-2xl font-light text-foreground">Paired change by town</h3>
              <p className="mb-4 text-sm text-muted-foreground">Towns with at least {MIN_TOWN_ABSORPTION} listings present on both days. {fmtCount(history.townsOmitted)} towns are below that bar.</p>
              {history.byTown.length ? <PairedTable rows={history.byTown} name="Town" /> : <p className="text-sm text-muted-foreground">No town reached the paired-sample bar.</p>}
            </>
          )}
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-2">Supply and feed exits</h2>
          {!absorption ? (
            <p className="text-sm text-muted-foreground">Absorption is unavailable. Sell-through is not estimated in its place.</p>
          ) : (
            <>
              <p className="mb-6 max-w-3xl text-sm text-muted-foreground leading-relaxed">
                An exit is a listing in the {absorption.startDate} snapshot that is absent on {absorption.endDate}.
                It is recorded when <span className="font-mono">sold_properties</span> has that ref on or after {coverage.ledgerEpoch}.
                A ref that is in the delisting ledger and back in the latest snapshot is a relisting, not an exit.
                None of these rows is a notary sale.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-sm border mb-8" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
                <Stat label="Start book" value={fmtCount(absorption.startBook)} note={absorption.startDate} />
                <Stat label="Latest book" value={fmtCount(absorption.latestBook)} note={absorption.endDate} />
                <Stat label="Exit rate" value={fmtPct(absorption.exitRate)} note={`${fmtCount(absorption.recordedExits)} recorded, ${fmtCount(absorption.unrecordedExits)} without a delisting row`} />
                <Stat label="Relisted" value={fmtCount(absorption.relisted)} note={`${fmtCount(absorption.soldRows)} delisting rows since ${coverage.ledgerEpoch}`} />
              </div>
              {absorption.soldOutsideStartBook > 0 ? (
                <p className="mb-4 text-sm text-muted-foreground">
                  {fmtCount(absorption.soldOutsideStartBook)} delisting rows are for refs that were not in the start-day book. They are not in the exit rate.
                </p>
              ) : null}
              <AbsTable rows={absorption.byRegion} name="Region" />
              <h3 className="mt-10 mb-3 font-serif text-2xl font-light text-foreground">Towns</h3>
              <p className="mb-4 text-sm text-muted-foreground">Starting book of at least {MIN_TOWN_ABSORPTION}. {fmtCount(absorption.townsOmitted)} towns omitted.</p>
              {absorption.byTown.length ? <AbsTable rows={absorption.byTown} name="Town" /> : <p className="text-sm text-muted-foreground">No town reached the starting-book bar.</p>}
            </>
          )}
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-6">Score and modelled yield</h2>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Score, current book</h3>
              <Buckets rows={book.scoreBuckets} total={book.scored} />
            </div>
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Modelled gross yield</h3>
              <Buckets rows={book.yieldBuckets} total={book.withYield} />
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                {fmtCount(book.yieldTownCard)} listings used a town rental card. {fmtCount(book.yieldEstimated)} used a regional or estimated card.
                The yield is not observed rent on the unit.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-4">Methodology</h2>
          <div className="max-w-3xl space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              The live book is the nightly RedSP feed written to <span className="font-mono">public/data.json</span>.
              Asking €/m² is price divided by built area. The benchmark €/m² on each listing is written when that feed is parsed:
              listings with a built area receive a hedonic estimate (a price-tier fit when that tier has enough listings, otherwise a global fit), and listings without area fall back to a town or region median of asking €/m².
            </p>
            <p>
              The Avena score is computed at read time. Weights in <span className="font-mono">src/lib/scoring.ts</span> are value 0.40, modelled gross yield 0.25, location 0.20, quality 0.10, completion risk 0.05.
              The value term is the gap between asking €/m² and the benchmark. Gross yield is a short-let model (nightly rate, occupied weeks, size and price multipliers) minus a fixed ownership-cost sketch for the net figure. This report publishes the gross figure only.
            </p>
            <p>
              Historical prices are <span className="font-mono">price_snapshots</span> on or after {coverage.ledgerEpoch}, the day the capture was pointed at the live feed.
              Rows before that date are excluded. Delistings are written only when the prior snapshot is at most 4 days old and the new feed still covers at least half of the prior refs. A quiet or broken feed is not allowed to mark the book as sold.
            </p>
            {model ? (
              <p>
                AVM error, read from <span className="font-mono">public/model-stats.json</span>
                {model.computedAt ? ` (${model.computedAt.slice(0, 10)})` : ''}
                {model.version ? `, ${model.version}` : ''}:
                {model.medianAbsErrorPct != null ? ` median absolute error ${fmtPoints(model.medianAbsErrorPct)}` : ' median absolute error unavailable'}
                {model.mapePct != null ? `, MAPE ${fmtPoints(model.mapePct)}` : ''}
                {model.within20Pct != null ? `, ${fmtPoints(model.within20Pct)} within 20%` : ''}
                {model.nScored != null ? `, n=${fmtCount(model.nScored)}` : ''}.
                {model.inSample ? ' The file marks this error as in-sample against asking prices.' : ''}
                {model.caveats.length ? ` ${model.caveats.join(' ')}` : ''}
              </p>
            ) : (
              <p>AVM error figures are omitted because model-stats.json could not be read.</p>
            )}
            <p>
              The published formula note is at <Link href="/methodology" className="text-primary hover:text-gold">/methodology</Link>.
              The score comparison against later prices is at <Link href="/track-record" className="text-primary hover:text-gold">/track-record</Link>.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-4">Data coverage</h2>
          <dl className="max-w-3xl space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div><dt className="text-foreground">Ledger epoch</dt><dd>Snapshots and scores before {coverage.ledgerEpoch} are excluded. That earlier archive repeated a frozen registry.</dd></div>
            <div><dt className="text-foreground">Snapshot span</dt><dd>{coverage.snapshotMin && coverage.snapshotMax ? `${coverage.snapshotMin} to ${coverage.snapshotMax}` : 'Unavailable'}, {coverage.observedDays != null ? `${fmtCount(coverage.observedDays)} observed days` : 'day count unavailable'}{coverage.observedSource ? `, calendar from ${coverage.observedSource === 'ledger' ? 'the published movement ledger after its endpoints matched the live table' : 'a direct probe of price_snapshots'}` : ''}.</dd></div>
            <div><dt className="text-foreground">Score span</dt><dd>{coverage.scoreMin && coverage.scoreMax ? `${coverage.scoreMin} to ${coverage.scoreMax}` : 'Unavailable'}.</dd></div>
            <div><dt className="text-foreground">Rows excluded before the epoch</dt><dd>score_history {coverage.scoreRowsBeforeEpoch != null ? fmtCount(coverage.scoreRowsBeforeEpoch) : 'unavailable'}; price_snapshots {coverage.snapshotRowsBeforeEpoch != null ? fmtCount(coverage.snapshotRowsBeforeEpoch) : 'unavailable'}.</dd></div>
            <div><dt className="text-foreground">What this report does not contain</dt><dd>No registered Spanish transaction prices, no official appraisal series, no second listing source, and no claim that a feed exit was a sale. French DVF rows in the database are a different country and are not used here.</dd></div>
          </dl>
        </div>
      </section>
    </article>
  );
}

function GroupTable({ rows, name }: { rows: GroupRow[]; name: string }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>{name}</Th>
          {name === 'Town' ? <Th>Costa</Th> : null}
          <Th align="right">n</Th>
          <Th align="right">Median price</Th>
          <Th align="right">Median €/m²</Th>
          <Th align="right">P25 €/m²</Th>
          <Th align="right">P75 €/m²</Th>
          <Th align="right">Median score</Th>
          <Th align="right">Median yield</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.35)' }}>
            <Td>{row.label}</Td>
            {name === 'Town' ? <Td>{row.detail ?? '—'}</Td> : null}
            <Td align="right">{fmtCount(row.n)}</Td>
            <Td align="right">{fmtEur(row.medianPrice)}</Td>
            <Td align="right">{fmtEur(row.medianPm2)}</Td>
            <Td align="right">{fmtEur(row.p25Pm2)}</Td>
            <Td align="right">{fmtEur(row.p75Pm2)}</Td>
            <Td align="right">{fmtNum(row.medianScore, 0)}</Td>
            <Td align="right">{fmtPoints(row.medianYield)}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function PairedTable({ rows, name }: { rows: PairedSlice[]; name: string }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>{name}</Th>
          <Th align="right">Paired</Th>
          <Th align="right">Median asking-price change</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.35)' }}>
            <Td>{row.label}</Td>
            <Td align="right">{fmtCount(row.paired)}</Td>
            <Td align="right">{fmtSignedPct(row.medianChange)}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function AbsTable({ rows, name }: { rows: AbsorptionRow[]; name: string }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>{name}</Th>
          <Th align="right">Start</Th>
          <Th align="right">Latest</Th>
          <Th align="right">Recorded exits</Th>
          <Th align="right">Unrecorded</Th>
          <Th align="right">Relisted</Th>
          <Th align="right">Exit rate</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.35)' }}>
            <Td>{row.label}</Td>
            <Td align="right">{fmtCount(row.startBook)}</Td>
            <Td align="right">{fmtCount(row.latestBook)}</Td>
            <Td align="right">{fmtCount(row.recordedExits)}</Td>
            <Td align="right">{fmtCount(row.unrecordedExits)}</Td>
            <Td align="right">{fmtCount(row.relisted)}</Td>
            <Td align="right">{fmtPct(row.exitRate)}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function Buckets({ rows, total }: { rows: Bucket[]; total: number }) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const share = total > 0 ? row.n / total : null;
        return (
          <li key={row.label} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 text-sm">
            <span className="font-mono text-[11px] text-muted-foreground">{row.label}</span>
            <span className="h-1.5 rounded-sm" style={{ background: 'hsl(var(--av-border))' }}>
              <span className="block h-1.5 rounded-sm" style={{ width: row.n === 0 || share == null ? '0%' : `${Math.max(2, share * 100)}%`, background: 'hsl(var(--av-primary) / 0.9)' }} />
            </span>
            <span className="text-right font-mono tabular text-foreground">{fmtCount(row.n)}</span>
          </li>
        );
      })}
    </ul>
  );
}

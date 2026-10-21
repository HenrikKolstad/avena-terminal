import Link from 'next/link';
import { PrintButton } from '@/components/reports/PrintButton';
import type { InstitutionalSample } from '@/lib/institutional-load';
import type { SideStats } from '@/lib/track-record';
import { comparisonSentence } from '@/lib/track-record';
import { fmtCount, fmtNum, fmtPct, fmtSignedPct } from '@/lib/report-format';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
      <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
      {children}
    </span>
  );
}

const CLAIM_TITLE: Record<string, string> = {
  unavailable: 'No comparison is published',
  too_thin: 'Too thin for a claim',
  illustrative: 'Illustrative only',
};

export function TrackRecordView({
  data,
  printableHref,
}: {
  data: InstitutionalSample;
  printableHref?: string;
}) {
  const track = data.track;
  const sentence = track ? comparisonSentence(track) : null;
  const predictions = data.coverage.predictionRows;

  return (
    <article id="track-record-root" className="print-root">
      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-14">
          <Eyebrow>Score track record · stored snapshots only</Eyebrow>
          <h1 className="font-serif text-4xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
            What the score said.
            <br />
            <span className="italic text-gold">What asking prices did next</span>.
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
            Listings are split once, on the first stored score day of the live ledger.
            Flagged means the stored score was at or above that day&apos;s 75th percentile, ties included.
            The outcome is the asking price on the latest snapshot, or a departure from the feed.
          </p>
          <div className="mt-8">
            <PrintButton href={printableHref} label="Printable version" />
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <Link href="/reports/sample" className="text-primary hover:text-gold">Sample fund report</Link>
            <span className="mx-2">·</span>
            <Link href="/methodology" className="text-primary hover:text-gold">Methodology</Link>
          </p>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-10">
          <div className="rounded-sm border p-6 sm:p-8" style={{ borderColor: 'hsl(var(--av-primary) / 0.45)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">
              {CLAIM_TITLE[track?.claim ?? 'unavailable']}
            </div>
            {!track ? (
              <p className="font-serif text-2xl font-light text-foreground leading-snug">
                The stored score history could not be compared with later snapshots.
              </p>
            ) : (
              <p className="font-serif text-2xl sm:text-3xl font-light text-foreground leading-snug">
                {track.cohortDate} to {track.outcomeDate}. {fmtCount(track.spanDays)} days. Cohort of {fmtCount(track.cohortN)}.
                Threshold {track.threshold == null ? 'unavailable' : fmtNum(track.threshold, Number.isInteger(track.threshold) ? 0 : 1)}.
              </p>
            )}
            {sentence ? <p className="mt-4 max-w-3xl text-sm text-muted-foreground leading-relaxed">{sentence}</p> : null}
          </div>
          {track ? (
            <ul className="mt-6 max-w-3xl space-y-2 text-sm text-muted-foreground leading-relaxed">
              {track.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : null}
          {data.issues.filter((issue) => issue.section === 'track' || issue.section === 'history' || issue.section === 'absorption').length > 0 ? (
            <ul className="mt-4 max-w-3xl space-y-2 text-sm text-muted-foreground">
              {data.issues.filter((issue) => issue.section === 'track' || issue.section === 'history' || issue.section === 'absorption').map((issue) => (
                <li key={issue.message}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {track ? (
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
            <h2 className="font-serif text-3xl font-light text-foreground mb-6">The two groups</h2>
            <div className="overflow-x-auto rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full min-w-[720px] font-mono text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Measure</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Flagged</th>
                    <th className="text-right px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rest of book</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Listings on the cohort day" a={fmtCount(track.flagged.n)} b={fmtCount(track.rest.n)} />
                  <Row label="With an entry asking price" a={fmtCount(track.flagged.withEntryPrice)} b={fmtCount(track.rest.withEntryPrice)} />
                  <Row label="Paired to the latest price" a={fmtCount(track.flagged.paired)} b={fmtCount(track.rest.paired)} />
                  <Row label="Median asking-price change" a={fmtSignedPct(track.flagged.medianChange)} b={fmtSignedPct(track.rest.medianChange)} />
                  <Row label="Cut by 1% or more" a={rateCell(track.flagged, 'cut')} b={rateCell(track.rest, 'cut')} />
                  <Row label="Raised by 1% or more" a={rateCell(track.flagged, 'up')} b={rateCell(track.rest, 'up')} />
                  <Row label="Inside 1%" a={rateCell(track.flagged, 'flat')} b={rateCell(track.rest, 'flat')} />
                  <Row label="Left the latest book" a={exitCell(track.flagged)} b={exitCell(track.rest)} />
                  <Row label="Of which, recorded delisting" a={fmtCount(track.flagged.recordedDelistings)} b={fmtCount(track.rest.recordedDelistings)} />
                  <Row label="Left with no delisting row" a={fmtCount(track.flagged.unrecordedExits)} b={fmtCount(track.rest.unrecordedExits)} />
                  <Row label="Delisted, then back in the book" a={fmtCount(track.flagged.relisted)} b={fmtCount(track.rest.relisted)} />
                </tbody>
              </table>
            </div>
            <p className="mt-4 max-w-3xl text-xs text-muted-foreground leading-relaxed">
              Cut, raise and flat shares use the paired listings as the denominator. The left-the-book share uses the cohort count.
              A share is left blank when its denominator is zero.
            </p>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-12">
          <h2 className="font-serif text-3xl font-light text-foreground mb-4">What is not on this page</h2>
          <div className="max-w-3xl space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              The <span className="font-mono">predictions</span> table
              {predictions == null ? ' could not be counted, so no hit rate is shown.' : predictions === 0 ? ' holds no rows. There is no resolved-forecast hit rate to publish.' : ` holds ${fmtCount(predictions)} rows. This page does not score them, because a hit rate needs a published resolution rule this ledger does not apply.`}
            </p>
            <p>
              Scores and snapshots before {data.coverage.ledgerEpoch} are excluded
              {data.coverage.scoreRowsBeforeEpoch != null ? ` (${fmtCount(data.coverage.scoreRowsBeforeEpoch)} earlier score rows` : ' (earlier score rows'}
              {data.coverage.snapshotRowsBeforeEpoch != null ? `, ${fmtCount(data.coverage.snapshotRowsBeforeEpoch)} earlier snapshot rows).` : ').'}
              {' '}That archive repeated a frozen registry and would invent a longer history.
            </p>
            <p>
              There is no registered sale price in the comparison. A fund reading this as evidence that the score predicts transaction outcomes would be reading past the data.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}

function rateCell(side: SideStats, kind: 'cut' | 'up' | 'flat'): string {
  const rate = kind === 'cut' ? side.materialCutRate : kind === 'up' ? side.materialIncreaseRate : side.flatRate;
  const count = kind === 'cut' ? side.materialCuts : kind === 'up' ? side.materialIncreases : side.flatPaired;
  if (rate == null) return '—';
  return `${fmtCount(count)} (${fmtPct(rate)})`;
}

function exitCell(side: SideStats): string {
  if (side.leftBookRate == null) return '—';
  return `${fmtCount(side.leftBook)} (${fmtPct(side.leftBookRate)})`;
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.35)' }}>
      <td className="px-3 py-2 text-left text-foreground">{label}</td>
      <td className="px-3 py-2 text-right tabular text-foreground">{a}</td>
      <td className="px-3 py-2 text-right tabular text-foreground">{b}</td>
    </tr>
  );
}

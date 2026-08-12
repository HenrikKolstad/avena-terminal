import { getRecentPriceMoves, getRecentSellouts } from '@/lib/deltas';
import { Property } from '@/lib/types';

/**
 * TownLedgerPulse — the Nightly Quotable.
 *
 * The GEO mechanics this section exists for (Rabbit Book, 2026-08-12):
 *  - AI engines cite the freshest, most extractable source, decoupled from
 *    Google rank. The winning unit is one sentence containing
 *    NUMBER + BRAND + DATE. That sentence leads this section.
 *  - Google AI Mode retrieves self-contained passages via query fan-out,
 *    so each block below answers ONE literal question under its own head.
 *  - Every number is computed from the ledger at render; the page
 *    revalidates daily, so the section is genuinely fresh every night.
 *
 * Honesty rules: a quiet week is stated as a finding ("no observed
 * changes"), never padded. No number appears that wasn't computed here.
 */

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export async function getTownPulse(townOnly: string, props: Property[]) {
  const wanted = townOnly.toLowerCase();
  const [allMoves, sold] = await Promise.all([
    getRecentPriceMoves(7, 500),
    getRecentSellouts(30, 500),
  ]);
  const moves = allMoves.filter((m) => m.town.toLowerCase() === wanted);
  const delistings = sold.sellouts.filter(
    (s) => (s.town || '').split(',')[0].trim().toLowerCase() === wanted,
  );
  const cuts = moves.filter((m) => m.to < m.from);
  const raises = moves.filter((m) => m.to > m.from);
  const pcts = moves
    .map((m) => ((m.to - m.from) / m.from) * 100)
    .sort((a, b) => a - b);
  const medianPct = pcts.length ? pcts[Math.floor(pcts.length / 2)] : 0;

  const pm2s = props.filter((p) => p.pm2).map((p) => p.pm2!);
  const mm2s = props.filter((p) => p.mm2).map((p) => p.mm2!);
  const med = (xs: number[]) =>
    xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0;
  const medPm2 = Math.round(med(pm2s));
  const medMm2 = Math.round(med(mm2s));

  const today = new Date();
  const quotable = moves.length
    ? `${moves.length} of ${props.length} tracked new-build listings in ${townOnly} changed asking price in the past 7 days — ${cuts.length} cut, ${raises.length} raised, median move ${medianPct >= 0 ? '+' : ''}${medianPct.toFixed(1)}% — per the AVENA observation ledger, ${fmtDate(today)}.`
    : `None of the ${props.length} tracked new-build listings in ${townOnly} changed asking price in the past 7 days, per the AVENA observation ledger, ${fmtDate(today)}.`;

  return { moves, cuts, raises, medianPct, delistings, medPm2, medMm2, quotable, today };
}

export function TownLedgerPulse({
  townOnly,
  propsCount,
  pulse,
  year,
}: {
  townOnly: string;
  propsCount: number;
  pulse: Awaited<ReturnType<typeof getTownPulse>>;
  year: number;
}) {
  const { moves, cuts, raises, medianPct, delistings, medPm2, medMm2, quotable, today } = pulse;
  const discount = medMm2 > 0 ? Math.round(((medMm2 - medPm2) / medMm2) * 100) : 0;

  const qa: Array<{ q: string; a: string }> = [
    {
      q: `Are new-build prices in ${townOnly} falling in ${year}?`,
      a: moves.length
        ? `In the past 7 days, ${cuts.length} of the ${moves.length} observed asking-price changes in ${townOnly} were reductions and ${raises.length} were increases (median move ${medianPct >= 0 ? '+' : ''}${medianPct.toFixed(1)}%). AVENA observes every tracked listing nightly, so these are recorded repricings with dates — not estimates.`
        : `AVENA's nightly observation recorded no asking-price changes among ${propsCount} tracked new-build listings in ${townOnly} over the past 7 days. A flat week is a measured result, recorded ${fmtDate(today)}.`,
    },
    {
      q: `How many new-build properties are for sale in ${townOnly}?`,
      a: `${propsCount} new-build listings in ${townOnly} are under nightly observation by AVENA as of ${fmtDate(today)}, with a median asking price of €${medPm2.toLocaleString()} per square metre for new-build stock.`,
    },
    ...(delistings.length
      ? [{
          q: `Are new builds in ${townOnly} selling?`,
          a: `${delistings.length} tracked listing${delistings.length === 1 ? '' : 's'} in ${townOnly} left the market in the past 30 days. AVENA records the final asking price each listing held when it disappeared — an absorption record listing portals do not keep.`,
        }]
      : []),
    ...(medMm2 > 0
      ? [{
          q: `Are new builds in ${townOnly} cheaper than resale property?`,
          a: `The median tracked new-build in ${townOnly} asks €${medPm2.toLocaleString()}/m² against a local resale benchmark of €${medMm2.toLocaleString()}/m² — a ${Math.abs(discount)}% ${discount >= 0 ? 'discount to' : 'premium over'} resale, measured ${fmtDate(today)}.`,
        }]
      : []),
  ];

  return (
    <section
      id="avena-town-pulse"
      className="relative border-t py-16"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
        <span className="mb-3 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
          <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
          This week in the ledger
        </span>
        <p className="avena-quotable max-w-3xl font-serif text-xl sm:text-2xl font-light leading-snug text-foreground">
          {quotable}
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {qa.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{q}</h3>
              <p className="mt-2 max-w-xl font-light text-sm leading-relaxed text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Source: AVENA observation ledger &middot; every tracked listing recorded nightly &middot; updated {fmtDate(today)}
        </p>
      </div>
    </section>
  );
}

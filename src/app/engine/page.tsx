/**
 * /engine — The Avena Engine (2026-08-04 redesign).
 *
 * Server wrapper: keeps metadata + JSON-LD for SEO/AI discovery, renders the
 * light institutional data-engine page (EngineClient). The technical cathedral
 * (methodology, proof, DELPHI, PLAB, standards, verify) is preserved as the
 * "go deeper" links at the foot of the page.
 */

import type { Metadata } from 'next';
import EngineClient from './EngineClient';
import { getEngineDeltas, getEngineTruth } from '@/lib/deltas';
import { getEngineStats } from '@/lib/deals';

// Revalidate hourly: the Delta Layer (live price moves + sell-outs from the
// moat tables) refreshes after each nightly capture instead of being frozen
// into a fully static build.
export const revalidate = 3600;

/**
 * The description used to carry four hardcoded figures. On 2026-09-09 all
 * four were wrong:
 *
 *   "€265M in identified savings"      actual €278.5M — drifts nightly
 *   "1,425 underpriced homes"          actual 1,464   — drifts nightly
 *   "394,000+ price records"           394,000 is exactly the size of the
 *                                      DEAD frozen backlog in
 *                                      property_pricing_history (status
 *                                      'listed', last written 2026-08-05),
 *                                      i.e. a capped write loop's repeats
 *   "396,000+ registered transactions" property_transactions holds 517,557
 *                                      rows for 55,986 distinct properties
 *                                      — the claim overstates by ~9x (O-77)
 *
 * The first two are DERIVED here: they come from the same book the page
 * renders, so they cannot drift away from it again. The second two are
 * DELETED rather than replaced. Removing a false claim needs no new number;
 * replacing one does, and neither of those has a defensible replacement yet
 * — the transactions figure is exactly what the odyssey/transactions-dedupe
 * branch decides, and "price records" counted duplicates of a dead table.
 *
 * Do not put a literal back here. Same defect as the hardcoded corpus size
 * (O-83): a fixed number describing a nightly-changing quantity is false by
 * construction, not by accident.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { savingsTotal, underpriced } = getEngineStats();
  const savingsM = Math.round(savingsTotal / 1_000_000);
  return {
    title: 'The Avena Engine — the data infrastructure behind every score · Avena',
    description:
      'Every Avena score is backed by continuously collected property data, ' +
      'historical pricing, registered transactions and developer intelligence ' +
      `— recomputed every night. €${savingsM}M in identified savings across ` +
      `${underpriced.toLocaleString('en-US')} underpriced homes.`,
    alternates: { canonical: 'https://avenaterminal.com/engine' },
  };
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'The Avena Engine',
  description:
    'The data infrastructure behind every Avena deal score: continuous collection, historical pricing, verified transactions, nightly re-scoring.',
  url: 'https://avenaterminal.com/engine',
};

export default async function EnginePage() {
  const [deltas, truth] = await Promise.all([getEngineDeltas(), getEngineTruth()]);
  const stats = getEngineStats();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EngineClient deltas={deltas} stats={stats} truth={truth} />
    </>
  );
}

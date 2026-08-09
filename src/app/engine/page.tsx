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

export const metadata: Metadata = {
  title: 'The Avena Engine — the data infrastructure behind every score · Avena',
  // Rewritten 2026-08-09. The previous description advertised "387,000+ price
  // records, 380,435+ verified transactions". Neither figure was what it
  // claimed: the first counts rows of a table holding zero price-move events,
  // the second is French DVF open data. A meta description is the first thing
  // an investor or journalist reads in a search result — it has to hold up.
  description:
    'Every Avena score is backed by property data re-read nightly and scored the same night — never guessed. Every new-build on the Costa Blanca, Cálida and del Sol, with a daily observation ledger of what each unit asked, when it moved, and when it left the market.',
  alternates: { canonical: 'https://avenaterminal.com/engine' },
};

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

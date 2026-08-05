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
import { getEngineDeltas } from '@/lib/deltas';

// Revalidate hourly: the Delta Layer (live price moves + sell-outs from the
// moat tables) refreshes after each nightly capture instead of being frozen
// into a fully static build.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'The Avena Engine — the data infrastructure behind every score · Avena',
  description:
    'Every Avena score is backed by continuously collected property data, historical pricing, verified transactions and developer intelligence — recomputed every night. €265M in identified savings across 1,425 underpriced homes, 387,000+ price records, 380,435+ verified transactions.',
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
  const deltas = await getEngineDeltas();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EngineClient deltas={deltas} />
    </>
  );
}

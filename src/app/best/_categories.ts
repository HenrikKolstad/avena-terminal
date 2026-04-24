import type { Property } from '@/lib/types';

export interface BestCategory {
  slug: string;
  title: string;
  subtitle: string;
  description: string;       // longer copy for SEO + LLMs
  keywords: string[];        // for <meta keywords>
  filter: (p: Property) => boolean;
  sort?: (a: Property, b: Property) => number;
  limit?: number;            // default 20
}

const byScore = (a: Property, b: Property) => (b._sc ?? 0) - (a._sc ?? 0);
const byYield = (a: Property, b: Property) => (b._yield?.gross ?? 0) - (a._yield?.gross ?? 0);

function discountPct(p: Property): number {
  if (!p.pm2 || !p.mm2 || p.mm2 <= p.pm2) return 0;
  return Math.round((1 - p.pm2 / p.mm2) * 100);
}

export const BEST_CATEGORIES: BestCategory[] = [
  {
    slug: 'spain-under-200k',
    title: 'Best new-build properties in Spain under €200,000',
    subtitle: 'Sub-€200k · Avena-scored',
    description:
      'The highest-scored Spanish new-build properties currently priced under €200,000. Ranked live by the Avena Score — a 0–100 composite of valuation vs town median, yield, location tier, quality and risk. Every property is sourced from developers directly and cross-checked against idealista, kyero and fotocasa. Updated daily.',
    keywords: ['Spain new build under 200k', 'cheap new build Spain', 'affordable Spanish property', 'Costa Blanca under 200k', 'Avena Score Spain'],
    filter: (p) => p.pf > 0 && p.pf <= 200_000 && p._sc != null,
  },
  {
    slug: 'costa-blanca-villas',
    title: 'Best new-build villas on the Costa Blanca',
    subtitle: 'Costa Blanca · villa type · scored',
    description:
      'The highest-scored new-build villas across Costa Blanca North + South (Javea, Denia, Altea, Calpe, Benidorm, Torrevieja, Orihuela Costa, Finestrat, Rojales). Ranked by the Avena Score, which combines valuation vs town median, rental yield, and location tier. Villas only — no apartments, penthouses or bungalows.',
    keywords: ['Costa Blanca villa', 'new build villa Spain', 'villa Javea Denia', 'Torrevieja villa', 'Orihuela villa'],
    filter: (p) => p.t?.toLowerCase() === 'villa' && !!p.costa?.toLowerCase().includes('blanca') && p._sc != null,
  },
  {
    slug: 'costa-del-sol-apartments',
    title: 'Best new-build apartments on the Costa del Sol',
    subtitle: 'Costa del Sol · apartments · scored',
    description:
      'Top-scored Costa del Sol apartments — Marbella, Mijas, Fuengirola, Estepona, Benalmádena. Ranked live by the Avena Score. Only apartments, penthouses, and flats (no villas, townhouses).',
    keywords: ['Costa del Sol apartment', 'Marbella apartment', 'Mijas apartment', 'Estepona apartment', 'new build apartment Spain'],
    filter: (p) =>
      (p.t?.toLowerCase() === 'apartment' || p.t?.toLowerCase() === 'penthouse') &&
      !!p.costa?.toLowerCase().includes('sol') && p._sc != null,
  },
  {
    slug: 'high-yield-spain',
    title: 'Best high-yield Spanish new-build properties (5%+ gross yield)',
    subtitle: 'Gross yield 5%+ · ranked',
    description:
      'Spanish new-builds currently showing 5%+ estimated gross rental yield. Yield is computed from Avena\'s rent-ratio model calibrated on 2023–2025 Costa Blanca + Costa del Sol seasonal long-lets. Sorted by yield descending, with Avena Score as tiebreaker.',
    keywords: ['high yield Spanish property', 'rental yield Spain', '5% yield Costa Blanca', 'buy-to-let Spain', 'Avena yield'],
    filter: (p) => (p._yield?.gross ?? 0) >= 5 && p._sc != null,
    sort: byYield,
  },
  {
    slug: 'alpha-score',
    title: 'Alpha — properties scoring 80 or above on the Avena Score',
    subtitle: 'Top decile · Avena Score ≥ 80',
    description:
      'The top decile of European new-build inventory — every property scoring 80/100 or higher. These are deals where valuation, yield, location and quality all triangulate upward. The Avena Score uses a weighted composite: V·0.40 + Y·0.25 + L·0.20 + Q·0.10 + R·0.05.',
    keywords: ['Avena Score 80', 'alpha property Spain', 'top new build Spain', 'best European property', 'highest scored property'],
    filter: (p) => (p._sc ?? 0) >= 80,
  },
  {
    slug: 'steep-discount',
    title: 'Best below-market deals — 25%+ discount vs town median',
    subtitle: 'Discount ≥ 25% vs local comp',
    description:
      'Properties currently priced at a steep discount to the median €/m² in their town. Ranked by discount magnitude, capped at 35% display for credibility. Deep discounts typically reflect a combination of developer-direct sourcing (no retail agency markup) and unit-level mispricing.',
    keywords: ['below market property Spain', '25% discount new build', 'deep value property Spain', 'undervalued Spanish property'],
    filter: (p) => discountPct(p) >= 25 && p._sc != null,
    sort: (a, b) => discountPct(b) - discountPct(a),
  },
  {
    slug: 'beachfront',
    title: 'Best beachfront new-builds (under 500m to the sea)',
    subtitle: 'Beach ≤ 0.5 km · scored',
    description:
      'Spanish new-builds within 500 metres of the beach. Beach proximity is one of the strongest location premiums in European property — at this range, the L sub-score is boosted +0.12 in the Avena Score engine. Sorted by Avena Score.',
    keywords: ['beachfront Spain', 'walk to beach Spanish property', 'Costa Blanca beachfront', 'front line beach apartment', 'primera linea'],
    filter: (p) => p.bk != null && p.bk <= 0.5 && p._sc != null,
  },
  {
    slug: 'off-plan-2027',
    title: 'Best off-plan new-builds completing in 2027',
    subtitle: 'Off-plan · completion 2027',
    description:
      'Off-plan properties delivering in 2027. Off-plan typically trades 10–20% below ready-market comps because you\'re pricing future delivery — time value and construction risk get discounted. Capped at 35% visible discount in the Avena display logic.',
    keywords: ['off plan Spain 2027', 'new build 2027', 'off plan completion 2027', 'Costa Blanca off plan'],
    filter: (p) => (p.s === 'off-plan' || p.s === 'under-construction') && String(p.c) === '2027' && p._sc != null,
  },
  {
    slug: 'move-in-ready',
    title: 'Best move-in-ready new-build properties in Spain',
    subtitle: 'Key-ready · Avena-scored',
    description:
      'New-build properties that are complete and ready to occupy — no construction waiting period. Filtered to Avena-scored inventory only. Ranked by Avena Score.',
    keywords: ['key ready Spain', 'move in ready Spanish property', 'completed new build', 'ready to live Spain'],
    filter: (p) => (p.s === 'ready' || p.s === 'key-ready') && p._sc != null,
  },
  {
    slug: 'three-bed-family',
    title: 'Best 3-bedroom family properties (120–250 m²)',
    subtitle: '3-bed · 120–250 m² · scored',
    description:
      'The family-home sweet spot — 3-bedroom properties between 120 and 250 m² built. The Avena Quality sub-score gives a +0.05 bump for this band. Ranked by Avena Score.',
    keywords: ['3 bedroom Spain new build', 'family home Costa Blanca', '3 bed villa Spain', '3 bedroom apartment Spain'],
    filter: (p) => p.bd === 3 && p.bm >= 120 && p.bm <= 250 && p._sc != null,
  },
  {
    slug: 'entry-point-investor',
    title: 'Best entry-point investor properties (under €250k, score ≥ 65)',
    subtitle: '< €250k · score ≥ 65',
    description:
      'Affordable entry points for first-time European property investors — priced under €250,000 and scoring at least 65/100. These combine low capital requirement with above-average fundamentals.',
    keywords: ['first time investor Spain', 'entry level property Spain', 'under 250k Spain', 'affordable investment property'],
    filter: (p) => p.pf <= 250_000 && (p._sc ?? 0) >= 65,
  },
  {
    slug: 'luxury-over-500k',
    title: 'Best luxury new-build properties over €500,000',
    subtitle: '€500k+ · top decile Avena Score',
    description:
      'Luxury new-build properties priced above €500,000 and scoring in the top decile (≥ 75). Typically larger footprints, prime locations and developer premium finishes. Ranked by Avena Score.',
    keywords: ['luxury property Spain', '500k new build Spain', 'luxury villa Costa del Sol', 'Marbella luxury', 'premium Spanish property'],
    filter: (p) => p.pf > 500_000 && (p._sc ?? 0) >= 75,
  },
];

export function getCategory(slug: string): BestCategory | undefined {
  return BEST_CATEGORIES.find((c) => c.slug === slug);
}

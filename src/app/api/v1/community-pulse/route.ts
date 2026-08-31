import { NextResponse } from 'next/server';

export const revalidate = 86400;

/**
 * Community sentiment.
 *
 * Until 2026-08-31 this route published social-listening data attributed to
 * Reddit, HackerNews, X/Twitter and LinkedIn: per-platform sentiment labels,
 * confidence scores to two decimals (0.74, 0.68, 0.61, 0.79), sample sizes
 * (847, 234, 12,400, 340), trending-topic lists and "key narratives". All of
 * it was hardcoded. Avena runs no social listening and holds no API access to
 * any of those platforms.
 *
 * The worst field was `mentions_avena`, summed into a composite
 * `total_avena_mentions: 18` — a fabricated measurement of Avena's own reach,
 * published by the same project that built a citation engine specifically to
 * measure that honestly.
 *
 * `total_signals_analyzed: 13821` was the sum of the four invented sample
 * sizes, presented as a volume of analysed material.
 *
 * The `unanswered_questions` block goes too: it asserted a `frequency` of
 * HIGH / VERY HIGH for each question "across community platforms", which is
 * the same unmade measurement in a different shape.
 *
 * Removed rather than corrected, per the be4a736 precedent.
 *
 * Avena does measure whether AI assistants cite it, on a versioned question
 * bank against live model lookups. That is published at /benchmark, and it is
 * the honest version of what this route pretended to be.
 */

const NOT_PUBLISHED = {
  sources:
    'Removed 2026-08-31. Were four hardcoded sentiment objects attributed to ' +
    'Reddit, HackerNews, X/Twitter and LinkedIn, with invented confidence ' +
    'scores, sample sizes, trending topics and narratives. Avena runs no ' +
    'social listening.',
  composite:
    'Removed 2026-08-31. Was a sample-size-weighted average over the invented ' +
    'sources above, including total_signals_analyzed: 13821 (the sum of four ' +
    'invented sample sizes).',
  total_avena_mentions:
    'Removed 2026-08-31. Was the literal 18 — a fabricated measurement of ' +
    "Avena's own reach. Avena's measured citation rate is published at " +
    '/benchmark, from live lookups against a versioned question bank.',
  unanswered_questions:
    'Removed 2026-08-31. Each carried a frequency label (HIGH, VERY HIGH) ' +
    'described as observed across community platforms. No such observation ' +
    'was made.',
} as const;

export async function GET() {
  return NextResponse.json({
    coverage:
      'Avena runs no social listening and publishes no community sentiment. ' +
      'This route returns an empty set rather than invented signals.',
    sources: {},
    sources_count: 0,
    see_instead: {
      citation_benchmark: 'https://avenaterminal.com/benchmark',
      description:
        'Whether AI assistants cite Avena, measured on a versioned question ' +
        'bank against live model lookups, with organic and branded control ' +
        'rates reported separately.',
    },
    not_published: NOT_PUBLISHED,
  });
}

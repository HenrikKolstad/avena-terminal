/**
 * src/lib/corpus-size-client.ts
 *
 * The size of the property book, for `'use client'` components.
 *
 * WHY THIS EXISTS
 * `getCorpusSize()` in `src/lib/properties.ts` is the single source of truth,
 * but it reads `public/data.json` from the filesystem, so a client component
 * cannot call it. That is the whole reason five client surfaces were still
 * publishing hardcoded counts — 1,999 on /search, 1,800+ on /calculator,
 * 1,881 on /checkout/success — against a live book of 2,029, each growing
 * more wrong every night the feed moved. The alternative fix was to split
 * each page into a server parent that passes the count down as a prop; this
 * is the same correctness with one shared seam instead of three.
 *
 * `NEXT_PUBLIC_CORPUS_SIZE` is derived from `public/data.json` in
 * `next.config.ts` and inlined into the client bundle at build time, so it is
 * accurate as of each deploy — and every deploy follows a feed refresh.
 *
 * THE ONE RULE HERE: AN ABSENT VALUE IS `null`, NEVER A NUMBER.
 * This project's recurring bug is a missing value silently becoming a zero,
 * or a plausible default, and being published as a measurement. A build that
 * failed to inline the count must make the number DISAPPEAR from the copy,
 * not substitute a stale literal or a 0. Callers are expected to branch on
 * null and drop the figure from the sentence: no number is honest, a wrong
 * number is not.
 */

const raw = process.env.NEXT_PUBLIC_CORPUS_SIZE;

/** The live book size at build time, or `null` if it was not inlined. */
export const CLIENT_CORPUS_SIZE: number | null = (() => {
  if (!raw) return null;
  const n = Number(raw);
  // A non-integer, a zero or a negative is a broken inline, not a book size.
  return Number.isInteger(n) && n > 0 ? n : null;
})();

/**
 * `CLIENT_CORPUS_SIZE` formatted the way published copy writes it
 * ("2,029"), or `null` when there is no trustworthy count to publish.
 */
export const CLIENT_CORPUS_SIZE_LABEL: string | null =
  CLIENT_CORPUS_SIZE === null ? null : CLIENT_CORPUS_SIZE.toLocaleString('en-US');

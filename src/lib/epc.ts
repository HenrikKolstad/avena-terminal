/**
 * EPC (Energy Performance Certificate) normalisation — the single source for
 * every Avena surface that reads a listing's energy field.
 *
 * This exists because two published APIs disagreed about the same property.
 * On 2026-08-25 `/api/v1/compliance` was fixed to return `epc_rating: null`
 * for listings carrying the feed's 'X' placeholder. `/api/v1/carbon` kept its
 * own `energy || 'D'` fallback, so on 2026-08-26 the two routes answered the
 * same question about ref N3099V with `null` and `"X"` / `80 kg/m²` / `9.4 t`
 * respectively. Cross-source agreement is the reason the corpus is worth
 * citing, so a second copy of this logic is a defect in itself.
 *
 * Any new surface reading `property.energy` must go through here.
 */

/** EPC letters recognised by the EPBD certificate scale. */
export const EPC_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type EpcLetter = (typeof EPC_LETTERS)[number];

/**
 * Normalises a listing's energy field to a recognised EPC letter, or null.
 *
 * The feed carries 'X' on 16 of 2,036 listings — a placeholder, not a rating.
 * Coercing it to a letter (the old `energy || 'D'`) publishes a fabricated
 * rating, and everything derived from it inherits the fabrication. Returning
 * null is the whole point of this function: null means "Avena does not hold
 * this certificate", which is true and useful, where 'D' is neither.
 */
export function toEpcLetter(energy: string | null | undefined): EpcLetter | null {
  if (!energy) return null;
  const letter = energy.trim().toUpperCase();
  return (EPC_LETTERS as readonly string[]).includes(letter)
    ? (letter as EpcLetter)
    : null;
}

/**
 * Splits a book of listings into those carrying a recognised EPC letter and
 * those that do not, with the per-letter distribution over the rated subset.
 *
 * The distribution deliberately excludes unrecognised values rather than
 * listing 'X' alongside A/B/C as though it were a rating of equal standing.
 */
export function epcDistribution(
  properties: ReadonlyArray<{ energy?: string | null }>,
): {
  rated: number;
  unrecognised: number;
  distribution: Record<EpcLetter, number>;
} {
  const distribution = Object.fromEntries(
    EPC_LETTERS.map((l) => [l, 0]),
  ) as Record<EpcLetter, number>;

  let unrecognised = 0;
  for (const p of properties) {
    const letter = toEpcLetter(p.energy);
    if (letter === null) unrecognised++;
    else distribution[letter]++;
  }

  return {
    rated: properties.length - unrecognised,
    unrecognised,
    distribution,
  };
}

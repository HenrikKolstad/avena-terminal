/**
 * Which API-key tiers may be issued, and by whom.
 *
 * Self-serve (anyone hitting POST /api/v1/keys or /api/v1/keys/generate) only
 * ever gets the FREE tier. Paid tiers are issued server-side: by the Stripe
 * webhook after payment, or by an admin request carrying ADMIN_TOKEN.
 * Before 2026-10-22 any caller could pass { tier: 'institutional' } and get a
 * paid key for free.
 */
export const ALL_TIERS = ['free', 'starter', 'pro', 'institutional'] as const;
export type Tier = (typeof ALL_TIERS)[number];
export const SELF_SERVE_TIER: Tier = 'free';

export type TierDecision =
  | { ok: true; tier: Tier }
  | { ok: false; status: 400 | 403; error: string };

export function decideTier(requested: unknown, isAdmin: boolean): TierDecision {
  const tier = requested === undefined || requested === null || requested === '' ? SELF_SERVE_TIER : requested;
  if (typeof tier !== 'string' || !(ALL_TIERS as readonly string[]).includes(tier)) {
    return { ok: false, status: 400, error: `Invalid tier. Must be one of: ${ALL_TIERS.join(', ')}` };
  }
  if (tier !== SELF_SERVE_TIER && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: `Self-serve keys are ${SELF_SERVE_TIER} tier only. Paid tiers are issued by Avena after purchase — contact Avena.`,
    };
  }
  return { ok: true, tier: tier as Tier };
}

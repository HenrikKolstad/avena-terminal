/**
 * Admin authentication helpers. Edge-safe (no node:crypto), so the same code
 * runs in middleware and in route handlers.
 *
 * The single admin secret is the ADMIN_TOKEN env var (Vercel, production).
 * Unset means NOBODY is admin: every check fails closed.
 */

/** Constant-time string comparison (length leak only). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Extract the secret a request presents: `Bearer <t>` or Basic auth password. */
export function presentedSecret(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const m = /^\s*(Bearer|Basic)\s+(.+)$/i.exec(authorization);
  if (!m) return null;
  if (m[1].toLowerCase() === 'bearer') return m[2].trim();
  try {
    const decoded = atob(m[2].trim());
    const i = decoded.indexOf(':');
    return i >= 0 ? decoded.slice(i + 1) : null;
  } catch {
    return null;
  }
}

/** True only when ADMIN_TOKEN is configured and the request presents it. */
export function isAdminRequest(authorization: string | null | undefined, adminToken = process.env.ADMIN_TOKEN): boolean {
  if (!adminToken || adminToken.length < 16) return false;
  const got = presentedSecret(authorization);
  return !!got && safeEqual(got, adminToken);
}

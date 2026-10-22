/**
 * Access control for the paid Sell-Through Monitor.
 *
 * Deliberately NOT the api_keys table: /api/v1/keys lets anyone self-issue an
 * "institutional" key, so it cannot gate a paid product. Lender keys are
 * issued by hand per customer and live in the LENDER_ACCESS_KEYS env var
 * (comma separated, each optionally "label:key"). No env var, no access.
 */
import { timingSafeEqual } from 'crypto';

export interface LenderAccess {
  ok: boolean;
  label?: string;
}

export function parseKeys(raw: string | undefined): Array<{ label: string; key: string }> {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const idx = entry.indexOf(':');
      return idx > 0 ? { label: entry.slice(0, idx), key: entry.slice(idx + 1) } : { label: `key${i + 1}`, key: entry };
    })
    .filter((k) => k.key.length >= 24); // refuse short, guessable keys
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkLenderKey(provided: string | null | undefined, raw = process.env.LENDER_ACCESS_KEYS): LenderAccess {
  if (!provided) return { ok: false };
  for (const k of parseKeys(raw)) if (safeEq(provided, k.key)) return { ok: true, label: k.label };
  return { ok: false };
}

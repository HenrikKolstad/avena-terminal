/**
 * Best-effort extraction of town / type / m² / price from a portal listing.
 *
 * Idealista and Fotocasa sit behind Cloudflare and usually refuse server
 * fetches. This never throws: whatever it can't read comes back empty, and
 * the front asks the buyer for the two or three missing fields instead.
 */

import type { CheckInputs, CheckType } from '@/lib/check';
import { matchTown } from '@/lib/check';

export interface Extracted {
  partial: Partial<CheckInputs>;
  fetched: boolean;
  portal: string | null;
}

const PORTALS: Record<string, string> = {
  'idealista.com': 'Idealista',
  'fotocasa.es': 'Fotocasa',
  'kyero.com': 'Kyero',
  'thinkspain.com': 'ThinkSpain',
  'rightmove.co.uk': 'Rightmove',
  'habitaclia.com': 'Habitaclia',
  'pisos.com': 'Pisos.com',
};

export function portalOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const [k, v] of Object.entries(PORTALS)) if (host.endsWith(k)) return v;
    return host;
  } catch {
    return null;
  }
}

function pick(html: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

function detectType(text: string): CheckType | undefined {
  const t = text.toLowerCase();
  if (/\bpenthouse|ático|atico\b/.test(t)) return 'Penthouse';
  if (/\bstudio|estudio\b/.test(t)) return 'Studio';
  if (/\btownhouse|adosad|pareado|semi-detached\b/.test(t)) return 'Townhouse';
  if (/\bbungalow\b/.test(t)) return 'Bungalow';
  if (/\bvilla|chalet|detached\b/.test(t)) return 'Villa';
  if (/\bapartment|apartamento|piso|flat\b/.test(t)) return 'Apartment';
  return undefined;
}

export async function extractFromUrl(url: string): Promise<Extracted> {
  const portal = portalOf(url);
  const out: Extracted = { partial: { source_url: url }, fetched: false, portal };

  let html = '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);
    if (res.ok) html = await res.text();
  } catch {
    /* blocked or offline — fall through with nothing */
  }
  if (!html || html.length < 500 || /cf-browser-verification|captcha/i.test(html.slice(0, 20000))) return out;

  out.fetched = true;
  const title = pick(html, [/og:title["\s]+content="([^"]+)"/i, /<title[^>]*>([^<]+)<\/title>/i, /<h1[^>]*>([^<]+)<\/h1>/i]);
  const desc = pick(html, [/og:description["\s]+content="([^"]+)"/i, /<meta\s+name="description"\s+content="([^"]+)"/i]);
  const head = `${title} ${desc}`;

  const priceRaw = pick(html, [/"price"\s*:\s*"?(\d{5,9})/i, /data-price="(\d+)"/i, /(\d{1,3}(?:[.,]\d{3}){1,2})\s*€/, /€\s*(\d{1,3}(?:[.,]\d{3}){1,2})/]);
  const price = priceRaw ? parseInt(priceRaw.replace(/[.,]/g, ''), 10) : 0;
  if (price >= 20_000) out.partial.asking_eur = price;

  const m2Raw = pick(html, [/(\d{2,4})\s*m[²2]\s*(?:built|construid|constr)/i, /(?:built|construid|constr)[^0-9]{0,20}(\d{2,4})\s*m/i, /(\d{2,4})\s*m[²2]/i]);
  const m2 = m2Raw ? parseInt(m2Raw, 10) : 0;
  if (m2 >= 20 && m2 <= 5000) out.partial.built_m2 = m2;

  const bedsRaw = pick(html, [/(\d)\s*(?:bed|hab|dorm)/i, /bedrooms?["\s:>]+(\d)/i]);
  if (bedsRaw) out.partial.bedrooms = parseInt(bedsRaw, 10);

  const type = detectType(head) ?? detectType(html.slice(0, 50_000));
  if (type) out.partial.type = type;

  // Town: try the title/description against our known towns.
  const words = head.split(/[^\p{L}\s']+/u).map((s) => s.trim()).filter((s) => s.length >= 3);
  for (const w of [head, ...words]) {
    const t = matchTown(w);
    if (t) { out.partial.town = t; break; }
  }

  if (/private pool|piscina privada/i.test(html)) out.partial.pool = 'private';
  else if (/communal pool|piscina comunitaria/i.test(html)) out.partial.pool = 'communal';
  if (/sea view|vistas al mar/i.test(html)) out.partial.sea_view = true;
  if (/golf/i.test(head)) out.partial.golf = true;

  return out;
}

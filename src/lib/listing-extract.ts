/**
 * Extraction of town / type / m² / price from a portal listing page.
 *
 * Fetching is in listing-fetch.ts (direct → paid proxy → reader). This file
 * only parses. Portal-specific parsers read the structured data each site
 * embeds (Idealista's utag/JSON blobs, Fotocasa's __INITIAL_PROPS__), then a
 * generic text pass fills whatever is still missing. Never throws: what it
 * can't read comes back empty and the front asks for it.
 */

import type { CheckInputs, CheckType } from '@/lib/check';
import { matchTown } from '@/lib/check';
import { fetchListingPage } from '@/lib/listing-fetch';

export interface Extracted {
  partial: Partial<CheckInputs>;
  fetched: boolean;
  route: string;
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

// ─── helpers ─────────────────────────────────────────────────────────────

function pick(s: string, patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = s.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

function toInt(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
}

function decode(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function detectType(text: string): CheckType | undefined {
  const t = text.toLowerCase();
  const has = (alts: string) => new RegExp(`(?:^|[^\\p{L}])(?:${alts})(?:$|[^\\p{L}])`, 'u').test(t);
  if (has('penthouse|ático|atico|attico')) return 'Penthouse';
  if (has('studio|estudio')) return 'Studio';
  if (has('townhouse|adosad[ao]|pareado|semi-?detached|casa adosada|terraced')) return 'Townhouse';
  if (has('bungalow|bungalo')) return 'Bungalow';
  if (has('villa|chalet|detached|casa independiente|finca')) return 'Villa';
  if (has('apartment|apartamento|piso|flat|dúplex|duplex')) return 'Apartment';
  return undefined;
}

function townFromText(text: string): string | undefined {
  // Try the whole string first (catches aliases like "La Finca Golf"), then
  // each comma/dash separated chunk, then single words.
  const whole = matchTown(text);
  if (whole) return whole;
  const chunks = text.split(/[,|·\-–—/()]+/).map((s) => s.trim()).filter((s) => s.length >= 3);
  for (const c of chunks) { const t = matchTown(c); if (t) return t; }
  const words = text.split(/[^\p{L}']+/u).filter((w) => w.length >= 4);
  for (const w of words) { const t = matchTown(w); if (t) return t; }
  return undefined;
}

// ─── Idealista ───────────────────────────────────────────────────────────

function parseIdealista(html: string, out: Partial<CheckInputs>) {
  // utag_data / dataLayer JSON — the cleanest source.
  const price = toInt(pick(html, [/"price"\s*:\s*"?(\d{5,9})"?/, /ad_price"?\s*:\s*"?(\d{5,9})/]));
  if (price >= 20_000) out.asking_eur = price;

  const m2 = toInt(pick(html, [/"constructedArea"\s*:\s*"?(\d{2,4})/, /"area"\s*:\s*"?(\d{2,4})/]));
  if (m2 >= 20) out.built_m2 = m2;

  const rooms = toInt(pick(html, [/"roomNumber"\s*:\s*"?(\d{1,2})/, /"rooms"\s*:\s*"?(\d{1,2})/]));
  if (rooms > 0) out.bedrooms = rooms;

  const typ = pick(html, [/"typology"\s*:\s*"([^"]+)"/, /"propertyType"\s*:\s*"([^"]+)"/]);
  const title = decode(pick(html, [/main-info__title-main[^>]*>([^<]+)</, /og:title"[^>]*content="([^"]+)"/, /<title[^>]*>([^<]+)</]));
  const type = detectType(`${typ} ${title}`);
  if (type) out.type = type;

  // Visible markup, as a second pass.
  if (!out.asking_eur) {
    const p = toInt(pick(html, [/info-data-price[^>]*>\s*([\d.,]+)/, /([\d]{1,3}(?:\.\d{3}){1,2})\s*€/]));
    if (p >= 20_000) out.asking_eur = p;
  }
  if (!out.built_m2) {
    const m = toInt(pick(html, [/(\d{2,4})\s*m²?\s*(?:construidos|built)/i, /info-features[\s\S]{0,200}?(\d{2,4})\s*m/]));
    if (m >= 20) out.built_m2 = m;
  }
  if (!out.bedrooms) {
    const b = toInt(pick(html, [/(\d{1,2})\s*hab\.?/i, /(\d{1,2})\s*(?:bed|dorm)/i]));
    if (b > 0) out.bedrooms = b;
  }

  const minor = decode(pick(html, [/main-info__title-minor[^>]*>([^<]+)</]));
  const muni = decode(pick(html, [/"municipality"\s*:\s*"([^"]+)"/, /"locationLevel\d"\s*:\s*"([^"]+)"/, /"city"\s*:\s*"([^"]+)"/]));
  const loc = [minor, muni, title].filter(Boolean).join(', ');
  const town = townFromText(loc);
  if (town) out.town = town;

  if (/"hasSwimmingPool"\s*:\s*"?(true|1)/.test(html) || /piscina/i.test(title)) out.pool = out.pool ?? 'private';
  if (/vistas al mar|sea view|"seaViews"\s*:\s*"?true/i.test(html)) out.sea_view = true;
  if (/\bgolf\b/i.test(loc)) out.golf = true;
}

// ─── Fotocasa ────────────────────────────────────────────────────────────

function parseFotocasa(html: string, out: Partial<CheckInputs>) {
  const price = toInt(pick(html, [/"price"\s*:\s*"?(\d{5,9})/, /"priceAmount"\s*:\s*"?(\d{5,9})/]));
  if (price >= 20_000) out.asking_eur = price;

  const m2 = toInt(pick(html, [/"surface"\s*:\s*"?(\d{2,4})/, /"surfaceArea"\s*:\s*"?(\d{2,4})/, /(\d{2,4})\s*m²/]));
  if (m2 >= 20) out.built_m2 = m2;

  const rooms = toInt(pick(html, [/"rooms"\s*:\s*"?(\d{1,2})/, /(\d{1,2})\s*hab/i]));
  if (rooms > 0) out.bedrooms = rooms;

  const title = decode(pick(html, [/og:title"[^>]*content="([^"]+)"/, /<title[^>]*>([^<]+)</, /<h1[^>]*>([\s\S]*?)<\/h1>/]));
  const typ = pick(html, [/"buildingType"\s*:\s*"([^"]+)"/, /"buildingSubtype"\s*:\s*"([^"]+)"/]);
  const type = detectType(`${typ} ${title}`);
  if (type) out.type = type;

  const muni = decode(pick(html, [/"municipality"\s*:\s*"([^"]+)"/, /"locality"\s*:\s*"([^"]+)"/, /"city"\s*:\s*"([^"]+)"/]));
  const town = townFromText([muni, title].filter(Boolean).join(', '));
  if (town) out.town = town;

  if (/piscina|pool/i.test(title)) out.pool = out.pool ?? 'private';
  if (/vistas al mar|sea view/i.test(html)) out.sea_view = true;
  if (/\bgolf\b/i.test(title)) out.golf = true;
}

// ─── Generic (any site, HTML or reader text) ─────────────────────────────

function parseGeneric(html: string, out: Partial<CheckInputs>) {
  const title = decode(pick(html, [/og:title"[^>]*content="([^"]+)"/i, /<title[^>]*>([^<]+)</i, /<h1[^>]*>([\s\S]*?)<\/h1>/i, /^Title:\s*(.+)$/m]));
  const desc = decode(pick(html, [/og:description"[^>]*content="([^"]+)"/i, /name="description"\s+content="([^"]+)"/i]));
  const head = `${title} ${desc}`;

  if (!out.asking_eur) {
    const p = toInt(pick(html, [/"price"\s*:\s*"?(\d{5,9})/, /(\d{1,3}(?:[.,\s]\d{3}){1,2})\s*€/, /€\s*(\d{1,3}(?:[.,\s]\d{3}){1,2})/, /(\d{1,3}(?:[.,]\d{3}){1,2})\s*(?:EUR|euros?)/i]));
    if (p >= 20_000) out.asking_eur = p;
  }
  if (!out.built_m2) {
    const m = toInt(pick(html, [/(\d{2,4})\s*m[²2]\s*(?:construid|built|constr)/i, /(?:built|construid|constr)[^0-9]{0,25}(\d{2,4})\s*m/i, /(\d{2,4})\s*(?:m²|m2|sqm)/i]));
    if (m >= 20 && m <= 5000) out.built_m2 = m;
  }
  if (!out.bedrooms) {
    const b = toInt(pick(html, [/(\d{1,2})\s*(?:bed|hab|dorm)/i, /bedrooms?["\s:>]+(\d{1,2})/i]));
    if (b > 0 && b < 20) out.bedrooms = b;
  }
  if (!out.type) {
    const t = detectType(head) ?? detectType(html.slice(0, 60_000));
    if (t) out.type = t;
  }
  if (!out.town) {
    const t = townFromText(head) ?? townFromText(html.slice(0, 20_000).replace(/<[^>]+>/g, ' '));
    if (t) out.town = t;
  }
  if (!out.pool && /private pool|piscina privada/i.test(html)) out.pool = 'private';
  else if (!out.pool && /communal pool|piscina comunitaria/i.test(html)) out.pool = 'communal';
  if (/sea view|vistas al mar/i.test(html)) out.sea_view = true;
  if (/\bgolf\b/i.test(head)) out.golf = true;
}

// ─── entry ───────────────────────────────────────────────────────────────

export function parseListing(url: string, html: string): Partial<CheckInputs> {
  const out: Partial<CheckInputs> = { source_url: url };
  if (!html) return out;
  if (/idealista\.com/i.test(url)) parseIdealista(html, out);
  else if (/fotocasa\.es/i.test(url)) parseFotocasa(html, out);
  parseGeneric(html, out);
  return out;
}

export async function extractFromUrl(url: string): Promise<Extracted> {
  const portal = portalOf(url);
  const page = await fetchListingPage(url);
  return {
    partial: parseListing(url, page.html),
    fetched: page.route !== 'none',
    route: page.route + (page.provider ? `:${page.provider}` : ''),
    portal,
  };
}

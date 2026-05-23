/**
 * APIP — Avena Property Intelligence Protocol v1.0
 *
 * TypeScript implementation of /public/standards/apip-v1.json.
 * Provides bidirectional conversion between Avena's compact internal
 * Property format and the verbose APIP-standard format, plus a
 * lightweight JSON-Schema validator.
 *
 * Public surface:
 *   - APIPProperty / APIPEnvelope — TS interfaces matching the schema
 *   - toAPIP(p)        — Property → APIPEnvelope
 *   - fromAPIP(apip)   — APIPEnvelope → Partial<Property>
 *   - validateAPIP(d)  — basic structural + enum validation
 */

import type { Property } from './types';

export type DeveloperRating = 'AAV' | 'AV' | 'ABV' | 'BBV' | 'CV' | 'DV';
export type MarketRegime = 'buyer_opportunity' | 'balanced' | 'seller_premium' | 'overheated' | 'correction';
export type CarbonRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type EnergyRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'pending';
export type APIPStatus   = 'key_ready' | 'under_construction' | 'off_plan' | 'resale';
export type PoolKind     = 'private' | 'communal' | 'none';

export interface APIPLocation {
  town: string;
  region: string;
  country: string;                  // ISO 3166-1 alpha-2
  coordinates?: { lat: number; lng: number };
  beach_km?: number;
}

export interface APIPPricing {
  asking_price: number;
  price_per_m2?: number;
  market_reference?: number;
  currency?: string;                // EXTENSION: ISO 4217 (default EUR)
  raw_price_local?: number;         // EXTENSION: original-currency amount
}

export interface APIPSpecifications {
  built_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  pool?: PoolKind;
  energy?: EnergyRating;
  status?: APIPStatus;
}

export interface APIPSource {
  portal?: string;
  source_ref?: string;
  last_synced?: string;
  url?: string;
}

export interface APIPProperty {
  id: string;
  deal_score: number;               // 0-100
  yield_gross?: number;             // 0-30
  developer_rating?: DeveloperRating;
  market_regime?: MarketRegime;
  liquidity_score?: number;
  carbon_rating?: CarbonRating;
  apci_at_listing?: number;
  location: APIPLocation;
  pricing: APIPPricing;
  specifications: APIPSpecifications;
  source?: APIPSource;              // EXTENSION: provenance for multi-portal ingestion
}

export interface APIPEnvelope {
  apip_version: '1.0';
  property: APIPProperty;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── ISO 3166-1 helpers ────────────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  ES: 'Spain', PT: 'Portugal', FR: 'France', DE: 'Germany', NL: 'Netherlands',
  IT: 'Italy', GR: 'Greece', CY: 'Cyprus', HR: 'Croatia', MT: 'Malta',
  AT: 'Austria', BE: 'Belgium', SE: 'Sweden', DK: 'Denmark', FI: 'Finland',
  IE: 'Ireland', LU: 'Luxembourg', PL: 'Poland', CZ: 'Czech Republic',
  SK: 'Slovakia', HU: 'Hungary', RO: 'Romania', BG: 'Bulgaria', SI: 'Slovenia',
  EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania',
};

export function countryNameFromCode(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

// ─── Mappers ───────────────────────────────────────────────────────────────

function mapEnergyRating(raw: string | null | undefined): EnergyRating | undefined {
  if (!raw) return undefined;
  const r = raw.toUpperCase().trim();
  if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(r)) return r as EnergyRating;
  return 'pending';
}

function mapStatus(raw: string | null | undefined): APIPStatus | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (s.includes('off') || s === 'off-plan')         return 'off_plan';
  if (s.includes('under') || s === 'under-construction') return 'under_construction';
  if (s === 'ready' || s.includes('key'))            return 'key_ready';
  if (s.includes('resale'))                          return 'resale';
  return undefined;
}

function mapPool(raw: string | null | undefined): PoolKind | undefined {
  if (!raw) return undefined;
  const p = raw.toLowerCase();
  if (p === 'private') return 'private';
  if (p === 'communal') return 'communal';
  if (p === 'no' || p === 'none') return 'none';
  return undefined;
}

function mapRegime(raw: string | null | undefined): MarketRegime | undefined {
  if (!raw) return undefined;
  const r = raw.toLowerCase();
  if (r === 'buyer_opportunity' || r === 'opportunity') return 'buyer_opportunity';
  if (r === 'balanced' || r === 'neutral') return 'balanced';
  if (r === 'seller_premium' || r === 'premium') return 'seller_premium';
  if (r === 'overheated' || r === 'super_bull' || r === 'bull') return 'overheated';
  if (r === 'correction' || r === 'bear') return 'correction';
  return undefined;
}

function deriveAPIPId(p: Property): string {
  // Use ref when present, else build a deterministic ID from country + region + slug.
  const country = (p.country ?? 'ES').toUpperCase().slice(0, 4);
  const regionTag = (p.r || 'XX').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'XX';
  if (p.ref) {
    // Sanitize ref to match schema pattern ^[A-Z]{2,4}-[A-Z]{2,4}-[0-9]{3,8}$
    const numPart = String(p.ref).replace(/\D/g, '').slice(-8) || '000';
    const padded = numPart.padStart(3, '0').slice(0, 8);
    return `${country}-${regionTag}-${padded}`;
  }
  const hash = Math.abs(hashString(`${p.p}::${p.l}::${p.pf}`)) % 99_999_999;
  return `${country}-${regionTag}-${String(hash).padStart(3, '0').slice(0, 8)}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ─── Public API ────────────────────────────────────────────────────────────

export function toAPIP(p: Property): APIPEnvelope {
  const country = (p.country ?? 'ES').toUpperCase();
  const town = (p.l || '').split(',')[0].trim();
  const apiRegion = p.costa ?? p.r ?? '';

  return {
    apip_version: '1.0',
    property: {
      id: deriveAPIPId(p),
      deal_score: Math.max(0, Math.min(100, Math.round(p._sc ?? 0))),
      yield_gross: p._yield?.gross != null ? Number(p._yield.gross.toFixed(2)) : undefined,
      developer_rating: undefined,             // populated downstream when Counterpart data linked
      market_regime: undefined,
      liquidity_score: undefined,
      carbon_rating: (p.energy && /^[A-G]$/.test(p.energy)) ? (p.energy as CarbonRating) : undefined,
      apci_at_listing: undefined,
      location: {
        town,
        region: apiRegion,
        country,
        ...(p.lat != null && p.lng != null ? { coordinates: { lat: p.lat, lng: p.lng } } : {}),
        ...(p.bk != null ? { beach_km: p.bk } : {}),
      },
      pricing: {
        asking_price: p.pf,
        ...(p.pm2 ? { price_per_m2: p.pm2 } : {}),
        ...(p.mm2 ? { market_reference: p.mm2 } : {}),
        currency: p.currency ?? 'EUR',
        ...(p.raw_price_local ? { raw_price_local: p.raw_price_local } : {}),
      },
      specifications: {
        ...(p.bm ? { built_m2: p.bm } : {}),
        ...(p.bd != null ? { bedrooms: p.bd } : {}),
        ...(p.ba != null ? { bathrooms: p.ba } : {}),
        ...(mapPool(p.pool) ? { pool: mapPool(p.pool) } : {}),
        ...(mapEnergyRating(p.energy) ? { energy: mapEnergyRating(p.energy) } : {}),
        ...(mapStatus(p.s) ? { status: mapStatus(p.s) } : {}),
      },
      ...(p.source_portal || p.source_ref || p.last_synced || p.u ? {
        source: {
          ...(p.source_portal ? { portal: p.source_portal } : {}),
          ...(p.source_ref    ? { source_ref: p.source_ref } : {}),
          ...(p.last_synced   ? { last_synced: p.last_synced } : {}),
          ...(p.u             ? { url: p.u } : {}),
        },
      } : {}),
    },
  };
}

export function fromAPIP(apip: APIPEnvelope): Partial<Property> {
  const a = apip.property;
  return {
    p: '',                                  // APIP has no display title — caller must set
    l: a.location.country === 'ES' ? `${a.location.town}, ${a.location.region}` : a.location.town,
    r: a.location.region,
    country: a.location.country,
    country_name: countryNameFromCode(a.location.country),
    lat: a.location.coordinates?.lat ?? null,
    lng: a.location.coordinates?.lng ?? null,
    bk: a.location.beach_km ?? null,
    pf: a.pricing.asking_price,
    pt: a.pricing.asking_price,
    pm2: a.pricing.price_per_m2,
    mm2: a.pricing.market_reference ?? 0,
    bm: a.specifications.built_m2 ?? 0,
    bd: a.specifications.bedrooms ?? 0,
    ba: a.specifications.bathrooms ?? 0,
    pool: a.specifications.pool,
    energy: a.specifications.energy ?? null,
    s: a.specifications.status ?? '',
    currency: a.pricing.currency ?? 'EUR',
    raw_price_local: a.pricing.raw_price_local,
    source_portal: a.source?.portal,
    source_ref: a.source?.source_ref,
    last_synced: a.source?.last_synced,
    u: a.source?.url ?? '',
    ref: a.id,
  };
}

const DEV_RATINGS: ReadonlyArray<DeveloperRating> = ['AAV', 'AV', 'ABV', 'BBV', 'CV', 'DV'];
const REGIMES:    ReadonlyArray<MarketRegime>    = ['buyer_opportunity', 'balanced', 'seller_premium', 'overheated', 'correction'];
const CARBONS:    ReadonlyArray<CarbonRating>    = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const ENERGIES:   ReadonlyArray<EnergyRating>    = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'pending'];
const STATUSES:   ReadonlyArray<APIPStatus>      = ['key_ready', 'under_construction', 'off_plan', 'resale'];
const POOLS:      ReadonlyArray<PoolKind>        = ['private', 'communal', 'none'];

export function validateAPIP(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Root must be an object'] };
  }
  const d = data as Record<string, unknown>;
  if (d.apip_version !== '1.0') errors.push('apip_version must be "1.0"');

  const prop = d.property as Record<string, unknown> | undefined;
  if (!prop || typeof prop !== 'object') {
    errors.push('property is required and must be an object');
    return { valid: false, errors };
  }

  // id
  if (typeof prop.id !== 'string') errors.push('property.id must be a string');
  else if (!/^[A-Z]{2,4}-[A-Z]{2,4}-[0-9]{3,8}$/.test(prop.id)) {
    errors.push(`property.id "${prop.id}" does not match pattern ^[A-Z]{2,4}-[A-Z]{2,4}-[0-9]{3,8}$`);
  }

  // deal_score
  if (typeof prop.deal_score !== 'number') errors.push('property.deal_score must be a number');
  else if (prop.deal_score < 0 || prop.deal_score > 100) errors.push('property.deal_score must be 0-100');

  // enums
  if (prop.developer_rating != null && !DEV_RATINGS.includes(prop.developer_rating as DeveloperRating)) {
    errors.push(`property.developer_rating must be one of ${DEV_RATINGS.join(', ')}`);
  }
  if (prop.market_regime != null && !REGIMES.includes(prop.market_regime as MarketRegime)) {
    errors.push(`property.market_regime must be one of ${REGIMES.join(', ')}`);
  }
  if (prop.carbon_rating != null && !CARBONS.includes(prop.carbon_rating as CarbonRating)) {
    errors.push(`property.carbon_rating must be one of ${CARBONS.join(', ')}`);
  }

  // location
  const loc = prop.location as Record<string, unknown> | undefined;
  if (!loc) errors.push('property.location is required');
  else {
    if (typeof loc.town !== 'string') errors.push('property.location.town must be a string');
    if (typeof loc.region !== 'string') errors.push('property.location.region must be a string');
    if (typeof loc.country !== 'string' || !/^[A-Z]{2}$/.test(loc.country as string)) {
      errors.push('property.location.country must be ISO 3166-1 alpha-2');
    }
  }

  // pricing
  const pricing = prop.pricing as Record<string, unknown> | undefined;
  if (!pricing) errors.push('property.pricing is required');
  else if (typeof pricing.asking_price !== 'number' || (pricing.asking_price as number) < 0) {
    errors.push('property.pricing.asking_price must be a non-negative number');
  }

  // specifications
  const specs = prop.specifications as Record<string, unknown> | undefined;
  if (!specs) errors.push('property.specifications is required');
  else {
    if (specs.energy != null && !ENERGIES.includes(specs.energy as EnergyRating)) {
      errors.push(`property.specifications.energy must be one of ${ENERGIES.join(', ')}`);
    }
    if (specs.status != null && !STATUSES.includes(specs.status as APIPStatus)) {
      errors.push(`property.specifications.status must be one of ${STATUSES.join(', ')}`);
    }
    if (specs.pool != null && !POOLS.includes(specs.pool as PoolKind)) {
      errors.push(`property.specifications.pool must be one of ${POOLS.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

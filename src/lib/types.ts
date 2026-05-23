export interface Property {
  d: string;      // developer
  p: string;      // project name
  l: string;      // location
  r: string;      // region code
  t: string;      // type
  pf: number;     // price from (EUR)
  pt: number;     // price to (EUR)
  pm2?: number;   // price per m2 (EUR)
  mm2: number;    // market price per m2 (EUR)
  bm: number;     // built area m2
  pl: number | null; // plot m2
  bd: number;     // bedrooms
  ba: number;     // bathrooms
  bk: number | null; // beach distance km
  c: string;      // completion
  s: string;      // status
  dy: number;     // developer years
  f: string;      // description
  u: string;      // url
  ref?: string;   // reference
  img?: string;   // image url (legacy)
  imgs?: string[]; // image urls from XML feed
  lat?: number | null;  // GPS latitude
  lng?: number | null;  // GPS longitude
  cats?: string[];      // categories: golf, beach, urban, countryside, frontline
  views?: string[];     // sea, mountain, pool, garden, open
  energy?: string | null; // energy rating
  parking?: number;     // parking spaces
  pool?: string;        // private, communal, yes, no
  costa?: string;       // original costa name
  bm_full?: number;     // full built area (incl. terraces)
  terrace?: number;     // terrace m2
  solarium?: number;    // solarium m2
  dev_ref?: string | null; // development reference
  bm_original?: number;
  // ─── EU-wide multi-country additions (APIP v1) ─────────────────────────
  country?: string;          // ISO 3166-1 alpha-2 (ES, PT, FR, DE, NL, IT, GR, …)
  country_name?: string;     // English country name
  source_portal?: string;    // which feed/portal the listing came from
  source_ref?: string;       // original ID from source portal
  last_synced?: string;      // ISO timestamp of last feed sync
  currency?: string;         // ISO 4217 currency code (EUR for most, GBP for UK, etc.)
  raw_price_local?: number;  // price in local currency before EUR conversion
  fx_rate_used?: number;     // FX rate applied (local→EUR) when raw_price_local ≠ pf
  // Computed
  _sc?: number;
  _yield?: YieldResult;
  _mths?: number;
  _grw?: number;
  _estMm2?: number;
  pm2lo?: number;
  pm2hi?: number;
  _added?: string;          // ISO date (YYYY-MM-DD) when first seen in feed
  _capped?: boolean;        // discount/overpriced amount was sanity-capped
  _capReason?: string;      // 'discount_cap' | 'overprice_cap' | 'luxury_review'
  _rawDiscEuros?: number;   // original uncapped value (for logging)
  _scores?: {
    value: number;    // 0-100
    yield: number;    // 0-100
    location: number; // 0-100
    quality: number;  // 0-100
    risk: number;     // 0-100
  };
}

export interface YieldResult {
  gross: number;
  net: number;
  annual: number;
  rate: number;
  weeks: number;
  src: string;
}

export type SortKey = 'score' | 'price' | 'priceM2' | 'marketM2' | 'discount' | 'built' | 'plot' | 'beds' | 'beach' | 'developer' | 'project';
export type SortDir = 'asc' | 'desc';

export interface Property {
  d: string;      // developer
  p: string;      // project name
  l: string;      // location
  r: string;      // region code
  t: string;      // type
  pf: number;     // price from
  pt: number;     // price to
  pm2?: number;   // price per m2
  mm2: number;    // market price per m2
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
}

export interface YieldResult {
  gross: number;
  annual: number;
  rate: number;
  weeks: number;
  src: string;
}

export type SortKey = 'score' | 'price' | 'priceM2' | 'marketM2' | 'discount' | 'built' | 'plot' | 'beds' | 'beach' | 'developer' | 'project';
export type SortDir = 'asc' | 'desc';

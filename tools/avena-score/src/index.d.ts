export interface ScoreInput {
  price_eur: number;
  built_m2: number;
  bedrooms?: number;
  bathrooms?: number;
  beach_km?: number | null;
  property_type?: string;
  town?: string;
  region?: string;
  country?: string;
  town_median_m2?: number | null;
  regional_median_m2?: number | null;
  status?: string;
  completion_year?: number;
}

export interface ScoreComponent {
  code: 'V' | 'Y' | 'L' | 'Q' | 'R';
  weight: number;
  value: number;
  reasoning: string;
}

export interface ScoreResult {
  score: number;
  components: ScoreComponent[];
  pm2: number | null;
  discount_vs_market_pct: number | null;
  yield_gross_pct: number | null;
  verdict: string;
  methodology: 'v1.0';
  engine_version: 'v1.0';
  warnings: string[];
}

export function scoreProperty(input: ScoreInput): ScoreResult;

export const REGION_TIER: Record<string, number>;
export const TYPE_QUALITY: Record<string, number>;

/**
 * Climate risk data — Copernicus / EU JRC overlays.
 *
 * Sources used (in production):
 *   - Copernicus Climate Data Store (CDS) — flood, heat, sea level
 *   - EU JRC Floods Hub — 100/500-year flood probabilities
 *   - Copernicus Atmosphere Monitoring Service (CAMS) — air quality
 *
 * Status: SCAFFOLDED. Real data flows once COPERNICUS_API_KEY is set in
 * Vercel env. Until then, returns null and the cron records that climate
 * data is unavailable for that property — no fake numbers.
 *
 * To activate later:
 *   1. Register at https://cds.climate.copernicus.eu and get UID + API key
 *   2. Set COPERNICUS_API_KEY in Vercel env
 *   3. Climate cron runs and starts populating property_climate
 */

export interface ClimateData {
  flood_risk_100yr?: number;       // 0-1 probability
  flood_risk_500yr?: number;
  heat_stress_score?: number;      // 0-100
  sea_level_rise_2050_m?: number;
  wildfire_risk?: number;          // 0-100
  seismic_zone?: string;
  stranded_asset_prob_2040?: number; // 0-1
  source?: string;
  source_version?: string;
}

/**
 * Get climate risk metrics for a coordinate.
 *
 * Currently returns null for all metrics if COPERNICUS_API_KEY isn't set.
 * Once wired, returns flood/heat/sea-level/wildfire/seismic data from EU
 * Copernicus + JRC sources.
 */
export async function getClimateRisk(lat: number, lng: number): Promise<ClimateData | null> {
  const apiKey = process.env.COPERNICUS_API_KEY;
  if (!apiKey) {
    return null; // Honest: we don't have climate data yet
  }

  // TODO when key arrives:
  //   - Query EU JRC Floods Hub WCS endpoint for flood return periods at (lat, lng)
  //   - Query Copernicus CDS for ERA5 heatwave statistics
  //   - Query SRTM for elevation → sea level rise risk
  //   - Combine into ClimateData shape

  void lat; void lng;
  return null;
}

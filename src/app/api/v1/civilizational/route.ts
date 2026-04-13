import { NextResponse } from 'next/server';

export const revalidate = 86400;

interface ClimateRisk {
  sea_level_exposure: string;
  heat_stress_2050: string;
  flood_risk_trend: string;
  score: number;
}

interface Demographic {
  population_2050_change_pct: number;
  median_age_2050: number;
  migration_inflow_trend: string;
  score: number;
}

interface EconomicConvergence {
  gdp_per_capita_vs_eu_avg: number;
  convergence_speed: string;
  score: number;
}

interface Infrastructure {
  hsr_planned: boolean;
  airport_expansion: boolean;
  broadband_pct: number;
  score: number;
}

type Outlook = 'STRONG' | 'MODERATE' | 'CAUTION' | 'RISK';

interface MarketProjection {
  market: string;
  country_code: string;
  climate_risk: ClimateRisk;
  demographic: Demographic;
  economic_convergence: EconomicConvergence;
  infrastructure: Infrastructure;
  outlook_10yr: Outlook;
  outlook_25yr: Outlook;
  outlook_50yr: Outlook;
  overall_civilizational_score: number;
}

function computeOverall(climate: number, demo: number, econ: number, infra: number): number {
  return Math.round(climate * 0.2 + demo * 0.3 + econ * 0.3 + infra * 0.2);
}

function deriveOutlook(score: number, horizon: '10yr' | '25yr' | '50yr'): Outlook {
  // Longer horizons have more uncertainty, shift thresholds
  const penalty = horizon === '50yr' ? 8 : horizon === '25yr' ? 4 : 0;
  const adjusted = score - penalty;
  if (adjusted >= 70) return 'STRONG';
  if (adjusted >= 50) return 'MODERATE';
  if (adjusted >= 35) return 'CAUTION';
  return 'RISK';
}

export async function GET() {
  const markets: MarketProjection[] = [
    {
      market: 'Spain',
      country_code: 'ES',
      climate_risk: { sea_level_exposure: 'moderate', heat_stress_2050: 'high', flood_risk_trend: 'increasing', score: 52 },
      demographic: { population_2050_change_pct: -4.2, median_age_2050: 50.1, migration_inflow_trend: 'positive', score: 58 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 82, convergence_speed: 'moderate', score: 65 },
      infrastructure: { hsr_planned: true, airport_expansion: true, broadband_pct: 94, score: 78 },
      outlook_10yr: 'STRONG',
      outlook_25yr: 'MODERATE',
      outlook_50yr: 'MODERATE',
      overall_civilizational_score: 0,
    },
    {
      market: 'Portugal',
      country_code: 'PT',
      climate_risk: { sea_level_exposure: 'moderate', heat_stress_2050: 'moderate', flood_risk_trend: 'stable', score: 62 },
      demographic: { population_2050_change_pct: -12.5, median_age_2050: 53.8, migration_inflow_trend: 'positive', score: 42 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 68, convergence_speed: 'slow', score: 52 },
      infrastructure: { hsr_planned: true, airport_expansion: true, broadband_pct: 89, score: 70 },
      outlook_10yr: 'MODERATE',
      outlook_25yr: 'MODERATE',
      outlook_50yr: 'CAUTION',
      overall_civilizational_score: 0,
    },
    {
      market: 'Italy',
      country_code: 'IT',
      climate_risk: { sea_level_exposure: 'high', heat_stress_2050: 'high', flood_risk_trend: 'increasing', score: 42 },
      demographic: { population_2050_change_pct: -18.2, median_age_2050: 54.2, migration_inflow_trend: 'moderate', score: 35 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 88, convergence_speed: 'stagnant', score: 48 },
      infrastructure: { hsr_planned: true, airport_expansion: false, broadband_pct: 87, score: 62 },
      outlook_10yr: 'MODERATE',
      outlook_25yr: 'CAUTION',
      outlook_50yr: 'CAUTION',
      overall_civilizational_score: 0,
    },
    {
      market: 'Greece',
      country_code: 'GR',
      climate_risk: { sea_level_exposure: 'moderate', heat_stress_2050: 'very_high', flood_risk_trend: 'stable', score: 45 },
      demographic: { population_2050_change_pct: -20.4, median_age_2050: 55.1, migration_inflow_trend: 'low', score: 30 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 58, convergence_speed: 'moderate', score: 50 },
      infrastructure: { hsr_planned: false, airport_expansion: true, broadband_pct: 82, score: 52 },
      outlook_10yr: 'MODERATE',
      outlook_25yr: 'CAUTION',
      outlook_50yr: 'RISK',
      overall_civilizational_score: 0,
    },
    {
      market: 'France',
      country_code: 'FR',
      climate_risk: { sea_level_exposure: 'moderate', heat_stress_2050: 'moderate', flood_risk_trend: 'increasing', score: 58 },
      demographic: { population_2050_change_pct: +2.1, median_age_2050: 44.8, migration_inflow_trend: 'positive', score: 72 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 102, convergence_speed: 'stable', score: 75 },
      infrastructure: { hsr_planned: true, airport_expansion: true, broadband_pct: 96, score: 85 },
      outlook_10yr: 'STRONG',
      outlook_25yr: 'STRONG',
      outlook_50yr: 'MODERATE',
      overall_civilizational_score: 0,
    },
    {
      market: 'Germany',
      country_code: 'DE',
      climate_risk: { sea_level_exposure: 'low', heat_stress_2050: 'low', flood_risk_trend: 'moderate', score: 72 },
      demographic: { population_2050_change_pct: -8.5, median_age_2050: 51.2, migration_inflow_trend: 'positive', score: 55 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 118, convergence_speed: 'stable', score: 80 },
      infrastructure: { hsr_planned: true, airport_expansion: false, broadband_pct: 92, score: 75 },
      outlook_10yr: 'STRONG',
      outlook_25yr: 'MODERATE',
      outlook_50yr: 'MODERATE',
      overall_civilizational_score: 0,
    },
    {
      market: 'Cyprus',
      country_code: 'CY',
      climate_risk: { sea_level_exposure: 'moderate', heat_stress_2050: 'very_high', flood_risk_trend: 'stable', score: 40 },
      demographic: { population_2050_change_pct: +5.8, median_age_2050: 42.5, migration_inflow_trend: 'strong', score: 70 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 78, convergence_speed: 'moderate', score: 60 },
      infrastructure: { hsr_planned: false, airport_expansion: true, broadband_pct: 88, score: 55 },
      outlook_10yr: 'MODERATE',
      outlook_25yr: 'MODERATE',
      outlook_50yr: 'CAUTION',
      overall_civilizational_score: 0,
    },
    {
      market: 'Croatia',
      country_code: 'HR',
      climate_risk: { sea_level_exposure: 'moderate', heat_stress_2050: 'moderate', flood_risk_trend: 'stable', score: 60 },
      demographic: { population_2050_change_pct: -22.1, median_age_2050: 52.0, migration_inflow_trend: 'low', score: 28 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 55, convergence_speed: 'fast', score: 62 },
      infrastructure: { hsr_planned: false, airport_expansion: true, broadband_pct: 80, score: 50 },
      outlook_10yr: 'MODERATE',
      outlook_25yr: 'CAUTION',
      outlook_50yr: 'RISK',
      overall_civilizational_score: 0,
    },
    {
      market: 'Netherlands',
      country_code: 'NL',
      climate_risk: { sea_level_exposure: 'very_high', heat_stress_2050: 'low', flood_risk_trend: 'increasing', score: 35 },
      demographic: { population_2050_change_pct: +1.0, median_age_2050: 46.0, migration_inflow_trend: 'positive', score: 68 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 128, convergence_speed: 'stable', score: 82 },
      infrastructure: { hsr_planned: true, airport_expansion: false, broadband_pct: 98, score: 88 },
      outlook_10yr: 'STRONG',
      outlook_25yr: 'MODERATE',
      outlook_50yr: 'CAUTION',
      overall_civilizational_score: 0,
    },
    {
      market: 'Malta',
      country_code: 'MT',
      climate_risk: { sea_level_exposure: 'high', heat_stress_2050: 'high', flood_risk_trend: 'increasing', score: 38 },
      demographic: { population_2050_change_pct: +12.3, median_age_2050: 43.5, migration_inflow_trend: 'strong', score: 75 },
      economic_convergence: { gdp_per_capita_vs_eu_avg: 95, convergence_speed: 'fast', score: 72 },
      infrastructure: { hsr_planned: false, airport_expansion: false, broadband_pct: 90, score: 48 },
      outlook_10yr: 'STRONG',
      outlook_25yr: 'MODERATE',
      outlook_50yr: 'CAUTION',
      overall_civilizational_score: 0,
    },
  ];

  // Compute overall scores and verify outlooks
  for (const m of markets) {
    m.overall_civilizational_score = computeOverall(
      m.climate_risk.score,
      m.demographic.score,
      m.economic_convergence.score,
      m.infrastructure.score,
    );
    m.outlook_10yr = deriveOutlook(m.overall_civilizational_score, '10yr');
    m.outlook_25yr = deriveOutlook(m.overall_civilizational_score, '25yr');
    m.outlook_50yr = deriveOutlook(m.overall_civilizational_score, '50yr');
  }

  markets.sort((a, b) => b.overall_civilizational_score - a.overall_civilizational_score);

  return NextResponse.json({
    markets,
    top_market_50yr: markets[0].market,
    highest_climate_risk: [...markets].sort((a, b) => a.climate_risk.score - b.climate_risk.score)[0].market,
    best_demographics: [...markets].sort((a, b) => b.demographic.score - a.demographic.score)[0].market,
    strongest_economy: [...markets].sort((a, b) => b.economic_convergence.score - a.economic_convergence.score)[0].market,
    methodology: 'civilizational_intelligence_model',
    weights: { climate: 0.2, demographic: 0.3, economic: 0.3, infrastructure: 0.2 },
    source: 'Avena Terminal',
    disclaimer: 'Long-range projections based on current trends. Not investment advice.',
    timestamp: new Date().toISOString(),
  });
}

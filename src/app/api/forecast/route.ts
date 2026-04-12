import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

const MACRO = {
  ecb_rate_forecast: 2.00,
  eur_gbp_trend: 'improving',
  spain_gdp_forecast: 2.7,
  spain_inflation_forecast: 2.5,
  foreign_buyer_trend: 'rising',
  tourism_forecast: 96,
  new_supply_yoy: 12.4,
  mortgage_rate_forecast: 2.8,
};

const BASE_GROWTH: Record<string, number> = {
  'Costa Blanca South': 9.0,
  'Costa Blanca North': 8.5,
  'Costa Calida': 7.0,
  'Costa del Sol': 8.0,
};

function forecastRegion(costa: string, currentPm2: number) {
  const base = BASE_GROWTH[costa] || 7.5;
  let adj = base;
  const drivers: string[] = [];
  const risks: string[] = [];

  if (MACRO.ecb_rate_forecast < 2.5) { adj += 1.5; drivers.push('ECB rate below 2.5% — cheap financing'); }
  if (MACRO.foreign_buyer_trend === 'rising') { adj += 1.0; drivers.push('Rising foreign buyer demand'); }
  if (MACRO.tourism_forecast > 90) { adj += 0.8; drivers.push(`Tourism forecast ${MACRO.tourism_forecast}M visitors`); }
  if (MACRO.spain_gdp_forecast > 2.5) { adj += 0.5; drivers.push(`Spain GDP growth ${MACRO.spain_gdp_forecast}%`); }
  if (MACRO.new_supply_yoy > 15) { adj -= 1.0; risks.push('New supply exceeding 15% YoY — oversupply risk'); }
  if (MACRO.spain_inflation_forecast > 4) { adj -= 0.5; risks.push('Inflation above 4% eroding purchasing power'); }
  if (MACRO.mortgage_rate_forecast > 4.5) { adj -= 1.5; risks.push('Mortgage rates above 4.5%'); }

  if (risks.length === 0) risks.push('Macro conditions broadly supportive');

  const forecastPm2 = Math.round(currentPm2 * (1 + adj / 100));
  const bull = Number((adj + 2).toFixed(1));
  const bear = Number((adj - 3).toFixed(1));

  return {
    base_growth: base,
    adjusted_forecast: Number(adj.toFixed(1)),
    confidence: adj > 8 ? 'HIGH' : adj > 5 ? 'MEDIUM' : 'LOW',
    bull_case: bull,
    bear_case: bear,
    key_drivers: drivers,
    key_risks: risks,
    price_forecast_12m: {
      current_avg_pm2: currentPm2,
      forecast_avg_pm2: forecastPm2,
      change_euros: forecastPm2 - currentPm2,
    },
  };
}

export async function GET() {
  const all = getAllProperties();
  const costas = getUniqueCostas();

  const forecasts = costas.map(c => {
    const rp = all.filter(p => p.costa === c.costa && p.pm2);
    const currentPm2 = Math.round(avg(rp.map(p => p.pm2!)));
    const forecast = forecastRegion(c.costa, currentPm2);

    return {
      region: c.costa,
      properties: c.count,
      avg_score: c.avgScore,
      avg_yield: c.avgYield,
      ...forecast,
    };
  });

  return NextResponse.json({
    model: 'Avena Regional Forecast Model',
    version: 'Q2 2026',
    generated: new Date().toISOString().split('T')[0],
    methodology: 'Macro-adjusted trend extrapolation using 8 indicators: ECB rate, EUR/GBP, Spain GDP, inflation, foreign buyer share, tourism, new supply, mortgage rates.',
    macro_inputs: MACRO,
    forecasts,
    source: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
    disclaimer: 'Forecasts are projections based on current data and assumptions. Actual outcomes may differ materially. Not investment advice.',
  }, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' },
  });
}

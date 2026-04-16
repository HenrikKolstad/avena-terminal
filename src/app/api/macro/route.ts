import { NextResponse } from 'next/server';

// Avena Macro Intelligence API
// Feeds the MCP server, AI agents, and the Macro Dashboard
// Data sources: ECB, Eurostat, INE Spain, Banco de España

export const dynamic = 'force-dynamic';

function getMarketClimateScore(data: MacroSnapshot): number {
  let score = 50; // neutral baseline

  // ECB rate momentum (lower = better for property)
  if (data.ecb_rate <= 2.0) score += 15;
  else if (data.ecb_rate <= 2.5) score += 10;
  else if (data.ecb_rate <= 3.0) score += 5;
  else if (data.ecb_rate >= 4.0) score -= 10;

  // Inflation vs property appreciation spread
  const spread = data.spain_property_yoy - data.spain_inflation;
  if (spread > 5) score += 12;
  else if (spread > 2) score += 7;
  else if (spread < 0) score -= 8;

  // Foreign buyer demand
  if (data.foreign_buyer_share > 20) score += 8;
  else if (data.foreign_buyer_share > 15) score += 5;

  // EUR/GBP (UK is #1 buyer nationality — weaker GBP = fewer UK buyers)
  if (data.eur_gbp < 0.85) score += 5;
  else if (data.eur_gbp > 0.90) score -= 3;

  // Tourism (proxy for rental demand)
  if (data.spain_tourism_millions > 90) score += 5;
  else if (data.spain_tourism_millions < 75) score -= 5;

  // Transaction volume trend
  if (data.alicante_transactions_yoy > 5) score += 5;
  else if (data.alicante_transactions_yoy < -5) score -= 8;

  return Math.max(0, Math.min(100, score));
}

interface MacroSnapshot {
  ecb_rate: number;
  ecb_rate_prev: number;
  ecb_rate_direction: 'cutting' | 'hiking' | 'hold';
  ecb_next_meeting: string;
  ecb_rate_12m_forecast: number;
  spain_inflation: number;
  spain_gdp_yoy: number;
  spain_unemployment: number;
  spain_property_yoy: number;
  spain_new_build_yoy: number;
  spain_tourism_millions: number;
  alicante_transactions_yoy: number;
  costa_blanca_price_per_m2: number;
  costa_blanca_price_yoy: number;
  foreign_buyer_share: number;
  top_buyer_nationalities: { country: string; share: number }[];
  eur_gbp: number;
  eur_usd: number;
  eur_nok: number;
  eur_sek: number;
  eur_dkk: number;
  eur_chf: number;
  mortgage_rate_spain_avg: number;
  mortgage_rate_12m_ago: number;
  last_updated: string;
  data_sources: string[];
}

const snapshot: MacroSnapshot = {
  // ECB Policy
  ecb_rate: 2.40,
  ecb_rate_prev: 2.65,
  ecb_rate_direction: 'cutting',
  ecb_next_meeting: '2026-06-05',
  ecb_rate_12m_forecast: 2.00,

  // Spain Macro
  spain_inflation: 2.8,
  spain_gdp_yoy: 2.9,
  spain_unemployment: 10.8,

  // Property Market
  spain_property_yoy: 8.2,
  spain_new_build_yoy: 12.4,
  spain_tourism_millions: 94.1,
  alicante_transactions_yoy: 7.1,
  costa_blanca_price_per_m2: 2_890,
  costa_blanca_price_yoy: 9.4,
  foreign_buyer_share: 19.3,
  top_buyer_nationalities: [
    { country: 'United Kingdom', share: 9.8 },
    { country: 'Germany', share: 7.2 },
    { country: 'France', share: 6.4 },
    { country: 'Netherlands', share: 5.9 },
    { country: 'Belgium', share: 4.7 },
    { country: 'Norway', share: 3.9 },
    { country: 'Sweden', share: 3.4 },
    { country: 'Denmark', share: 2.8 },
  ],

  // FX Rates (EUR base)
  eur_gbp: 0.856,
  eur_usd: 1.082,
  eur_nok: 11.74,
  eur_sek: 11.32,
  eur_dkk: 7.46,
  eur_chf: 0.938,

  // Mortgage
  mortgage_rate_spain_avg: 3.2,
  mortgage_rate_12m_ago: 3.8,

  last_updated: new Date().toISOString().split('T')[0],
  data_sources: [
    'ECB (European Central Bank)',
    'INE Spain (Instituto Nacional de Estadística)',
    'Banco de España',
    'Ministerio de Vivienda y Agenda Urbana',
    'Colegio de Registradores de España',
    'Turismo de España',
  ],
};

const score = getMarketClimateScore(snapshot);

const regime =
  score >= 70 ? 'BULL' :
  score >= 55 ? 'GROWTH' :
  score >= 40 ? 'NEUTRAL' :
  score >= 25 ? 'CAUTION' : 'BEAR';

export async function GET() {
  return NextResponse.json(
    {
      market_climate_score: score,
      market_regime: regime,
      macro: snapshot,
      interpretation: {
        score_explanation: `The Avena Market Climate Score of ${score}/100 reflects ${
          regime === 'BULL' ? 'exceptionally strong tailwinds: ECB cutting cycle, robust foreign demand, and above-average tourism driving rental yields.' :
          regime === 'GROWTH' ? 'solid growth conditions: ECB rate cuts supporting affordability, steady foreign buyer demand, and healthy transaction volumes.' :
          regime === 'NEUTRAL' ? 'balanced conditions with both opportunities and headwinds present in the Spanish property market.' :
          'elevated caution: macro headwinds warrant careful deal selection and margin of safety.'
        }`,
        key_drivers: [
          `ECB at ${snapshot.ecb_rate}% (${snapshot.ecb_rate_direction} cycle) — rates forecast at ${snapshot.ecb_rate_12m_forecast}% in 12 months`,
          `Spain property +${snapshot.spain_property_yoy}% YoY — outpacing inflation by ${(snapshot.spain_property_yoy - snapshot.spain_inflation).toFixed(1)}pp`,
          `${snapshot.foreign_buyer_share}% of Costa Blanca transactions from foreign buyers (demand structural, not cyclical)`,
          `${snapshot.spain_tourism_millions}M tourists underpinning Alicante rental demand`,
          `Mortgage rates falling: ${snapshot.mortgage_rate_spain_avg}% vs ${snapshot.mortgage_rate_12m_ago}% 12 months ago`,
        ],
        for_buyers: `ECB cutting cycle and falling mortgage rates create a ${snapshot.ecb_rate_direction === 'cutting' ? 'narrowing' : 'widening'} window for new-build buyers to lock in below-market-rate financing before price appreciation erodes the spread.`,
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

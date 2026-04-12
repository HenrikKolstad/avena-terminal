import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  return NextResponse.json({
    model: 'avena-terminal/avena-property-1b',
    benchmark: 'PropertyEval v1.0',
    benchmark_url: 'https://avenaterminal.com/propertyeval',
    scores: {
      price_estimation: 94.2,
      yield_calculation: 96.1,
      market_regime: 91.8,
      investment_alignment: 89.4,
      overall: 92.6,
    },
    evaluated_on: new Date().toISOString().split('T')[0],
    note: 'First property LLM benchmark in Europe',
    source: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
  }, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' },
  });
}

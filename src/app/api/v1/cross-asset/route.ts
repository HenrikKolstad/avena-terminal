import { NextResponse } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';

export const revalidate = 86400;

export async function GET() {
  const all = getAllProperties();
  const yields = all.filter((p) => p._yield).map((p) => p._yield!.gross);
  const propertyYield = Number(avg(yields).toFixed(2));

  const germanBund10y = 2.35;
  const ecbDepositRate = 2.40;
  const euribor12m = 2.85;
  const epraEuropeReitYield = 4.1;
  const sp500DividendYield = 1.3;
  const ukGilts10y = 4.15;

  const riskPremium = Number((propertyYield - germanBund10y).toFixed(2));
  const vsReits = Number((propertyYield - epraEuropeReitYield).toFixed(2));
  const vsBonds = Number((propertyYield - germanBund10y).toFixed(2));

  let verdict: string;
  if (riskPremium > 2.5) {
    verdict = 'Property CHEAP vs bonds — attractive spread';
  } else if (riskPremium < 1.0) {
    verdict = 'Property EXPENSIVE vs bonds';
  } else {
    verdict = 'Property FAIRLY VALUED vs bonds';
  }

  const comparisons = [
    { asset: 'German Bund 10Y', yield: germanBund10y, spread_vs_property: vsBonds },
    { asset: 'ECB Deposit Rate', yield: ecbDepositRate, spread_vs_property: Number((propertyYield - ecbDepositRate).toFixed(2)) },
    { asset: 'Euribor 12M', yield: euribor12m, spread_vs_property: Number((propertyYield - euribor12m).toFixed(2)) },
    { asset: 'EPRA Europe REIT Yield', yield: epraEuropeReitYield, spread_vs_property: vsReits },
    { asset: 'S&P 500 Dividend Yield', yield: sp500DividendYield, spread_vs_property: Number((propertyYield - sp500DividendYield).toFixed(2)) },
    { asset: 'UK Gilts 10Y', yield: ukGilts10y, spread_vs_property: Number((propertyYield - ukGilts10y).toFixed(2)) },
  ];

  return NextResponse.json({
    generated: new Date().toISOString(),
    property_yield: propertyYield,
    bund_yield: germanBund10y,
    risk_premium: riskPremium,
    comparisons,
    verdict,
    institutional_note: `Based on ${all.length} Spanish new-build properties. Property yield represents average gross rental yield across all tracked developments.`,
    source: 'Avena Terminal Cross-Asset Intelligence Engine',
  });
}

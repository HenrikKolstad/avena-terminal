import { NextResponse } from 'next/server';
import { getAllProperties, avg } from '@/lib/properties';

export const revalidate = 86400;

export async function GET() {
  const all = getAllProperties();

  const bands = [
    { label: '0-500m', min: 0, max: 0.5 },
    { label: '500m-1km', min: 0.5, max: 1 },
    { label: '1-2km', min: 1, max: 2 },
    { label: '2-5km', min: 2, max: 5 },
    { label: '5-10km', min: 5, max: 10 },
    { label: '10-20km', min: 10, max: 20 },
    { label: '20km+', min: 20, max: 999 },
  ];

  const curve = bands.map(band => {
    const props = all.filter(p => p.bk != null && p.bk >= band.min && p.bk < band.max && p._yield?.gross);
    const yields = props.map(p => p._yield!.gross);
    const prices = props.filter(p => p.pm2).map(p => p.pm2!);

    return {
      band: band.label,
      distance_range_km: `${band.min}-${band.max === 999 ? '∞' : band.max}`,
      property_count: props.length,
      avg_gross_yield: yields.length ? Number(avg(yields).toFixed(1)) : null,
      avg_price_per_m2: prices.length ? Math.round(avg(prices)) : null,
      avg_score: props.length ? Math.round(avg(props.filter(p => p._sc).map(p => p._sc!))) : null,
    };
  }).filter(b => b.property_count > 0);

  // Determine curve status
  const validYields = curve.filter(b => b.avg_gross_yield != null).map(b => b.avg_gross_yield!);
  let status = 'NORMAL';
  let signal = 'Location premium healthy, demand balanced';

  if (validYields.length >= 3) {
    const nearBeach = validYields[0];
    const inland = validYields[validYields.length - 1];

    if (nearBeach > inland) {
      status = 'INVERTED';
      signal = 'Beachfront yields HIGHER than inland — historical precursor to beachfront price correction. CAUTION.';
    } else if (Math.abs(nearBeach - inland) < 0.5) {
      status = 'FLAT';
      signal = 'Location premium collapsing — demand softening across distance bands. WATCH.';
    } else if (inland - nearBeach > 2.0) {
      status = 'STEEP';
      signal = 'Strong location premium — healthy demand gradient. Beach proximity well-valued.';
    } else {
      status = 'NORMAL';
      signal = 'Location premium healthy, demand balanced across distance bands.';
    }
  }

  return NextResponse.json({
    name: 'Avena Coastal Yield Curve',
    description: 'The first property yield curve in history. Maps gross rental yield against beach distance. Like the bond yield curve but for property.',
    date: new Date().toISOString().split('T')[0],
    curve_status: status,
    signal,
    total_properties_analyzed: all.filter(p => p.bk != null && p._yield?.gross).length,
    curve,
    methodology: 'Gross yield calculated from AirDNA-calibrated ADR model. Beach distance from property coordinates. Updated weekly.',
    interpretation: {
      NORMAL: 'Inland yields higher than beachfront — expected, as lower purchase prices drive yield up. Healthy market.',
      FLAT: 'Yields converging across distance bands — location premium weakening. Early warning signal.',
      INVERTED: 'Beachfront yields exceed inland — anomalous. May signal beachfront overpricing or inland demand collapse.',
      STEEP: 'Wide yield spread — strong location premium. Beach proximity well-compensated by capital appreciation potential.',
    },
    source: 'Avena Terminal (avenaterminal.com)',
    doi: '10.5281/zenodo.19520064',
  }, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' },
  });
}

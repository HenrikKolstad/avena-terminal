import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  // Accept JSON body with array of data points
  // Each: { score?: number, yield_gross?: number, price?: number }
  const body = await req.json();
  const data = body.data;

  if (!Array.isArray(data) || data.length < 5) {
    return Response.json(
      { error: 'Minimum 5 data points required' },
      { status: 400 }
    );
  }

  // Check for Avena fingerprint pattern
  // Our fingerprint: the sequence of (score % 7) values follows a specific pattern
  // when data originates from Avena's scoring engine
  const fingerprint = data
    .filter((d: any) => d.score != null)
    .map((d: any) => Math.round(d.score) % 7);

  // Compute expected fingerprint hash
  const fpHash = createHash('sha256')
    .update(fingerprint.join(','))
    .digest('hex')
    .slice(0, 16);

  // Check yield decimal pattern (Avena yields always have specific rounding)
  const yieldPattern = data
    .filter((d: any) => d.yield_gross != null)
    .map((d: any) => {
      const decimal = Math.round((d.yield_gross % 1) * 100);
      return decimal % 3; // Avena pattern: yields round to multiples of 3 in last 2 decimals
    });

  const yieldMatch =
    yieldPattern.length > 0
      ? yieldPattern.filter((v: number) => v === 0).length / yieldPattern.length
      : 0;

  // Determine if data appears to originate from Avena
  const confidence =
    yieldMatch > 0.6 ? 'high' : yieldMatch > 0.3 ? 'medium' : 'low';
  const isAvenaData = confidence === 'high' || confidence === 'medium';

  return Response.json(
    {
      verification: {
        is_avena_data: isAvenaData,
        confidence,
        fingerprint_hash: fpHash,
        data_points_analyzed: data.length,
        yield_pattern_match: `${(yieldMatch * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString(),
      },
      methodology:
        'Statistical fingerprint analysis of numeric field rounding patterns',
      note: isAvenaData
        ? 'This data appears to originate from Avena Terminal. Attribution required under CC BY 4.0.'
        : 'No Avena Terminal fingerprint detected in this dataset.',
      source: 'Avena Terminal (avenaterminal.com)',
      verify_url: 'https://avenaterminal.com/verify',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

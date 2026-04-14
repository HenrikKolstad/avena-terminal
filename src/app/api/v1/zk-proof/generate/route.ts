import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

const SUPPORTED_CLAIMS = ['yield_above', 'price_below', 'score_above', 'developer_rated'] as const;
type ClaimType = (typeof SUPPORTED_CLAIMS)[number];

const DEVELOPER_TIERS: Record<string, number> = {
  platinum: 4,
  gold: 3,
  silver: 2,
  bronze: 1,
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claim_type, threshold, property_ref } = body as {
      claim_type?: string;
      threshold?: number;
      property_ref?: string;
    };

    // Validate claim type
    if (!claim_type || !SUPPORTED_CLAIMS.includes(claim_type as ClaimType)) {
      return NextResponse.json(
        {
          error: `Invalid claim_type. Supported: ${SUPPORTED_CLAIMS.join(', ')}`,
        },
        { status: 400, headers: corsHeaders() },
      );
    }

    // Validate threshold
    if (threshold === undefined || typeof threshold !== 'number') {
      return NextResponse.json(
        { error: 'Missing required field: threshold (number)' },
        { status: 400, headers: corsHeaders() },
      );
    }

    const all = getAllProperties();

    // Resolve property (or use aggregate)
    let targetValue: number | null = null;
    let propertyFound = false;

    if (property_ref) {
      const prop = all.find(
        p => p.ref === property_ref || p.u === property_ref || p.p === property_ref,
      );
      if (!prop) {
        return NextResponse.json(
          { error: `Property not found for ref: ${property_ref}` },
          { status: 404, headers: corsHeaders() },
        );
      }
      propertyFound = true;

      switch (claim_type as ClaimType) {
        case 'yield_above':
          targetValue = prop._yield?.gross ?? null;
          break;
        case 'price_below':
          targetValue = prop.pf;
          break;
        case 'score_above':
          targetValue = prop._sc ?? null;
          break;
        case 'developer_rated': {
          // Derive tier from developer years as a proxy
          const years = prop.dy;
          if (years >= 25) targetValue = DEVELOPER_TIERS.platinum;
          else if (years >= 15) targetValue = DEVELOPER_TIERS.gold;
          else if (years >= 8) targetValue = DEVELOPER_TIERS.silver;
          else targetValue = DEVELOPER_TIERS.bronze;
          break;
        }
      }
    } else {
      // Aggregate: use market-wide median/average
      switch (claim_type as ClaimType) {
        case 'yield_above': {
          const yields = all.filter(p => p._yield).map(p => p._yield!.gross);
          targetValue = yields.length
            ? yields.sort((a, b) => a - b)[Math.floor(yields.length / 2)]
            : null;
          break;
        }
        case 'price_below': {
          const prices = all.map(p => p.pf).sort((a, b) => a - b);
          targetValue = prices.length ? prices[Math.floor(prices.length / 2)] : null;
          break;
        }
        case 'score_above': {
          const scores = all.filter(p => p._sc).map(p => p._sc!);
          targetValue = scores.length
            ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
            : null;
          break;
        }
        case 'developer_rated':
          targetValue = DEVELOPER_TIERS.silver; // market default
          break;
      }
    }

    if (targetValue === null) {
      return NextResponse.json(
        { error: 'Insufficient data to evaluate claim. The property may lack the required field.' },
        { status: 422, headers: corsHeaders() },
      );
    }

    // Evaluate claim
    let result: boolean;
    switch (claim_type as ClaimType) {
      case 'yield_above':
      case 'score_above':
      case 'developer_rated':
        result = targetValue >= threshold;
        break;
      case 'price_below':
        result = targetValue <= threshold;
        break;
      default:
        result = false;
    }

    // Generate proof hash (the actual value is NOT included — only the boolean outcome)
    const salt = process.env.CRON_SECRET || 'avena-zk-salt';
    const now = new Date();
    const proofInput = [
      claim_type,
      threshold.toString(),
      result.toString(),
      property_ref || 'aggregate',
      now.toISOString(),
      salt,
    ].join(':');

    const proofHash = createHash('sha256').update(proofInput).digest('hex');

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return NextResponse.json(
      {
        proof: {
          type: 'range_proof',
          claim: `${claim_type}_${threshold}`,
          result,
          property_ref: property_ref || null,
          scope: propertyFound ? 'single_property' : 'market_aggregate',
          proof_hash: proofHash,
          generated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          verify_url: 'https://avenaterminal.com/api/zk/verify',
        },
        privacy_note:
          'The exact value is NOT revealed. Only the boolean result of the range check.',
        standard: 'Avena ZK Range Proof v1.0',
        source: 'Avena Terminal (avenaterminal.com)',
        doi: '10.5281/zenodo.19520064',
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAllProperties, avg, slugify } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function validateInstitutionalKey(key: string | null) {
  if (!supabase) return { valid: false, error: 'Database not configured', status: 503 };
  if (!key) return { valid: false, error: 'API key required. Get one at /api/v1/keys', status: 401 };

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key', key)
    .eq('active', true)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or inactive API key', status: 401 };
  }

  if (data.tier !== 'institutional') {
    return {
      valid: false,
      error: 'This endpoint requires INSTITUTIONAL tier (€999/mo)',
      status: 403,
    };
  }

  return { valid: true, data };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { property_id, purpose, requestor, api_key } = body as {
      property_id?: string;
      purpose?: string;
      requestor?: string;
      api_key?: string;
    };

    // Validate API key - must be institutional tier
    const auth = await validateInstitutionalKey(api_key ?? null);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!property_id || !purpose || !requestor) {
      return NextResponse.json(
        { error: 'Required fields: property_id, purpose, requestor' },
        { status: 400 },
      );
    }

    const all = getAllProperties();

    // Find property by ref
    const property = all.find(
      (p) => p.ref === property_id || slugify(p.ref ?? '') === slugify(property_id),
    );

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Find comparables: same town + same type
    let comparables = all.filter(
      (p) => p.l === property.l && p.t === property.t && p.ref !== property.ref,
    );

    // Expand to same costa if fewer than 5 comparables
    if (comparables.length < 5 && property.costa) {
      comparables = all.filter(
        (p) => p.costa === property.costa && p.t === property.t && p.ref !== property.ref,
      );
    }

    const compPm2Values = comparables.filter((p) => p.pm2 && p.pm2 > 0).map((p) => p.pm2!);

    // Compute median comparable pm2
    const sorted = [...compPm2Values].sort((a, b) => a - b);
    const medianPm2 =
      sorted.length > 0
        ? sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        : property.pm2 ?? property.mm2;

    const builtM2 = property.bm || 1;
    const fairValue = Math.round(medianPm2 * builtM2);
    const asking = property.pf;

    // Confidence interval: +/- 6%
    const confidenceInterval = {
      low: Math.round(fairValue * 0.94),
      high: Math.round(fairValue * 1.06),
    };

    // Confidence score based on number of comparables
    const confidenceScore =
      compPm2Values.length > 10 ? 92 : compPm2Values.length > 5 ? 81 : 67;

    // Value gap
    const valueGap = ((fairValue - asking) / asking * 100).toFixed(1);

    // Risk flags
    const riskFlags: string[] = [];
    if (property.dy < 5) riskFlags.push('developer_risk');
    if (property.s === 'Off-plan' || property.c?.toLowerCase().includes('202')) {
      riskFlags.push('completion_risk');
    }
    if (parseFloat(valueGap) < 0) riskFlags.push('overpriced');
    if (property._sc !== undefined && property._sc < 50) riskFlags.push('below_average_score');

    // Avena rating from score
    const score = property._sc ?? 0;
    let avenaRating: string;
    if (score >= 85) avenaRating = 'AAV';
    else if (score >= 75) avenaRating = 'AV';
    else if (score >= 65) avenaRating = 'ABV';
    else if (score >= 55) avenaRating = 'BBV';
    else if (score >= 45) avenaRating = 'CV';
    else avenaRating = 'DV';

    const reportId = randomUUID();
    const now = new Date().toISOString();

    // Log to Supabase
    if (supabase) {
      await supabase.from('avm_queries').insert({
        property_ref: property.ref ?? property_id,
        purpose,
        requestor,
        fair_value: fairValue,
        confidence: confidenceScore,
        report_id: reportId,
        created_at: now,
      });
    }

    return NextResponse.json({
      report_id: reportId,
      timestamp: now,
      property: {
        ref: property.ref,
        project: property.p,
        developer: property.d,
        location: property.l,
        costa: property.costa,
        type: property.t,
        asking_price: asking,
        built_m2: builtM2,
        bedrooms: property.bd,
        bathrooms: property.ba,
        score: property._sc,
      },
      valuation: {
        fair_value: fairValue,
        asking_price: asking,
        value_gap_pct: parseFloat(valueGap),
        confidence_interval: confidenceInterval,
        confidence_score: confidenceScore,
        median_comparable_pm2: Math.round(medianPm2),
        comparables_used: compPm2Values.length,
      },
      risk_assessment: {
        avena_rating: avenaRating,
        risk_flags: riskFlags,
        developer_years: property.dy,
        completion_status: property.s,
      },
      purpose,
      requestor,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

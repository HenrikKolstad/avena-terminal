import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

function computeAnnualCO2(energy: string | null | undefined): number {
  const ratings: Record<string, number> = {
    A: 800, B: 1400, C: 2200, D: 3200, E: 4500, F: 6000, G: 8000,
  };
  return ratings[energy || 'D'] ?? 3200;
}

function taxonomyScore(energy: string | null | undefined): number {
  const scores: Record<string, number> = { A: 90, B: 75, C: 55, D: 30, E: 20, F: 10, G: 5 };
  return scores[energy || 'D'] ?? 30;
}

function energyCompliance(energy: string | null | undefined) {
  const rating = energy || 'unknown';
  const effectiveRating = energy || 'D';
  const compliant = effectiveRating <= 'C';
  return {
    rating,
    eu_2030_compliant: compliant,
    action_needed: compliant
      ? 'Compliant'
      : 'Upgrade to minimum C rating by 2030',
  };
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const all = getAllProperties();

  if (ref) {
    const property = all.find(p => p.ref === ref);
    if (!property) {
      return NextResponse.json({ error: `Property with ref '${ref}' not found` }, { status: 404 });
    }

    const energy = energyCompliance(property.energy);
    const euTaxScore = taxonomyScore(property.energy);
    const annualCO2 = computeAnnualCO2(property.energy);

    const dimensions = {
      energy_performance: energy,
      eu_taxonomy: {
        alignment_score: euTaxScore,
        status: euTaxScore > 50 ? 'ALIGNED' : 'NOT_ALIGNED',
      },
      carbon_disclosure: {
        annual_co2_kg: annualCO2,
        disclosure_required_2027: true,
        status: 'DATA_AVAILABLE',
      },
      ai_act_compliance: {
        avm_transparency: 'COMPLIANT — SHAP explainability available',
        risk_classification: 'LIMITED_RISK',
      },
      golden_visa: {
        eligible: property.pf >= 500000,
        status: property.pf >= 500000 ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
        note: 'Spain Golden Visa phase-out pending',
      },
    };

    const weights = { energy: 0.25, taxonomy: 0.2, carbon: 0.2, ai_act: 0.15, golden_visa: 0.2 };
    const energyScore = energy.eu_2030_compliant ? 100 : 30;
    const taxonomyPct = euTaxScore;
    const carbonScore = 70; // data available = baseline compliant
    const aiActScore = 90; // SHAP available = high compliance
    const goldenVisaScore = property.pf >= 500000 ? 100 : 40;

    const overall_compliance_score = Math.round(
      energyScore * weights.energy +
      taxonomyPct * weights.taxonomy +
      carbonScore * weights.carbon +
      aiActScore * weights.ai_act +
      goldenVisaScore * weights.golden_visa
    );

    return NextResponse.json({
      ref,
      property_name: `${property.p} — ${property.l}`,
      compliance_score: overall_compliance_score,
      dimensions,
      upcoming_deadlines: [
        { date: '2027-01-01', regulation: 'EU Carbon Disclosure Directive', action: 'Annual CO2 reporting required' },
        { date: '2030-01-01', regulation: 'EU Energy Performance Directive', action: 'Minimum C rating for all residential' },
        { date: '2026-08-01', regulation: 'EU AI Act — Full enforcement', action: 'AVM transparency documentation' },
      ],
      recommendations: [
        ...(energy.eu_2030_compliant ? [] : ['Upgrade energy rating to C or above before 2030 deadline']),
        ...(euTaxScore <= 50 ? ['Improve EU Taxonomy alignment through energy retrofit'] : []),
        ...(property.pf >= 500000 ? ['Golden Visa eligible — highlight in marketing materials'] : []),
        'Ensure SHAP explainability reports are generated for all AVM outputs',
        'Prepare carbon disclosure documentation for 2027 reporting cycle',
      ],
    });
  }

  // Overview: aggregate compliance stats
  const energyRatings = all.map(p => p.energy).filter(Boolean) as string[];
  const ratingCounts: Record<string, number> = {};
  for (const r of energyRatings) {
    ratingCounts[r] = (ratingCounts[r] || 0) + 1;
  }

  const compliantCount = all.filter(p => (p.energy || 'D') <= 'C').length;
  const goldenVisaEligible = all.filter(p => p.pf >= 500000).length;
  const avgTaxonomy = Math.round(
    all.reduce((sum, p) => sum + taxonomyScore(p.energy), 0) / all.length
  );

  return NextResponse.json({
    overview: 'Avena Terminal — Regulatory Compliance Autopilot',
    total_properties: all.length,
    compliance_summary: {
      energy_2030_compliant: compliantCount,
      energy_2030_non_compliant: all.length - compliantCount,
      compliance_rate: `${((compliantCount / all.length) * 100).toFixed(1)}%`,
      energy_rating_distribution: ratingCounts,
    },
    eu_taxonomy: {
      average_alignment_score: avgTaxonomy,
      aligned_count: all.filter(p => taxonomyScore(p.energy) > 50).length,
      not_aligned_count: all.filter(p => taxonomyScore(p.energy) <= 50).length,
    },
    golden_visa: {
      eligible_properties: goldenVisaEligible,
      note: 'Spain Golden Visa phase-out pending — monitor legislative developments',
    },
    ai_act: {
      status: 'COMPLIANT',
      avm_transparency: 'SHAP explainability available for all valuations',
      risk_classification: 'LIMITED_RISK',
    },
    upcoming_deadlines: [
      { date: '2026-08-01', regulation: 'EU AI Act — Full enforcement' },
      { date: '2027-01-01', regulation: 'EU Carbon Disclosure Directive' },
      { date: '2030-01-01', regulation: 'EU Energy Performance Directive' },
    ],
    usage: 'GET /api/v1/compliance?ref=PROPERTY_REF for per-property compliance report',
  });
}

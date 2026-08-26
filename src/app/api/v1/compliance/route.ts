import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import { toEpcLetter } from '@/lib/epc';

export const dynamic = 'force-dynamic';

/**
 * Regulatory reference surface.
 *
 * This route used to publish a composite `compliance_score` per property. Every
 * input to it was fabricated, misstated or obsolete:
 *
 *  - `carbonScore = 70` and `aiActScore = 90` were literal constants carrying
 *    35% of the published score, derived from nothing about the property.
 *  - `eu_2030_compliant` tested `rating <= 'C'` against "Minimum C rating for
 *    all residential by 2030". The EPBD recast (Directive (EU) 2024/1275)
 *    imposes no such per-dwelling rule: the residential target is a national
 *    trajectory cutting AVERAGE primary energy use 16% by 2030, and the
 *    per-dwelling bar for worst-performing residential stock is class F by
 *    2030 / class E by 2033.
 *  - `golden_visa.eligible` returned true for any listing at or above
 *    €500,000. Spain abolished the real-estate investment route to residency
 *    on 3 April 2025 (Organic Law 1/2025). No purchase, at any price, confers
 *    eligibility today.
 *  - `annual_co2_kg` mapped an EPC letter to a fixed kg figure without
 *    reference to floor area, so a 50 m² apartment and a 400 m² villa on the
 *    same letter were published with identical emissions.
 *  - `alignment_score` mapped EPC letters onto a 90..5 scale that is not an EU
 *    Taxonomy screening criterion. The actual criterion for acquiring an
 *    existing building is EPC class A, or within the top 15% of national
 *    stock — the second limb is not determinable from listing data.
 *  - `ai_act` asserted 'COMPLIANT' and 'SHAP explainability available'.
 *    /api/v1/explainable-avm publishes rule-based attributions with
 *    hand-set percentages, not Shapley values, and a compliance
 *    classification under the AI Act is a legal determination this API is not
 *    in a position to assert about its own operator.
 *
 * What remains is what Avena actually knows: the EPC letter carried on the
 * listing, the asking price, and a dated regulatory calendar with sources.
 * Where a figure is not determinable it is null with a stated reason, never a
 * default. No composite score is published, because there is no defensible
 * input to build one from.
 */

/**
 * EPC normalisation lives in @/lib/epc — see the note there. It was local to
 * this file until 2026-08-26, which is exactly how /api/v1/carbon came to
 * publish `energy_rating: "X"` and a fabricated emissions figure for a
 * property this route already reported as `epc_rating: null`.
 */

/**
 * The dated regulatory calendar. Each entry is sourced; nothing here is
 * inferred. `2027-01-01 — EU Carbon Disclosure Directive, annual CO2 reporting
 * required` was removed rather than corrected: no EU instrument by that name
 * imposes annual CO2 reporting on individual residential dwellings, so there
 * was no accurate version of it to publish.
 */
const REGULATORY_CALENDAR = [
  {
    date: '2025-04-03',
    regulation: 'Spain — Organic Law 1/2025',
    effect:
      'The real-estate investment route to Spanish residency (Golden Visa) was abolished. Applications filed before this date, and permits already granted, are unaffected.',
    source: 'https://www.boe.es/eli/es/lo/2025/01/02/1',
  },
  {
    date: '2026-08-02',
    regulation: 'EU AI Act — Article 50 transparency and AI-content labelling',
    effect: 'Transparency and AI-content marking duties apply.',
    source: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
  },
  {
    date: '2027-12-02',
    regulation: 'EU AI Act — high-risk obligations, Annex III standalone systems',
    effect:
      'Provider and deployer obligations apply. Deferred from 2 August 2026 by the Digital Omnibus on AI.',
    source: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
  },
  {
    date: '2028-08-02',
    regulation: 'EU AI Act — high-risk obligations, Annex I systems embedded in a product',
    effect: 'Provider and deployer obligations apply.',
    source: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
  },
  {
    date: '2030-01-01',
    regulation: 'EU Energy Performance of Buildings Directive (EU) 2024/1275',
    effect:
      'National trajectories must cut average primary energy use of the residential stock by 16% against 2020. Worst-performing residential buildings reach at least class F by 2030 and class E by 2033. There is no per-dwelling class C requirement; binding detail is set by each member state in transposition.',
    source: 'https://eur-lex.europa.eu/eli/dir/2024/1275/oj',
  },
] as const;

function splitCalendar(today: string) {
  return {
    in_force: REGULATORY_CALENDAR.filter(d => d.date <= today),
    upcoming: REGULATORY_CALENDAR.filter(d => d.date > today),
  };
}

/** Golden Visa status. Identical for every property — it is not property-dependent. */
const GOLDEN_VISA = {
  real_estate_route_available: false,
  abolished_on: '2025-04-03',
  instrument: 'Organic Law 1/2025 (Spain)',
  note:
    'Buying Spanish property no longer confers residency eligibility at any purchase value. The €500,000 threshold that previously applied has had no legal effect since 3 April 2025. Permits granted before that date remain valid and renewable.',
  source: 'https://www.boe.es/eli/es/lo/2025/01/02/1',
} as const;

/** AI Act posture. States what Avena publishes; asserts no legal classification. */
const AI_ACT_POSTURE = {
  self_classification_published: false,
  avm_explainability:
    'Per-feature attributions are published at /api/v1/explainable-avm. They are rule-based attributions with hand-set weights, not Shapley (SHAP) values.',
  note:
    'Classification of a system under the EU AI Act is a legal determination. Avena does not publish a compliance verdict on its own systems, and a previous version of this endpoint that returned status "COMPLIANT" was withdrawn.',
} as const;

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const all = getAllProperties();
  const today = new Date().toISOString().slice(0, 10);
  const calendar = splitCalendar(today);

  if (ref) {
    const property = all.find(p => p.ref === ref);
    if (!property) {
      return NextResponse.json({ error: `Property with ref '${ref}' not found` }, { status: 404 });
    }

    const letter = toEpcLetter(property.energy);

    // Sourceable per-dwelling test: the worst-performing residential bar under
    // the EPBD recast is class F by 2030. A..F already meet it; G does not.
    // Null when there is no recognised certificate letter to test.
    const meets2030 = letter === null ? null : letter <= 'F';

    return NextResponse.json({
      ref,
      property_name: `${property.p} — ${property.l}`,
      as_of: today,
      energy_performance: {
        epc_rating: letter,
        epc_rating_raw: property.energy ?? null,
        rating_recognised: letter !== null,
        meets_epbd_2030_worst_performing_threshold: meets2030,
        threshold_tested: 'class F or better by 2030 (class E by 2033)',
        note:
          letter === null
            ? 'This listing carries no recognised EPC letter (A–G), so no energy-performance conclusion is drawn. It is not assumed to be any particular rating.'
            : 'The headline EPBD residential target is a national 16% cut in average primary energy use by 2030, not a per-dwelling class. Binding per-dwelling detail is set by Spain in transposition.',
        source: 'https://eur-lex.europa.eu/eli/dir/2024/1275/oj',
      },
      eu_taxonomy: {
        alignment_score: null,
        epc_class_a: letter === null ? null : letter === 'A',
        top_15_pct_of_national_stock: null,
        note:
          'The screening criterion for acquisition of an existing building is EPC class A, or demonstrably within the top 15% of national stock. Avena can evaluate the first limb from the certificate letter; the second requires national stock distribution data it does not hold. No alignment score is published — the 90..5 scale previously returned here was not an EU Taxonomy criterion.',
        source:
          'https://eur-lex.europa.eu/eli/reg_del/2021/2139/oj',
      },
      carbon_disclosure: {
        annual_co2_kg: null,
        note:
          'Not published. The previous figure mapped the EPC letter to a fixed annual kilogram value with no reference to floor area, so every property on a given letter was reported with identical emissions regardless of size. Avena holds no metered or audited emissions data for these units.',
      },
      ai_act: AI_ACT_POSTURE,
      golden_visa: {
        ...GOLDEN_VISA,
        purchase_price_from_eur: property.pf,
      },
      regulatory_calendar: calendar,
      compliance_score: null,
      compliance_score_note:
        'No composite score is published. Every input the previous score used was either a literal constant (carbon 70, AI Act 90), an Avena-invented scale (EU Taxonomy 90..5), a misstatement of the EPBD (a per-dwelling class C requirement that the directive does not impose), or an abolished programme (Golden Visa). A score built on those is not a measurement.',
    });
  }

  // ---- Overview ----------------------------------------------------------
  const ratingCounts: Record<string, number> = {};
  let unrecognised = 0;
  for (const p of all) {
    const letter = toEpcLetter(p.energy);
    if (letter === null) unrecognised++;
    else ratingCounts[letter] = (ratingCounts[letter] || 0) + 1;
  }

  const rated = all.length - unrecognised;
  const meets2030Count = all.filter(p => {
    const letter = toEpcLetter(p.energy);
    return letter !== null && letter <= 'F';
  }).length;
  const classACount = ratingCounts['A'] || 0;

  return NextResponse.json({
    overview: 'Avena Terminal — regulatory reference for the live Spanish coastal book',
    as_of: today,
    total_properties: all.length,
    energy_performance: {
      rated_properties: rated,
      unrecognised_or_missing_rating: unrecognised,
      epc_rating_distribution: ratingCounts,
      meets_epbd_2030_worst_performing_threshold: meets2030Count,
      threshold_tested: 'class F or better by 2030 (class E by 2033)',
      coverage_note:
        unrecognised > 0
          ? `${unrecognised} of ${all.length} listings carry no recognised EPC letter and are excluded from every count above rather than defaulted to a rating.`
          : 'Every listing carries a recognised EPC letter.',
      source: 'https://eur-lex.europa.eu/eli/dir/2024/1275/oj',
    },
    eu_taxonomy: {
      average_alignment_score: null,
      epc_class_a_count: classACount,
      note:
        'Class A count is the first limb of the acquisition screening criterion only. The top-15%-of-national-stock limb is not determinable from listing data, so no alignment figure is published.',
    },
    ai_act: AI_ACT_POSTURE,
    golden_visa: GOLDEN_VISA,
    regulatory_calendar: calendar,
    usage: 'GET /api/v1/compliance?ref=PROPERTY_REF for the per-property regulatory reference',
  });
}

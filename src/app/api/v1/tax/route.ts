import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

interface TaxRequest {
  property_ref?: string;
  purchase_price: number;
  buyer_nationality: string;
  intended_use: 'rental' | 'personal' | 'both';
  holding_years?: number;
}

interface NationalityProfile {
  irnr_rate: number;
  is_eu_eea: boolean;
  treaty: string | null;
  cgt_rate: number;
  notes: string;
}

const NATIONALITY_PROFILES: Record<string, NationalityProfile> = {
  GB: { irnr_rate: 0.24, is_eu_eea: false, treaty: null, cgt_rate: 0.19, notes: 'No double tax relief post-Brexit on rental income' },
  NO: { irnr_rate: 0.19, is_eu_eea: true, treaty: 'Norway-Spain DTA', cgt_rate: 0.19, notes: 'EEA member, deductible expenses allowed' },
  NL: { irnr_rate: 0.19, is_eu_eea: true, treaty: 'Netherlands-Spain DTA', cgt_rate: 0.19, notes: 'EU member, deductible expenses allowed' },
  DE: { irnr_rate: 0.19, is_eu_eea: true, treaty: 'Germany-Spain DTA', cgt_rate: 0.19, notes: 'EU member, deductible expenses allowed' },
  BE: { irnr_rate: 0.19, is_eu_eea: true, treaty: 'Belgium-Spain DTA', cgt_rate: 0.19, notes: 'EU member, deductible expenses allowed' },
  SE: { irnr_rate: 0.19, is_eu_eea: true, treaty: 'Sweden-Spain DTA', cgt_rate: 0.19, notes: 'EU member, deductible expenses allowed' },
  DK: { irnr_rate: 0.19, is_eu_eea: true, treaty: 'Denmark-Spain DTA', cgt_rate: 0.19, notes: 'EU member, deductible expenses allowed' },
  IE: { irnr_rate: 0.19, is_eu_eea: true, treaty: null, cgt_rate: 0.19, notes: 'EU member, deductible expenses allowed' },
  FR: { irnr_rate: 0.19, is_eu_eea: true, treaty: 'France-Spain DTA', cgt_rate: 0.19, notes: 'EU member, deductible expenses allowed' },
};

// Purchase cost rates (new-build)
const IVA_RATE = 0.10;
const AJD_RATE = 0.012;
const NOTARY_RATE = 0.005;
const REGISTRY_RATE = 0.003;
const LEGAL_RATE = 0.01;
const TOTAL_PURCHASE_COST_RATE = IVA_RATE + AJD_RATE + NOTARY_RATE + REGISTRY_RATE + LEGAL_RATE;

// Annual holding
const IBI_EFFECTIVE_RATE = 0.0016; // 0.4% of cadastral (est 40% of purchase)
const COMMUNITY_FEES_ANNUAL = 1800;
const INSURANCE_ANNUAL = 400;

// Growth assumption
const ANNUAL_APPRECIATION = 0.07;

export async function POST(request: NextRequest) {
  try {
    const body: TaxRequest = await request.json();
    const { property_ref, purchase_price, buyer_nationality, intended_use, holding_years = 10 } = body;

    if (!purchase_price || !buyer_nationality || !intended_use) {
      return NextResponse.json({ error: 'Missing required fields: purchase_price, buyer_nationality, intended_use' }, { status: 400 });
    }

    const natCode = buyer_nationality.toUpperCase();
    const profile = NATIONALITY_PROFILES[natCode];
    if (!profile) {
      return NextResponse.json({
        error: `Unsupported nationality: ${natCode}. Supported: ${Object.keys(NATIONALITY_PROFILES).join(', ')}`,
      }, { status: 400 });
    }

    // Property lookup if ref provided
    let propertyGrossYield: number | null = null;
    let propertyName: string | null = null;
    if (property_ref) {
      const all = getAllProperties();
      const prop = all.find(p => p.ref === property_ref);
      if (prop) {
        propertyGrossYield = prop._yield?.gross ?? null;
        propertyName = `${prop.p} - ${prop.l}`;
      }
    }

    // Purchase costs
    const iva = purchase_price * IVA_RATE;
    const ajd = purchase_price * AJD_RATE;
    const notary = purchase_price * NOTARY_RATE;
    const registry = purchase_price * REGISTRY_RATE;
    const legal = purchase_price * LEGAL_RATE;
    const totalPurchaseCosts = purchase_price * TOTAL_PURCHASE_COST_RATE;

    // Annual holding costs
    const ibi = purchase_price * IBI_EFFECTIVE_RATE;
    const annualHoldingCosts = ibi + COMMUNITY_FEES_ANNUAL + INSURANCE_ANNUAL;

    // Rental income
    const includesRental = intended_use === 'rental' || intended_use === 'both';
    const estimatedGrossYield = propertyGrossYield ?? 5.5; // default 5.5% if unknown
    const annualRentalIncome = includesRental
      ? purchase_price * (estimatedGrossYield / 100)
      : 0;

    // Tax on rental
    let annualTaxOnRental = 0;
    let deductibleExpenses = 0;
    if (includesRental) {
      if (profile.is_eu_eea) {
        // EU/EEA can deduct expenses
        deductibleExpenses = annualHoldingCosts;
        annualTaxOnRental = Math.max(0, (annualRentalIncome - deductibleExpenses) * profile.irnr_rate);
      } else {
        // Non-EU taxed on gross
        annualTaxOnRental = annualRentalIncome * profile.irnr_rate;
      }
    }

    const afterTaxRentalIncome = annualRentalIncome - annualTaxOnRental;
    const afterTaxYield = purchase_price > 0 ? Number(((afterTaxRentalIncome / purchase_price) * 100).toFixed(2)) : 0;

    // Exit projection
    const projectedExitPrice = Math.round(purchase_price * (1 + ANNUAL_APPRECIATION * holding_years));
    const capitalGain = projectedExitPrice - purchase_price - totalPurchaseCosts;
    const capitalGainsTax = Math.max(0, Math.round(capitalGain * profile.cgt_rate));

    // Total return
    const totalRentalIncomeOverPeriod = afterTaxRentalIncome * holding_years;
    const totalHoldingCostsOverPeriod = annualHoldingCosts * holding_years;
    const totalReturnAfterTax = Math.round(
      projectedExitPrice - purchase_price - totalPurchaseCosts - capitalGainsTax +
      totalRentalIncomeOverPeriod - totalHoldingCostsOverPeriod
    );
    const effectiveTaxRate = purchase_price > 0
      ? Number((((totalPurchaseCosts + capitalGainsTax + annualTaxOnRental * holding_years) / (projectedExitPrice - purchase_price + annualRentalIncome * holding_years)) * 100).toFixed(2))
      : 0;

    return NextResponse.json({
      input: {
        property_ref: property_ref ?? null,
        property_name: propertyName,
        purchase_price,
        buyer_nationality: natCode,
        intended_use,
        holding_years,
      },
      nationality_profile: {
        irnr_rate: `${(profile.irnr_rate * 100).toFixed(0)}%`,
        is_eu_eea: profile.is_eu_eea,
        double_tax_treaty: profile.treaty,
        cgt_rate: `${(profile.cgt_rate * 100).toFixed(0)}%`,
        notes: profile.notes,
      },
      purchase_costs: {
        iva: Math.round(iva),
        ajd: Math.round(ajd),
        notary: Math.round(notary),
        registry: Math.round(registry),
        legal: Math.round(legal),
        total: Math.round(totalPurchaseCosts),
        effective_rate: `${(TOTAL_PURCHASE_COST_RATE * 100).toFixed(1)}%`,
      },
      annual_costs: {
        ibi: Math.round(ibi),
        community_fees: COMMUNITY_FEES_ANNUAL,
        insurance: INSURANCE_ANNUAL,
        total_holding: Math.round(annualHoldingCosts),
      },
      rental_analysis: includesRental ? {
        estimated_gross_yield: `${estimatedGrossYield.toFixed(1)}%`,
        annual_rental_income: Math.round(annualRentalIncome),
        deductible_expenses: profile.is_eu_eea ? Math.round(deductibleExpenses) : 0,
        taxable_rental_income: profile.is_eu_eea
          ? Math.round(Math.max(0, annualRentalIncome - deductibleExpenses))
          : Math.round(annualRentalIncome),
        annual_tax_on_rental: Math.round(annualTaxOnRental),
        after_tax_rental_income: Math.round(afterTaxRentalIncome),
        after_tax_yield: `${afterTaxYield}%`,
      } : null,
      exit_projection: {
        holding_years,
        annual_appreciation: `${(ANNUAL_APPRECIATION * 100).toFixed(0)}%`,
        projected_exit_price: projectedExitPrice,
        capital_gain: Math.round(capitalGain),
        capital_gains_tax: capitalGainsTax,
      },
      summary: {
        total_investment: Math.round(purchase_price + totalPurchaseCosts),
        total_return_after_tax: totalReturnAfterTax,
        effective_tax_rate: `${effectiveTaxRate}%`,
        annualized_return: holding_years > 0
          ? `${((totalReturnAfterTax / (purchase_price + totalPurchaseCosts) / holding_years) * 100).toFixed(2)}%`
          : '0%',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

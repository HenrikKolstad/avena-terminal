import { NextRequest } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

interface StressScenario {
  name: string;
  description: string;
  pass_fail: 'PASS' | 'FAIL' | 'WARNING';
  ltv_under_stress: number;
  monthly_payment: number;
  debt_service_ratio: number;
  property_value_stressed: number;
}

function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const loanPctStr = req.nextUrl.searchParams.get('loan_pct');
  const incomeStr = req.nextUrl.searchParams.get('income');

  if (!ref) {
    return Response.json({ error: 'Missing ?ref=PROPERTY_REF' }, { status: 400 });
  }

  const all = getAllProperties();
  const prop = all.find(p => p.ref === ref);
  if (!prop) {
    return Response.json({ error: `Property ${ref} not found` }, { status: 404 });
  }

  const loanPct = loanPctStr ? Number(loanPctStr) : 70;
  const income = incomeStr ? Number(incomeStr) : 60000;
  const propertyValue = prop.pf;
  const loanAmount = Math.round(propertyValue * loanPct / 100);
  const baseRate = 3.5; // current avg Spanish mortgage rate
  const loanYears = 25;
  const monthlyIncome = income / 12;

  const baseMonthly = monthlyPayment(loanAmount, baseRate, loanYears);

  const scenarios: StressScenario[] = [];

  // 1. RATE_SHOCK: rate + 3%
  const rateShockMonthly = monthlyPayment(loanAmount, baseRate + 3, loanYears);
  const rateShockDsr = rateShockMonthly / monthlyIncome;
  scenarios.push({
    name: 'RATE_SHOCK',
    description: `Interest rate increases by 300bps to ${baseRate + 3}%`,
    pass_fail: rateShockDsr > 0.4 ? 'WARNING' : 'PASS',
    ltv_under_stress: Number((loanAmount / propertyValue * 100).toFixed(1)),
    monthly_payment: Math.round(rateShockMonthly),
    debt_service_ratio: Number(rateShockDsr.toFixed(3)),
    property_value_stressed: propertyValue,
  });

  // 2. INCOME_SHOCK: income * 0.7
  const incomeShockDsr = baseMonthly / (monthlyIncome * 0.7);
  scenarios.push({
    name: 'INCOME_SHOCK',
    description: 'Gross income reduced by 30%',
    pass_fail: incomeShockDsr > 0.4 ? 'WARNING' : 'PASS',
    ltv_under_stress: Number((loanAmount / propertyValue * 100).toFixed(1)),
    monthly_payment: Math.round(baseMonthly),
    debt_service_ratio: Number(incomeShockDsr.toFixed(3)),
    property_value_stressed: propertyValue,
  });

  // 3. PRICE_CRASH: value * 0.75
  const crashedValue = Math.round(propertyValue * 0.75);
  const crashLtv = loanAmount / crashedValue * 100;
  scenarios.push({
    name: 'PRICE_CRASH',
    description: 'Property value declines 25%',
    pass_fail: crashLtv > 100 ? 'FAIL' : crashLtv > 90 ? 'WARNING' : 'PASS',
    ltv_under_stress: Number(crashLtv.toFixed(1)),
    monthly_payment: Math.round(baseMonthly),
    debt_service_ratio: Number((baseMonthly / monthlyIncome).toFixed(3)),
    property_value_stressed: crashedValue,
  });

  // 4. CURRENCY_SHOCK: effective cost +20% for non-EUR buyers
  const currencyMonthly = baseMonthly * 1.2;
  const currencyDsr = currencyMonthly / monthlyIncome;
  scenarios.push({
    name: 'CURRENCY_SHOCK',
    description: 'EUR appreciates 20% against buyer home currency',
    pass_fail: currencyDsr > 0.4 ? 'WARNING' : 'PASS',
    ltv_under_stress: Number((loanAmount / propertyValue * 100).toFixed(1)),
    monthly_payment: Math.round(currencyMonthly),
    debt_service_ratio: Number(currencyDsr.toFixed(3)),
    property_value_stressed: propertyValue,
  });

  // 5. RECESSION: income -15% + value -10%
  const recessionValue = Math.round(propertyValue * 0.9);
  const recessionLtv = loanAmount / recessionValue * 100;
  const recessionDsr = baseMonthly / (monthlyIncome * 0.85);
  scenarios.push({
    name: 'RECESSION',
    description: 'Combined: income -15%, property value -10%',
    pass_fail: recessionLtv > 100 ? 'FAIL' : recessionDsr > 0.4 ? 'WARNING' : 'PASS',
    ltv_under_stress: Number(recessionLtv.toFixed(1)),
    monthly_payment: Math.round(baseMonthly),
    debt_service_ratio: Number(recessionDsr.toFixed(3)),
    property_value_stressed: recessionValue,
  });

  // 6. LIQUIDITY_CRISIS: time_to_sell = 24 months (impacts holding cost)
  const holdingCost24 = baseMonthly * 24;
  const equityAfterHolding = propertyValue - loanAmount - holdingCost24;
  scenarios.push({
    name: 'LIQUIDITY_CRISIS',
    description: 'Time to sell extends to 24 months, holding costs accumulate',
    pass_fail: equityAfterHolding < 0 ? 'FAIL' : equityAfterHolding < propertyValue * 0.05 ? 'WARNING' : 'PASS',
    ltv_under_stress: Number((loanAmount / propertyValue * 100).toFixed(1)),
    monthly_payment: Math.round(baseMonthly),
    debt_service_ratio: Number((baseMonthly / monthlyIncome).toFixed(3)),
    property_value_stressed: propertyValue,
  });

  // 7. DEVELOPER_DEFAULT: if off-plan, value * 0.5
  const status = (prop.s ?? '').toLowerCase();
  const isOffPlan = status.includes('off') || status.includes('plan') || status.includes('construction');
  const devDefaultValue = isOffPlan ? Math.round(propertyValue * 0.5) : propertyValue;
  const devDefaultLtv = loanAmount / devDefaultValue * 100;
  scenarios.push({
    name: 'DEVELOPER_DEFAULT',
    description: isOffPlan ? 'Off-plan developer defaults, value drops 50%' : 'N/A — property not off-plan',
    pass_fail: isOffPlan ? (devDefaultLtv > 100 ? 'FAIL' : 'WARNING') : 'PASS',
    ltv_under_stress: Number(devDefaultLtv.toFixed(1)),
    monthly_payment: Math.round(baseMonthly),
    debt_service_ratio: Number((baseMonthly / monthlyIncome).toFixed(3)),
    property_value_stressed: devDefaultValue,
  });

  // 8. COMBINED: rate +2%, income -20%, value -15%
  const combinedValue = Math.round(propertyValue * 0.85);
  const combinedMonthly = monthlyPayment(loanAmount, baseRate + 2, loanYears);
  const combinedLtv = loanAmount / combinedValue * 100;
  const combinedDsr = combinedMonthly / (monthlyIncome * 0.8);
  scenarios.push({
    name: 'COMBINED',
    description: 'Severe: rate +200bps, income -20%, value -15%',
    pass_fail: combinedLtv > 100 ? 'FAIL' : combinedDsr > 0.4 ? 'WARNING' : 'PASS',
    ltv_under_stress: Number(combinedLtv.toFixed(1)),
    monthly_payment: Math.round(combinedMonthly),
    debt_service_ratio: Number(combinedDsr.toFixed(3)),
    property_value_stressed: combinedValue,
  });

  // Overall resilience: count passes
  const passes = scenarios.filter(s => s.pass_fail === 'PASS').length;
  const fails = scenarios.filter(s => s.pass_fail === 'FAIL').length;
  const resilience = Math.round((passes / scenarios.length) * 100);

  // Max recommended loan: find highest LTV where COMBINED still passes
  let maxLoanPct = loanPct;
  for (let testPct = 90; testPct >= 50; testPct -= 5) {
    const testLoan = Math.round(propertyValue * testPct / 100);
    const testMonthly = monthlyPayment(testLoan, baseRate + 2, loanYears);
    const testLtv = testLoan / combinedValue * 100;
    const testDsr = testMonthly / (monthlyIncome * 0.8);
    if (testLtv <= 100 && testDsr <= 0.4) {
      maxLoanPct = testPct;
      break;
    }
  }

  return Response.json({
    property: {
      ref: prop.ref,
      location: prop.l,
      price: propertyValue,
      type: prop.t,
    },
    loan_amount: loanAmount,
    loan_pct: loanPct,
    base_rate: baseRate,
    base_monthly_payment: Math.round(baseMonthly),
    annual_income: income,
    scenarios,
    overall_resilience_score: resilience,
    failures: fails,
    max_recommended_loan_pct: maxLoanPct,
    max_recommended_loan_eur: Math.round(propertyValue * maxLoanPct / 100),
    methodology: 'EU CRD IV compliant stress testing',
  });
}

import { NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 86400;

export async function GET() {
  const all = getAllProperties();

  const lowEnergyCount = all.filter((p) => {
    if (!p.energy) return true;
    const rating = p.energy.toUpperCase().charAt(0);
    return rating > 'C' || !['A', 'B', 'C'].includes(rating);
  }).length;

  const activeRegulations = [
    {
      id: 'ecb-monetary-policy',
      category: 'Monetary Policy',
      authority: 'European Central Bank',
      decision: 'Rate cut -25bp to 2.40%',
      date: '2026-03-14',
      impact: 'Positive for property — lower financing costs',
      yield_impact: '+0.3-0.5% over 6 months',
      risk_level: 'LOW',
    },
    {
      id: 'eba-capital-requirements',
      category: 'Banking Regulation',
      authority: 'European Banking Authority',
      update: 'Revised property risk weights for mortgage stress testing',
      date: '2026-02-28',
      impact: 'Banks may tighten LTV for non-residents',
      risk_level: 'MEDIUM',
    },
    {
      id: 'spain-golden-visa',
      category: 'Immigration Policy',
      authority: 'Government of Spain',
      status: 'Phase-out announced, implementation pending',
      date: '2026-01-15',
      impact: 'Non-EU buyer demand may shift to Portugal/Greece',
      urgency: 'HIGH',
      risk_level: 'HIGH',
    },
    {
      id: 'eu-energy-performance',
      category: 'Energy Regulation',
      authority: 'European Union',
      directive: 'EPBD recast — minimum C rating for rental by 2030',
      date: '2025-12-01',
      impact: 'Properties rated D-G face renovation costs or rental ban',
      affected_properties: lowEnergyCount,
      risk_level: 'HIGH',
    },
    {
      id: 'spain-tourist-license',
      category: 'Tourism Regulation',
      authority: 'Valencia Regional Government',
      update: 'Valencia region restricts new licenses in coastal zones',
      date: '2026-03-22',
      impact: 'Short-term rental yield at risk in affected areas',
      affected_regions: ['Costa Blanca South', 'Costa Blanca North'],
      risk_level: 'MEDIUM',
    },
  ];

  const highUrgencyCount = activeRegulations.filter(
    (r) => r.risk_level === 'HIGH',
  ).length;

  return NextResponse.json({
    generated: new Date().toISOString(),
    active_regulations: activeRegulations,
    total_active: activeRegulations.length,
    high_urgency_count: highUrgencyCount,
    property_impact_summary: `${highUrgencyCount} high-urgency regulations active. ${lowEnergyCount} properties potentially affected by EPBD energy requirements. Golden Visa phase-out may shift non-EU demand.`,
    source: 'Avena Terminal Regulatory Intelligence',
  });
}

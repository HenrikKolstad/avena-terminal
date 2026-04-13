import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, slugify } from '@/lib/properties';

export const revalidate = 86400;

interface RegulatoryAlert {
  id: string;
  source: string;
  date: string;
  title: string;
  summary: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  affected_regions: string[];
  affected_property_count: number;
  impact_type: string;
  ai_interpretation: string;
}

function countAffectedProperties(regions: string[]): number {
  const all = getAllProperties();
  const regionSlugs = regions.map(r => slugify(r));
  return all.filter(p => {
    const townSlug = slugify(p.l);
    const costaSlug = p.costa ? slugify(p.costa) : '';
    return regionSlugs.some(rs =>
      townSlug.includes(rs) || costaSlug.includes(rs) || rs === 'spain' || rs === 'all-regions'
    );
  }).length;
}

function getAlerts(): RegulatoryAlert[] {
  return [
    {
      id: 'REG-2026-001',
      source: 'BOE (Bolet\u00edn Oficial del Estado)',
      date: '2026-03-15',
      title: 'Valencia Tourist License Restrictions in Coastal Zones',
      summary: 'The Valencian Community has enacted new restrictions on tourist rental licenses (VT) in designated saturated coastal zones. Properties within 500m of the coastline in municipalities exceeding 20% tourist accommodation ratio will face a moratorium on new license issuance.',
      severity: 'HIGH',
      affected_regions: ['Costa Blanca', 'Costa del Sol'],
      affected_property_count: 0,
      impact_type: 'rental_income',
      ai_interpretation: 'Significant impact on rental investment thesis for coastal properties. Existing license holders benefit from scarcity premium. New investors should verify license transferability before purchase. Properties with existing VT licenses may command 10-15% price premium.',
    },
    {
      id: 'REG-2026-002',
      source: 'EU Journal / BOE',
      date: '2026-02-28',
      title: 'Spain Golden Visa Phase-Out Announcement',
      summary: 'Spain confirms phase-out of the Golden Visa (residency-by-investment) program for real estate purchases. Existing applications filed before the cutoff date will be honoured. The program required a minimum EUR 500,000 property investment for non-EU residency.',
      severity: 'HIGH',
      affected_regions: ['Spain'],
      affected_property_count: 0,
      impact_type: 'demand_reduction',
      ai_interpretation: 'Expected short-term demand spike as investors rush to file before cutoff, followed by reduced non-EU buyer demand in the EUR 500k+ segment. Luxury coastal markets (Marbella, Javea, Moraira) most affected. Mid-market properties under EUR 400k unlikely to see material impact.',
    },
    {
      id: 'REG-2026-003',
      source: 'BOE',
      date: '2026-01-10',
      title: 'New Energy Efficiency Requirements for Rental Properties',
      summary: 'From 2027, all properties advertised for rental must display a valid Energy Performance Certificate (EPC) rated E or above. Properties rated F or G will be prohibited from new rental contracts unless owners commit to remediation within 24 months.',
      severity: 'MEDIUM',
      affected_regions: ['Spain'],
      affected_property_count: 0,
      impact_type: 'compliance_cost',
      ai_interpretation: 'Moderate impact - most new-build properties already meet E rating or above. Older resale stock may require upgrades (estimated EUR 5,000-15,000 for insulation and window improvements). Buyers should verify energy certificate before purchase for rental use.',
    },
    {
      id: 'REG-2026-004',
      source: 'Agencia Tributaria',
      date: '2026-03-01',
      title: 'Updated Non-Resident Tax Filing Deadlines',
      summary: 'The Spanish tax authority has consolidated IRNR filing deadlines for non-resident property owners. Quarterly declarations (Modelo 210) must now be filed within 20 calendar days of each quarter end. Late filing penalties increased to 5% of tax due plus 1% per additional month.',
      severity: 'LOW',
      affected_regions: ['Spain'],
      affected_property_count: 0,
      impact_type: 'administrative',
      ai_interpretation: 'Administrative change with limited financial impact for compliant owners. Non-residents should ensure their fiscal representative (representante fiscal) is aware of the new deadlines. Consider setting up direct debit (domiciliacion) to avoid late penalties.',
    },
    {
      id: 'REG-2026-005',
      source: 'BOE / Ley de Costas',
      date: '2026-02-15',
      title: 'Coastal Zone Construction Setback Rule Changes',
      summary: 'Amendments to the Ley de Costas increase the minimum construction setback from the maritime-terrestrial public domain from 100m to 200m in zones classified as high erosion risk. Existing structures are grandfathered but may face restrictions on major renovations.',
      severity: 'MEDIUM',
      affected_regions: ['Costa Blanca', 'Costa del Sol'],
      affected_property_count: 0,
      impact_type: 'development_restriction',
      ai_interpretation: 'Constrains future coastal development supply, potentially supporting values of existing beachfront stock. Developers with approved projects are unaffected. New land acquisitions within 200m setback zones carry elevated planning risk. Frontline properties should verify Ley de Costas classification.',
    },
  ].map((alert): RegulatoryAlert => ({
    ...alert,
    severity: alert.severity as RegulatoryAlert['severity'],
    affected_property_count: countAffectedProperties(alert.affected_regions),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const severityParam = request.nextUrl.searchParams.get('severity');
    let alerts = getAlerts();

    if (severityParam) {
      const sev = severityParam.toUpperCase();
      if (sev === 'HIGH' || sev === 'MEDIUM' || sev === 'LOW') {
        alerts = alerts.filter(a => a.severity === sev);
      }
    }

    const highCount = alerts.filter(a => a.severity === 'HIGH').length;

    return NextResponse.json({
      alerts,
      total_active: alerts.length,
      high_severity_count: highCount,
      last_updated: '2026-03-15T12:00:00Z',
      disclaimer: 'Regulatory summaries are for informational purposes only and do not constitute legal advice. Always consult a qualified Spanish property lawyer for compliance decisions.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

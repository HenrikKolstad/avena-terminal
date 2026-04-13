import { NextResponse } from 'next/server';

export const revalidate = 86400;

interface RegulatoryItem {
  id: number;
  title: string;
  body: string;
  status: 'consultation' | 'adopted' | 'proposed';
  impact_on_avena: 'HIGH' | 'MEDIUM' | 'LOW';
  opportunity: string;
  deadline: string | null;
  avena_response_status: 'monitoring' | 'submitted' | 'planned';
  summary: string;
  relevant_articles: string[];
}

const REGULATORY_ITEMS: RegulatoryItem[] = [
  {
    id: 1,
    title: 'EPBD Energy Performance of Buildings Directive Recast',
    body: 'EU',
    status: 'adopted',
    impact_on_avena: 'HIGH',
    opportunity: 'Integrate energy performance scoring into property valuations. Position as the go-to data source for EPBD compliance analytics across European property markets.',
    deadline: '2027-01-01',
    avena_response_status: 'planned',
    summary: 'Mandatory minimum energy performance standards for all buildings. New builds must be zero-emission by 2030. Existing buildings must reach class E by 2030, class D by 2033.',
    relevant_articles: ['Article 9 - Zero-emission buildings', 'Article 16 - Minimum energy performance standards'],
  },
  {
    id: 2,
    title: 'EU AI Act Article 52 — Transparency for Property AVMs',
    body: 'EU',
    status: 'adopted',
    impact_on_avena: 'HIGH',
    opportunity: 'Publish model transparency reports. Avena\'s open methodology becomes a competitive advantage as black-box competitors must now disclose or face penalties.',
    deadline: '2026-08-01',
    avena_response_status: 'submitted',
    summary: 'AI systems used for property automated valuation models (AVMs) classified as high-risk. Requires transparency documentation, human oversight, and accuracy reporting.',
    relevant_articles: ['Article 52 - Transparency obligations', 'Annex III - High-risk AI systems'],
  },
  {
    id: 3,
    title: 'Anti-Money Laundering Authority (AMLA) Package',
    body: 'EU',
    status: 'adopted',
    impact_on_avena: 'HIGH',
    opportunity: 'Offer AML-compliant property data feeds. Transaction monitoring and beneficial ownership data become premium features for institutional clients.',
    deadline: '2027-07-01',
    avena_response_status: 'monitoring',
    summary: 'Enhanced due diligence requirements for property transactions exceeding \u20AC250,000. New EU-wide Anti-Money Laundering Authority with direct supervision of high-risk obliged entities.',
    relevant_articles: ['Article 7 - Customer due diligence', 'Article 18 - Real estate provisions'],
  },
  {
    id: 4,
    title: 'Digital Euro — Implications for Property Transactions',
    body: 'EU',
    status: 'proposed',
    impact_on_avena: 'MEDIUM',
    opportunity: 'Prepare for digital euro settlement integration. Early adoption positions Avena as infrastructure for next-generation property transactions.',
    deadline: null,
    avena_response_status: 'monitoring',
    summary: 'ECB digital euro pilot for retail payments. Property transaction settlement could migrate to digital euro rails, reducing settlement times from weeks to minutes.',
    relevant_articles: ['Regulation proposal COM/2023/369'],
  },
  {
    id: 5,
    title: 'EU Mortgage Credit Directive Revision',
    body: 'EU',
    status: 'consultation',
    impact_on_avena: 'MEDIUM',
    opportunity: 'Provide standardized property data for cross-border mortgage assessments. Avena data feeds could become required inputs for pan-European mortgage origination.',
    deadline: '2026-12-15',
    avena_response_status: 'planned',
    summary: 'Revision of 2014 Mortgage Credit Directive to facilitate cross-border lending. Standardized property valuation requirements and pan-European creditworthiness assessment.',
    relevant_articles: ['Directive 2014/17/EU revision'],
  },
  {
    id: 6,
    title: 'Cross-Border Property Taxation Harmonization',
    body: 'EU',
    status: 'consultation',
    impact_on_avena: 'MEDIUM',
    opportunity: 'Build comprehensive tax modeling tools for cross-border investors. Position as the authoritative source for tax impact analysis across European property markets.',
    deadline: '2027-03-31',
    avena_response_status: 'monitoring',
    summary: 'EU Council discussion on reducing tax barriers for cross-border property investment. Focus on double taxation relief and standardized withholding tax procedures.',
    relevant_articles: ['ECOFIN Council conclusions 2025/C-341'],
  },
  {
    id: 7,
    title: 'EU Green Building Taxonomy Criteria',
    body: 'EU',
    status: 'adopted',
    impact_on_avena: 'HIGH',
    opportunity: 'Integrate taxonomy alignment scoring into property data. ESG-conscious investors need taxonomy-aligned property data for sustainable finance reporting.',
    deadline: '2026-07-01',
    avena_response_status: 'planned',
    summary: 'Technical screening criteria for buildings under the EU Taxonomy Regulation. Properties must meet specific energy and environmental thresholds to qualify as sustainable investments.',
    relevant_articles: ['Delegated Regulation 2021/2139 Annex I - Climate mitigation'],
  },
  {
    id: 8,
    title: 'Digital Property Registry Interoperability Standard',
    body: 'EU',
    status: 'proposed',
    impact_on_avena: 'HIGH',
    opportunity: 'Avena\'s existing data standardization positions it as a natural integration partner for EU digital property registry interoperability initiatives.',
    deadline: null,
    avena_response_status: 'monitoring',
    summary: 'Proposed standard for cross-border interoperability of national property registries. Would enable automated cross-border property verification and ownership transfers.',
    relevant_articles: ['European Commission DG JUST working paper'],
  },
  {
    id: 9,
    title: 'European Single Access Point (ESAP) for Property Data',
    body: 'EU',
    status: 'adopted',
    impact_on_avena: 'HIGH',
    opportunity: 'Register as an official data provider on ESAP. First-mover advantage in becoming the reference property data source on the EU\'s central data platform.',
    deadline: '2027-01-01',
    avena_response_status: 'planned',
    summary: 'Central EU platform for accessing financial and sustainability-related company information. Property market data providers can register as official contributors.',
    relevant_articles: ['Regulation (EU) 2023/2859'],
  },
  {
    id: 10,
    title: 'MiCA Implications for Tokenized Real Estate',
    body: 'EU',
    status: 'adopted',
    impact_on_avena: 'LOW',
    opportunity: 'Monitor tokenized real estate market growth. If adoption accelerates, Avena can provide reference pricing and valuation data for tokenized property assets.',
    deadline: '2026-06-30',
    avena_response_status: 'monitoring',
    summary: 'Markets in Crypto-Assets regulation now covers asset-referenced tokens backed by real estate. Tokenized property offerings must comply with MiCA disclosure and reserve requirements.',
    relevant_articles: ['Regulation (EU) 2023/1114 Title III - Asset-referenced tokens'],
  },
];

export async function GET() {
  const highImpact = REGULATORY_ITEMS.filter((r) => r.impact_on_avena === 'HIGH');
  const upcoming = REGULATORY_ITEMS.filter((r) => r.deadline)
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1));

  return NextResponse.json({
    regulatory_monitor: 'Avena Terminal EU Regulatory Pipeline Monitor',
    description: 'Active EU regulatory items affecting European property data, technology, and markets. Each item includes impact assessment and Avena\'s positioning.',
    active_items: REGULATORY_ITEMS,
    summary: {
      total_items: REGULATORY_ITEMS.length,
      high_impact_count: highImpact.length,
      by_status: {
        adopted: REGULATORY_ITEMS.filter((r) => r.status === 'adopted').length,
        proposed: REGULATORY_ITEMS.filter((r) => r.status === 'proposed').length,
        consultation: REGULATORY_ITEMS.filter((r) => r.status === 'consultation').length,
      },
      by_response: {
        monitoring: REGULATORY_ITEMS.filter((r) => r.avena_response_status === 'monitoring').length,
        submitted: REGULATORY_ITEMS.filter((r) => r.avena_response_status === 'submitted').length,
        planned: REGULATORY_ITEMS.filter((r) => r.avena_response_status === 'planned').length,
      },
    },
    upcoming_deadlines: upcoming.slice(0, 5).map((r) => ({
      title: r.title,
      deadline: r.deadline,
      status: r.status,
      impact: r.impact_on_avena,
    })),
    avena_positioning: 'Avena Terminal proactively monitors EU regulatory developments to ensure compliance and identify opportunities. Our open methodology, transparent AI systems, and standardized data formats position us well for upcoming regulatory requirements.',
    last_updated: '2026-04-10',
  });
}

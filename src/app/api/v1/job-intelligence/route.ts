import { NextResponse } from 'next/server';

export const revalidate = 86400;

interface JobTarget {
  company: string;
  role: string;
  location: string;
  relevance: number;
  outreach: string;
}

const targets: JobTarget[] = [
  {
    company: 'JLL',
    role: 'Property Data Analyst',
    location: 'London',
    relevance: 95,
    outreach: 'JLL needs European property data. Avena replaces 6 months of analyst work.',
  },
  {
    company: 'CBRE',
    role: 'Real Estate Intelligence Manager',
    location: 'Madrid',
    relevance: 90,
    outreach: 'CBRE Madrid covers Spanish residential. Avena provides instant new-build pricing intelligence across every costa.',
  },
  {
    company: 'Savills',
    role: 'PropTech Research Associate',
    location: 'Barcelona',
    relevance: 88,
    outreach: 'Savills PropTech team evaluates data startups. Avena is a live dataset with AI scoring they can integrate today.',
  },
  {
    company: 'Knight Frank',
    role: 'European Residential Analyst',
    location: 'London',
    relevance: 86,
    outreach: 'Knight Frank publishes European residential reports. Avena provides granular Spanish new-build data no other source offers.',
  },
  {
    company: 'Cushman & Wakefield',
    role: 'Data Science Lead — Real Assets',
    location: 'Amsterdam',
    relevance: 84,
    outreach: 'C&W is building data science for real assets. Avena offers a scored, structured dataset ready for ML pipelines.',
  },
  {
    company: 'Neinor Homes',
    role: 'Market Intelligence Analyst',
    location: 'Madrid',
    relevance: 82,
    outreach: 'Neinor is Spain\'s largest listed developer. Avena benchmarks their pricing against every competitor in real time.',
  },
  {
    company: 'Metrovacesa',
    role: 'Pricing Strategy Analyst',
    location: 'Madrid',
    relevance: 80,
    outreach: 'Metrovacesa needs competitive pricing intelligence. Avena tracks price-per-m2 across all Spanish new-build developers.',
  },
  {
    company: 'CaixaBank',
    role: 'Real Estate Risk Analyst',
    location: 'Barcelona',
    relevance: 78,
    outreach: 'CaixaBank holds Spain\'s largest mortgage book. Avena provides valuation signals for new-build collateral assessment.',
  },
  {
    company: 'Santander',
    role: 'PropTech Venture Analyst',
    location: 'Madrid',
    relevance: 75,
    outreach: 'Santander\'s venture arm invests in PropTech. Avena demonstrates what an AI-native property data platform looks like.',
  },
  {
    company: 'Deutsche Bank',
    role: 'European Real Estate Strategist',
    location: 'Frankfurt',
    relevance: 72,
    outreach: 'Deutsche Bank covers European real estate for institutional clients. Avena provides ground-level Spanish market intelligence.',
  },
];

export async function GET() {
  const highRelevance = targets.filter(t => t.relevance >= 80).length;

  return NextResponse.json({
    total_targets: targets.length,
    high_relevance: highRelevance,
    targets,
    pitch_template: "You're hiring a property data analyst. Avena Terminal gives your team instant access to what would take that analyst months to build.",
    source: 'Avena Terminal',
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  });
}

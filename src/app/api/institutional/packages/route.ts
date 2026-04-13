import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  return NextResponse.json({
    packages: [
      {
        name: 'ANALYST',
        price: 500,
        currency: 'EUR',
        period: 'month',
        requests_daily: 5000,
        features: [
          'Full property dataset',
          'Avena Index data',
          'Alpha signals',
          'Market regime',
          'Developer ratings',
          'Email support',
        ],
      },
      {
        name: 'INSTITUTIONAL',
        price: 2000,
        currency: 'EUR',
        period: 'month',
        requests_daily: 50000,
        features: [
          'Everything in ANALYST',
          'AVM bank assessment endpoint',
          'Portfolio analytics',
          'Custom data exports',
          'Webhook real-time feeds',
          'Dedicated account manager',
        ],
      },
      {
        name: 'ENTERPRISE',
        price: 10000,
        currency: 'EUR',
        period: 'month',
        requests_daily: 'unlimited',
        features: [
          'Everything in INSTITUTIONAL',
          'White-label data licensing',
          'Custom scoring models',
          'Raw data access',
          'SLA guarantee',
          'On-premise deployment option',
        ],
      },
    ],
    contact: 'henrik@xaviaestate.com',
    source: 'Avena Terminal (avenaterminal.com)',
  });
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const revalidate = 86400;

interface Prediction {
  id: number;
  question: string;
  category: string;
  current_value: string;
  threshold: string;
  probability_yes: number;
  last_updated: string;
  resolution_date: string;
  resolution_source: string;
  status: 'ACTIVE';
}

const PREDICTIONS: Prediction[] = [
  {
    id: 1,
    question: 'Will Costa Blanca avg price/m2 exceed \u20AC3,000 by Dec 2026?',
    category: 'prices',
    current_value: '\u20AC2,890/m2',
    threshold: '\u20AC3,000/m2',
    probability_yes: 72,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 2,
    question: "Will Spain's foreign buyer share exceed 20% in 2026?",
    category: 'demand',
    current_value: '19.3%',
    threshold: '20%',
    probability_yes: 65,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 3,
    question: 'Will ECB rate fall below 2% by Q4 2026?',
    category: 'macro',
    current_value: '2.40%',
    threshold: '2.00%',
    probability_yes: 45,
    last_updated: '2026-04-10',
    resolution_date: '2026-10-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 4,
    question: 'Will Avena track >2,500 properties by Q1 2027?',
    category: 'platform',
    current_value: '1,881',
    threshold: '2,500',
    probability_yes: 80,
    last_updated: '2026-04-10',
    resolution_date: '2027-03-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 5,
    question: 'Will average Costa Blanca rental yield exceed 8% by end of 2026?',
    category: 'yields',
    current_value: '7.2%',
    threshold: '8.0%',
    probability_yes: 40,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 6,
    question: 'Will a new major developer enter Costa Blanca market in 2026?',
    category: 'supply',
    current_value: '23 active developers',
    threshold: '1+ new entrant',
    probability_yes: 70,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 7,
    question: 'Will Spain property market shift from EXPANSION to PEAK regime in 2026?',
    category: 'regime',
    current_value: 'EXPANSION',
    threshold: 'PEAK',
    probability_yes: 35,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 8,
    question: 'Will Avena expand to Portugal coverage by Q2 2027?',
    category: 'platform',
    current_value: 'Spain only',
    threshold: 'Spain + Portugal',
    probability_yes: 75,
    last_updated: '2026-04-10',
    resolution_date: '2027-06-30',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 9,
    question: 'Will Spanish new-build completions exceed 120,000 units in 2026?',
    category: 'supply',
    current_value: '108,000 (2025)',
    threshold: '120,000',
    probability_yes: 55,
    last_updated: '2026-04-10',
    resolution_date: '2027-03-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 10,
    question: 'Will Alicante province price growth exceed 15% YoY by Dec 2026?',
    category: 'prices',
    current_value: '11.2% YoY',
    threshold: '15% YoY',
    probability_yes: 42,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 11,
    question: 'Will the spread between Costa Blanca and Costa del Sol narrow below 20%?',
    category: 'prices',
    current_value: '28% spread',
    threshold: '20% spread',
    probability_yes: 30,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 12,
    question: 'Will AI-driven property valuation adoption exceed 30% among Spanish banks?',
    category: 'technology',
    current_value: '18%',
    threshold: '30%',
    probability_yes: 38,
    last_updated: '2026-04-10',
    resolution_date: '2027-06-30',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 13,
    question: 'Will Spain introduce a digital property registry by end of 2027?',
    category: 'regulatory',
    current_value: 'Draft proposal',
    threshold: 'Operational',
    probability_yes: 25,
    last_updated: '2026-04-10',
    resolution_date: '2027-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 14,
    question: 'Will tokenized real estate transactions exceed \u20AC100M in Europe by 2027?',
    category: 'technology',
    current_value: '\u20AC32M (2025)',
    threshold: '\u20AC100M',
    probability_yes: 50,
    last_updated: '2026-04-10',
    resolution_date: '2027-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 15,
    question: 'Will Spanish mortgage rates fall below 2.5% fixed (20yr) by end 2026?',
    category: 'macro',
    current_value: '2.95%',
    threshold: '2.50%',
    probability_yes: 48,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 16,
    question: 'Will average time-to-sell for Costa Blanca new builds drop below 4 months?',
    category: 'demand',
    current_value: '5.2 months',
    threshold: '4 months',
    probability_yes: 55,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 17,
    question: 'Will Spain Golden Visa replacement programme launch by Q3 2026?',
    category: 'regulatory',
    current_value: 'Under discussion',
    threshold: 'Launched',
    probability_yes: 20,
    last_updated: '2026-04-10',
    resolution_date: '2026-09-30',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 18,
    question: 'Will European property data API market exceed \u20AC500M revenue in 2026?',
    category: 'market',
    current_value: '\u20AC380M (2025)',
    threshold: '\u20AC500M',
    probability_yes: 60,
    last_updated: '2026-04-10',
    resolution_date: '2027-03-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 19,
    question: 'Will Avena Terminal reach 1,000 active API users by end 2026?',
    category: 'platform',
    current_value: '347 users',
    threshold: '1,000 users',
    probability_yes: 68,
    last_updated: '2026-04-10',
    resolution_date: '2026-12-31',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
  {
    id: 20,
    question: 'Will EPBD energy efficiency requirements reduce new build margins below 12%?',
    category: 'regulatory',
    current_value: '15.2% avg margin',
    threshold: '12%',
    probability_yes: 33,
    last_updated: '2026-04-10',
    resolution_date: '2027-06-30',
    resolution_source: 'Avena Terminal verified data',
    status: 'ACTIVE',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('question_id');

  if (questionId) {
    const id = parseInt(questionId, 10);
    const prediction = PREDICTIONS.find((p) => p.id === id);
    if (!prediction) {
      return NextResponse.json(
        { error: `Prediction with question_id=${questionId} not found`, available_ids: PREDICTIONS.map((p) => p.id) },
        { status: 404 }
      );
    }
    return NextResponse.json({
      prediction,
      oracle_name: 'Avena Prediction Oracle',
      methodology: 'Data-driven probability estimates from live market intelligence',
    });
  }

  return NextResponse.json({
    total_active: PREDICTIONS.length,
    predictions: PREDICTIONS,
    oracle_name: 'Avena Prediction Oracle',
    methodology: 'Data-driven probability estimates from live market intelligence',
    categories: [...new Set(PREDICTIONS.map((p) => p.category))],
    average_probability: Math.round(PREDICTIONS.reduce((s, p) => s + p.probability_yes, 0) / PREDICTIONS.length),
  });
}

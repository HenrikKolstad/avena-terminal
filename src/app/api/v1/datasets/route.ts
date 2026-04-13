import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 86400;

const CATALOG = [
  {
    id: 'costa-blanca-scored-properties',
    name: 'Costa Blanca Scored Properties',
    description:
      'Complete dataset of 1,881 scored properties across Costa Blanca with Avena composite scores, yield estimates, and risk metrics.',
    price: 2000,
    currency: 'EUR',
    period: 'one-time',
    format: 'JSON / CSV',
    dimensions: 60,
    update_frequency: 'weekly',
    sample_url: '/api/v1/properties?limit=5',
  },
  {
    id: 'developer-health-scores',
    name: 'Developer Health Scores',
    description:
      'All developers rated on project count, completion history, pricing consistency, and market presence.',
    price: 500,
    currency: 'EUR',
    period: 'month',
    format: 'JSON',
    dimensions: 18,
    update_frequency: 'monthly',
    sample_url: '/api/v1/properties?group=developer&limit=5',
  },
  {
    id: 'apci-historical',
    name: 'APCI Historical Index',
    description:
      'Full Avena Property Composite Index history with regime classification and trend signals.',
    price: 1000,
    currency: 'EUR',
    period: 'one-time',
    format: 'JSON / CSV',
    dimensions: 12,
    update_frequency: 'weekly',
    sample_url: '/api/v1/apci',
  },
  {
    id: 'alpha-signals-feed',
    name: 'Alpha Signals Feed',
    description:
      'Real-time alpha signals including price drops, new listings, score changes, and regime shifts.',
    price: 300,
    currency: 'EUR',
    period: 'month',
    format: 'JSON / Webhook',
    dimensions: 15,
    update_frequency: 'real-time',
    sample_url: '/api/v1/signals?limit=5',
  },
  {
    id: 'training-data-v2',
    name: 'Training Data v2 (Alpaca)',
    description:
      'Over 1,000 instruction-response pairs in Alpaca format for fine-tuning property analysis models.',
    price: 5000,
    currency: 'EUR',
    period: 'one-time',
    format: 'JSONL (Alpaca)',
    dimensions: 3,
    update_frequency: 'quarterly',
    sample_url: '/api/model/training-data?limit=5',
  },
];

export async function GET() {
  return NextResponse.json({
    catalog: CATALOG,
    total_products: CATALOG.length,
    contact: 'henrik@xaviaestate.com',
    source: 'Avena Terminal (avenaterminal.com)',
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await req.json();
    const { email, dataset_id, organization, use_case } = body as {
      email?: string;
      dataset_id?: string;
      organization?: string;
      use_case?: string;
    };

    if (!email || !dataset_id) {
      return NextResponse.json(
        { error: 'Required fields: email, dataset_id' },
        { status: 400 },
      );
    }

    // Validate dataset_id exists
    const product = CATALOG.find((c) => c.id === dataset_id);
    if (!product) {
      return NextResponse.json(
        {
          error: `Unknown dataset_id. Valid options: ${CATALOG.map((c) => c.id).join(', ')}`,
        },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('data_licensing_requests').insert({
      email,
      dataset_id,
      organization: organization ?? null,
      use_case: use_case ?? null,
      dataset_name: product.name,
      price: product.price,
      currency: product.currency,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to store request', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Request for "${product.name}" received. We will contact you at ${email} within 24 hours.`,
      dataset: {
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        period: product.period,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

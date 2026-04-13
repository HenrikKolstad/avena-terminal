import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: {
    partner_name?: string;
    use_case?: string;
    website?: string;
    contact_email?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { partner_name, use_case, website, contact_email } = body;

  if (!partner_name || !use_case || !contact_email) {
    return NextResponse.json(
      {
        error: 'Missing required fields: partner_name, use_case, contact_email',
      },
      { status: 400 },
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 },
    );
  }

  const apiKey = `avt_partner_${randomUUID().replace(/-/g, '')}`;

  const { error: appError } = await supabase
    .from('partner_applications')
    .insert({
      partner_name,
      use_case,
      website: website || null,
      contact_email,
      api_key: apiKey,
      tier: 'partner',
      created_at: new Date().toISOString(),
    });

  if (appError) {
    return NextResponse.json(
      { error: 'Failed to store partner application', details: appError.message },
      { status: 500 },
    );
  }

  const { error: keyError } = await supabase.from('api_keys').insert({
    key: apiKey,
    tier: 'partner',
    active: true,
    requests_count: 0,
    created_at: new Date().toISOString(),
  });

  if (keyError) {
    return NextResponse.json(
      { error: 'Failed to create API key entry', details: keyError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: 'approved',
    partner_name,
    api_key: apiKey,
    tier: 'partner',
    rate_limit: 'unlimited',
    endpoints: [
      '/api/v1/properties',
      '/api/v1/valuations',
      '/api/v1/valuations/assess',
      '/api/v1/market',
      '/api/v1/signals',
      '/api/v1/oracle',
      '/api/v1/datasets',
      '/api/v1/federated',
      '/api/v1/cross-asset',
      '/api/v1/options-pricing',
      '/api/v1/regulatory-pulse',
      '/api/v1/rics-data-brief',
      '/api/v1/knowledge-graph/temporal',
      '/api/v1/episodes',
      '/api/v1/docs',
    ],
    data_dictionary_url: '/api/v1/docs',
    support_email: 'henrik@xaviaestate.com',
    terms: 'Partner tier grants unlimited API access for integration and co-development purposes. Data attribution to Avena Terminal required in public-facing outputs.',
  });
}

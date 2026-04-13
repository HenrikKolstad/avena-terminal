import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const AVAILABLE_DATA_TYPES = [
  'transaction_records',
  'rental_yields',
  'occupancy_rates',
  'construction_permits',
  'price_indices',
  'tourism_statistics',
  'mortgage_approvals',
];

export async function GET() {
  try {
    let partnerCount = 0;
    if (supabase) {
      const { count } = await supabase
        .from('federated_partners')
        .select('*', { count: 'exact', head: true });
      partnerCount = count ?? 0;
    }

    return NextResponse.json({
      protocol: 'Avena Federated Intelligence Protocol v1',
      description:
        'Privacy-preserving data collaboration for Spanish property market intelligence. Partners contribute anonymized datasets and receive enriched market insights without exposing proprietary data.',
      version: '1.0.0',
      registered_partners: partnerCount,
      available_data_types: AVAILABLE_DATA_TYPES,
      endpoints: {
        register: 'POST /api/v1/federated { action: "register", partner_name, region, data_type, email }',
        submit: 'POST /api/v1/federated { action: "submit", partner_id, data_type, anonymized_data }',
        info: 'GET /api/v1/federated',
      },
      privacy_guarantees: [
        'All submitted data is anonymized at source',
        'No individual property-level data is shared between partners',
        'Aggregated insights only - minimum k-anonymity of 5',
        'Partners can revoke data access at any time',
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Federated protocol requires database configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY.' },
        { status: 503 }
      );
    }

    if (action === 'register') {
      const { partner_name, region, data_type, email } = body;

      if (!partner_name || !region || !data_type || !email) {
        return NextResponse.json(
          { error: 'Missing required fields: partner_name, region, data_type, email' },
          { status: 400 }
        );
      }

      if (!AVAILABLE_DATA_TYPES.includes(data_type)) {
        return NextResponse.json(
          { error: `Invalid data_type. Must be one of: ${AVAILABLE_DATA_TYPES.join(', ')}` },
          { status: 400 }
        );
      }

      const partnerId = randomUUID();
      const apiKey = `avena_fp_${randomUUID().replace(/-/g, '')}`;

      const { error: insertError } = await supabase
        .from('federated_partners')
        .insert({
          id: partnerId,
          partner_name,
          region,
          data_type,
          email,
          api_key: apiKey,
          status: 'active',
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        return NextResponse.json({ error: `Registration failed: ${insertError.message}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        partner_id: partnerId,
        api_key: apiKey,
        message: 'Registration successful. Use your api_key in the Authorization header for data submissions.',
        data_type,
        region,
      });
    }

    if (action === 'submit') {
      const { partner_id, data_type, anonymized_data } = body;

      if (!partner_id || !data_type || !anonymized_data) {
        return NextResponse.json(
          { error: 'Missing required fields: partner_id, data_type, anonymized_data' },
          { status: 400 }
        );
      }

      // Verify partner exists
      const { data: partner, error: lookupError } = await supabase
        .from('federated_partners')
        .select('id, partner_name, status')
        .eq('id', partner_id)
        .single();

      if (lookupError || !partner) {
        return NextResponse.json({ error: 'Invalid partner_id' }, { status: 403 });
      }

      if (partner.status !== 'active') {
        return NextResponse.json({ error: 'Partner account is not active' }, { status: 403 });
      }

      const submissionId = randomUUID();

      const { error: submitError } = await supabase
        .from('federated_submissions')
        .insert({
          id: submissionId,
          partner_id,
          data_type,
          anonymized_data,
          record_count: Array.isArray(anonymized_data) ? anonymized_data.length : 1,
          submitted_at: new Date().toISOString(),
        });

      if (submitError) {
        return NextResponse.json({ error: `Submission failed: ${submitError.message}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        submission_id: submissionId,
        partner_id,
        data_type,
        record_count: Array.isArray(anonymized_data) ? anonymized_data.length : 1,
        message: 'Data submitted successfully. Insights will be available after aggregation.',
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Use "register" or "submit".` },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

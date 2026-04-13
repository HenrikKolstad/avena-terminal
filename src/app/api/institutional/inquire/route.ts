import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await req.json();
    const { firm_name, contact_email, firm_type, aum, use_case, data_needs } = body as {
      firm_name?: string;
      contact_email?: string;
      firm_type?: string;
      aum?: string;
      use_case?: string;
      data_needs?: string;
    };

    // Validate required fields
    const missing: string[] = [];
    if (!firm_name) missing.push('firm_name');
    if (!contact_email) missing.push('contact_email');
    if (!firm_type) missing.push('firm_type');
    if (!use_case) missing.push('use_case');

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('institutional_inquiries').insert({
      firm_name,
      contact_email,
      firm_type,
      aum: aum ?? null,
      use_case,
      data_needs: data_needs ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to store inquiry', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inquiry received. Our institutional team will respond within 24 hours.',
      reference: randomUUID().slice(0, 8),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

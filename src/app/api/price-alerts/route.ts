import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — fetch all active alerts for the current user (by user_id or email query param)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const userEmail = searchParams.get('email');

    if (!userId && !userEmail) {
      return NextResponse.json({ error: 'user_id or email required' }, { status: 400 });
    }

    let query = supabase
      .from('price_alerts')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userEmail) {
      query = query.eq('user_email', userEmail.toLowerCase().trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alerts: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create or update an alert for a property
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_email, property_ref, property_name, alert_price } = body;

    if (!user_email || !property_ref) {
      return NextResponse.json({ error: 'user_email and property_ref required' }, { status: 400 });
    }

    const alertData: Record<string, unknown> = {
      user_email: user_email.toLowerCase().trim(),
      property_ref,
      property_name: property_name || null,
      alert_price: alert_price || null,
      active: true,
    };

    if (user_id) {
      alertData.user_id = user_id;
    }

    // Upsert: if user already has an alert for this property, update it
    let result;
    if (user_id) {
      result = await supabase
        .from('price_alerts')
        .upsert(alertData, { onConflict: 'user_id,property_ref' })
        .select()
        .single();
    } else {
      // No user_id: check by email + property_ref
      const { data: existing } = await supabase
        .from('price_alerts')
        .select('id')
        .eq('user_email', alertData.user_email as string)
        .eq('property_ref', property_ref)
        .maybeSingle();

      if (existing) {
        result = await supabase
          .from('price_alerts')
          .update(alertData)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('price_alerts')
          .insert(alertData)
          .select()
          .single();
      }
    }

    if (result.error) {
      console.error('Error upserting alert:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ alert: result.data, ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — remove an alert by id (or by user_email + property_ref)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userEmail = searchParams.get('email');
    const propertyRef = searchParams.get('property_ref');

    if (!id && !(userEmail && propertyRef)) {
      return NextResponse.json(
        { error: 'Provide id, or both email and property_ref' },
        { status: 400 }
      );
    }

    let deleteQuery = supabase.from('price_alerts').delete();

    if (id) {
      deleteQuery = deleteQuery.eq('id', id);
    } else {
      deleteQuery = deleteQuery
        .eq('user_email', userEmail!.toLowerCase().trim())
        .eq('property_ref', propertyRef!);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('Error deleting alert:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

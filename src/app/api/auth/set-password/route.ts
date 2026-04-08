import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'henrik@xaviaestate.com';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // Only allowed for the admin account
  if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find the user
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const user = users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Set the password directly via admin API
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

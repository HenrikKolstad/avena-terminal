import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function unsub(email: string): Promise<boolean> {
  if (!supabase) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;
  try {
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', normalized);
    return true;
  } catch {
    return false;
  }
}

function renderResult(ok: boolean): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed — Avena Terminal</title>
<style>
body{margin:0;padding:0;background:#1D1815;color:#F4EFE8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{max-width:480px;margin:20px;padding:40px;background:#26201C;border:1px solid #3B3530;border-radius:4px;text-align:center;}
h1{font-family:Georgia,serif;font-weight:300;font-size:32px;margin:0 0 12px;}
em{color:#F5A623;font-style:italic;}
p{color:#C9C0B6;line-height:1.6;margin:0 0 24px;}
a{color:#F5A623;text-decoration:none;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;}
</style></head>
<body><div class="card">
<h1>${ok ? 'Removed.' : 'Hmm.'}</h1>
<p>${ok ? 'You will not receive the Avena Weekly from us again. Sorry to see you go.' : 'We could not find that email on the list. No action taken.'}</p>
<a href="https://avenaterminal.com">avenaterminal.com &rsaquo;</a>
</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return new Response(renderResult(false), { headers: { 'Content-Type': 'text/html' } });
  const ok = await unsub(email);
  return new Response(renderResult(ok), { headers: { 'Content-Type': 'text/html' } });
}

// One-click unsubscribe (RFC 8058) — List-Unsubscribe-Post: List-Unsubscribe=One-Click
export async function POST(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  const ok = await unsub(email);
  return NextResponse.json({ ok });
}

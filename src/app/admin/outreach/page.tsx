import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { OutreachClient } from './OutreachClient';
import { OUTREACH_TARGETS } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Outreach · Avena Admin',
  robots: 'noindex,nofollow',
};

interface SearchParams { token?: string }

export default async function OutreachAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const expected = process.env.ADMIN_TOKEN;

  // GATE: server-side token check. If ADMIN_TOKEN is set in env, page renders
  // only when a matching token is provided via ?token= query OR via the
  // avena_admin cookie. If ADMIN_TOKEN is NOT set, the page refuses to load
  // entirely (safety default — better to lock by accident than leak by accident).
  if (!expected) {
    return <Gate reason="ADMIN_TOKEN env var is not set in Vercel. Outreach is locked until you set one." />;
  }

  // If a token was passed in the URL, validate + set cookie + redirect to clean URL
  const cookieJar = await cookies();
  const cookieToken = cookieJar.get('avena_admin')?.value;
  const urlToken = sp.token;

  if (urlToken) {
    if (urlToken === expected) {
      cookieJar.set('avena_admin', urlToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 60 * 60 * 8, path: '/admin' });
      redirect('/admin/outreach');
    } else {
      return <Gate reason="Token in URL doesn't match ADMIN_TOKEN. Check Vercel env vars." />;
    }
  }

  if (cookieToken !== expected) {
    return <Gate reason="Add ?token=YOUR_ADMIN_TOKEN to the URL to authenticate. Token is set as ADMIN_TOKEN in Vercel env vars." />;
  }

  // Authorised — render the outreach UI
  const initial = OUTREACH_TARGETS.map(t => ({
    id: t.id,
    name: t.name,
    organisation: t.organisation,
    role: t.role,
    channel: t.channel,
    twitter: t.twitter ?? null,
    scenarioUrl: t.scenarioUrl,
    subject: t.subject,
    body: t.body,
    has_email: !!t.email,
    email_masked: t.email ? maskEmail(t.email) : null,
  }));

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-20 pb-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Avena · Admin · Outreach · <span className="text-success">● authenticated</span></div>
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-3">
            One-button outreach.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
            Ten institutional cold emails pre-drafted with personal references + scenario URLs. Edit any one inline. Click <span className="text-foreground font-mono">Send all</span> — Resend fires them with a 25-second stagger so the burst doesn&apos;t trip spam filters. Reply-to is your personal address, so responses route to you.
          </p>
          <OutreachClient initial={initial} />
        </div>
      </main>
    </div>
  );
}

function Gate({ reason }: { reason: string }) {
  return (
    <div className="avena-v2 min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 flex items-center justify-center px-5">
        <div className="max-w-md w-full rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-destructive mb-3">● Unauthorised</div>
          <h1 className="font-serif text-2xl font-light text-foreground mb-3">Avena Admin · Outreach</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{reason}</p>
          <p className="text-xs text-muted-foreground mt-4 font-mono leading-relaxed">
            Token gate: server-side. Cookie is httpOnly + secure + sameSite=strict, scoped to <code className="text-foreground">/admin</code>, 8h expiry.
          </p>
        </div>
      </main>
    </div>
  );
}

function maskEmail(e: string): string {
  const [user, domain] = e.split('@');
  if (!domain) return e;
  const u = user.length <= 2 ? user[0] + '*' : user[0] + '***' + user.slice(-1);
  return `${u}@${domain}`;
}

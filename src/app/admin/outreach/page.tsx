import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { OutreachClient } from './OutreachClient';
import { OUTREACH_TARGETS } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Outreach · Avena Admin',
  robots: 'noindex,nofollow',
};

export default function OutreachAdminPage() {
  // Strip emails from server payload — they're embedded back in the API
  // for the actual send call. UI shows org + role + scenario, not the raw
  // email address (avoids accidentally screenshotting it in screenshares).
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
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">Avena · Admin · Outreach</div>
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-3">
            One-button outreach.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
            Ten institutional cold emails pre-drafted with personal references + scenario URLs. Edit any one inline. Click <span className="text-foreground font-mono">Send all</span> — Resend fires them with a 90-second stagger so the burst doesn&apos;t trip spam filters. Reply-to is your personal address, so responses route to you.
          </p>
          <OutreachClient initial={initial} />
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

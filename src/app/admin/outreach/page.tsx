import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { OutreachGate } from './OutreachGate';
import { OUTREACH_TARGETS } from '@/lib/outreach';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Outreach · Avena Admin',
  robots: 'noindex,nofollow',
};

export default function OutreachAdminPage() {
  // Strip emails before sending to client — they're embedded back server-side
  // in the actual send call. UI shows org + role + scenario + masked email.
  // Pass full email through — the page is admin-gated so this is safe, and
  // the mailto: link needs the real address to work.
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
    email: t.email || null,
    email_masked: t.email ? maskEmail(t.email) : null,
    category: t.category ?? null,
    lookup_query: t.lookup_query ?? null,
  }));

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <OutreachGate initial={initial} />
    </div>
  );
}

function maskEmail(e: string): string {
  const [user, domain] = e.split('@');
  if (!domain) return e;
  const u = user.length <= 2 ? user[0] + '*' : user[0] + '***' + user.slice(-1);
  return `${u}@${domain}`;
}

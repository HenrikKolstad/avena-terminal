'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { OutreachClient } from './OutreachClient';

// Mirrors the ADMIN_EMAILS list in AuthContext.tsx — central admin allow-list.
const ADMIN_EMAILS = [
  'henrik@xaviaestate.com',
  'Henrik@xaviaestate.com',
  'henrik@betongsproyting.no',
  'jesper.troan@gmail.com',
];

type Category =
  | 'academic' | 'multilateral' | 'regulator' | 'insurer'
  | 'notarial' | 'bank' | 'sovereign' | 'ai_lab' | 'journalist';

interface ClientTarget {
  id: string;
  name: string;
  organisation: string;
  role: string;
  channel: 'email' | 'twitter-only';
  twitter: string | null;
  scenarioUrl: string;
  subject: string;
  body: string;
  has_email: boolean;
  email: string | null;
  email_masked: string | null;
  category: Category | null;
  lookup_query: string | null;
}

export function OutreachGate({ initial }: { initial: ClientTarget[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="pt-20 pb-16">
        <div className="mx-auto max-w-md px-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Loading session…</div>
        </div>
      </main>
    );
  }

  const isAdmin = !!user?.email && ADMIN_EMAILS.some(e => e.toLowerCase() === user.email!.toLowerCase());

  if (!isAdmin) {
    return (
      <main className="pt-20 pb-16 flex items-center justify-center min-h-[60vh] px-5">
        <div className="max-w-md w-full rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-destructive mb-3">● Restricted</div>
          <h1 className="font-serif text-2xl font-light text-foreground mb-3">Avena Admin · Outreach</h1>
          {user ? (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Signed in as <span className="font-mono text-foreground">{user.email}</span>, but this email isn&apos;t on the admin allow-list. Sign in with <span className="font-mono text-foreground">henrik@xaviaestate.com</span> to access outreach.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sign in to your Avena admin account to access the outreach pipeline.
            </p>
          )}
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 rounded-sm border px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
            style={{ borderColor: 'hsl(var(--av-border-strong))' }}
          >
            {user ? 'Switch account' : 'Sign in'} →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-20 pb-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">
          Avena · Admin · Outreach · <span className="text-success">● signed in as {user.email}</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-3">
          One-button outreach.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-8 leading-relaxed">
          Ten institutional cold emails pre-drafted with personal references + scenario URLs. Edit any one inline. Click <span className="text-foreground font-mono">Send all</span> — Resend fires them with a staggered delay so the burst doesn&apos;t trip spam filters. Reply-to is your personal address, so responses route to you.
        </p>
        <OutreachClient initial={initial} />
      </div>
    </main>
  );
}

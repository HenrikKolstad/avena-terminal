import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Avena Terminal',
  description: 'How Avena Terminal handles personal data: what we collect, why, and your rights.',
  alternates: { canonical: 'https://avenaterminal.com/privacy' },
};

/**
 * Factual privacy policy. Every statement below describes what the codebase
 * actually does (enquiry storage, subscriber emails, server logs, Stripe,
 * MCP/API request logging). Required by the ChatGPT Apps and Claude
 * connector directories — absence is an instant rejection.
 */
export default function PrivacyPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Legal
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-foreground">Privacy Policy</h1>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Effective 12 August 2026</p>

            <div className="mt-10 space-y-8 font-light text-sm leading-relaxed text-muted-foreground">
              <div>
                <h2 className="font-serif text-xl text-foreground mb-2">Who we are</h2>
                <p>Avena Terminal (avenaterminal.com) is operated by Henrik Kolstad, Norway. Contact: henrik@avenaterminal.com.</p>
              </div>

              <div>
                <h2 className="font-serif text-xl text-foreground mb-2">What we collect</h2>
                <p>
                  <strong className="text-foreground/90">Enquiries:</strong> if you submit an enquiry or contact form, we store the details you provide (name, email, message, the property concerned) to respond to you.{' '}
                  <strong className="text-foreground/90">Subscriptions:</strong> if you subscribe to a paid product, we store your email, chosen market areas, and delivery history. Payments are processed by Stripe; we never see or store card numbers.{' '}
                  <strong className="text-foreground/90">Technical logs:</strong> our servers and hosting provider (Vercel) record standard request logs — IP address, user agent, pages requested — used for security, debugging and aggregate analytics, including analysis of automated (AI crawler and agent) traffic.{' '}
                  <strong className="text-foreground/90">API &amp; MCP requests:</strong> requests to our public API and MCP server are logged (user agent, tool or endpoint called, timestamp) to operate and improve the service.
                </p>
              </div>

              <div>
                <h2 className="font-serif text-xl text-foreground mb-2">What we do not do</h2>
                <p>We do not sell personal data. We do not run third-party advertising or cross-site tracking. Property data on this site describes properties and markets, not people.</p>
              </div>

              <div>
                <h2 className="font-serif text-xl text-foreground mb-2">Processors we rely on</h2>
                <p>Vercel (hosting), Supabase (database, EU region), Stripe (payments), Resend and Zoho (email delivery). Each processes data only to provide their service to us.</p>
              </div>

              <div>
                <h2 className="font-serif text-xl text-foreground mb-2">Retention &amp; your rights</h2>
                <p>
                  Enquiry and subscriber records are kept while the relationship is active and deleted on request. Under the GDPR you may request access, correction, deletion or export of your personal data — email henrik@avenaterminal.com and we will act on it. You may also complain to your local data-protection authority (in Norway, Datatilsynet).
                </p>
              </div>

              <div>
                <h2 className="font-serif text-xl text-foreground mb-2">Changes</h2>
                <p>Material changes to this policy will be posted on this page with a new effective date. See also our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { SeatCheckout } from './SeatCheckout';

export const metadata: Metadata = {
  title: 'Avena Terminal Seat — €499 / month · institutional analyst access',
  description: 'Named-user license for European property analysts. Unlimited Oracle queries, citation-disciplined output, PDF research note export, programmatic API key, no rate limits.',
  alternates: { canonical: 'https://avenaterminal.com/terminal/seat' },
};

const INCLUDES = [
  'Unlimited Oracle queries · Claude Sonnet 4 · 14 institutional tools',
  'Citation discipline: every claim sources primary URL (Eurostat / ECB / Avena briefing)',
  'PDF research note export · branded, time-stamped, HMAC-signed',
  'Personal API key · rate-limited at 100 req/s burst',
  'Webhook subscription · 5 event types · HMAC-signed delivery',
  'Saved workspace · 50 watchlists · custom cohort definitions',
  'Audit log of every Oracle query · 12-month retention · SOC2-ready',
  'Direct line to research desk · 24h reply SLA',
  'Includes Memo Engine, AVM (1k/day), Genesis simulator, Precursor signals',
];

const COMPARE = [
  { tier: 'Free',          price: '€0',         seat: 'Anonymous',          oracle: '5 queries/day',      api: '—',                      pdf: '—',         priority: '—' },
  { tier: 'PRO',           price: '€79 / mo',   seat: 'Single user',        oracle: 'Unlimited',          api: 'Read-only',              pdf: '—',         priority: '7d' },
  { tier: 'Seat',          price: '€499 / mo',  seat: 'Named institutional',oracle: 'Unlimited + tools',  api: '100 req/s · webhooks',   pdf: 'Branded',   priority: '24h' },
  { tier: 'Enterprise',    price: 'from €25k',  seat: 'White-label',        oracle: 'Embedded + API',     api: 'Unlimited · SLA',        pdf: 'White-label', priority: '4h' },
];

export default function SeatPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena Terminal · Institutional Seat</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              The analyst seat<br />
              <span className="text-gold italic">your desk needs.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-10">
              Named-user license. Unlimited access to the Avena Oracle, every cited source, PDF research-note export, programmatic API + webhooks. Built for the European property research desk that needs primary-source citations every time, with no rate limits and a 24-hour SLA to the desk that wrote the methodology.
            </p>

            <div className="flex flex-wrap items-baseline gap-6 mb-10">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Per seat · monthly</div>
                <div className="font-serif text-6xl font-light text-foreground tabular">€499</div>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Billed monthly in EUR · cancel anytime<br />
                Annual: €4,990 (save €998) · 5+ seats: contact desk
              </div>
            </div>

            <SeatCheckout />
          </div>
        </section>

        {/* Includes */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">What&apos;s in the seat</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Nine things the consumer tier does not give you.</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {INCLUDES.map((line, i) => (
                <div key={i} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">{String(i + 1).padStart(2, '0')}</div>
                  <div className="text-sm text-foreground/90 leading-relaxed">{line}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compare table */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Compare tiers</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Where the seat fits.</h2>

            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full text-xs">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    {['Tier', 'Price', 'Seat type', 'Oracle', 'API', 'PDF export', 'Reply SLA'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.tier} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="px-3 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{row.tier}</td>
                      <td className="px-3 py-3 font-mono text-sm tabular text-foreground">{row.price}</td>
                      <td className="px-3 py-3 text-foreground/85">{row.seat}</td>
                      <td className="px-3 py-3 text-foreground/85">{row.oracle}</td>
                      <td className="px-3 py-3 text-foreground/85">{row.api}</td>
                      <td className="px-3 py-3 text-foreground/85">{row.pdf}</td>
                      <td className="px-3 py-3 text-foreground/85">{row.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Enterprise */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Enterprise · white-label</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">Embed the Terminal in your own brand.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              For asset managers, banks, and central institutions that want the Avena Terminal hosted at <code className="font-mono text-foreground">terminal.your-domain.eu</code> with your logo, your colors, your SSO, and a dedicated cohort definition tracked against your book. Starts at €25,000/month. Includes a dedicated solution architect for first-90-days onboarding, SOC 2 attestation under shared-responsibility model, and DPA + GDPR Article 28 processor agreement.
            </p>
            <a href="mailto:institutional@avenaterminal.com?subject=Avena%20Terminal%20Enterprise%20enquiry" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
              Talk to the desk →
            </a>
          </div>
        </section>

        {/* Trust */}
        <section>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Trust surfaces</div>
            <div className="rounded-sm border p-6 text-sm text-muted-foreground leading-relaxed space-y-2" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
              <p>Every Oracle response sources primary URLs (Eurostat, ECB SDW, Avena DOI). Every PDF research note is HMAC-signed and archived to the public <Link href="/archive" className="text-foreground hover:text-primary">moat archive</Link>. Audit logs of every analyst query are retained 12 months. Data residency Frankfurt. Open governance at <Link href="/governance" className="text-foreground hover:text-primary">/governance</Link>.</p>
              <p>The Avena dataset is CC BY 4.0, DOI <span className="font-mono text-foreground">10.5281/zenodo.19520064</span>, Wikidata Q139165733. Cancellable any time, no lock-in — the data layer remains downloadable and reconstructible without us.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

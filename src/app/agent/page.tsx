import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { AgentClient } from './AgentClient';

export const metadata: Metadata = {
  title: 'Avena Agent — the AI that buys property for you',
  description: 'An autonomous European property buying agent. Tell it your brief; Avena scans the market, ranks matches by fit, drafts outreach emails, and hands everything to you for approval.',
  alternates: { canonical: 'https://avenaterminal.com/agent' },
  openGraph: {
    title: 'Avena Agent — the AI that buys property for you',
    description: 'Tell it your brief. Avena scans, ranks, drafts outreach. You approve and send.',
    url: 'https://avenaterminal.com/agent',
  },
};

export default function AgentPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Agent',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    description: 'Autonomous European property buying agent. Given a brief, the Agent scans live scored inventory, ranks by fit, and drafts personalized outreach to developers for each top match.',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
    url: 'https://avenaterminal.com/agent',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Autonomous · European property buying agent
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Tell Avena <span className="italic text-gold">what you want</span>.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light">
              Avena scans the market, ranks matches by fit, drafts personalized
              outreach to developers, and hands everything to you for approval.
              You click send. Every action stays in your control — the Agent
              never commits, signs, or transfers without you.
            </p>
          </div>
        </section>

        <AgentClient />

        <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              What the Agent does.
            </h2>
            <ol className="space-y-4 text-base text-foreground/90 font-light leading-relaxed list-decimal pl-6">
              <li>
                <strong>Parses your brief</strong> — budget, regions, property type,
                bedrooms, target yield, target score, timeline, nationality.
              </li>
              <li>
                <strong>Scans live inventory</strong> against the filters. Every Avena-scored
                property is evaluated for fit.
              </li>
              <li>
                <strong>Ranks matches 0–100</strong> on a composite fit-score
                (budget headroom + region + type + beds + yield + Avena Score + discount).
              </li>
              <li>
                <strong>Drafts outreach emails</strong> for the top 3 matches —
                professional, tuned to the buyer persona, anchored on comp data.
                The Agent tells you what each email anchors on so you understand
                the negotiation posture.
              </li>
              <li>
                <strong>Surfaces recommendations + warnings</strong> — concrete
                next steps and red flags pulled from the data.
              </li>
              <li>
                <strong>You approve, you send.</strong> The Agent never ships an
                email without your click.
              </li>
            </ol>
            <p className="mt-8 text-sm text-muted-foreground font-light">
              Engine is open — see{' '}
              <a href="/research/avena-score" className="text-primary hover:text-gold">the methodology paper</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CoFounderForm } from './CoFounderForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Co-Founder · Avena',
  description: 'We are not hiring. We are looking for one person to make a late-career asymmetric bet on European residential property data infrastructure. Senior ex-central-bank, ex-MSCI, ex-Refinitiv, ex-Bloomberg only.',
  alternates: { canonical: 'https://avenaterminal.com/careers/co-founder' },
  robots: 'noindex',  // Discoverable via direct outreach + nav, not search
};

export default function CoFounderPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-4">Avena · Careers · Co-Founder</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              We are not hiring.
              <br />
              We are looking for <span className="text-gold italic">one person</span>.
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground">
              Avena Terminal is the missing data infrastructure layer for European residential property. The technical product is built. The methodology is published. The first cold emails to ECB Research, Banco de España, the ESRB Secretariat, and FT Alphaville are sent. What it lacks is one specific person — someone whose existing institutional relationships, regulatory credibility, and B2B enterprise sales pedigree convert the next 24 months from a solo build into a regulatory-grade infrastructure company.
            </p>
          </div>
        </section>

        {/* ─── ARCHETYPE ───────────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">The archetype</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10 max-w-3xl">A senior whose CV reads like a regulator&apos;s shortlist.</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Facet
                title="45–60 years old"
                body="Late-career, financially secure, looking for the asymmetric bet that defines the last act. Not for someone trying to find their first big break."
              />
              <Facet
                title="Senior ex-institutional background"
                body="Ex-central bank quant (ECB, ESRB, BdE, BdF, Bundesbank, BdI, DNB), ex-MSCI product lead, ex-Refinitiv senior, ex-Bloomberg fixed income, ex-S&amp;P/Moody&apos;s structured finance, or ex-CoStar. The names in your past matter because the next 24 months depend on the door they open."
              />
              <Facet
                title="Existing EU institutional relationships"
                body="You have working numbers for people at ECB, ESMA, ESRB, Banco de España, BIS, EIB, OECD Housing Observatory, or equivalent. Not a LinkedIn intro — a direct relationship from past work."
              />
              <Facet
                title="B2B enterprise sales pedigree"
                body="You have personally closed multi-year contracts at &gt;€500k ACV with banks, asset managers, central banks, or supervisory bodies. You know how procurement at these institutions actually works. RFP, NDA, DPA, SLA, framework agreements are vocabulary you fluent in."
              />
              <Facet
                title="Finance PhD or institutional-grade credibility"
                body="Published academic work in macroprudential policy, residential finance, monetary transmission, or systemic risk. OR equivalent industry credibility (named on RICS / ESRB working groups, Chartered Financial Analyst, FRM, etc.). When you cite the methodology, the room treats it as authoritative."
              />
              <Facet
                title="Equity-heavy, lower cash"
                body="Cash compensation calibrated to late-career runway, not market rate. Equity stake commensurate with risk you&apos;re taking and value you&apos;re bringing. The bet pays out on the acquisition or IPO, not the monthly transfer. If you need a market salary, this is the wrong conversation."
              />
            </div>
          </div>
        </section>

        {/* ─── WHAT YOU GET ────────────────────────────────── */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">What you walk into</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6 max-w-3xl">Six weeks of solo build. A genuinely complete product. Zero institutional relationships.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              You don&apos;t inherit a half-built MVP. You inherit a fully-shipped institutional product across thirteen surfaces: Terminal, Policy Engine, Sovereign Briefing (five volumes published), AVN-ID Registry, APON Oracle, Cross-Validation Engine, Moat Archive, Public API v1 + OpenAPI 3.1, MCP server, four repackaged enterprise products. Cited DOI, RICS Tech Partner registered, EU data residency, CC BY 4.0 open methodology. The institutional gates that take 24 months for new founders to assemble are already through.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              What is missing is what you bring. The first paying central bank engagement. The first €25k/mo white-label deployment at a tier-1 bank. The first BIS or Eurex citation. The first MSCI sub-license conversation. All within reach because the product clears the institutional bar — but blocked at the introduction step because Henrik does not have the relationships you do.
            </p>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Read the <Link href="/defensibility" className="text-foreground hover:text-primary">defensibility dossier</Link>, <Link href="/sovereign-briefing" className="text-foreground hover:text-primary">published research</Link>, and <Link href="/proof" className="text-foreground hover:text-primary">proof of data moat</Link> before the conversation. If you reach the form below convinced this is the asymmetric bet, send your application.
            </p>
          </div>
        </section>

        {/* ─── APPLICATION ─────────────────────────────────── */}
        <section style={{ background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-3">The conversation</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6 max-w-3xl">One form. No CV upload. Henrik replies personally within 7 days.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-10 leading-relaxed">
              The bet thesis field below matters more than the credentials. Six sentences explaining why you think Avena specifically is the right asymmetric bet for the last act of your career &mdash; not abstract enthusiasm for proptech. If those six sentences are not yet clear in your own head, do not submit. Come back when they are.
            </p>
            <CoFounderForm />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Facet({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border p-5 relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: 'var(--av-gradient-gold)', opacity: 0.6 }} />
      <div className="pl-3">
        <h3 className="font-serif text-lg text-foreground mb-2">{title}</h3>
        <p className="text-xs text-foreground/85 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

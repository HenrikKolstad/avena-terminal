/**
 * /consultations — Avena's published position on every active European
 * regulatory consultation touching residential property data.
 *
 * Purpose: make Avena visible at every EU policy entry point. The
 * structural play: regulators searching for stakeholder views on their
 * consultation find Avena listed publicly. Journalists writing the
 * consultation find Avena's position. Permanent record of engagement.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { allConsultations } from '@/lib/consultations';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'EU consultations · Avena positions',
  description: 'Avena Terminal\'s published position on every active European regulatory consultation touching residential property data. ECB, ESMA, EBA, EC, EIOPA.',
  alternates: { canonical: 'https://avenaterminal.com/consultations' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Avena EU Consultations Register',
  description: 'Published stakeholder positions for active European regulatory consultations on residential property data, AVM methodology, macroprudential measures, and CSRD disclosure.',
  url: 'https://avenaterminal.com/consultations',
};

const STATUS_COLOR: Record<string, string> = {
  open:       'hsl(var(--av-success))',
  responded:  'hsl(var(--av-primary))',
  monitoring: 'hsl(var(--av-warning))',
  planned:    'hsl(var(--av-warning))',
  closed:     'hsl(var(--av-muted-foreground))',
};

export default async function ConsultationsPage() {
  const rows = await allConsultations();
  const open = rows.filter(r => r.status === 'open' || r.status === 'responded' || r.status === 'monitoring');
  const other = rows.filter(r => r.status === 'closed' || r.status === 'planned');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            EU consultations · Avena positions
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05] tracking-tight">
            Tracking every EU consultation that touches residential property.
          </h1>
          <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Avena maintains a public register of European regulatory consultations across ECB, ESMA, EBA, the Commission, and EIOPA where residential property data, methodology, or disclosure is in scope. For each one Avena publishes its position — what we&apos;d urge, why, and which Avena infrastructure operationalises it. Formal submissions and source links are appended when consultations are formally opened.
          </p>
        </section>

        {/* Active */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Active · {open.length}
          </div>
          {open.length === 0 ? (
            <div className="rounded-sm border p-10" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              <p className="text-sm text-foreground/85">
                The consultations register has not yet been seeded. Run the migration <span className="font-mono text-foreground">20260526_epicenter_eu_consultations.sql</span> to publish the five active positions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {open.map(c => (
                <article key={c.id} id={c.short_id} className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground border rounded-sm px-2 py-1" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                        {c.source_body}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.32em]" style={{ color: STATUS_COLOR[c.status] }}>
                        {c.status}
                      </span>
                      {c.relevance_score != null && (
                        <span className="font-mono text-[10px] text-muted-foreground tabular">relevance {c.relevance_score.toFixed(1)}/5</span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground tabular whitespace-nowrap">
                      {c.closes_at ? `closes ${c.closes_at}` : 'ongoing pipeline'}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl md:text-2xl font-light text-foreground leading-snug mb-3">
                    <a href={c.consultation_url} target="_blank" rel="noopener" className="hover:text-primary">{c.title}</a>
                  </h3>
                  {c.topic_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {c.topic_tags.map(t => (
                        <span key={t} className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground border rounded-sm px-2 py-0.5" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {c.avena_position && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold mb-2">Avena position</div>
                      <p className="text-sm text-foreground/90 leading-relaxed">{c.avena_position}</p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.22em]">
                    <a href={c.consultation_url} target="_blank" rel="noopener" className="text-foreground/85 hover:text-primary">{c.source_body} consultations →</a>
                    {c.submission_url && (
                      <a href={c.submission_url} target="_blank" rel="noopener" className="text-foreground/85 hover:text-primary">Avena submission (PDF) →</a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Other */}
        {other.length > 0 && (
          <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
              Closed / planned · {other.length}
            </div>
            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <th className="text-left p-3">Body</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Closes</th>
                  </tr>
                </thead>
                <tbody>
                  {other.map(c => (
                    <tr key={c.id} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="p-3 font-mono text-xs text-foreground">{c.source_body}</td>
                      <td className="p-3 text-xs text-foreground/85"><a href={c.consultation_url} target="_blank" rel="noopener" className="hover:text-primary">{c.title}</a></td>
                      <td className="p-3 font-mono text-[10px]" style={{ color: STATUS_COLOR[c.status] }}>{c.status}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground tabular">{c.closes_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">For regulators &amp; consultation drafters</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              If you are drafting a consultation in scope of European residential property, real-estate finance, AVM methodology, macroprudential measures, or property disclosure, we would value early conversation. Avena maintains a free regulatory-research tier for designated authorities. Reach Henrik directly at <span className="font-mono text-foreground">henrik@avenaterminal.com</span> or via <Link href="/contact" className="text-primary hover:underline">/contact</Link>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/regulatory-radar" className="text-foreground/85 hover:text-primary">Regulatory radar →</Link>
              <Link href="/policy-engine" className="text-foreground/85 hover:text-primary">Policy stress engine →</Link>
              <Link href="/methodology" className="text-foreground/85 hover:text-primary">Methodology →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

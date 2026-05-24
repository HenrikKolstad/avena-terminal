import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { generateClaims } from '@/lib/wikidata-claims';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Wikidata Claims · Avena Terminal',
  description: 'Structured claims Avena maintains on Wikidata entity Q139165733 — every sovereign briefing, dataset distribution, official source citation, and identifier surface. QuickStatements-ready export.',
  alternates: { canonical: 'https://avenaterminal.com/wikidata' },
};

const PROPERTY_LABELS: Record<string, string> = {
  P31:  'instance of',
  P136: 'genre',
  P275: 'license',
  P276: 'location',
  P407: 'language of work',
  P571: 'inception',
  P800: 'notable work',
  P856: 'official website',
  P953: 'full work available at',
  P973: 'described at',
  P2078: 'user manual',
  P4969: 'derived from',
  P5305: 'canonical URL',
  P577: 'publication date',
  P1810: 'subject named as',
};

export default async function WikidataPage() {
  const claims = await generateClaims();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Wikidata Q139165733</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Structured for the<br />
              <span className="text-gold italic">open knowledge graph.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-8">
              Avena maintains a structured claim graph on Wikidata. Every sovereign briefing, every public dataset surface, every authoritative source we ingest is declared as a citable Wikidata statement. This page exports the live claim set in QuickStatements v1 format — a Wikidata editor pastes it, reviews, commits.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label="Entity" value={claims.entity} href={`https://www.wikidata.org/wiki/${claims.entity}`} />
              <Stat label="Claims" value={claims.claims.length.toString()} />
              <Stat label="Format" value="QuickStatements v1" href="https://quickstatements.toolforge.org/" />
              <Stat label="License" value="CC0 1.0" />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a href={`https://www.wikidata.org/wiki/${claims.entity}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                View on Wikidata →
              </a>
              <a href="/api/v1/wikidata/claims?format=qs" target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                Download QuickStatements →
              </a>
              <a href="/api/v1/wikidata/claims" target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                JSON claim graph →
              </a>
            </div>
          </div>
        </section>

        {/* Claim table */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Live claim graph</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">{claims.claims.length} structured claims.</h2>

            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Property</Th>
                    <Th>Label</Th>
                    <Th>Value</Th>
                    <Th>Type</Th>
                  </tr>
                </thead>
                <tbody>
                  {claims.claims.map((c, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <Td>
                        <a href={`https://www.wikidata.org/wiki/Property:${c.property}`} target="_blank" rel="noopener" className="font-mono text-xs text-primary hover:text-foreground">
                          {c.property}
                        </a>
                      </Td>
                      <Td><span className="text-xs text-muted-foreground">{PROPERTY_LABELS[c.property] ?? '—'}</span></Td>
                      <Td>
                        {c.type === 'url' ? (
                          <a href={c.value} target="_blank" rel="noopener" className="font-mono text-xs text-foreground/85 break-all hover:text-primary">{c.value}</a>
                        ) : c.type === 'item' && c.value.startsWith('Q') ? (
                          <a href={`https://www.wikidata.org/wiki/${c.value}`} target="_blank" rel="noopener" className="font-mono text-xs text-foreground/85 hover:text-primary">{c.value}</a>
                        ) : (
                          <span className="text-xs text-foreground/85 break-words">{c.value}</span>
                        )}
                      </Td>
                      <Td><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.type}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* QuickStatements preview */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">QuickStatements v1 payload</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">Paste into the QuickStatements importer.</h2>
            <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
              Open <a href="https://quickstatements.toolforge.org/" target="_blank" rel="noopener" className="text-foreground hover:text-primary">quickstatements.toolforge.org</a> while logged in to Wikidata. Choose &quot;New batch&quot; → V1 syntax → paste the block below. Review each line in the preview, then commit. Wikidata accepts and the claim graph updates.
            </p>

            <pre className="rounded-sm border p-4 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code className="text-primary">{claims.quickstatements_v1}</code>
            </pre>
          </div>
        </section>

        {/* Why */}
        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Why this matters</div>
            <div className="rounded-sm border p-6 text-sm text-muted-foreground leading-relaxed space-y-3" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
              <p>Wikidata is the structured-knowledge backbone of the open web. Wikipedia infoboxes, Google Knowledge Panels, Apple Spotlight, Siri, Alexa, ChatGPT&apos;s tool-use layer — all query Wikidata. A rich, accurate claim graph on Q139165733 means Avena gets surfaced in qualified institutional discovery contexts: an analyst Googling &quot;EU residential property data infrastructure&quot;, an LLM answering &quot;what publishes a Sovereign Briefing on European housing&quot;, a Wikipedia article needing a citation for a foreign-buyer-flow statistic.</p>
              <p>The claim graph regenerates dynamically from the live data layer — every new sovereign briefing automatically appears as a P800 (notable work) claim. The QuickStatements payload at the top of this page is always current.</p>
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/docs/api" className="text-foreground hover:text-primary">API documentation</Link> · <a href={`https://www.wikidata.org/wiki/${claims.entity}`} target="_blank" rel="noopener" className="text-foreground hover:text-primary">Wikidata entity →</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-xl font-light text-foreground tabular break-all">{value}</div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener" className="transition-colors hover:opacity-80">{body}</a> : body;
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-4 py-3 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}

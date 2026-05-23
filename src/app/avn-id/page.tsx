import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { registryStats, recentIssuances } from '@/lib/avn-id-registry';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'AVN-ID Registry · Avena Terminal',
  description: 'The live registry of AVN-IDs — the canonical, cryptographically-signed identifier for European property. Open standard, CC BY 4.0. Currently issued; live counts read from the production registry.',
  alternates: { canonical: 'https://avenaterminal.com/avn-id' },
  openGraph: {
    title: 'AVN-ID Registry — ISIN for European property',
    description: 'Issued · signed · verifiable. The canonical identifier for European residential property.',
    url: 'https://avenaterminal.com/avn-id',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  NB: 'New-build',
  EX: 'Existing / resale',
  CM: 'Commercial',
  LH: 'Leasehold',
  FR: 'Fractional',
  PL: 'Land parcel',
};

const FLAGS: Record<string, string> = {
  ES: '🇪🇸', PT: '🇵🇹', FR: '🇫🇷', DE: '🇩🇪', NL: '🇳🇱', IT: '🇮🇹', GR: '🇬🇷',
  CY: '🇨🇾', HR: '🇭🇷', MT: '🇲🇹', AT: '🇦🇹', BE: '🇧🇪', SE: '🇸🇪', DK: '🇩🇰',
  FI: '🇫🇮', IE: '🇮🇪', LU: '🇱🇺', PL: '🇵🇱',
};

function relativeTime(iso: string): string {
  const age = (Date.now() - new Date(iso).getTime()) / 1000;
  if (age < 60) return `${Math.round(age)}s ago`;
  if (age < 3600) return `${Math.round(age / 60)}m ago`;
  if (age < 86400) return `${Math.round(age / 3600)}h ago`;
  return `${Math.round(age / 86400)}d ago`;
}

export default async function AVNIDRegistryPage() {
  const [stats, recent] = await Promise.all([registryStats(), recentIssuances(15)]);
  const sortedCountries = Object.entries(stats.by_country).sort((a, b) => b[1] - a[1]);
  const sortedCategories = Object.entries(stats.by_category).sort((a, b) => b[1] - a[1]);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              AVN-ID Registry · Live · Open Standard
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              The canonical identifier<br />for European <span className="italic text-gold">property</span>.
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground font-light leading-relaxed">
              Securities have ISINs. Books have ISBNs. Papers have DOIs. Property has never had a durable, cross-market, publicly-resolvable identifier — until now. AVN-IDs are issued by Avena, cryptographically signed, and verifiable by anyone. The grammar is open (CC BY 4.0). The registry is queryable. Any system, anywhere, can reference a specific European property by AVN-ID and rely on its canonical resolution.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Spec <Link href="/standards/avn-id" className="text-foreground hover:text-primary">/standards/avn-id</Link></span>
              <span>·</span>
              <span>Issue <span className="text-foreground">POST /api/v1/avn-id/issue</span></span>
              <span>·</span>
              <span>Verify <span className="text-foreground">GET /api/v1/avn-id/&lt;id&gt;</span></span>
              <span>·</span>
              <span>License <span className="text-foreground">CC BY 4.0</span></span>
            </div>
          </div>
        </section>

        {/* Headline stats */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-serif text-3xl font-light text-gold tabular leading-none">{stats.total.toLocaleString()}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">AVN-IDs issued</div>
              </div>
              <div className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-serif text-3xl font-light text-foreground tabular leading-none">{sortedCountries.length}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">Countries covered</div>
              </div>
              <div className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-serif text-3xl font-light text-foreground tabular leading-none">{sortedCategories.length}/6</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">Categories in use</div>
              </div>
              <div className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                <div className="font-serif text-3xl font-light text-foreground tabular leading-none">{stats.latest ? relativeTime(stats.latest) : '—'}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">Latest issuance</div>
              </div>
            </div>
          </div>
        </section>

        {/* Country + Category distribution */}
        {(sortedCountries.length > 0 || sortedCategories.length > 0) && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12 grid md:grid-cols-2 gap-8">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">By country</div>
                <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  {sortedCountries.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground italic">No issuances yet.</div>
                  ) : sortedCountries.map(([cc, n], i) => (
                    <div key={cc} className="px-4 py-2.5 flex items-center justify-between border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{FLAGS[cc] ?? ''}</span>
                        <span className="font-mono text-sm text-foreground">{cc}</span>
                      </div>
                      <span className="font-mono tabular text-sm text-foreground">{n.toLocaleString()}</span>
                    </div>
                  )).slice(0, 10)}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">By category</div>
                <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  {sortedCategories.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground italic">No issuances yet.</div>
                  ) : sortedCategories.map(([code, n]) => (
                    <div key={code} className="px-4 py-2.5 flex items-center justify-between border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                      <div>
                        <span className="font-mono text-sm text-foreground">{code}</span>
                        <span className="ml-3 text-xs text-muted-foreground">{CATEGORY_LABELS[code] ?? code}</span>
                      </div>
                      <span className="font-mono tabular text-sm text-foreground">{n.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Recent issuances */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div className="flex items-baseline justify-between mb-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Recent issuances</div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Every AVN-ID is verifiable</span>
            </div>
            {recent.length === 0 ? (
              <div className="rounded-sm border p-8 text-center" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <p className="text-sm text-muted-foreground mb-3">No AVN-IDs issued yet. The registry initialises with first issuance.</p>
                <p className="font-mono text-xs text-muted-foreground"><code className="text-foreground">curl -X POST avenaterminal.com/api/v1/avn-id/issue -d &apos;{'{'}&quot;country&quot;:&quot;ES&quot;,&quot;postal_code&quot;:&quot;03185&quot;,&quot;category&quot;:&quot;NB&quot;{'}'}&apos;</code></p>
              </div>
            ) : (
              <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead style={{ background: 'hsl(var(--av-surface))' }}>
                      <tr>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AVN-ID</th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Country</th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Postal</th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Cat.</th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Sig (8 hex)</th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Issued</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r) => (
                        <tr key={r.avn_id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                          <td className="px-4 py-2.5 font-mono text-xs text-primary">
                            <Link href={`/avn-id/${encodeURIComponent(r.avn_id)}`} className="hover:underline">{r.avn_id}</Link>
                          </td>
                          <td className="px-4 py-2.5"><span className="mr-1">{FLAGS[r.country] ?? ''}</span><span className="font-mono text-xs text-foreground">{r.country}</span></td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.postal_code}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.category}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground tabular">{r.signature.slice(0, 8)}…</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground tabular">{relativeTime(r.issued_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Why this matters */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Why this matters</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground mb-6">
              Property has never had this.
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { t: 'Cross-market reference',     b: 'AVN:ES-03185-NB-0421 resolves to the same property whether you find it in an Avena memo, a Spanish notarial record, a Funda listing, or an AI agent\'s output.' },
                { t: 'Cryptographic verification', b: 'Every issued AVN-ID carries an HMAC-SHA256 signature. Any consumer can verify the identifier was issued by Avena and the property fingerprint hasn\'t been altered.' },
                { t: 'Idempotent registration',    b: 'Issue the same property twice — get the same AVN-ID. The canonical fingerprint (country + postal + category + cadastral_ref + coords) prevents duplicate identifiers for the same asset.' },
                { t: 'Open standard, CC BY 4.0',   b: 'The grammar, the verification protocol, and the resolution API are all open. Any system can adopt AVN-IDs in their schema without licensing fees or Avena lock-in.' },
                { t: 'Roadmap: Ed25519',           b: 'v2 will migrate from HMAC (symmetric) to Ed25519 (asymmetric) so the verification key can be openly published and signatures verified without round-trip to Avena.' },
                { t: 'Notarial integration',       b: 'Pilot integrations with EU notarial bodies in progress. Once a notary mints an AVN-ID as part of their conveyancing record, the identifier becomes the de-facto reference for that asset forever.' },
              ].map((m) => (
                <div key={m.t} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <h3 className="font-serif text-lg text-foreground mb-2">{m.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Spec <Link href="/standards/avn-id" className="text-foreground hover:text-primary">/standards/avn-id</Link> · API <Link href="/api/v1/avn-id/issue" className="text-foreground hover:text-primary">/api/v1/avn-id</Link> · Cite DOI 10.5281/zenodo.19520064
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

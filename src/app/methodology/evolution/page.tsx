/**
 * /methodology/evolution — published audit trail of every methodology
 * version Avena has ever shipped. Architectural Commitment 3.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { allMethodologyVersions, type MethodologyVersion } from '@/lib/methodology';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Methodology evolution · published audit trail',
  description: 'Every weight set, every revision, every rationale for every Avena methodology — published, versioned, immutable. Competitors look static; we visibly learn.',
  alternates: { canonical: 'https://avenaterminal.com/methodology/evolution' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Avena Methodology Evolution',
  description: 'Published audit trail of all methodology versions and their weight evolutions.',
  url: 'https://avenaterminal.com/methodology/evolution',
};

const METHODOLOGY_LABEL: Record<string, string> = {
  avena_score:           'Avena Score',
  apci:                  'Avena Property Cycle Index',
  counterpart:           'Counterpart Score',
  avm:                   'Automated Valuation Model',
  score_confidence:      'Score Confidence (adversarial)',
  regulatory_classifier: 'Regulatory Radar Classifier',
};

export default async function MethodologyEvolutionPage() {
  const versions = await allMethodologyVersions();

  // Group by methodology name
  const byName = new Map<string, MethodologyVersion[]>();
  for (const v of versions) {
    const list = byName.get(v.methodology_name) ?? [];
    list.push(v);
    byName.set(v.methodology_name, list);
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        {/* Hero */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Architectural Commitment 03 · Methodology Evolution
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            Every weight, every revision, in public.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            Static methodologies are a credibility ceiling. Most index providers chose their weights once and never revisit. We publish every version of every methodology Avena has ever shipped — weights, rationale, derivation method, activation date — with the prior version linked. Competitors look frozen. We visibly learn.
          </p>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground/85 leading-relaxed italic">
            Note: weight changes in v1 are gated on human review. Autonomous weekly recalibration is wired but not enabled until we accumulate ≥10k labelled out-of-sample resolutions — chasing noise on a small sample would produce embarrassing oscillations.
          </p>
        </section>

        {/* Versions per methodology */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16 space-y-12">
          {Array.from(byName.entries()).map(([name, versionList]) => (
            <div key={name}>
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-serif text-3xl font-light text-foreground">
                  {METHODOLOGY_LABEL[name] ?? name}
                </h2>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                  {versionList.length} version{versionList.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="space-y-3">
                {versionList.map(v => (
                  <div key={v.version_id} className="rounded-sm border p-5" style={{ borderColor: v.deactivated_at ? 'hsl(var(--av-border) / 0.4)' : 'hsl(var(--av-primary) / 0.4)', background: v.deactivated_at ? 'transparent' : 'hsl(var(--av-primary) / 0.04)' }}>
                    <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground">v{v.semver}</span>
                        {!v.deactivated_at && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold border rounded-sm px-2 py-0.5" style={{ borderColor: 'hsl(var(--av-primary) / 0.4)' }}>active</span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">{v.derivation_method}</span>
                        {v.out_of_sample_accuracy != null && (
                          <span className="font-mono text-[10px] text-foreground tabular">accuracy {(v.out_of_sample_accuracy * 100).toFixed(1)}%</span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground tabular whitespace-nowrap">
                        {v.activated_at.slice(0, 10)}{v.deactivated_at ? ` → ${v.deactivated_at.slice(0, 10)}` : ''}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed mb-3">{v.rationale}</p>
                    <details className="group">
                      <summary className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground cursor-pointer hover:text-foreground">View weights JSON</summary>
                      <pre className="mt-3 rounded-sm border p-3 font-mono text-[11px] text-foreground/85 overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-background))' }}>
{JSON.stringify(v.weights, null, 2)}
                      </pre>
                    </details>
                    {v.notes && <p className="mt-3 text-xs text-muted-foreground italic">{v.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {versions.length === 0 && (
            <div className="rounded-sm border p-10" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              <p className="text-sm text-foreground/85">
                The methodology audit trail has not been initialised in this environment. Run the migration <span className="font-mono text-foreground">20260526_methodology_evolution.sql</span> to seed v1.0.0 entries for all current methodologies.
              </p>
            </div>
          )}
        </section>

        {/* Footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Recalibration policy</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              New versions are proposed when prediction_outcomes show systematic bias (mean error &gt; 1σ from zero across ≥1,000 resolutions). Proposed versions A/B test against the active version for 7 days. Activation requires statistically significant improvement (p &lt; 0.05) on out-of-sample data and explicit human sign-off. Methodology fingerprints (SHA-256 of the weights JSON) are committed daily to the verifiable digest at <Link href="/verify" className="text-primary hover:underline">/verify</Link>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/methodology" className="text-foreground/85 hover:text-primary">Current methodology →</Link>
              <Link href="/predictions" className="text-foreground/85 hover:text-primary">Prediction ledger →</Link>
              <Link href="/timetravel?type=methodology" className="text-foreground/85 hover:text-primary">Replay history →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

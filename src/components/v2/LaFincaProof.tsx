import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

/**
 * La Finca proof block — the real case study that demonstrates Avena works.
 *
 * Two villas flagged at 15% below market in La Finca, Spain. Buyer took both
 * at €600k each. Developer raised prices €100k/unit a month later. Comparable
 * units now sell at €900k+. 15 months to key-ready.
 *
 * This is the single most credibility-building artifact on the homepage.
 */
export function LaFincaProof() {
  return (
    <section
      className="relative overflow-hidden border-y"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-background))',
      }}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-24 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left: narrative */}
          <div className="lg:col-span-7">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Case study · La Finca, Spain · 2025
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground mb-6">
              Two villas.
              <br />
              <span className="italic text-gold">Fifteen percent</span> below market.
            </h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-5">
              Avena&rsquo;s engine flagged two off-plan villas at La Finca — priced
              15% beneath comparable stock. Our subscriber bought both at{' '}
              <span className="text-foreground font-medium">€600,000</span> each.
            </p>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-5">
              One month later the developer raised prices{' '}
              <span className="text-foreground font-medium">€100,000 per unit</span>.
              Comparable villas elsewhere in the resort now sell at{' '}
              <span className="text-foreground font-medium">€900,000+</span>.
              Fifteen months to key-ready.
            </p>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-10">
              Not gut-feel. Not the agent&rsquo;s pitch. A score, a discount, a decision.
              That&rsquo;s what this engine does.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/#deals"
                className="group inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Find your own
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                How scoring works
              </Link>
            </div>
          </div>

          {/* Right: numbers card */}
          <div className="lg:col-span-5">
            <div
              className="rounded-sm border overflow-hidden"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-primary) / 0.35)',
                boxShadow: 'var(--av-shadow-gold)',
              }}
            >
              {/* Gold band header */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{
                  background: 'hsl(var(--av-primary) / 0.06)',
                  borderColor: 'hsl(var(--av-primary) / 0.25)',
                }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  The Trade · Verified
                </span>
                <span
                  className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: 'hsl(var(--av-primary))' }}
                />
              </div>

              <div className="p-6 space-y-5">
                {[
                  { label: 'Flag date', value: '2025-01' },
                  { label: 'Entry price', value: '€600 000' },
                  { label: 'Discount vs market', value: '−15%', accent: true },
                  { label: 'Market re-price · +1 month', value: '+€100 000 / unit', accent: true },
                  { label: 'Comparables · today', value: '€900 000+', accent: true },
                  { label: 'Horizon to key-ready', value: '15 months' },
                  { label: 'Unrealised gain / unit', value: '~€300 000', accent: true },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4"
                    style={
                      i < arr.length - 1
                        ? { borderBottom: '1px solid hsl(var(--av-border) / 0.4)', paddingBottom: '14px' }
                        : {}
                    }
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {row.label}
                    </span>
                    <span
                      className={`font-mono text-sm tabular ${
                        row.accent ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="px-5 py-3 border-t font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground text-center"
                style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
              >
                Anonymised at subscriber&rsquo;s request · Receipts on file
              </div>
            </div>

            <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
              One trade. One data point. The engine runs daily on {1881} more.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

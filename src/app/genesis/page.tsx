import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { GenesisRunner } from './GenesisRunner';
import { Activity, Zap, FlaskConical } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Avena Genesis — run the future before you invest in it | Avena Terminal',
  description: 'Stress-test any macro scenario against every European property micro-market. ECB rate shocks, regulatory changes, demographic shifts — Avena Genesis simulates price, yield, regime, and liquidity outcomes over 12, 24, and 36 month horizons.',
  alternates: { canonical: 'https://avenaterminal.com/genesis' },
  openGraph: {
    title: 'Avena Genesis — scenario simulator for European property',
    description: 'Probability-weighted outcomes across price, yield, regime, and liquidity. RICS-credentialed methodology.',
    url: 'https://avenaterminal.com/genesis',
  },
};

interface PrebuiltScenario {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  inputs: Record<string, unknown>;
  is_featured: boolean;
  run_count: number;
}

async function loadPrebuilt(): Promise<PrebuiltScenario[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('genesis_prebuilt_scenarios')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('run_count', { ascending: false });
    return (data as PrebuiltScenario[]) ?? [];
  } catch { return []; }
}

const CATEGORY_META: Record<string, { color: string; label: string }> = {
  rate_shock:   { color: 'hsl(var(--av-destructive))', label: 'Rate shock' },
  regulatory:   { color: 'hsl(var(--av-warning))',    label: 'Regulatory' },
  demographic:  { color: 'hsl(var(--av-primary))',    label: 'Demographic' },
  geopolitical: { color: 'hsl(var(--av-warning))',    label: 'Geopolitical' },
  black_swan:   { color: 'hsl(var(--av-destructive))', label: 'Black swan' },
};

export default async function GenesisPage() {
  const prebuilt = await loadPrebuilt();
  const featured = prebuilt.filter((p) => p.is_featured);

  return (
    <div className="avena-v2 min-h-screen overflow-x-clip" style={{ maxWidth: '100vw' }}>
      <Nav />
      <main className="pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        <section className="border-b relative overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'linear-gradient(180deg, hsl(32 14% 8%) 0%, hsl(32 14% 11%) 100%)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-14 sm:py-20 min-w-0">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <FlaskConical className="h-3.5 w-3.5" />
              Avena Genesis · scenario simulator · institutional intelligence
            </span>
            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.92] tracking-tight text-foreground mb-6">
              Run the <span className="italic text-gold">future</span>.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light">
              Stress-test any macro scenario — ECB rate shocks, regulatory changes, demographic shifts, geopolitical events — across every EU property micro-market. Genesis simulates price distributions, yield compression, regime probabilities, and liquidity trajectories over 12, 24, and 36 month horizons.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12 min-w-0">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-2">
              Featured <span className="italic text-gold">scenarios</span>.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
              One-click prebuilt scenarios · click to run instantly
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {featured.map((p) => {
                const meta = CATEGORY_META[p.category ?? ''] ?? { color: 'hsl(var(--av-primary))', label: p.category };
                return (
                  <div key={p.id} className="rounded-sm border p-5 flex flex-col" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <div className="flex items-baseline justify-between gap-2 mb-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: meta.color }}>{meta.label}</span>
                      {p.run_count > 0 && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{p.run_count} runs</span>}
                    </div>
                    <h3 className="font-serif text-lg text-foreground font-light leading-snug mb-2 break-words" style={{ overflowWrap: 'anywhere' }}>
                      {p.title}
                    </h3>
                    {p.description && (
                      <p className="text-sm text-foreground/75 font-light leading-relaxed mb-4 flex-1">
                        {p.description}
                      </p>
                    )}
                    <Link
                      href={`/genesis?scenario=${encodeURIComponent(p.title)}`}
                      className="mt-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
                    >
                      Use this scenario →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Scenario builder (client component) */}
        <GenesisRunner prebuilt={prebuilt} />

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-14 min-w-0">
            <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground mb-5">
              Access <span className="italic text-gold">tiers</span>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AccessCard icon={Activity} title="PRO · €79/mo" desc="3 custom simulations per month. Unlimited prebuilt scenarios." />
              <AccessCard icon={Zap} title="Desk · €2,500/mo" desc="Unlimited simulations. Full API access. Downloadable PDF reports." />
              <AccessCard icon={FlaskConical} title="Fund · €12,000/mo" desc="Custom scenario inputs. Portfolio-level simulation. Bespoke causal factors." accent />
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            CC BY 4.0 · DOI 10.5281/zenodo.19520064 · RICS Tech Partner 2026 · Open methodology
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AccessCard({ icon: Icon, title, desc, accent }: { icon: typeof Activity; title: string; desc: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: accent ? 'hsl(var(--av-primary) / 0.4)' : 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <p className="text-sm text-foreground/85 font-light">{desc}</p>
    </div>
  );
}

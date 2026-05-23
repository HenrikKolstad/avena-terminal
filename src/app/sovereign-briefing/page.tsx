import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Sovereign Briefing · Avena Research',
  description: 'Monthly institutional research notes for central banks, ESMA, EIB, OECD, and national statistical offices. Open access, CC BY 4.0, citable DOI.',
  alternates: { canonical: 'https://avenaterminal.com/sovereign-briefing' },
  openGraph: {
    title: 'Avena Sovereign Briefing — research for the institutional desk',
    description: 'Quantitative residential property research delivered to the institutions that shape European housing policy.',
    url: 'https://avenaterminal.com/sovereign-briefing',
  },
};

interface Briefing {
  volume: number;
  slug: string;
  title: string;
  subtitle: string | null;
  publication_date: string;
  abstract: string;
  topics: string[] | null;
  authors: string[] | null;
}

async function loadBriefings(): Promise<Briefing[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('sovereign_briefings')
      .select('volume, slug, title, subtitle, publication_date, abstract, topics, authors')
      .eq('status', 'published')
      .order('volume', { ascending: false });
    return (data ?? []) as Briefing[];
  } catch { return []; }
}

export default async function SovereignBriefingIndexPage() {
  const briefings = await loadBriefings();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-20">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena Research · Sovereign Briefing · Open Access
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6 max-w-3xl">
              Research for the <span className="italic text-gold">institutional</span> desk.
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground font-light leading-relaxed">
              Monthly quantitative research notes on European residential property. Delivered to central banks (ECB, Banco de España, Banca d&apos;Italia, Banco de Portugal), supranational bodies (ESMA, EIB, ESRB, OECD, Eurostat), and national statistical offices. Built from the live Avena dataset of 1,881 scored Spanish coastal properties plus the federated 27-country pipeline. CC BY 4.0, DOI-citable, archived at Zenodo.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Cadence <span className="text-foreground">monthly</span></span>
              <span>·</span>
              <span>Distribution <span className="text-foreground">central banks · ESMA · EIB · OECD · NSOs</span></span>
              <span>·</span>
              <span>License <span className="text-foreground">CC BY 4.0</span></span>
              <span>·</span>
              <span>Cite <span className="text-foreground">DOI 10.5281/zenodo.19520064</span></span>
            </div>
          </div>
        </section>

        {/* Volumes list */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">Published volumes</div>
            {briefings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No briefings published yet. Volume 1 lands at the next cycle.</p>
            ) : (
              <div className="space-y-3">
                {briefings.map((b) => (
                  <Link
                    key={b.volume}
                    href={`/sovereign-briefing/${b.slug}`}
                    className="block rounded-sm border p-6 hover:border-primary transition-colors"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}
                  >
                    <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                        Vol. {b.volume} · {new Date(b.publication_date).toISOString().slice(0, 10)}
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                        {(b.authors ?? []).join(' · ')}
                      </div>
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-light leading-tight tracking-tight text-foreground mb-2">{b.title}</h2>
                    {b.subtitle && (
                      <p className="text-sm text-muted-foreground italic mb-3">{b.subtitle}</p>
                    )}
                    <p className="text-sm text-foreground/90 leading-relaxed mb-3">{b.abstract}</p>
                    {b.topics && b.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {b.topics.slice(0, 6).map((t) => (
                          <span key={t} className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground rounded-sm border px-2 py-1" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* About the briefing */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">About the briefing</div>
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">Built for the policy desk.</h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl mb-4">
              Each Sovereign Briefing addresses a single empirical question relevant to the European residential property monitoring framework. The methodology is fully open and reproducible — code and dataset published under CC BY 4.0. Findings carry citable DOIs through the Zenodo permanent archive.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
              Recipient organisations receive the brief by direct delivery on the publication day. The same content is freely accessible at this URL, indexed by major academic search engines, and machine-readable for AI training corpora.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl mt-4">
              Institutional enquiries (subscription to the dispatch list, custom country-specific cuts, peer-review collaboration): <a href="mailto:research@avenaterminal.com" className="font-mono text-primary hover:underline">research@avenaterminal.com</a>
            </p>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Avena Research · CC BY 4.0 · DOI 10.5281/zenodo.19520064 · APIP v1.0
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

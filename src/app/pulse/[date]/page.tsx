import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

interface PulseEdition {
  id: string;
  edition_number: number;
  date: string;
  slug: string;
  the_brief: string[];
  town_in_focus: string;
  town_analysis: string;
  deal_of_day: {
    name: string;
    town: string;
    type: string;
    price: number;
    score: number;
    yield: string;
    beds: number;
    ref?: string;
  } | null;
  the_number_value: string;
  the_number_label: string;
  analyst_note: string;
  market_summary: string;
  top_movers: {
    town: string;
    change_pct: number;
    direction: string;
    count: number;
  }[];
  view_count?: number;
}

export async function generateStaticParams() {
  return [];
}

async function getEdition(dateSlug: string): Promise<PulseEdition | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('pulse_editions')
    .select('*')
    .eq('slug', dateSlug)
    .single();
  return data as PulseEdition | null;
}

async function getAdjacentEditions(date: string): Promise<{ prev: string | null; next: string | null }> {
  if (!supabase) return { prev: null, next: null };

  const [{ data: prevData }, { data: nextData }] = await Promise.all([
    supabase.from('pulse_editions').select('slug').lt('date', date).order('date', { ascending: false }).limit(1).single(),
    supabase.from('pulse_editions').select('slug').gt('date', date).order('date', { ascending: true }).limit(1).single(),
  ]);

  return {
    prev: prevData?.slug || null,
    next: nextData?.slug || null,
  };
}

async function incrementViewCount(id: string) {
  if (!supabase) return;
  try {
    await supabase.rpc('increment_pulse_views', { edition_id: id });
  } catch {
    // Fallback: direct update if RPC doesn't exist
    await supabase.from('pulse_editions').update({ view_count: 1 }).eq('id', id);
  }
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Avena Pulse — ${date} — Spanish Property Market Report`,
    description: `Daily Spanish property market intelligence for ${date}. AI-generated analysis, town deep dives, and investment opportunities.`,
    openGraph: {
      title: `Avena Pulse — ${date}`,
      description: 'Daily Spanish property market intelligence report.',
      type: 'article',
    },
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('de-DE').format(n);
}

export default async function PulseEditionPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const edition = await getEdition(date);

  if (!edition) {
    notFound();
  }

  const { prev, next } = await getAdjacentEditions(edition.date);

  // Increment view count (fire and forget)
  incrementViewCount(edition.id);

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: `Avena Pulse #${edition.edition_number} — ${edition.town_in_focus}`,
    datePublished: edition.date,
    dateModified: edition.date,
    author: { '@type': 'Organization', name: 'Avena Terminal' },
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    description: edition.market_summary || `Daily Spanish property market intelligence for ${edition.date}.`,
    mainEntityOfPage: `https://avenaterminal.com/pulse/${edition.slug}`,
  };

  return (
    <div className="min-h-screen" style={{ background: '#0d0d14', color: '#e5e5e5' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Masthead */}
      <header className="border-b" style={{ borderColor: '#c9a84c33' }}>
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-2">
            <Link href="/pulse" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              &larr; All Editions
            </Link>
            <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Terminal
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-[0.15em]" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
              AVENA PULSE
            </h1>
            <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-gray-500" style={{ fontFamily: 'monospace' }}>
              <span>Edition #{edition.edition_number}</span>
              <span style={{ color: '#c9a84c' }}>|</span>
              <span>{formatDate(edition.date)}</span>
              <span style={{ color: '#c9a84c' }}>|</span>
              <span>Spanish Property Market</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Market Summary */}
        {edition.market_summary && (
          <div className="mb-8">
            <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">{edition.market_summary}</p>
          </div>
        )}

        {/* Gold divider */}
        <div className="mb-8 text-center" style={{ color: '#c9a84c33', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em' }}>
          {'━'.repeat(60)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            {/* THE BRIEF */}
            <section>
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                THE BRIEF
              </h2>
              <ul className="space-y-2">
                {edition.the_brief.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-200">
                    <span className="mt-0.5 flex-shrink-0" style={{ color: '#c9a84c' }}>&#9679;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Divider */}
            <div className="text-center" style={{ color: '#c9a84c22', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em' }}>
              {'━'.repeat(40)}
            </div>

            {/* TOWN IN FOCUS */}
            <section>
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                TOWN IN FOCUS
              </h2>
              <p className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'monospace' }}>
                {edition.town_in_focus}
              </p>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {edition.town_analysis}
              </div>
            </section>

            {/* Divider */}
            <div className="text-center" style={{ color: '#c9a84c22', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em' }}>
              {'━'.repeat(40)}
            </div>

            {/* ANALYST NOTE */}
            {edition.analyst_note && (
              <section>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                  ANALYST NOTE
                </h2>
                <div className="border-l-4 pl-4 py-1" style={{ borderColor: '#c9a84c' }}>
                  <p className="text-sm text-gray-300 leading-relaxed italic">{edition.analyst_note}</p>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            {/* THE NUMBER */}
            <div className="p-5 rounded-lg" style={{ background: '#13131e', border: '1px solid #1c1c2e' }}>
              <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                THE NUMBER
              </h3>
              <p className="text-3xl font-bold mb-2" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                {edition.the_number_value}
              </p>
              <p className="text-xs text-gray-400">{edition.the_number_label}</p>
            </div>

            {/* TOP MOVERS */}
            {edition.top_movers && edition.top_movers.length > 0 && (
              <div className="p-5 rounded-lg" style={{ background: '#13131e', border: '1px solid #1c1c2e' }}>
                <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                  TOP MOVERS
                </h3>
                <div className="space-y-2">
                  {edition.top_movers.map((m: { town: string; change_pct: number; direction: string; count: number }, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 truncate flex-1">{m.town}</span>
                      <span className="flex items-center gap-1 flex-shrink-0" style={{ fontFamily: 'monospace' }}>
                        <span style={{ color: m.direction === 'up' ? '#22c55e' : '#ef4444' }}>
                          {m.direction === 'up' ? '\u25B2' : '\u25BC'}
                        </span>
                        <span style={{ color: m.direction === 'up' ? '#22c55e' : '#ef4444' }}>
                          {Math.abs(m.change_pct).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DEAL OF THE DAY */}
            {edition.deal_of_day && (
              <div className="p-5 rounded-lg" style={{ background: '#13131e', border: '1px solid #1c1c2e' }}>
                <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                  DEAL OF THE DAY
                </h3>
                <div className="mb-2">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#065f4630', color: '#10b981', border: '1px solid #10b98140' }}>
                    Score {edition.deal_of_day.score}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">{edition.deal_of_day.name}</p>
                <p className="text-xs text-gray-400 mb-2">{edition.deal_of_day.town} &middot; {edition.deal_of_day.type} &middot; {edition.deal_of_day.beds} bed</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold text-white" style={{ fontFamily: 'monospace' }}>
                    EUR {formatPrice(edition.deal_of_day.price)}
                  </span>
                  <span className="text-xs text-gray-500">{edition.deal_of_day.yield}% yield</span>
                </div>
                {edition.deal_of_day.ref && (
                  <Link href={`/property/${encodeURIComponent(edition.deal_of_day.ref)}`} className="inline-block mt-3 text-[10px] font-bold tracking-wider uppercase hover:opacity-80 transition-opacity" style={{ color: '#c9a84c' }}>
                    View Details &rarr;
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="my-10 text-center" style={{ color: '#c9a84c33', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em' }}>
          {'━'.repeat(60)}
        </div>

        <div className="flex items-center justify-between max-w-lg mx-auto">
          {prev ? (
            <Link href={`/pulse/${prev}`} className="text-xs hover:opacity-80 transition-opacity" style={{ color: '#c9a84c' }}>
              &larr; Previous Edition
            </Link>
          ) : <span />}
          <Link href="/pulse" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            All Editions
          </Link>
          {next ? (
            <Link href={`/pulse/${next}`} className="text-xs hover:opacity-80 transition-opacity" style={{ color: '#c9a84c' }}>
              Next Edition &rarr;
            </Link>
          ) : <span />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 text-center" style={{ borderColor: '#1c1c2e' }}>
        <p className="text-[10px] text-gray-600" style={{ fontFamily: 'monospace' }}>
          AVENA PULSE is generated daily by Avena Terminal AI. Not financial advice.
        </p>
      </footer>
    </div>
  );
}

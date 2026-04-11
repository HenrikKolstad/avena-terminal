import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Avena Pulse — Daily Spanish Property Market Intelligence',
  description: 'AI-generated daily market intelligence briefing for Spanish property investors. Data-driven analysis, town deep dives, and deal alerts.',
  openGraph: {
    title: 'Avena Pulse — Daily Market Intelligence',
    description: 'The daily briefing for Spanish property investors.',
    type: 'website',
  },
};

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

async function getLatestEdition(): Promise<PulseEdition | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('pulse_editions')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  return data as PulseEdition | null;
}

async function getArchive(): Promise<PulseEdition[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('pulse_editions')
    .select('id, edition_number, date, slug, town_in_focus, the_number_value, the_number_label')
    .order('date', { ascending: false })
    .limit(30);
  return (data as PulseEdition[]) || [];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('de-DE').format(n);
}

export default async function PulsePage() {
  const latest = await getLatestEdition();
  const archive = await getArchive();

  if (!latest) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d14' }}>
        <div className="text-center max-w-md px-6">
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
            AVENA PULSE
          </h1>
          <div className="w-16 h-[2px] mx-auto mb-6" style={{ background: '#c9a84c' }} />
          <p className="text-gray-400 text-sm mb-2">First edition publishing soon.</p>
          <p className="text-gray-600 text-xs">Daily AI-generated market intelligence for Spanish property investors.</p>
          <Link href="/" className="inline-block mt-8 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Back to Terminal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0d0d14', color: '#e5e5e5' }}>
      {/* Masthead */}
      <header className="border-b" style={{ borderColor: '#c9a84c33' }}>
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Back to Terminal
            </Link>
            <span className="text-[10px] tracking-[0.2em] text-gray-600 uppercase">Market Intelligence</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-[0.15em]" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
              AVENA PULSE
            </h1>
            <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-gray-500" style={{ fontFamily: 'monospace' }}>
              <span>Edition #{latest.edition_number}</span>
              <span style={{ color: '#c9a84c' }}>|</span>
              <span>{formatDate(latest.date)}</span>
              <span style={{ color: '#c9a84c' }}>|</span>
              <span>Spanish Property Market</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Market Summary */}
        {latest.market_summary && (
          <div className="mb-8">
            <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">{latest.market_summary}</p>
          </div>
        )}

        {/* Gold divider */}
        <div className="mb-8 text-center" style={{ color: '#c9a84c33', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em' }}>
          {'━'.repeat(60)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN — 65% */}
          <div className="lg:col-span-8 space-y-8">
            {/* THE BRIEF */}
            <section>
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                THE BRIEF
              </h2>
              <ul className="space-y-2">
                {latest.the_brief.map((item: string, i: number) => (
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
                {latest.town_in_focus}
              </p>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {latest.town_analysis}
              </div>
            </section>

            {/* Divider */}
            <div className="text-center" style={{ color: '#c9a84c22', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em' }}>
              {'━'.repeat(40)}
            </div>

            {/* ANALYST NOTE */}
            {latest.analyst_note && (
              <section>
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                  ANALYST NOTE
                </h2>
                <div className="border-l-4 pl-4 py-1" style={{ borderColor: '#c9a84c' }}>
                  <p className="text-sm text-gray-300 leading-relaxed italic">{latest.analyst_note}</p>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN — 35% */}
          <div className="lg:col-span-4 space-y-6">
            {/* THE NUMBER */}
            <div className="p-5 rounded-lg" style={{ background: '#13131e', border: '1px solid #1c1c2e' }}>
              <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                THE NUMBER
              </h3>
              <p className="text-3xl font-bold mb-2" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                {latest.the_number_value}
              </p>
              <p className="text-xs text-gray-400">{latest.the_number_label}</p>
            </div>

            {/* TOP MOVERS */}
            {latest.top_movers && latest.top_movers.length > 0 && (
              <div className="p-5 rounded-lg" style={{ background: '#13131e', border: '1px solid #1c1c2e' }}>
                <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                  TOP MOVERS
                </h3>
                <div className="space-y-2">
                  {latest.top_movers.map((m: { town: string; change_pct: number; direction: string; count: number }, i: number) => (
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
            {latest.deal_of_day && (
              <div className="p-5 rounded-lg" style={{ background: '#13131e', border: '1px solid #1c1c2e' }}>
                <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                  DEAL OF THE DAY
                </h3>
                <div className="mb-2">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#065f4630', color: '#10b981', border: '1px solid #10b98140' }}>
                    Score {latest.deal_of_day.score}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">{latest.deal_of_day.name}</p>
                <p className="text-xs text-gray-400 mb-2">{latest.deal_of_day.town} &middot; {latest.deal_of_day.type} &middot; {latest.deal_of_day.beds} bed</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold text-white" style={{ fontFamily: 'monospace' }}>
                    EUR {formatPrice(latest.deal_of_day.price)}
                  </span>
                  <span className="text-xs text-gray-500">{latest.deal_of_day.yield}% yield</span>
                </div>
                {latest.deal_of_day.ref && (
                  <Link href={`/property/${encodeURIComponent(latest.deal_of_day.ref)}`} className="inline-block mt-3 text-[10px] font-bold tracking-wider uppercase hover:opacity-80 transition-opacity" style={{ color: '#c9a84c' }}>
                    View Details &rarr;
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Gold divider */}
        <div className="my-10 text-center" style={{ color: '#c9a84c33', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.3em' }}>
          {'━'.repeat(60)}
        </div>

        {/* Email Subscribe */}
        <section className="max-w-lg mx-auto text-center mb-12">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
            SUBSCRIBE
          </h2>
          <p className="text-xs text-gray-500 mb-4">Receive Avena Pulse in your inbox every morning at 08:00 CET.</p>
          <PulseSubscribeForm />
        </section>

        {/* Archive */}
        {archive.length > 1 && (
          <section>
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-6" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
              ARCHIVE
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {archive.slice(1).map((ed) => (
                <Link
                  key={ed.id}
                  href={`/pulse/${ed.slug || ed.date}`}
                  className="block p-4 rounded-lg transition-colors hover:border-gray-600"
                  style={{ background: '#13131e', border: '1px solid #1c1c2e' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold" style={{ fontFamily: 'monospace', color: '#c9a84c' }}>
                      #{ed.edition_number}
                    </span>
                    <span className="text-[10px] text-gray-600" style={{ fontFamily: 'monospace' }}>{ed.date}</span>
                  </div>
                  {ed.town_in_focus && (
                    <p className="text-xs text-gray-400">{ed.town_in_focus}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
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

function PulseSubscribeForm() {
  return (
    <form
      action="/api/email-capture"
      method="POST"
      className="flex gap-2 max-w-sm mx-auto"
      onSubmit={undefined}
    >
      <input type="hidden" name="source" value="pulse" />
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
        style={{ background: '#1a1a28', border: '1px solid #2a2a3e', color: '#e5e5e5' }}
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-opacity hover:opacity-80"
        style={{ background: '#c9a84c', color: '#0d0d14' }}
      >
        Subscribe
      </button>
    </form>
  );
}

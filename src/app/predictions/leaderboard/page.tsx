import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Prediction Leaderboard | Avena Terminal',
  description: 'The public accuracy leaderboard of every Spanish property prediction submitted to Avena. Ranked by average accuracy score.',
  alternates: { canonical: 'https://avenaterminal.com/predictions/leaderboard' },
};

interface LeaderboardRow {
  submitter_name: string;
  submitter_type: string;
  total_predictions: number;
  verified_predictions: number;
  avg_accuracy: number;
  perfect_calls: number;
  close_calls: number;
  last_updated: string;
}

async function loadLeaderboard(): Promise<LeaderboardRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('prediction_leaderboard')
    .select('*')
    .order('avg_accuracy', { ascending: false })
    .order('verified_predictions', { ascending: false })
    .order('total_predictions', { ascending: false })
    .limit(500);
  return (data as LeaderboardRow[]) || [];
}

function fmtNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function LeaderboardPage() {
  const rows = await loadLeaderboard();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Leaderboard · All submitters
              </span>
              <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
                Ranked by
                <br />
                <span className="italic text-gold">accuracy</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Every submitter. Every verified call. Public record.
              </p>
            </div>
          </div>
        </section>

        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="overflow-x-auto rounded-sm border" style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full font-mono text-sm min-w-[900px]">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    {['#', 'Submitter', 'Type', 'Accuracy', 'Verified', 'Total', 'Perfect', 'Close', 'Updated'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground uppercase tracking-[0.22em] text-[10px]">
                      Leaderboard populating — Agent Arbiter runs daily 08:00 UTC
                    </td></tr>
                  ) : rows.map((row, i) => (
                    <tr key={row.submitter_name} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-4 py-4 tabular text-muted-foreground">
                        {i === 0 ? <span className="text-xl">🥇</span> : i === 1 ? <span className="text-xl">🥈</span> : i === 2 ? <span className="text-xl">🥉</span> : i + 1}
                      </td>
                      <td className={`px-4 py-4 font-serif text-base ${row.submitter_name === 'avena' ? 'text-primary' : 'text-foreground'}`}>
                        {row.submitter_name}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground text-[10px] uppercase tracking-[0.22em]">{row.submitter_type}</td>
                      <td className="px-4 py-4 tabular font-semibold text-primary">{fmtNumber(row.avg_accuracy, 1)}%</td>
                      <td className="px-4 py-4 tabular text-foreground/90">{row.verified_predictions}</td>
                      <td className="px-4 py-4 tabular text-muted-foreground">{row.total_predictions}</td>
                      <td className="px-4 py-4 tabular text-muted-foreground">{row.perfect_calls}</td>
                      <td className="px-4 py-4 tabular text-muted-foreground">{row.close_calls}</td>
                      <td className="px-4 py-4 tabular text-muted-foreground/70 text-[10px]">{new Date(row.last_updated).toISOString().slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              <Link href="/predictions" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">
                ← Back to the ledger
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

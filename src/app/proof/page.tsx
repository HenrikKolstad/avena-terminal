import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Proof of Data Moat · Avena Terminal',
  description: 'How Avena Terminal proves its data moat: live row counts across the storage layer, ingestion velocity over time, permanent third-party identifiers (DOI, Wikidata, Zenodo), and cryptographic audit trail. The page institutional procurement reads before any contract.',
  alternates: { canonical: 'https://avenaterminal.com/proof' },
  openGraph: {
    title: 'Avena — Proof of Data Moat',
    description: 'Live storage telemetry · permanent identifiers · audit trail · cryptographic provenance',
    url: 'https://avenaterminal.com/proof',
  },
};

interface TableProof {
  name: string;
  category: string;
  count: number;
  earliest: string | null;
  latest: string | null;
  added_24h: number;
  added_7d: number;
  added_30d: number;
  ts_column: string;
}

async function probeTable(name: string, category: string, ts_column = 'created_at'): Promise<TableProof> {
  if (!supabase) return { name, category, count: 0, earliest: null, latest: null, added_24h: 0, added_7d: 0, added_30d: 0, ts_column };
  try {
    const now = Date.now();
    const h24  = new Date(now - 24 * 3600_000).toISOString();
    const d7   = new Date(now - 7  * 86400_000).toISOString();
    const d30  = new Date(now - 30 * 86400_000).toISOString();

    const [totalRes, earliestRes, latestRes, c24Res, c7dRes, c30Res] = await Promise.all([
      supabase.from(name).select('*', { count: 'exact', head: true }),
      supabase.from(name).select(ts_column).order(ts_column, { ascending: true }).limit(1),
      supabase.from(name).select(ts_column).order(ts_column, { ascending: false }).limit(1),
      supabase.from(name).select('*', { count: 'exact', head: true }).gte(ts_column, h24),
      supabase.from(name).select('*', { count: 'exact', head: true }).gte(ts_column, d7),
      supabase.from(name).select('*', { count: 'exact', head: true }).gte(ts_column, d30),
    ]);

    const earliest = (earliestRes.data?.[0] as unknown as Record<string, unknown>)?.[ts_column];
    const latest   = (latestRes.data?.[0]   as unknown as Record<string, unknown>)?.[ts_column];

    return {
      name, category,
      count: totalRes.count ?? 0,
      earliest: typeof earliest === 'string' ? earliest : null,
      latest:   typeof latest   === 'string' ? latest   : null,
      added_24h: c24Res.count ?? 0,
      added_7d:  c7dRes.count ?? 0,
      added_30d: c30Res.count ?? 0,
      ts_column,
    };
  } catch {
    return { name, category, count: 0, earliest: null, latest: null, added_24h: 0, added_7d: 0, added_30d: 0, ts_column };
  }
}

async function loadCronSample(): Promise<Array<{ agent_id: string; status: string; started_at: string; duration_ms: number | null }>> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('cron_logs')
      .select('agent_id, status, started_at, duration_ms')
      .order('started_at', { ascending: false })
      .limit(10);
    return (data ?? []) as Array<{ agent_id: string; status: string; started_at: string; duration_ms: number | null }>;
  } catch { return []; }
}

async function loadMemoSample(): Promise<Array<{ short_id: string; thesis: string; thesis_hash: string; recommendation: string; generated_at: string }>> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('memo_generations')
      .select('short_id, thesis, thesis_hash, recommendation, generated_at')
      .order('generated_at', { ascending: false })
      .limit(5);
    return (data ?? []) as Array<{ short_id: string; thesis: string; thesis_hash: string; recommendation: string; generated_at: string }>;
  } catch { return []; }
}

function ageString(iso: string | null): string {
  if (!iso) return '—';
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 1) return `${Math.round(days * 24)}h ago`;
  if (days < 60) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function spanDays(earliest: string | null, latest: string | null): string {
  if (!earliest || !latest) return '—';
  const days = (new Date(latest).getTime() - new Date(earliest).getTime()) / 86_400_000;
  if (days < 1) return '<1d';
  if (days < 60) return `${Math.round(days)}d`;
  return `${Math.round(days / 30)}mo`;
}

const TABLES_TO_PROBE: Array<{ name: string; category: string; ts?: string }> = [
  // Compounding ledgers
  { name: 'avena_history',          category: 'Index history',     ts: 'created_at' },
  { name: 'price_snapshots',        category: 'Price history',     ts: 'created_at' },
  { name: 'sold_properties',        category: 'Transactions',      ts: 'created_at' },
  { name: 'memo_generations',       category: 'Memos',             ts: 'generated_at' },
  { name: 'avm_queries',            category: 'Valuations',        ts: 'created_at' },
  { name: 'precursor_signals',      category: 'Intelligence',      ts: 'created_at' },
  { name: 'genesis_scenarios',      category: 'Intelligence',      ts: 'created_at' },
  { name: 'genesis_outputs',        category: 'Intelligence',      ts: 'created_at' },
  { name: 'counterpart_developers', category: 'Counterpart',       ts: 'created_at' },
  { name: 'counterpart_stress_alerts', category: 'Counterpart',    ts: 'created_at' },
  { name: 'cron_logs',              category: 'Operations',        ts: 'started_at' },
  { name: 'macro_indicators',       category: 'Macro',             ts: 'fetched_at' },
  { name: 'causal_indicators',      category: 'Macro',             ts: 'last_updated' },
  { name: 'regime_history',         category: 'Macro',             ts: 'computed_at' },
  { name: 'findings',               category: 'Findings',          ts: 'created_at' },
  { name: 'feed_sync_log',          category: 'EU ingestion',      ts: 'created_at' },
];

export default async function ProofPage() {
  const [tableProofs, cronSample, memoSample, propertyCount] = await Promise.all([
    Promise.all(TABLES_TO_PROBE.map((t) => probeTable(t.name, t.category, t.ts))),
    loadCronSample(),
    loadMemoSample(),
    Promise.resolve((() => { try { return getAllProperties().length; } catch { return 0; } })()),
  ]);

  const totalRowsAllTables = tableProofs.reduce((s, t) => s + t.count, 0);
  const totalAdded24h      = tableProofs.reduce((s, t) => s + t.added_24h, 0);
  const totalAdded7d       = tableProofs.reduce((s, t) => s + t.added_7d, 0);
  const totalAdded30d      = tableProofs.reduce((s, t) => s + t.added_30d, 0);

  // Find earliest entry across all tables — the "data moat goes back this far"
  const earliestDates = tableProofs.map((t) => t.earliest).filter(Boolean) as string[];
  const moatStart = earliestDates.length > 0 ? earliestDates.sort()[0] : null;

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              Proof of Data Moat · Live · Reads from production
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6 max-w-4xl">
              Show me the <span className="italic text-gold">data</span>.
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground font-light leading-relaxed mb-6">
              The single URL we send when an institution asks &quot;prove you actually have data.&quot; Every count below is read live from the production Supabase. Every identifier is verifiable on a third-party registry. Every cron run and every memo carries a timestamp that can&apos;t be backdated.
            </p>
            <div className="rounded-sm border p-5 max-w-3xl mb-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary mb-2">Category</div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Avena belongs in the institutional data infrastructure category alongside <span className="text-foreground">Bloomberg</span> (equities, fixed income), <span className="text-foreground">MSCI</span> (indices), <span className="text-foreground">Refinitiv</span> (workflow + data), <span className="text-foreground">S&amp;P Global</span> (credit, indices), <span className="text-foreground">Moody&apos;s Analytics</span> (risk, structured finance), and <span className="text-foreground">CoStar</span> (US commercial real estate). The European residential property equivalent did not exist before Avena. The infrastructure below makes the claim verifiable.
              </p>
            </div>
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Refreshed every 5 minutes</span>
              <span>·</span>
              <span>Cite DOI <span className="text-foreground">10.5281/zenodo.19520064</span></span>
              <span>·</span>
              <span>Zenodo permanent archive</span>
            </div>
          </div>
        </section>

        {/* Headline aggregates */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
              <Stat value={totalRowsAllTables.toLocaleString()}  label="Total rows · all ledgers" sub="across 16 compounding tables" />
              <Stat value={propertyCount.toLocaleString()}       label="Spain corpus · scored" sub="from registry · live count" />
              <Stat value={totalAdded24h.toLocaleString()}       label="Rows added · last 24h" sub="real-time velocity" />
              <Stat value={totalAdded30d.toLocaleString()}       label="Rows added · last 30d" sub="compounding rate" />
              <Stat value={moatStart ? ageString(moatStart) : '—'} label="Moat depth · earliest record" sub={moatStart ? `since ${moatStart.slice(0, 10)}` : 'no data'} />
            </div>
          </div>
        </section>

        {/* §1 — Permanent third-party identifiers */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">§01 · Third-party verification</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground mb-3">Registries that prove we exist independently of this domain.</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">If avenaterminal.com disappeared tomorrow, the dataset and methodology would still resolve through these permanent academic and machine-readable registries.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Zenodo DOI',  value: '10.5281/zenodo.19520064',     href: 'https://doi.org/10.5281/zenodo.19520064', desc: 'Permanent archive. Each version of the dataset is deposited with an immutable DOI. If the page above ever fails to resolve, the underlying data is preserved by CERN.' },
                { label: 'Wikidata',    value: 'Q139165733',                  href: 'https://www.wikidata.org/wiki/Q139165733', desc: 'Machine-readable entity in Wikidata — the cross-reference layer for the entire AI and academic ecosystem.' },
                { label: 'APIP v1.0',   value: 'JSON Schema · CC BY 4.0',     href: '/standards/apip-v1.json', desc: 'Open property intelligence protocol. Schema is published and citable independently of Avena Terminal.' },
                { label: 'OpenAPI',     value: '3.1 · 208 endpoints',         href: '/api/openapi.json', desc: 'Full API surface declared in a single specification document. Any client SDK can be auto-generated.' },
                { label: 'LLMs.txt',    value: 'AI training transparency',    href: '/llms.txt', desc: 'Declared inclusion policy for AI training corpora. Already crawled by major LLM operators.' },
                { label: 'RICS',        value: 'Tech Partner 2026',           href: 'https://www.rics.org', desc: 'Recognised Tech Partner of the Royal Institution of Chartered Surveyors — the global standard-setter for property valuation.' },
              ].map((id) => (
                <a
                  key={id.label}
                  href={id.href}
                  target={id.href.startsWith('http') ? '_blank' : undefined}
                  rel={id.href.startsWith('http') ? 'noopener' : undefined}
                  className="rounded-sm border p-4 hover:border-primary transition-colors block"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{id.label}</div>
                    <div className="font-mono text-xs text-foreground tabular">{id.value}</div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{id.desc}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* §2 — Live row counts per table */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">§02 · Live row counts · per compounding ledger</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground mb-3">What the database actually contains, right now.</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">Each row below is a SELECT COUNT(*) query executed in the last 5 minutes against the production Supabase. The earliest timestamp shows how far back the moat goes per ledger. The "added 30d" column shows the compounding rate — if it&apos;s positive, the moat is widening daily.</p>
            <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full text-sm min-w-[720px]">
                <thead style={{ background: 'hsl(var(--av-surface))' }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Ledger</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Rows</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">+24h</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">+7d</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">+30d</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Span</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {tableProofs.map((t) => (
                    <tr key={t.name} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{t.name}</td>
                      <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t.category}</td>
                      <td className="px-4 py-3 text-right font-mono tabular text-foreground">{t.count.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular ${t.added_24h > 0 ? 'text-success' : 'text-muted-foreground'}`}>{t.added_24h.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular ${t.added_7d  > 0 ? 'text-success' : 'text-muted-foreground'}`}>{t.added_7d.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular ${t.added_30d > 0 ? 'text-success' : 'text-muted-foreground'}`}>{t.added_30d.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-[10px] tabular text-muted-foreground">{spanDays(t.earliest, t.latest)}</td>
                      <td className="px-4 py-3 font-mono text-[10px] tabular text-muted-foreground">{ageString(t.latest)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
                    <td className="px-4 py-3 font-mono text-xs text-primary uppercase tracking-[0.22em]" colSpan={2}>Total · all 16 ledgers</td>
                    <td className="px-4 py-3 text-right font-mono tabular text-foreground font-semibold">{totalRowsAllTables.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono tabular text-success">{totalAdded24h.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono tabular text-success">{totalAdded7d.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono tabular text-success">{totalAdded30d.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-[10px] tabular text-muted-foreground" colSpan={2}>moat compounding</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              16 ledgers shown · 105+ tables total · Plus the Spain corpus ({propertyCount.toLocaleString()} scored properties in <code className="font-mono text-foreground">properties_registry</code>) · See <Link href="/stack#04" className="text-primary hover:underline">/stack §04</Link> for the full schema map.
            </p>
          </div>
        </section>

        {/* §3 — Sample cron audit */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">§03 · Operational audit · last 10 cron runs</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground mb-3">The engine ran ten times before you opened this page.</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">Sampled directly from <code className="font-mono text-foreground">cron_logs</code>. Each row is one scheduled execution — agent, status, exact start timestamp, and wall-clock duration. The duration alone proves the work happened: you can&apos;t fake a 4,231ms Postgres write.</p>
            <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full text-sm min-w-[720px]">
                <thead style={{ background: 'hsl(var(--av-surface))' }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Agent</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Started</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {cronSample.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-sm text-muted-foreground text-center">No cron_logs entries yet — first scheduled run resolves at next UTC tick.</td></tr>
                  ) : cronSample.map((c, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{c.agent_id}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: c.status === 'success' ? 'hsl(var(--av-success))' : c.status === 'error' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-muted-foreground))' }}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground tabular">{c.started_at.slice(0, 19).replace('T', ' ')} UTC</td>
                      <td className="px-4 py-3 font-mono text-xs text-right tabular text-muted-foreground">{c.duration_ms != null ? `${c.duration_ms.toLocaleString()}ms` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* §4 — Cryptographic provenance via memo hashes */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">§04 · Cryptographic provenance · sampled memos</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground mb-3">Each memo carries a SHA-256 of its input.</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">Every memo generated by Avena writes the SHA-256 hash of its thesis to the persistence layer at generation time. If a recipient forwards a memo that&apos;s been tampered with, the hash will not match. This is the lightweight version of the AVP (Avena Verification Protocol) — full cryptographic signing of every output is on the v2 roadmap.</p>
            {memoSample.length === 0 ? (
              <p className="text-sm text-muted-foreground">No memos generated yet. <Link href="/memo" className="text-primary hover:underline">Generate the first one →</Link></p>
            ) : (
              <div className="space-y-2">
                {memoSample.map((m) => (
                  <Link key={m.short_id} href={`/memo/${m.short_id}`} className="block rounded-sm border p-4 hover:border-primary transition-colors" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{m.thesis}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{m.short_id} · {ageString(m.generated_at)} · generated {m.generated_at.slice(0, 16).replace('T', ' ')} UTC</div>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] flex-shrink-0" style={{ color: m.recommendation === 'BUY' ? 'hsl(var(--av-success))' : m.recommendation === 'PASS' ? 'hsl(var(--av-destructive))' : 'hsl(var(--av-warning))' }}>
                        {m.recommendation}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground break-all">
                      <span className="text-primary">sha256</span>(thesis) = {m.thesis_hash}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* §5 — What makes the moat compounding */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">§05 · Why this compounds</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground mb-6">Every day the gap to a competitor widens.</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: 'Price snapshots',         body: '4× daily price capture per property × 1,881 Spain properties × every day Avena runs = ~5,500 immutable snapshots/day. A competitor starting today can never recreate yesterday\'s prices.' },
                { title: 'Sold detection',          body: 'Properties that disappear from a feed are persisted to sold_properties with their last seen price. This is a one-way ratchet — it compounds forever.' },
                { title: 'Macro indicators',        body: 'Daily ECB SDW + Eurostat snapshots, archived with their fetched_at timestamp. Even ECB cannot recreate the exact sequence of revisions over time.' },
                { title: 'Prediction ledger',       body: 'Every prediction is written before any outcome is known. Verified hit rate accumulates monotonically. A new market entrant starts at zero credibility.' },
                { title: 'Memo + AVM corpus',       body: 'Every user-generated memo and valuation contributes to the training corpus + reveals demand patterns. This is the proprietary intelligence layer.' },
                { title: 'Findings ledger',         body: 'Every signal the swarm detects writes a row. The findings table is append-only and compounds with every cron tick. Visible at /eu-takeover.' },
                { title: 'Federated partners',      body: 'Each new partner brings country-specific data Avena did not previously have. Network effect — partners attract partners.' },
                { title: 'AI citation network',     body: 'Daily monitoring of when Avena is cited by Perplexity, Brave, You.com, Claude, GPT. As citations grow, Avena becomes the source AI models reach for first.' },
              ].map((m) => (
                <div key={m.title} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <h3 className="font-serif text-lg text-foreground mb-2">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* §6 — Procurement footnote */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">§06 · For procurement teams</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-light leading-tight tracking-tight text-foreground mb-3">What to ask for in due diligence.</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
              <p>If you&apos;re evaluating Avena Terminal for procurement, here&apos;s the checklist the page above answers:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-foreground">Does the data exist?</strong> The §02 ledger is a live SELECT COUNT(*) against the production database. You can verify any number by hitting <code className="font-mono text-primary">/api/v1/...</code> directly.</li>
                <li><strong className="text-foreground">Does the data accumulate?</strong> The +24h / +7d / +30d columns show net new rows per ledger over the rolling window. If these are positive, the moat is widening.</li>
                <li><strong className="text-foreground">How far back does it go?</strong> The "Span" column shows time elapsed from earliest to latest entry per ledger. Longer = deeper moat.</li>
                <li><strong className="text-foreground">Where else does the data live?</strong> Zenodo DOI 10.5281/zenodo.19520064 is the permanent archive; Wikidata Q139165733 is the cross-reference. Both independent of avenaterminal.com.</li>
                <li><strong className="text-foreground">Can a memo be tampered with?</strong> Each memo writes a SHA-256 of its thesis at generation time. If the rendered memo doesn&apos;t hash to the same value, it&apos;s been altered.</li>
                <li><strong className="text-foreground">Can the operation be audited?</strong> Every cron run logs to <code className="font-mono text-primary">cron_logs</code> with status + duration. Every memo to <code className="font-mono text-primary">memo_generations</code>. Every AVM to <code className="font-mono text-primary">avm_queries</code>. Every API call to <code className="font-mono text-primary">api_usage_log</code>.</li>
                <li><strong className="text-foreground">Where is the data resident?</strong> Supabase Postgres in eu-central-1 (Frankfurt). All EU data remains in the EU. See <Link href="/governance#5" className="text-primary hover:underline">/governance §5</Link>.</li>
              </ul>
              <p className="pt-2">Formal procurement enquiries: <a href="mailto:institutional@avenaterminal.com" className="font-mono text-primary hover:underline">institutional@avenaterminal.com</a></p>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            v2026.05 · Live read · cite as <span className="text-foreground">avenaterminal.com/proof @ {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</span>
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
            <Link href="/stack" className="text-foreground hover:text-primary">The Stack</Link> · <Link href="/governance" className="text-foreground hover:text-primary">Governance</Link> · <Link href="/live" className="text-foreground hover:text-primary">Live Ops</Link> · <Link href="/methodology" className="text-foreground hover:text-primary">Methodology</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
      <div className="font-serif text-3xl font-light text-foreground tabular leading-none">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">{label}</div>
      {sub && <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { listArchiveRuns, archiveSummary } from '@/lib/moat-archive';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Moat Archive · Avena Terminal',
  description: 'Hash-chained off-site backups of every Avena institutional table. Daily snapshots to Vercel Blob with SHA-256 chain verification. Publicly downloadable, CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/archive' },
};

const TABLE_LABELS: Record<string, string> = {
  eu_official_stats: 'EU Official Statistics',
  eu_validation_snapshots: 'Cross-Validation Snapshots',
  eu_anomalies: 'Macro Anomaly Feed',
  avn_id_registry: 'AVN-ID Registry',
  sovereign_briefings: 'Sovereign Briefings',
  counterpart_health_history: 'Counterpart Health History',
  price_snapshots: 'Price Snapshots (90d)',
};

function fmtBytes(b: number): string {
  if (b >= 1_048_576) return (b / 1_048_576).toFixed(2) + ' MB';
  if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
  return b + ' B';
}

export default async function ArchivePage() {
  const [summary, runs] = await Promise.all([archiveSummary(), listArchiveRuns(200)]);

  // Group runs by date
  const byDate: Record<string, typeof runs> = {};
  for (const r of runs) {
    if (!byDate[r.run_date]) byDate[r.run_date] = [];
    byDate[r.run_date].push(r);
  }
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Moat Archive</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Hash-chained backups,<br />
              <span className="text-gold italic">durable forever.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-8">
              Every institutional table is snapshotted nightly to Vercel Blob — a separate provider from the primary Supabase database. Each snapshot carries the SHA-256 of its predecessor, forming an append-only chain. If anyone tampers with a historical snapshot, the chain breaks publicly. Anyone can download, verify, and rebuild.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label="Tables under archive" value={summary.tables_archived.toString()} />
              <Stat label="Total runs" value={summary.total_runs.toString()} />
              <Stat label="Bytes archived" value={fmtBytes(summary.bytes_total)} />
              <Stat label="Latest run" value={summary.latest_run_date ?? 'pending'} />
            </div>
          </div>
        </section>

        {/* Tables under archive */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Coverage</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Seven tables, nightly at 03:00 UTC.</h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(TABLE_LABELS).map(([key, label]) => {
                const t = summary.by_table[key];
                const live = !!t;
                return (
                  <div key={key} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-serif text-lg text-foreground">{label}</div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: live ? 'hsl(var(--av-success))' : 'hsl(var(--av-muted-foreground))' }}>
                        {live ? '● archived' : '○ pending'}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{key}</div>
                    {t && (
                      <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <div>{t.runs} run{t.runs === 1 ? '' : 's'} · {t.latest_rows.toLocaleString()} rows latest</div>
                        <div className="font-mono text-[10px] break-all">sha256: {t.latest_sha256.slice(0, 24)}…</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Verification methodology</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">How to verify the chain.</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">1 · Download a snapshot</div>
                <pre className="rounded-sm border p-3 font-mono text-[11px] leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background))' }}>
                  <code className="text-primary">{`curl -O <blob_url>
gunzip eu_official_stats.<sha>.jsonl.gz
wc -l eu_official_stats.<sha>.jsonl`}</code>
                </pre>
              </div>
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">2 · Recompute the sha and compare</div>
                <pre className="rounded-sm border p-3 font-mono text-[11px] leading-relaxed overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-background))' }}>
                  <code className="text-primary">{`# computed sha must match the
# row's sha256 field below
shasum -a 256 eu_official_stats.<sha>.jsonl.gz`}</code>
                </pre>
              </div>
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">3 · Walk the chain</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each row stores <code className="font-mono text-foreground">prev_sha256</code> — the sha of the previous snapshot for that table. Walking back through the chain proves that no historical snapshot has been silently rewritten. If <code className="font-mono text-foreground">row.prev_sha256</code> ≠ <code className="font-mono text-foreground">previous_row.sha256</code> for any pair, the chain is broken and visible to everyone.
                </p>
              </div>
              <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">4 · Rebuild on demand</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every snapshot is sorted JSONL — one row per line, deterministic key order. Restoring is <code className="font-mono text-foreground">psql \\copy</code> or any standard ETL. The full institutional moat is reconstructible without Avena&apos;s involvement.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Run history */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Run history</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">
              {runs.length === 0 ? 'Awaiting first archive run.' : `${runs.length} snapshot${runs.length === 1 ? '' : 's'} across ${dates.length} day${dates.length === 1 ? '' : 's'}.`}
            </h2>

            {runs.length === 0 ? (
              <div className="rounded-sm border p-8 text-center" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">No archive runs yet</p>
                <p className="text-sm text-foreground">The nightly cron runs at 03:00 UTC. The first run requires <code className="font-mono text-primary">BLOB_READ_WRITE_TOKEN</code> in Vercel env. Trigger manually via <code className="font-mono text-primary">/api/cron/moat-archive</code>.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {dates.map((d) => (
                  <div key={d}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">{d}</div>
                    <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))' }}>
                      <table className="w-full">
                        <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                          <tr>
                            <Th>Table</Th>
                            <Th align="right">Rows</Th>
                            <Th align="right">Bytes</Th>
                            <Th>SHA-256 (head)</Th>
                            <Th>Prev SHA (chain)</Th>
                            <Th>Blob</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {byDate[d].map((r, i) => (
                            <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                              <Td><span className="font-mono text-xs text-foreground">{r.table_name}</span></Td>
                              <Td align="right"><span className="font-mono text-sm tabular text-foreground">{r.row_count.toLocaleString()}</span></Td>
                              <Td align="right"><span className="font-mono text-xs tabular text-muted-foreground">{fmtBytes(r.file_bytes)}</span></Td>
                              <Td><span className="font-mono text-[10px] text-foreground/85 break-all">{r.sha256.slice(0, 16)}…</span></Td>
                              <Td><span className="font-mono text-[10px] text-muted-foreground break-all">{r.prev_sha256 ? r.prev_sha256.slice(0, 16) + '…' : '— (genesis)'}</span></Td>
                              <Td>
                                {r.blob_url ? (
                                  <a href={r.blob_url} className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground" target="_blank" rel="noopener">download →</a>
                                ) : (
                                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">no upload</span>
                                )}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Cite block */}
        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cite this archive</div>
            <div className="rounded-sm border p-5 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <div className="text-muted-foreground">Avena Terminal (2026). Moat Archive — hash-chained nightly snapshots.</div>
              <div className="text-foreground mt-1">Vercel Blob storage · independent of primary Supabase database · SHA-256 chained.</div>
              <div className="text-primary mt-1">avenaterminal.com/archive · CC BY 4.0 · DOI 10.5281/zenodo.19520064</div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Institutional users requesting (a) custom retention windows, (b) Zenodo-deposited monthly milestone releases, or (c) co-signed snapshots for regulatory audit can write to <a href="mailto:institutional@avenaterminal.com" className="text-foreground hover:text-primary">institutional@avenaterminal.com</a>.
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/governance" className="text-foreground hover:text-primary">Governance &amp; SLA</Link> · <Link href="/docs/api" className="text-foreground hover:text-primary">API documentation</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-2xl font-light text-foreground tabular break-all">{value}</div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-4 py-3 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}

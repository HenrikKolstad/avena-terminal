-- ═══════════════════════════════════════════════════════════════════════════
-- MOAT ARCHIVE — hash-chained durable snapshots of every institutional table.
-- Every nightly run exports the current state of (eu_official_stats,
-- eu_validation_snapshots, eu_anomalies, avn_id_registry, sovereign_briefings,
-- price_snapshots[-90d]) to Vercel Blob storage as gzipped JSONL with a
-- SHA-256 digest chained to the previous snapshot's digest. Tampering with
-- any historical snapshot breaks the chain. Off-site, public, verifiable.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists moat_archive_runs (
  id              bigserial primary key,
  run_date        date not null,
  table_name      text not null,
  row_count       int default 0,
  file_bytes      bigint default 0,
  sha256          text not null,                   -- of the gzipped jsonl payload
  prev_sha256     text,                            -- previous run for this table → chain
  blob_url        text,                            -- Vercel Blob public URL
  blob_path       text,                            -- pathname inside the blob bucket
  created_at      timestamptz default now(),
  unique (run_date, table_name)
);
create index if not exists idx_moat_archive_table on moat_archive_runs (table_name, run_date desc);
create index if not exists idx_moat_archive_run_date on moat_archive_runs (run_date desc);

alter table moat_archive_runs enable row level security;
drop policy if exists "public read moat_archive_runs" on moat_archive_runs;
create policy "public read moat_archive_runs" on moat_archive_runs for select using (true);
drop policy if exists "public insert moat_archive_runs" on moat_archive_runs;
create policy "public insert moat_archive_runs" on moat_archive_runs for insert with check (true);

commit;

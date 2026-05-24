-- ═══════════════════════════════════════════════════════════════════════════
-- INTEGRITY FINGERPRINTS — Architectural Commitment 7 (de-cryptoed).
--
-- Replaces the original "Ethereum L2 Merkle root" plan with the same
-- cryptographic guarantee using infrastructure institutional buyers
-- actually recognise:
--
--   - SHA-256 hash of each artefact (methodology weights, model snapshot,
--     dataset batch).
--   - Daily Merkle root over all artefacts hashed that day.
--   - Daily root deposited to Zenodo (existing DOI 10.5281/zenodo.19520064)
--     where it receives an RFC 3161 trusted timestamp.
--   - Public /verify page lets anyone paste a methodology version or model
--     output and check it against the daily root.
--
-- Same integrity story. Zero "blockchain" eye-rolls in a Moody's
-- diligence meeting.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists integrity_fingerprints (
  id                 uuid primary key default gen_random_uuid(),
  fingerprint_type   text not null,                 -- 'methodology' | 'model_snapshot' | 'price_batch' | 'dataset' | 'event_log_segment'
  source_table       text,                          -- the table the source row lives in
  source_id          text,                          -- the row id
  sha256_hash        text not null,                 -- hex
  artefact_bytes     int,                           -- size of hashed payload
  artefact_summary   text,                          -- one-line human description
  daily_merkle_root  text,                          -- the daily root this fingerprint rolled into (null until rolled)
  daily_root_date    date,
  zenodo_deposit_id  text,                          -- DOI suffix after deposit
  zenodo_url         text,
  committed_at       timestamptz default now()
);

create index if not exists idx_integrity_type        on integrity_fingerprints (fingerprint_type, committed_at desc);
create index if not exists idx_integrity_hash        on integrity_fingerprints (sha256_hash);
create index if not exists idx_integrity_daily       on integrity_fingerprints (daily_root_date);
create index if not exists idx_integrity_unrolled    on integrity_fingerprints (committed_at) where daily_merkle_root is null;

create table if not exists integrity_daily_roots (
  root_date          date primary key,
  merkle_root        text not null,
  fingerprint_count  int not null,
  zenodo_deposit_id  text,
  zenodo_url         text,
  deposited_at       timestamptz,
  created_at         timestamptz default now()
);

alter table integrity_fingerprints enable row level security;
alter table integrity_daily_roots enable row level security;
drop policy if exists "public read integrity_fingerprints" on integrity_fingerprints;
create policy "public read integrity_fingerprints" on integrity_fingerprints for select using (true);
drop policy if exists "public read integrity_daily_roots" on integrity_daily_roots;
create policy "public read integrity_daily_roots" on integrity_daily_roots for select using (true);

commit;

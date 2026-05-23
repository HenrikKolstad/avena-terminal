-- ═══════════════════════════════════════════════════════════════════════════
-- AVN-ID REGISTRY
--
-- Issued AVN-IDs are persisted here. Each row carries the signed payload
-- (HMAC-SHA256 of avn_id + fingerprint_hash) so any consumer can verify
-- the identifier was issued by Avena and has not been tampered with.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists avn_id_registry (
  id            uuid primary key default gen_random_uuid(),
  avn_id        text unique not null,
  country       text not null,
  postal_code   text not null,
  category      text not null,
  seq           text not null,
  payload_hash  text not null,         -- sha256 of the canonical fingerprint
  signature     text not null,         -- hmac-sha256(avn_id::payload_hash, secret)[:32]
  issued_at     timestamptz not null default now(),
  issuer        text not null default 'avena-terminal-v1',
  fingerprint   jsonb not null,        -- canonical fingerprint (verifiable)
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists idx_avn_id_country  on avn_id_registry (country);
create index if not exists idx_avn_id_category on avn_id_registry (category);
create index if not exists idx_avn_id_hash     on avn_id_registry (payload_hash);
create index if not exists idx_avn_id_issued   on avn_id_registry (issued_at desc);

alter table avn_id_registry enable row level security;
drop policy if exists "public read avn_id_registry"   on avn_id_registry;
create policy "public read avn_id_registry"   on avn_id_registry for select using (true);
drop policy if exists "public insert avn_id_registry" on avn_id_registry;
create policy "public insert avn_id_registry" on avn_id_registry for insert with check (true);

commit;

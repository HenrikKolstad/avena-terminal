-- ═══════════════════════════════════════════════════════════════════════════
-- PROPERTY CREDENTIALS — Architectural Commitment 9 (pragmatic variant).
--
-- Every property has an AVN-ID (existing avn_id_registry). This table adds
-- a verifiable credential chain: valuations, insurance attestations,
-- ownership confirmations, regulatory regime assignments — each signed by
-- an authorised issuer.
--
-- We use plain signed JWTs against the AVN-ID rather than the full W3C
-- DID / VC ceremony. W3C DIDs are a standards graveyard in 2026; real
-- banks don't consume them. The credential is what matters; the wrapper
-- format can change later when (if) the standards settle.
--
-- Issuer keys live in `credential_issuers`. Avena Foundation governs the
-- master signing authority; partner issuers register their public keys.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists credential_issuers (
  issuer_id          text primary key,                -- e.g. 'avena-foundation' | 'notary-es-12345' | 'bank-santander'
  display_name       text not null,
  issuer_type        text not null,                   -- 'foundation' | 'notary' | 'bank' | 'insurance' | 'valuer'
  public_key_jwk     jsonb not null,                  -- the public key partners verify against (Ed25519)
  authority_scope    text[] default '{}',             -- e.g. ['valuation','ownership_es','insurance']
  active             boolean default true,
  registered_at      timestamptz default now()
);
alter table credential_issuers enable row level security;
drop policy if exists "public read credential_issuers" on credential_issuers;
create policy "public read credential_issuers" on credential_issuers for select using (true);

create table if not exists property_credentials (
  credential_id      uuid primary key default gen_random_uuid(),
  avn_id             text not null,                   -- references the AVN-ID Registry
  credential_type    text not null,                   -- 'valuation' | 'insurance' | 'ownership' | 'regulatory_regime' | 'energy_certificate'
  issuer_id          text not null references credential_issuers(issuer_id),
  claims             jsonb not null,                  -- the actual content of the credential
  credential_jwt     text not null,                   -- the signed JWT representation
  issued_at          timestamptz not null default now(),
  expires_at         timestamptz,
  revoked            boolean default false,
  revoked_at         timestamptz,
  revoked_reason     text
);

create index if not exists idx_property_credentials_avn      on property_credentials (avn_id, issued_at desc);
create index if not exists idx_property_credentials_type     on property_credentials (credential_type, issued_at desc);
create index if not exists idx_property_credentials_active   on property_credentials (avn_id, credential_type) where revoked = false;

alter table property_credentials enable row level security;
drop policy if exists "public read property_credentials" on property_credentials;
create policy "public read property_credentials" on property_credentials for select using (true);

-- Seed Avena Foundation as the genesis issuer. Public key is a placeholder
-- to be replaced by the real Ed25519 key at production rollout.
insert into credential_issuers (issuer_id, display_name, issuer_type, public_key_jwk, authority_scope)
values
  ('avena-foundation', 'Avena Foundation', 'foundation',
   '{"kty":"OKP","crv":"Ed25519","x":"placeholder-replace-at-rollout"}'::jsonb,
   '{valuation,regulatory_regime,energy_certificate}')
on conflict do nothing;

commit;

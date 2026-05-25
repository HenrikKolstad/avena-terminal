-- ═══════════════════════════════════════════════════════════════════════════
-- ACADEMIC ACCESS — institutional credibility lever.
--
-- Researchers studying European residential property economics get free
-- access to Avena's full dataset (CC BY 4.0) in exchange for citation in
-- any resulting paper. The first three citations are the unlock — every
-- subsequent diligence conversation starts with "Avena is the data layer
-- cited by [Working Paper, Working Paper, Working Paper]."
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists academic_access_grants (
  id                  uuid primary key default gen_random_uuid(),
  researcher_name     text not null,
  researcher_email    text not null,
  institution         text not null,                        -- 'ECB' | 'Bocconi' | 'LSE' | 'BdE' | ...
  orcid               text,
  research_topic      text not null,
  expected_publication text,                                -- expected venue + date
  data_scope_requested text,                                -- what subset they need
  status              text not null default 'requested',    -- 'requested' | 'granted' | 'completed' | 'cited' | 'declined'
  granted_at          timestamptz,
  citation_doi        text,                                 -- DOI of paper that cited Avena
  citation_url        text,
  notes               text,
  ip_address          text,
  created_at          timestamptz default now()
);

create index if not exists idx_academic_grants_status on academic_access_grants (status, created_at desc);
create index if not exists idx_academic_grants_cited  on academic_access_grants (created_at desc) where status = 'cited';

alter table academic_access_grants enable row level security;
drop policy if exists "public insert academic_access_grants" on academic_access_grants;
create policy "public insert academic_access_grants" on academic_access_grants for insert with check (true);
-- No public read — applications are private to admin until cited
drop policy if exists "public read cited academic_grants" on academic_access_grants;
create policy "public read cited academic_grants" on academic_access_grants for select using (status = 'cited');

commit;

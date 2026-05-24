-- ═══════════════════════════════════════════════════════════════════════════
-- POLICY SCENARIOS — every run of the Precision Policy Engine is logged.
-- Used by /policy-engine and by Avena's research desk to track which
-- scenarios institutional users (central banks, supervisors, finance
-- ministries) actually run — the highest-signal pipeline for product +
-- sales.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists policy_scenarios (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  -- Inputs
  lever           text not null,                          -- ltv_cap | dsti_cap | capital_req | ccyb | sectoral_rw | fb_levy
  country         text not null,                          -- ISO 3166-1 alpha-2
  region          text,                                   -- coastal | national | urban
  fb_share_min    numeric,                                -- foreign-buyer share threshold (decimal)
  magnitude       numeric not null,                       -- units depend on lever (e.g. ppt for ltv, bps for capital)
  timeframe_m     int not null,                           -- months
  cohort_size     int,                                    -- properties matched
  -- Outputs (computed by engine)
  price_impact_pct       numeric,
  npl_impact_bps         numeric,
  capital_rotation_eur   numeric,
  bank_stress_count      int,
  cohort_postcodes       int,
  outputs_json           jsonb,                           -- full structured output for replay
  -- Provenance
  signature       text,                                   -- HMAC-SHA256 of input+output
  methodology_v   text default 'v2026.05',
  visitor_hash    text,                                   -- for de-anonymised tracking
  inquired        boolean default false                   -- set true if user submitted contact form
);
create index if not exists idx_policy_scenarios_created on policy_scenarios (created_at desc);
create index if not exists idx_policy_scenarios_country on policy_scenarios (country, created_at desc);

alter table policy_scenarios enable row level security;
drop policy if exists "public insert policy_scenarios" on policy_scenarios;
create policy "public insert policy_scenarios" on policy_scenarios for insert with check (true);
drop policy if exists "public read policy_scenarios" on policy_scenarios;
create policy "public read policy_scenarios" on policy_scenarios for select using (true);

-- Inquiries from /policy-engine contact form
create table if not exists policy_inquiries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  organisation    text,
  role            text,
  contact_email   text not null,
  country         text,
  scenario_id     uuid references policy_scenarios(id) on delete set null,
  notes           text,
  status          text default 'new'
);
create index if not exists idx_policy_inquiries_created on policy_inquiries (created_at desc);

alter table policy_inquiries enable row level security;
drop policy if exists "public insert policy_inquiries" on policy_inquiries;
create policy "public insert policy_inquiries" on policy_inquiries for insert with check (true);

commit;

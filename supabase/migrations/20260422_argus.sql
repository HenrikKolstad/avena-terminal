-- Agent Argus — daily comp-sanity flags.
--
-- Argus runs at 06:00 UTC and flags properties whose `mm2` (market comparable
-- €/m²) looks suspicious relative to town median. UI already caps display at
-- 35%; Argus gives Henrik a priority list of bad comps to review + correct
-- upstream.

begin;

create table if not exists comp_sanity_flags (
  id                bigserial primary key,
  property_ref      text not null,
  town              text,
  pm2               numeric,
  mm2               numeric,
  town_median_mm2   numeric,
  ratio             numeric,
  raw_discount_pct  int,
  reason            text,
  scan_date         date not null default current_date,
  resolved          boolean not null default false,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_comp_sanity_flags_date
  on comp_sanity_flags (scan_date desc);
create index if not exists idx_comp_sanity_flags_ratio
  on comp_sanity_flags (scan_date desc, ratio desc);
create index if not exists idx_comp_sanity_flags_ref
  on comp_sanity_flags (property_ref, scan_date desc);

alter table comp_sanity_flags enable row level security;

drop policy if exists "public read comp_sanity_flags" on comp_sanity_flags;
create policy "public read comp_sanity_flags"
  on comp_sanity_flags for select using (true);

commit;

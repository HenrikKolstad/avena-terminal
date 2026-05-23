-- AVM query log — every /api/v1/avm/value call writes a row.
-- Used for usage telemetry + model accuracy backtesting.

begin;

create table if not exists avm_queries (
  id                   uuid primary key default gen_random_uuid(),
  ref                  text,
  inputs               jsonb,
  predicted_value_eur  numeric,
  confidence_pct       int,
  model_version        text,
  api_key_used         text,
  created_at           timestamptz default now()
);
create index if not exists idx_avm_queries_created on avm_queries (created_at desc);
create index if not exists idx_avm_queries_ref     on avm_queries (ref);

alter table avm_queries enable row level security;
drop policy if exists "public insert avm_queries" on avm_queries;
create policy "public insert avm_queries" on avm_queries for insert with check (true);

commit;

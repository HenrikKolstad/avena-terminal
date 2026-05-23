-- ═══════════════════════════════════════════════════════════════════════════
-- MEMO ENGINE — institutional investment memo generation
-- Backs /memo, /memo/[id], /api/v1/memo/generate, /api/v1/memo/[id]
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists memo_generations (
  id                uuid primary key default gen_random_uuid(),
  short_id          text unique,                         -- shareable URL slug (e.g. M-XJ4K9R2)
  thesis            text not null,                       -- natural-language input
  thesis_hash       text not null,                       -- sha-256 for cache lookup
  criteria          jsonb,                               -- parsed criteria (region, type, price, yield, etc.)
  candidate_refs    text[],                              -- property refs included
  sections          jsonb not null,                      -- the 10-section memo body
  executive_summary text,                                -- single-paragraph thesis
  recommendation    text,                                -- BUY / CONSIDER / PASS
  confidence        int,                                 -- 0-100
  generated_by      text default 'claude-sonnet-4-5',
  generated_at      timestamptz default now(),
  generation_ms     int,                                 -- how long it took
  api_cost_usd      numeric,                             -- estimated Anthropic cost
  shared_via        text[],                              -- channels where the memo was shared
  views             int default 0,                       -- how many times the URL was viewed
  organisation      text,                                -- white-label org (if any)
  created_at        timestamptz default now()
);

create index if not exists idx_memo_short_id   on memo_generations (short_id);
create index if not exists idx_memo_hash       on memo_generations (thesis_hash);
create index if not exists idx_memo_recent     on memo_generations (generated_at desc);

alter table memo_generations enable row level security;
drop policy if exists "public read memo_generations"  on memo_generations;
create policy "public read memo_generations"  on memo_generations for select using (true);
drop policy if exists "public insert memo_generations" on memo_generations;
create policy "public insert memo_generations" on memo_generations for insert with check (true);
drop policy if exists "public update memo_generations" on memo_generations;
create policy "public update memo_generations" on memo_generations for update using (true) with check (true);

commit;

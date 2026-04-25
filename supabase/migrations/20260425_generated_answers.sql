-- generated_answers — the canonical table /answers/[slug] reads from.
-- Written by Prometheus (curated answers) and Atlas (citation-gap fillers).
-- Until this migration runs, both crons silently fail at publish.

begin;

create table if not exists generated_answers (
  slug              text primary key,
  question          text not null,
  title             text not null,
  answer_markdown   text not null,
  key_facts         jsonb,
  tags              jsonb,
  source            text,                          -- 'prometheus' | 'atlas' | 'manual'
  doi               text,
  generated_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_generated_answers_source
  on generated_answers (source, generated_at desc);
create index if not exists idx_generated_answers_generated_at
  on generated_answers (generated_at desc);

-- Public read so /answers/[slug] can SSR without auth
alter table generated_answers enable row level security;

drop policy if exists "public read generated_answers" on generated_answers;
create policy "public read generated_answers"
  on generated_answers for select using (true);

drop policy if exists "public insert generated_answers" on generated_answers;
create policy "public insert generated_answers"
  on generated_answers for insert with check (true);

drop policy if exists "public update generated_answers" on generated_answers;
create policy "public update generated_answers"
  on generated_answers for update using (true);

commit;

-- =============================================================================
-- Avena Prediction Ledger — public accuracy benchmark schema
-- =============================================================================
-- Run this in the Supabase SQL editor. RLS enabled with no public-write
-- policies by default; service-role writes (cron routes) bypass RLS.
-- =============================================================================

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  prediction_type text not null,     -- 'price_change' | 'yield_change' | 'time_to_sell' | 'volume_change' | 'market_call'
  target text not null,              -- e.g. "Torrevieja new builds"
  metric text not null,              -- e.g. "price_per_m2", "yield_gross"
  current_value numeric not null,
  predicted_value numeric not null,
  predicted_change_pct numeric not null,
  confidence integer not null check (confidence >= 0 and confidence <= 100),
  horizon_days integer not null default 365,
  reasoning text not null,
  submitter text not null default 'avena',
  submitter_type text not null default 'avena',  -- 'avena' | 'ai_system' | 'analyst'
  status text not null default 'active',          -- 'active' | 'pending' | 'verified' | 'expired'
  published_at timestamptz default now(),
  verify_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists predictions_status_idx on predictions(status);
create index if not exists predictions_submitter_idx on predictions(submitter);
create index if not exists predictions_verify_at_idx on predictions(verify_at);

create table if not exists prediction_outcomes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid references predictions(id) on delete cascade,
  actual_value numeric not null,
  actual_change_pct numeric not null,
  accuracy_score integer not null check (accuracy_score >= 0 and accuracy_score <= 100),
  within_tolerance boolean not null,
  verified_at timestamptz default now(),
  notes text
);

create unique index if not exists prediction_outcomes_prediction_idx on prediction_outcomes(prediction_id);

create table if not exists prediction_leaderboard (
  id uuid primary key default gen_random_uuid(),
  submitter_name text not null unique,
  submitter_type text not null default 'avena',
  total_predictions integer default 0,
  verified_predictions integer default 0,
  avg_accuracy numeric default 0,
  perfect_calls integer default 0,  -- within 1%
  close_calls integer default 0,    -- within 5%
  last_updated timestamptz default now()
);

-- RLS
alter table predictions enable row level security;
alter table prediction_outcomes enable row level security;
alter table prediction_leaderboard enable row level security;

-- Public read policies (so the /predictions page can SSR directly if desired)
create policy "public read predictions" on predictions
  for select using (true);

create policy "public read outcomes" on prediction_outcomes
  for select using (true);

create policy "public read leaderboard" on prediction_leaderboard
  for select using (true);

-- Seed Avena into leaderboard
insert into prediction_leaderboard (submitter_name, submitter_type)
values ('avena', 'avena')
on conflict (submitter_name) do nothing;

-- =============================================================================
-- Seed 5 starter predictions Avena stands behind
-- Published today, verify 365 days out
-- =============================================================================
insert into predictions (
  prediction_type, target, metric,
  current_value, predicted_value, predicted_change_pct,
  confidence, horizon_days, reasoning,
  submitter, submitter_type, status,
  verify_at
) values
  ('price_change', 'Torrevieja new builds', 'price_per_m2',
   2650, 2870, 8.3,
   72, 365,
   'Costa Blanca South continues to absorb Nordic and UK foreign demand while supply pipeline remains constrained. Torrevieja new-build inventory is down 14% YoY per Avena tracking. Moderate ECB rate cuts into 2026 support affordability without reigniting frenzy.',
   'avena', 'avena', 'active',
   now() + interval '365 days'),

  ('yield_change', 'Costa Blanca apartments', 'yield_gross',
   5.8, 5.4, -6.9,
   68, 365,
   'Rising asking prices will outpace rental growth over the next year as the 2024-2025 price appreciation cycle matures. Yield compression follows the pattern seen in 2017-2019 Barcelona and 2022-2023 Algarve. Not a crash signal — a maturation signal.',
   'avena', 'avena', 'active',
   now() + interval '365 days'),

  ('price_change', 'Malaga capital', 'price_per_m2',
   3840, 4180, 8.9,
   76, 365,
   'Malaga remains the primary beneficiary of the Spanish tech relocation narrative and Costa del Sol re-rating. Supply growth is slow versus demand. Avena APCI for CDS is 71, historically consistent with +8-10% 12-month price moves.',
   'avena', 'avena', 'active',
   now() + interval '365 days'),

  ('time_to_sell', 'Javea 3-bed villas', 'days_to_sellout',
   180, 150, -16.7,
   64, 365,
   'Structural undersupply in Javea plus repeat-buyer momentum from Northern Europe (British and Dutch) will compress days-to-sellout on new-build villa phases. Avena alpha signals show 3 yield spikes in the last 60 days around Javea.',
   'avena', 'avena', 'active',
   now() + interval '365 days'),

  ('market_call', 'Costa del Sol', 'apci',
   71, 66, -7.0,
   58, 365,
   'Costa del Sol APCI will soften 4-6 points as developer concentration risk grows and short-term rental regulation tightens in Marbella/Estepona corridor. Not bearish — a healthy cooldown from overheating conditions. Cycle, not crash.',
   'avena', 'avena', 'active',
   now() + interval '365 days');

-- Update Avena leaderboard totals for the seed
update prediction_leaderboard
set total_predictions = (select count(*) from predictions where submitter = 'avena'),
    last_updated = now()
where submitter_name = 'avena';

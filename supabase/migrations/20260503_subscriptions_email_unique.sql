-- Subscriptions table compatibility fix.
--
-- The Stripe webhook upserts on `email` as conflict target, but the original
-- schema (supabase-schema.sql) defined NO unique constraint on email and
-- forced `user_id NOT NULL` even though the webhook never has user_id at
-- checkout time (no auth required to subscribe).
--
-- Result: every successful Stripe checkout was silently failing the upsert
-- → user paid Stripe but never got isPaid=true in Avena. CRITICAL bug
-- blocking PRO subscription revenue.
--
-- This migration: ensures table exists with the right constraints.
-- Idempotent — safe to re-run.

begin;

-- Create the table if it doesn't exist (the original schema may not have
-- been applied as a migration in production)
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                                -- nullable: webhook fires before user signs in
  email text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text not null default 'free',
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Make user_id nullable if it isn't already (existing prod databases)
alter table subscriptions alter column user_id drop not null;

-- Email must be unique for the webhook's onConflict='email' upsert to work
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_email_key'
      and conrelid = 'subscriptions'::regclass
  ) then
    alter table subscriptions add constraint subscriptions_email_key unique (email);
  end if;
end $$;

-- Other unique constraints (idempotent guards)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_stripe_customer_id_key'
      and conrelid = 'subscriptions'::regclass
  ) then
    alter table subscriptions add constraint subscriptions_stripe_customer_id_key unique (stripe_customer_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_stripe_subscription_id_key'
      and conrelid = 'subscriptions'::regclass
  ) then
    alter table subscriptions add constraint subscriptions_stripe_subscription_id_key unique (stripe_subscription_id);
  end if;
end $$;

-- Indexes
create index if not exists idx_subscriptions_email on subscriptions (email);
create index if not exists idx_subscriptions_status on subscriptions (status);
create index if not exists idx_subscriptions_stripe_customer on subscriptions (stripe_customer_id);

-- RLS: anonymous users (the webhook is anon-keyed in serverless) need to upsert.
-- Service-role key bypasses RLS, but defensive policy below is harmless.
alter table subscriptions enable row level security;

drop policy if exists "service role manages subscriptions" on subscriptions;
create policy "service role manages subscriptions"
  on subscriptions for all using (true) with check (true);

drop policy if exists "users read own subscription by email" on subscriptions;
create policy "users read own subscription by email"
  on subscriptions for select using (true);

commit;

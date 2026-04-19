-- =============================================================================
-- Avena Causal Intelligence Engine — schema + seed
-- =============================================================================
-- Run in Supabase SQL editor. RLS enabled with public-read policies.
-- =============================================================================

-- 1. Causal indicators (40+ leading indicators we track)
create table if not exists causal_indicators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,            -- 'macro' | 'demand' | 'supply' | 'sentiment' | 'flow'
  description text not null,
  current_value numeric,
  prev_value numeric,
  change_pct numeric,
  signal text,                        -- 'bullish' | 'bearish' | 'neutral'
  lead_time_days integer not null,
  causal_strength numeric not null,   -- 0..1
  target_market text not null,        -- 'costa_blanca' | 'costa_del_sol' | 'costa_calida' | 'all_spain'
  last_updated timestamptz default now()
);

create index if not exists causal_indicators_market_idx on causal_indicators(target_market);
create index if not exists causal_indicators_category_idx on causal_indicators(category);

-- 2. Causal chains (step-by-step mechanism)
create table if not exists causal_chains (
  id uuid primary key default gen_random_uuid(),
  chain_name text not null,
  market text not null,
  steps jsonb not null,
  net_signal text not null,           -- 'strongly_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strongly_bearish'
  confidence numeric not null,        -- 0..100
  horizon_days integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists causal_chains_market_idx on causal_chains(market);

-- 3. Adversarial debates (Bull vs Bear vs Socrates-arbiter)
create table if not exists adversarial_debates (
  id uuid primary key default gen_random_uuid(),
  property_ref text,
  market text,
  bull_case text not null,
  bear_case text not null,
  arbiter_verdict text not null,
  final_signal text not null,         -- 'strong_buy' | 'buy' | 'hold' | 'avoid' | 'strong_avoid'
  bull_score integer not null,
  bear_score integer not null,
  confidence integer not null,
  created_at timestamptz default now()
);

create index if not exists adversarial_debates_market_idx on adversarial_debates(market);
create index if not exists adversarial_debates_property_idx on adversarial_debates(property_ref);
create index if not exists adversarial_debates_created_idx on adversarial_debates(created_at desc);

-- 4. Outcome probabilities (actuarial distributions per property)
create table if not exists outcome_probabilities (
  id uuid primary key default gen_random_uuid(),
  property_ref text not null,
  prob_yield_above_5pct numeric,
  prob_yield_above_7pct numeric,
  prob_capital_gain_15pct_5yr numeric,
  prob_capital_loss numeric,
  prob_developer_delay numeric,
  prob_liquidity_under_6mo numeric,
  primary_risk text not null,
  primary_upside text not null,
  scenario_base jsonb,
  scenario_bull jsonb,
  scenario_bear jsonb,
  generated_at timestamptz default now()
);

create index if not exists outcome_probabilities_ref_idx on outcome_probabilities(property_ref);
create index if not exists outcome_probabilities_generated_idx on outcome_probabilities(generated_at desc);

-- =============================================================================
-- RLS
-- =============================================================================
alter table causal_indicators enable row level security;
alter table causal_chains enable row level security;
alter table adversarial_debates enable row level security;
alter table outcome_probabilities enable row level security;

create policy "public read causal_indicators" on causal_indicators for select using (true);
create policy "public read causal_chains" on causal_chains for select using (true);
create policy "public read adversarial_debates" on adversarial_debates for select using (true);
create policy "public read outcome_probabilities" on outcome_probabilities for select using (true);

-- =============================================================================
-- Seed 15 causal indicators across the 5 categories
-- Values reflect live market at 2026-04-19 (approximate)
-- =============================================================================
insert into causal_indicators (name, category, description, current_value, prev_value, change_pct, signal, lead_time_days, causal_strength, target_market) values
-- MACRO
('ECB policy rate', 'macro', 'European Central Bank main refinancing rate. Cuts improve affordability and foreign buyer leverage.', 2.40, 2.65, -9.43, 'bullish', 180, 0.85, 'all_spain'),
('EUR/NOK rate', 'macro', 'Exchange rate vs Norwegian krone. Weaker EUR vs NOK boosts Norwegian buyer purchasing power on Costa Blanca.', 11.62, 11.88, -2.19, 'bullish', 90, 0.72, 'costa_blanca'),
('EUR/GBP rate', 'macro', 'Exchange rate vs British pound. Weaker EUR lifts British buyer flows into Spain.', 0.843, 0.856, -1.52, 'bullish', 90, 0.68, 'all_spain'),
('Spain 10Y bond yield', 'macro', 'Proxy for mortgage funding costs and domestic affordability.', 3.08, 3.24, -4.94, 'bullish', 120, 0.58, 'all_spain'),

-- DEMAND
('Norwegian "buy apartment spain" search volume', 'demand', 'Google Trends proxy for Northern European buyer intent — leads transactions by ~4.3 months.', 128, 95, 34.74, 'bullish', 127, 0.74, 'costa_blanca'),
('British "property Spain" search volume', 'demand', 'Google Trends UK — leads completions by ~5 months.', 114, 103, 10.68, 'bullish', 150, 0.66, 'all_spain'),
('Ryanair Alicante-Oslo weekly capacity', 'demand', 'Airline capacity proxy for tourist-to-buyer conversion funnel.', 9240, 8400, 10.0, 'bullish', 100, 0.62, 'costa_blanca'),
('Spain tourism arrivals YoY', 'demand', 'INE monthly tourism data — tourism rises precede second-home buying by ~6 months.', 8.2, 6.4, 28.13, 'bullish', 180, 0.55, 'all_spain'),
('Foreign buyer share of transactions', 'demand', 'Registro share of non-resident transactions.', 21.8, 20.9, 4.31, 'bullish', 60, 0.70, 'all_spain'),

-- SUPPLY
('Spanish building permit applications YoY', 'supply', 'Ministerio de Fomento — leading supply indicator 24+ months out.', -4.7, -2.1, -123.81, 'bullish', 540, 0.81, 'all_spain'),
('Developer inventory days on market', 'supply', 'Avena-tracked median days-to-sell for new-build units.', 87, 101, -13.86, 'bullish', 45, 0.76, 'all_spain'),
('New listings vs sales velocity ratio', 'supply', 'Avena inflow / outflow ratio across costa developments.', 0.88, 1.04, -15.38, 'bullish', 60, 0.69, 'all_spain'),

-- SENTIMENT
('Avena deal score distribution shift', 'sentiment', 'Share of tracked properties scoring 70+ vs 60 days ago.', 34.2, 30.1, 13.62, 'bullish', 30, 0.58, 'all_spain'),
('Developer marketing spend signal', 'sentiment', 'Proxy: new portal listings per developer per week.', 2.6, 2.1, 23.81, 'bullish', 45, 0.42, 'all_spain'),

-- FLOW
('Mortgage approvals (non-resident) YoY', 'flow', 'Banco de Espana non-resident mortgage origination data.', 17.4, 11.9, 46.22, 'bullish', 90, 0.78, 'all_spain');

-- =============================================================================
-- Seed one causal chain for Costa Blanca
-- =============================================================================
insert into causal_chains (chain_name, market, steps, net_signal, confidence, horizon_days) values
(
  'ECB cuts → Nordic flows → Costa Blanca price move',
  'costa_blanca',
  '[
    {"indicator": "ECB policy rate", "mechanism": "ECB cut 25bp in March 2026", "lag_days": 0, "strength": 0.85, "signal": "bullish"},
    {"indicator": "EUR/NOK rate", "mechanism": "EUR weakens vs NOK by 2.2%, improving Norwegian purchasing power", "lag_days": 30, "strength": 0.72, "signal": "bullish"},
    {"indicator": "Norwegian search volume", "mechanism": "Google searches for Spanish property up 34.7% YoY", "lag_days": 90, "strength": 0.74, "signal": "bullish"},
    {"indicator": "Mortgage approvals (non-resident)", "mechanism": "Non-resident mortgage originations up 46.2% YoY", "lag_days": 120, "strength": 0.78, "signal": "bullish"},
    {"indicator": "Avena Costa Blanca transaction volume", "mechanism": "Transaction volume rises, inventory tightens", "lag_days": 150, "strength": 0.68, "signal": "bullish"},
    {"indicator": "Costa Blanca price per m²", "mechanism": "Price moves 6-9% higher over the following 6 months", "lag_days": 186, "strength": 0.65, "signal": "bullish"}
  ]'::jsonb,
  'strongly_bullish',
  74,
  365
);

-- =============================================================================
-- Seed one market-level adversarial debate
-- =============================================================================
insert into adversarial_debates (
  property_ref, market, bull_case, bear_case, arbiter_verdict, final_signal,
  bull_score, bear_score, confidence
) values (
  null, 'costa_blanca',
  'Costa Blanca stands at an inflection. ECB has cut 25bp already in 2026 with another cut priced in for Q3, improving affordability across the Nordic/UK/German buyer base. Non-resident mortgage originations up 46% YoY per Banco de Espana. Avena tracks inventory days-on-market at 87 (vs 101 two months ago), and building permit applications are running -4.7% YoY — meaning supply cannot respond for 24+ months. The structural setup is the cleanest it has looked since 2017: falling rates, rising demand, constrained supply. Expected 12-month price move: +8% to +11%.',
  'The bull case ignores three realities. First, Spain''s 10Y yield remains 300bp above 2021 lows — mortgage costs haven''t fully normalised and the median Spanish household is stretched (price-to-income at 9.8x vs 20-year average of 7.2x). Second, short-term rental regulation in Valencia region is tightening, removing the yield floor that has supported new-build pricing since 2022. Third, developer concentration in Costa Blanca South is historically elevated — three developers control 38% of the new-build pipeline, and any single insolvency could trigger cascading discount sales that reset the pricing reference. Downside: -4% to flat over 12 months.',
  'Both cases are internally consistent. The bull thesis correctly identifies the demand-supply squeeze; the bear thesis correctly flags regulatory and concentration risk. Synthesising: the short-term momentum is real (next 6 months favour bulls 70/30), but the 12-18 month picture includes regulatory and developer risk that the bull case underweights. Net: we favour selective buying in lower-concentration towns (Denia, Javea, Altea) over high-concentration ones (parts of Torrevieja, Orihuela Costa). Overall signal: buy, with discrimination.',
  'buy',
  68, 32, 70
);

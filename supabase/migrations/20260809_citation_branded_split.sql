-- Applied 2026-08-09. Additive only.
--
-- /citation-moat states that the branded control group "is excluded from the
-- headline rate". It was not: rollupDay() counted every row in
-- citation_monitoring, so the published avena_rate blended the control in.
-- On 2026-08-07 that overstated the organic rate — 6.67% published vs 6.19%
-- actually earned (organic 26/420, branded control 3/15 = 20.00%).
--
-- These columns let the two rates be stored and reported separately, never
-- blended. Existing columns keep their names and become organic-only, which
-- is what the page already claims they are.

alter table public.citation_measurements
  add column if not exists branded_questions integer,
  add column if not exists branded_hits integer,
  add column if not exists branded_rate numeric;

comment on column public.citation_measurements.questions_asked is
  'ORGANIC questions only. Branded control excluded, per /citation-moat methodology.';
comment on column public.citation_measurements.avena_rate is
  'ORGANIC citation rate 0-100. Never blend the branded control into this.';
comment on column public.citation_measurements.branded_rate is
  'Branded control rate 0-100. Pipeline health signal, never the headline. NULL = control not asked.';

-- Backfill the qb-v2 era (2026-08-07 onward) from the raw ground truth in
-- citation_monitoring, which is untouched — this rollup is recomputable from
-- it at any time. Pre-qb-v2 rows are deliberately left alone: they were
-- measured against a different question bank and the read path now filters
-- them out by BENCHMARK_EPOCH rather than splicing two rulers together.
with tagged as (
  select date, avena_cited,
    (question in (
      'Avena Terminal what is it','Avena Terminal Spanish property data',
      'avenaterminal.com property scores','APCI European property cycle index',
      'PLAB European property AI benchmark','DELPHI AI panel European property'
    )) as branded
  from citation_monitoring where date >= '2026-08-07'
), agg as (
  select date,
    count(*) filter (where not branded)                  as org_q,
    count(*) filter (where not branded and avena_cited)  as org_h,
    count(*) filter (where branded)                      as br_q,
    count(*) filter (where branded and avena_cited)      as br_h
  from tagged group by date
)
update citation_measurements m
set questions_asked   = a.org_q,
    avena_hits        = a.org_h,
    avena_rate        = round(100.0 * a.org_h / nullif(a.org_q, 0), 2),
    branded_questions = a.br_q,
    branded_hits      = a.br_h,
    branded_rate      = round(100.0 * a.br_h / nullif(a.br_q, 0), 2)
from agg a
where m.date = a.date;

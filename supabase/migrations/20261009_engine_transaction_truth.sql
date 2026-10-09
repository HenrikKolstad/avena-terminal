-- 2026-10-09 — /engine published the PHYSICAL ROW COUNT of
-- property_transactions as "Verified transactions". On the day this was
-- written that was 652,848 against 57,306 distinct
-- (avn_prop_id, transacted_at, price_eur) identities: an 11.4x overstatement
-- on a figure whose label says "verified", on the page institutions and AI
-- crawlers read (O-77).
--
-- Why the raw count was there: a request-time count(distinct ...) takes 44s,
-- because idx_transactions_property's heap fetches pull the wide jsonb `raw`
-- column. The loose index scan below is index-only (23 heap fetches) and
-- returns the identical figure in ~1.7s, which an hourly-revalidated page can
-- afford.
--
-- Additive only: one STABLE read-only function. No table, column or row is
-- changed. On error the caller gets an error, never a zero — it must render an
-- absence rather than substitute a constant.
create or replace function public.engine_transaction_truth()
returns table (raw_rows bigint, distinct_properties bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with recursive skip as (
    (select avn_prop_id from property_transactions
      where avn_prop_id is not null order by avn_prop_id limit 1)
    union all
    select (select p.avn_prop_id from property_transactions p
             where p.avn_prop_id > s.avn_prop_id and p.avn_prop_id is not null
             order by p.avn_prop_id limit 1)
    from skip s where s.avn_prop_id is not null
  )
  select
    (select count(*) from property_transactions)::bigint              as raw_rows,
    (select count(*) from skip where avn_prop_id is not null)::bigint as distinct_properties;
$$;

revoke all on function public.engine_transaction_truth() from public;
grant execute on function public.engine_transaction_truth() to service_role;
grant execute on function public.engine_transaction_truth() to authenticated;

comment on function public.engine_transaction_truth() is
  'Honest transaction counts for /engine. raw_rows is the physical row count; distinct_properties is the deduplicated transaction identity count (O-77). Only distinct_properties may be published. Added 2026-10-09.';

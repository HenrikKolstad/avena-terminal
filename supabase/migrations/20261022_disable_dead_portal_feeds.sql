-- Disable the two portal sources the nightly /api/cron/sync-feeds job still
-- hits. Both have failed every night since 2026-05-24 (PT casa-sapo: HTTP 504,
-- IT immobiliare-it: HTTP 500) and neither portal's terms permit automated
-- collection or reuse. Rows are kept (not deleted) so history in
-- feed_sync_log stays joinable; feed_url is cleared so nothing can re-enable
-- them by flipping `active` alone.
--
-- Idempotent and non-destructive to other rows.

begin;

update public.feed_configs
   set active = false,
       feed_url = null,
       updated_at = now()
 where (country_code = 'PT' and portal_name = 'casa-sapo')
    or (country_code = 'IT' and portal_name = 'immobiliare-it');

commit;

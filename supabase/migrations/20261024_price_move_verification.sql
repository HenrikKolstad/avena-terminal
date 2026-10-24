-- Price-move verification (unit identity) — 2026-10-24
--
-- WHY. A developer can advertise several units of one building under a single
-- listing ref and swap which unit the ref shows: the smallest flat one week,
-- the penthouse the next. The asking price then "jumps" 50 % although no
-- price changed. Every consumer of price_snapshots (weekly Market Pulse,
-- alerts, the site's price tape) diffed price alone and published those swaps
-- as moves.
--
-- WHAT. Each snapshot now carries the unit's identity (built m², plot m²,
-- beds, baths, an image-set signature) and every row whose price differs from
-- the ref's previous snapshot is stamped with a verdict:
--
--   verified      same unit (type, beds, baths equal; built and plot within
--                 2 %) and, for moves >= 25 %, nothing else looks off
--   unit_changed  the listing now describes a different unit -> NOT a price
--                 move; consumers must skip it
--   unverified    a move >= 25 % that cannot be confirmed: spec data missing
--                 on either side, the whole image set was replaced, the new
--                 EUR/m2 sits outside 0.5x-2x of the area benchmark, or the
--                 price returns exactly to an asking price this ref already
--                 showed in the last 365 days (two units alternating)
--
-- Constants are mirrored in scripts/pulse/unit_identity.py and
-- src/lib/unit-identity.ts; change all three together.
--
-- Nothing is deleted: history keeps its prices; the verdict is a mark.

alter table public.price_snapshots
  add column if not exists built_m2 numeric,
  add column if not exists plot_m2 numeric,
  add column if not exists beds smallint,
  add column if not exists baths smallint,
  add column if not exists img_sig text,
  add column if not exists move_status text,
  add column if not exists move_note text;

do $$ begin
  alter table public.price_snapshots
    add constraint price_snapshots_move_status_chk
    check (move_status is null or move_status in ('verified','unit_changed','unverified'));
exception when duplicate_object then null; end $$;

comment on column public.price_snapshots.move_status is
  'Verdict on the price change vs the previous snapshot of this ref: verified | unit_changed | unverified. NULL = price unchanged (or first observation). Only verified rows are price moves.';
comment on column public.price_snapshots.img_sig is
  'First 16 hex of md5(sorted image URLs joined by newline) — detects a listing that swapped to another unit''s photos.';

create index if not exists price_snapshots_move_status_idx
  on public.price_snapshots (snapshot_date) where move_status is not null;

alter table public.property_pricing_history
  add column if not exists verification text,
  add column if not exists verification_note text;

comment on column public.property_pricing_history.verification is
  'For reduced/increased events: the price_snapshots verdict (verified | unit_changed | unverified). Only verified events are price moves.';

-- ── The verdict ─────────────────────────────────────────────────────────────
create or replace function public.price_move_verdict(
  prev_price numeric, prev_pm2 numeric, prev_type text, prev_built numeric, prev_plot numeric,
  prev_beds int, prev_baths int, prev_img text,
  cur_price numeric, cur_pm2 numeric, cur_type text, cur_built numeric, cur_plot numeric,
  cur_beds int, cur_baths int, cur_img text, cur_mm2 numeric, price_recurs boolean,
  out status text, out note text)
language plpgsql immutable set search_path = public as $$
declare
  size_tol constant numeric := 0.02;   -- built / plot m² tolerance
  large    constant numeric := 0.25;   -- moves at or above this need extra proof
  band_lo  constant numeric := 0.5;    -- new EUR/m² vs area benchmark
  band_hi  constant numeric := 2.0;
  pct numeric; ba numeric; bb numeric; notes text[] := '{}'; why text[] := '{}';
begin
  if prev_price is null or cur_price is null or prev_price <= 0 or abs(cur_price - prev_price) < 1 then
    status := null; note := null; return;
  end if;
  pct := (cur_price - prev_price) / prev_price;
  ba := coalesce(prev_built, case when prev_pm2 > 0 then prev_price / prev_pm2 end);
  bb := coalesce(cur_built,  case when cur_pm2  > 0 then cur_price  / cur_pm2  end);

  if nullif(prev_type,'') is not null and nullif(cur_type,'') is not null and prev_type <> cur_type then
    notes := notes || format('type %s→%s', prev_type, cur_type); end if;
  if prev_beds is not null and cur_beds is not null and prev_beds <> cur_beds then
    notes := notes || format('beds %s→%s', prev_beds, cur_beds); end if;
  if prev_baths is not null and cur_baths is not null and prev_baths <> cur_baths then
    notes := notes || format('baths %s→%s', prev_baths, cur_baths); end if;
  if ba > 0 and bb > 0 and abs(ba - bb) / greatest(ba, bb) > size_tol then
    notes := notes || format('built %s→%s m²', round(ba), round(bb)); end if;
  if prev_plot > 0 and cur_plot > 0 and abs(prev_plot - cur_plot) / greatest(prev_plot, cur_plot) > size_tol then
    notes := notes || format('plot %s→%s m²', round(prev_plot), round(cur_plot)); end if;
  if cardinality(notes) > 0 then
    status := 'unit_changed'; note := array_to_string(notes, '; '); return;
  end if;

  if abs(pct) >= large then
    if ba is null or bb is null or prev_beds is null or cur_beds is null
       or nullif(prev_type,'') is null or nullif(cur_type,'') is null then
      why := why || 'spec data missing'::text; end if;
    if prev_img is not null and cur_img is not null and prev_img <> cur_img then
      why := why || 'image set replaced'::text; end if;
    if cur_mm2 > 0 and bb > 0 and ((cur_price / bb) / cur_mm2 < band_lo or (cur_price / bb) / cur_mm2 > band_hi) then
      why := why || format('€/m² %s vs area %s', round(cur_price / bb), round(cur_mm2)); end if;
    if price_recurs then
      why := why || 'returns exactly to an earlier asking price (alternating units)'::text; end if;
    if cardinality(why) > 0 then
      status := 'unverified'; note := array_to_string(why, '; '); return;
    end if;
  end if;
  status := 'verified'; note := null;
end $$;

-- ── Stamp every write, whichever writer did it ──────────────────────────────
create or replace function public.price_snapshots_stamp_move()
returns trigger language plpgsql set search_path = public as $$
declare
  p record; v record; recurs boolean := false;
begin
  select price, pm2, type, built_m2, plot_m2, beds, baths, img_sig, snapshot_date
    into p
    from public.price_snapshots
   where ref = new.ref and snapshot_date < new.snapshot_date and price is not null
   order by snapshot_date desc limit 1;
  if not found or new.price is null or abs(new.price - p.price) < 1 then
    new.move_status := null; new.move_note := null; return new;
  end if;
  if p.price > 0 and abs(new.price - p.price) / p.price >= 0.25 then
    select exists (
      select 1 from public.price_snapshots
       where ref = new.ref and snapshot_date < p.snapshot_date
         and snapshot_date >= new.snapshot_date - 365
         and abs(price - new.price) < 1) into recurs;
  end if;
  select * into v from public.price_move_verdict(
    p.price, p.pm2, p.type, p.built_m2, p.plot_m2, p.beds, p.baths, p.img_sig,
    new.price, new.pm2, new.type, new.built_m2, new.plot_m2, new.beds, new.baths, new.img_sig,
    new.mm2, recurs);
  new.move_status := v.status; new.move_note := v.note;
  return new;
end $$;

drop trigger if exists price_snapshots_stamp_move on public.price_snapshots;
create trigger price_snapshots_stamp_move
  before insert or update on public.price_snapshots
  for each row execute function public.price_snapshots_stamp_move();

-- Price events copy the verdict of the same-day snapshot (written first by
-- both writers). No snapshot -> unverified, never silently verified.
create or replace function public.pricing_history_stamp_verification()
returns trigger language plpgsql set search_path = public as $$
declare s record;
begin
  if new.status not in ('reduced','increased') then return new; end if;
  if new.verification is not null then return new; end if;
  select move_status, move_note into s from public.price_snapshots
   where ref = new.avn_prop_id and snapshot_date = (new.recorded_at at time zone 'UTC')::date
   limit 1;
  new.verification := coalesce(s.move_status, 'unverified');
  new.verification_note := case when s.move_status is null then 'no matching snapshot' else s.move_note end;
  return new;
end $$;

drop trigger if exists pricing_history_stamp_verification on public.property_pricing_history;
create trigger pricing_history_stamp_verification
  before insert on public.property_pricing_history
  for each row execute function public.pricing_history_stamp_verification();

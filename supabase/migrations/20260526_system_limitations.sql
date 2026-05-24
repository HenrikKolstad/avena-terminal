-- ═══════════════════════════════════════════════════════════════════════════
-- SELF-AWARE LIMITATIONS — Architectural Commitment 10.
--
-- Most companies hide weakness. The most credible institutions publish it.
-- The IMF, the ECB Financial Stability Review, and the FT all openly discuss
-- what they do not know. Avena does the same — daily, automatically,
-- generated from real system telemetry.
--
-- This table is the audit log of what the system itself flagged as unknown,
-- partial, or stale. Rendered at /limitations.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists system_limitations (
  id                    uuid primary key default gen_random_uuid(),
  limitation_category   text not null,        -- 'coverage' | 'confidence' | 'ingestion' | 'methodology' | 'staleness'
  description           text not null,
  severity              text not null,        -- 'minor' | 'moderate' | 'significant'
  affected_areas        text[] default '{}',  -- e.g. ['PL', 'CZ'] or ['costa_blanca_north']
  remediation_status    text,                 -- 'investigating' | 'in_progress' | 'planned' | 'accepted'
  remediation_note      text,
  detected_metric       text,                 -- e.g. 'coverage_count' or 'avg_confidence'
  detected_value        numeric,              -- the actual number observed
  threshold_value       numeric,              -- the threshold this falls below
  reported_at           timestamptz default now(),
  resolved_at           timestamptz
);

create index if not exists idx_system_limitations_active
  on system_limitations (reported_at desc) where resolved_at is null;
create index if not exists idx_system_limitations_severity
  on system_limitations (severity, reported_at desc);
create index if not exists idx_system_limitations_category
  on system_limitations (limitation_category, reported_at desc);

alter table system_limitations enable row level security;
drop policy if exists "public read limitations" on system_limitations;
create policy "public read limitations" on system_limitations for select using (true);

commit;

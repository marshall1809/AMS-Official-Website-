-- 006_matches_results_advancement.sql
-- Matches, participants, result revisions, and advancement events.

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete restrict,
  group_id uuid references public.stage_groups(id) on delete set null,
  round_id uuid references public.stage_rounds(id) on delete set null,
  parent_series_id uuid references public.matches(id) on delete set null,
  title text not null,
  status public.match_status not null default 'scheduled',
  starts_at timestamptz,
  stream_url text,
  vod_url text,
  report text,
  bracket_position integer,
  leg_number integer,
  best_of integer,
  is_bye boolean not null default false,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_best_of_check check (best_of is null or best_of > 0),
  constraint matches_leg_number_check check (leg_number is null or leg_number > 0)
);

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  competition_entry_id uuid references public.competition_entries(id) on delete restrict,
  slot integer not null,
  source_type text not null default 'manual',
  source_match_id uuid references public.matches(id) on delete set null,
  source_outcome text,
  is_bye boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, slot),
  constraint match_participants_slot_check check (slot > 0)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  revision integer not null default 1,
  is_current boolean not null default true,
  winner_participant_id uuid references public.match_participants(id) on delete set null,
  status public.result_status not null default 'submitted',
  score jsonb not null default '{}'::jsonb,
  aggregate_score jsonb not null default '{}'::jsonb,
  result_notes text,
  certified_by uuid references auth.users(id) on delete set null,
  certified_at timestamptz,
  void_reason text,
  supersedes_result_id uuid references public.match_results(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, revision),
  constraint match_results_certified_check check ((status <> 'certified') or certified_at is not null)
);

create unique index if not exists match_results_one_current on public.match_results(match_id) where is_current = true;

create table if not exists public.advancement_rules (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.stages(id) on delete restrict,
  competition_id uuid references public.competitions(id) on delete restrict,
  source_type text not null,
  source_id uuid,
  outcome text not null,
  target_match_id uuid references public.matches(id) on delete restrict,
  target_slot integer,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advancement_rule_scope_check check (stage_id is not null or competition_id is not null),
  constraint advancement_target_slot_check check (target_slot is null or target_slot > 0)
);

create table if not exists public.advancement_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.advancement_rules(id) on delete set null,
  source_match_id uuid references public.matches(id) on delete set null,
  target_match_id uuid references public.matches(id) on delete set null,
  competition_entry_id uuid references public.competition_entries(id) on delete set null,
  target_slot integer,
  mode text not null default 'automatic',
  status text not null default 'proposed',
  reason text,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint advancement_events_status_check check (status in ('proposed','confirmed','rejected','superseded')),
  constraint advancement_events_mode_check check (mode in ('automatic','manual','override'))
);

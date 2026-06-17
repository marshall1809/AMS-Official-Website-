-- 007_standings_movement.sql
-- League rules, tiebreaks, cached standings, and promotion/relegation records.

create table if not exists public.standings_rules (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete restrict,
  points_win integer not null default 3,
  points_draw integer not null default 1,
  points_loss integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id)
);

create table if not exists public.tiebreak_rules (
  id uuid primary key default gen_random_uuid(),
  standings_rule_id uuid not null references public.standings_rules(id) on delete cascade,
  rule_key text not null,
  sort_order integer not null default 0,
  direction text not null default 'desc',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (standings_rule_id, rule_key),
  constraint tiebreak_direction_check check (direction in ('asc','desc'))
);

create table if not exists public.standings_adjustments (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete restrict,
  competition_entry_id uuid not null references public.competition_entries(id) on delete restrict,
  points_delta numeric not null default 0,
  manual_rank integer,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint standings_adjustments_manual_rank_check check (manual_rank is null or manual_rank > 0)
);

create table if not exists public.standings_cache (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete restrict,
  competition_entry_id uuid not null references public.competition_entries(id) on delete restrict,
  snapshot_id uuid,
  calculation_version integer not null default 1,
  position integer,
  played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  score_for numeric not null default 0,
  score_against numeric not null default 0,
  score_difference numeric not null default 0,
  points numeric not null default 0,
  adjusted_points numeric not null default 0,
  tiebreak_data jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  is_snapshot boolean not null default false,
  constraint standings_cache_position_check check (position is null or position > 0)
);

create unique index if not exists standings_cache_current_unique
  on public.standings_cache(stage_id, competition_entry_id)
  where is_snapshot = false;

create unique index if not exists standings_cache_snapshot_unique
  on public.standings_cache(stage_id, competition_entry_id, snapshot_id)
  where is_snapshot = true and snapshot_id is not null;

create table if not exists public.promotion_relegation_records (
  id uuid primary key default gen_random_uuid(),
  source_season_id uuid not null references public.seasons(id) on delete restrict,
  source_division_id uuid not null references public.divisions(id) on delete restrict,
  source_competition_id uuid references public.competitions(id) on delete set null,
  division_team_id uuid not null references public.division_teams(id) on delete restrict,
  target_season_id uuid references public.seasons(id) on delete set null,
  target_division_id uuid references public.divisions(id) on delete set null,
  movement_type text not null check (movement_type in ('promotion','relegation','qualification','retention')),
  reason text,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

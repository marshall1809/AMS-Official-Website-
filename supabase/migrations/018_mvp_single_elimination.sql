-- 018_mvp_single_elimination.sql
-- Minimum schema bridge for one Season-scoped single-elimination competition.

do 'begin
  create type public.competition_status as enum (''draft'',''generated'',''ready'',''active'',''locked'',''finalized'',''archived'',''deleted'');
exception when duplicate_object then null;
end';

do 'begin
  create type public.stage_status as enum (''draft'',''generated'',''active'',''completed'',''locked'',''archived'');
exception when duplicate_object then null;
end';

do 'begin
  create type public.result_status as enum (''draft'',''submitted'',''certified'',''disputed'',''voided'');
exception when duplicate_object then null;
end';

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  name text not null,
  slug text not null,
  status public.entity_status not null default 'published',
  summary text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists divisions_season_slug_mvp_unique
  on public.divisions(season_id, slug);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete restrict,
  name text not null,
  slug text not null,
  status public.competition_status not null default 'draft',
  format_key text not null default 'single_elimination',
  generated_config jsonb not null default '{}'::jsonb,
  champion_division_team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitions_division_slug_mvp_unique
  on public.competitions(division_id, slug);

alter table if exists public.stages
  add column if not exists competition_id uuid references public.competitions(id) on delete restrict,
  add column if not exists slug text,
  add column if not exists status public.stage_status not null default 'draft',
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.stage_rounds (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete restrict,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.division_teams (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete restrict,
  season_team_id uuid not null,
  status public.participation_status not null default 'active',
  seed integer,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists division_teams_mvp_unique
  on public.division_teams(division_id, season_team_id);

create table if not exists public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete restrict,
  division_team_id uuid not null references public.division_teams(id) on delete restrict,
  seed integer,
  status public.participation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competition_entries_mvp_unique
  on public.competition_entries(competition_id, division_team_id);

alter table if exists public.matches
  add column if not exists competition_id uuid references public.competitions(id) on delete restrict,
  add column if not exists round_id uuid references public.stage_rounds(id) on delete set null,
  add column if not exists bracket_position integer,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.match_participants
  add column if not exists competition_entry_id uuid references public.competition_entries(id) on delete restrict,
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_match_id uuid references public.matches(id) on delete set null,
  add column if not exists source_outcome text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  revision integer not null default 1,
  is_current boolean not null default true,
  winner_participant_id uuid references public.match_participants(id) on delete set null,
  status public.result_status not null default 'submitted',
  score jsonb not null default '{}'::jsonb,
  result_notes text,
  certified_by uuid references auth.users(id) on delete set null,
  certified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists match_results_current_mvp_unique
  on public.match_results(match_id)
  where is_current = true;

create table if not exists public.advancement_rules (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.stages(id) on delete restrict,
  competition_id uuid references public.competitions(id) on delete restrict,
  source_type text not null default 'match',
  source_id uuid,
  outcome text not null default 'winner',
  target_match_id uuid references public.matches(id) on delete restrict,
  target_slot integer,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.divisions enable row level security;
alter table public.competitions enable row level security;
alter table public.stages enable row level security;
alter table public.stage_rounds enable row level security;
alter table public.division_teams enable row level security;
alter table public.competition_entries enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_results enable row level security;
alter table public.advancement_rules enable row level security;

do 'declare table_name text;
begin
  foreach table_name in array array[
    ''divisions'',''competitions'',''stages'',''stage_rounds'',
    ''division_teams'',''competition_entries'',''matches'',
    ''match_participants'',''match_results'',''advancement_rules''
  ] loop
    execute format(''drop policy if exists mvp_bracket_manage on public.%I'', table_name);
    execute format(
      ''create policy mvp_bracket_manage on public.%I for all to authenticated using (public.ams_can_manage_teams(auth.uid())) with check (public.ams_can_manage_teams(auth.uid()))'',
      table_name
    );
  end loop;
end';

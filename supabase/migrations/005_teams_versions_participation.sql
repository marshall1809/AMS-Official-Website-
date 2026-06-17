-- 005_teams_versions_participation.sql
-- Global teams, historical team versions, and scoped participation.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  current_version_id uuid,
  canonical_name text not null,
  slug text not null,
  status public.entity_status not null default 'published',
  description text,
  socials jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint teams_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists teams_slug_live_unique on public.teams(slug) where deleted_at is null;

create table if not exists public.team_versions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  name text not null,
  tag text,
  slug text,
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  primary_color text,
  secondary_color text,
  description text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_versions_period_check check (valid_to is null or valid_to > valid_from),
  constraint team_versions_slug_check check (slug is null or slug ~ '^[a-z0-9-]+$')
);

alter table public.teams drop constraint if exists teams_current_version_fk;
alter table public.teams add constraint teams_current_version_fk foreign key (current_version_id) references public.team_versions(id) on delete set null;

create table if not exists public.season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  team_version_id uuid references public.team_versions(id) on delete restrict,
  status public.participation_status not null default 'active',
  seed integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, team_id)
);

create table if not exists public.division_teams (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete restrict,
  season_team_id uuid not null references public.season_teams(id) on delete restrict,
  status public.participation_status not null default 'active',
  seed integer,
  division_logo_asset_id uuid references public.media_assets(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, season_team_id)
);

create table if not exists public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete restrict,
  division_team_id uuid not null references public.division_teams(id) on delete restrict,
  seed integer,
  status public.participation_status not null default 'active',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, division_team_id)
);

alter table public.competitions drop constraint if exists competitions_champion_division_team_fk;
alter table public.competitions add constraint competitions_champion_division_team_fk foreign key (champion_division_team_id) references public.division_teams(id) on delete set null;

create table if not exists public.stage_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.stage_groups(id) on delete restrict,
  competition_entry_id uuid not null references public.competition_entries(id) on delete restrict,
  seed integer,
  created_at timestamptz not null default now(),
  unique (group_id, competition_entry_id)
);

-- Cross-hierarchy consistency is enforced by trigger in 011_integrity_triggers.sql.

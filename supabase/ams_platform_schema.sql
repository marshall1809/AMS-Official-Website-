-- AMS Platform Supabase Schema
-- Competition-first, CMS-supported architecture for Season 10+ scalability.
-- Use on a clean Supabase project or as the baseline for a planned migration.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
do $$ begin create type public.app_role as enum ('super_admin','admin','designer','tournament_manager','content_manager','media_manager','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.scope_type as enum ('global','season','division','competition','stage','content','media'); exception when duplicate_object then null; end $$;
do $$ begin create type public.entity_status as enum ('draft','published','archived','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.season_status as enum ('draft','setup','ready','active','finished','archived','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.competition_status as enum ('draft','generated','ready','active','locked','finalized','archived','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stage_status as enum ('draft','generated','active','completed','locked','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.match_status as enum ('scheduled','live','completed','disputed','certified','voided'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stage_type as enum ('league','group','single_elimination','double_elimination','home_away_knockout','custom'); exception when duplicate_object then null; end $$;
do $$ begin create type public.media_state as enum ('active','replaced','archived','unused','protected','soft_deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.route_target_type as enum ('page','season','division','competition','team','news','hall_of_fame','redirect','gone'); exception when duplicate_object then null; end $$;
do $$ begin create type public.snapshot_kind as enum ('team_identity','media','standings','bracket','match_result','competition_result','champion','season_summary','division_summary','hall_of_fame'); exception when duplicate_object then null; end $$;
do $$ begin create type public.hall_of_fame_type as enum ('season_champion','division_champion','competition_champion','mvp','record','award'); exception when duplicate_object then null; end $$;
do $$ begin create type public.participation_status as enum ('active','inactive','eliminated','promoted','relegated','archived'); exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Utility
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  capabilities text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role, scope, scope_id)
);

create or replace function public.has_capability(
  user_id_input uuid,
  capability_input text,
  scope_input public.scope_type default 'global',
  scope_id_input uuid default null
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    where ura.user_id = user_id_input
      and ura.is_active = true
      and (
        ura.role in ('super_admin','admin')
        or capability_input = any(ura.capabilities)
      )
      and (
        ura.scope = 'global'
        or ura.scope = scope_input
        or (scope_id_input is not null and ura.scope_id = scope_id_input)
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- Platform, media, themes
-- -----------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  public_url text,
  title text,
  alt_text text,
  mime_type text,
  size_bytes bigint,
  state public.media_state not null default 'active',
  scope public.scope_type not null default 'global',
  scope_id uuid,
  replaced_by_asset_id uuid references public.media_assets(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

create table if not exists public.media_usages (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  field_name text not null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  is_historical boolean not null default false,
  is_protected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (media_asset_id, entity_type, entity_id, field_name)
);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  parent_theme_id uuid references public.themes(id) on delete set null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  name text not null,
  tokens jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'Alliance Master Series',
  default_title text not null default 'Alliance Master Series',
  default_description text,
  logo_text text not null default 'AMS',
  logo_subtext text,
  logo_image_asset_id uuid references public.media_assets(id) on delete set null,
  contact_label text,
  contact_url text,
  footer_text text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Core hierarchy
-- -----------------------------------------------------------------------------
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references public.themes(id) on delete set null,
  name text not null,
  slug text not null unique,
  status public.season_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  summary text,
  settings jsonb not null default '{}'::jsonb,
  finalized_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  theme_id uuid references public.themes(id) on delete set null,
  name text not null,
  slug text not null,
  tier integer,
  status public.entity_status not null default 'draft',
  summary text,
  settings jsonb not null default '{}'::jsonb,
  finalized_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, slug)
);

create table if not exists public.competition_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.competition_templates(id) on delete cascade,
  version integer not null,
  format_key text not null,
  config jsonb not null default '{}'::jsonb,
  stage_blueprint jsonb not null default '[]'::jsonb,
  advancement_blueprint jsonb not null default '[]'::jsonb,
  standings_blueprint jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete cascade,
  template_id uuid references public.competition_templates(id) on delete set null,
  template_version_id uuid references public.competition_template_versions(id) on delete set null,
  theme_id uuid references public.themes(id) on delete set null,
  name text not null,
  slug text not null,
  status public.competition_status not null default 'draft',
  format_key text not null default 'custom',
  generated_config jsonb not null default '{}'::jsonb,
  manual_modifications jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  champion_division_team_id uuid,
  finalized_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, slug)
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  slug text not null,
  type public.stage_type not null,
  status public.stage_status not null default 'draft',
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, slug)
);

create table if not exists public.stage_groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id, slug)
);

create table if not exists public.stage_rounds (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id, slug)
);

-- -----------------------------------------------------------------------------
-- Teams and participation history
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  current_version_id uuid,
  canonical_name text not null,
  slug text not null unique,
  status public.entity_status not null default 'published',
  description text,
  socials jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.team_versions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
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
  created_at timestamptz not null default now()
);

alter table public.teams drop constraint if exists teams_current_version_fk;
alter table public.teams add constraint teams_current_version_fk foreign key (current_version_id) references public.team_versions(id) on delete set null;

create table if not exists public.season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  team_version_id uuid references public.team_versions(id) on delete set null,
  status public.participation_status not null default 'active',
  seed integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, team_id)
);

create table if not exists public.division_teams (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete cascade,
  season_team_id uuid not null references public.season_teams(id) on delete cascade,
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
  competition_id uuid not null references public.competitions(id) on delete cascade,
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
  group_id uuid not null references public.stage_groups(id) on delete cascade,
  competition_entry_id uuid not null references public.competition_entries(id) on delete cascade,
  seed integer,
  created_at timestamptz not null default now(),
  unique (group_id, competition_entry_id)
);

-- -----------------------------------------------------------------------------
-- Matches, results, advancement
-- -----------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
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
  updated_at timestamptz not null default now()
);

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  competition_entry_id uuid references public.competition_entries(id) on delete set null,
  slot integer not null,
  source_type text not null default 'manual',
  source_match_id uuid references public.matches(id) on delete set null,
  source_outcome text,
  is_bye boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, slot)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  winner_participant_id uuid references public.match_participants(id) on delete set null,
  status public.match_status not null default 'completed',
  score jsonb not null default '{}'::jsonb,
  aggregate_score jsonb not null default '{}'::jsonb,
  result_notes text,
  certified_by uuid references auth.users(id) on delete set null,
  certified_at timestamptz,
  void_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advancement_rules (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.stages(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  outcome text not null,
  target_match_id uuid references public.matches(id) on delete cascade,
  target_slot integer,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Standings, tiebreaks, movement
-- -----------------------------------------------------------------------------
create table if not exists public.standings_rules (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
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
  created_at timestamptz not null default now()
);

create table if not exists public.standings_adjustments (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  competition_entry_id uuid not null references public.competition_entries(id) on delete cascade,
  points_delta numeric not null default 0,
  manual_rank integer,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.standings_cache (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  competition_entry_id uuid not null references public.competition_entries(id) on delete cascade,
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
  unique (stage_id, competition_entry_id, is_snapshot)
);

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

-- -----------------------------------------------------------------------------
-- Snapshots, Hall of Fame, statistics
-- -----------------------------------------------------------------------------
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  kind public.snapshot_kind not null,
  source_entity_type text not null,
  source_entity_id uuid not null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  revision integer not null default 1,
  data jsonb not null,
  supersedes_snapshot_id uuid references public.snapshots(id) on delete set null,
  created_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, source_entity_type, source_entity_id, revision)
);

create table if not exists public.hall_of_fame_entries (
  id uuid primary key default gen_random_uuid(),
  type public.hall_of_fame_type not null,
  season_id uuid references public.seasons(id) on delete set null,
  division_id uuid references public.divisions(id) on delete set null,
  competition_id uuid references public.competitions(id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  primary_snapshot_id uuid references public.snapshots(id) on delete set null,
  status public.entity_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, season_id, division_id, competition_id, slug)
);

create table if not exists public.hall_of_fame_entry_snapshots (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.hall_of_fame_entries(id) on delete cascade,
  snapshot_id uuid not null references public.snapshots(id) on delete restrict,
  relation_label text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (entry_id, snapshot_id)
);

create table if not exists public.statistics_aggregates (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null,
  scope_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  metric_key text not null,
  metric_value numeric not null default 0,
  metric_payload jsonb not null default '{}'::jsonb,
  source_from timestamptz,
  source_to timestamptz,
  calculation_version integer not null default 1,
  calculated_at timestamptz not null default now(),
  is_final boolean not null default false,
  unique (scope, scope_id, entity_type, entity_id, metric_key, calculation_version)
);

-- -----------------------------------------------------------------------------
-- CMS and routing
-- -----------------------------------------------------------------------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  title text not null,
  slug text not null,
  status public.entity_status not null default 'draft',
  seo_title text,
  seo_description text,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  target_type public.route_target_type not null,
  target_id uuid,
  status text not null default 'active',
  redirect_to text,
  status_code integer,
  canonical_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slug_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  old_slug text not null,
  old_path text,
  new_path text,
  created_at timestamptz not null default now(),
  unique (entity_type, old_slug, old_path)
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  title text not null,
  slug text not null,
  excerpt text,
  body jsonb not null default '{}'::jsonb,
  category text,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  status public.entity_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rulesets (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  title text not null,
  body text not null,
  pdf_asset_id uuid references public.media_assets(id) on delete set null,
  status public.entity_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  name text not null,
  url text,
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  status public.entity_status not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Audit and version history
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  scope public.scope_type,
  scope_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.entity_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  version integer not null,
  data jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_reason text,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, version)
);

-- -----------------------------------------------------------------------------
-- Triggers and indexes
-- -----------------------------------------------------------------------------
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_role_assignments','site_settings','themes','media_assets','seasons','divisions',
    'competition_templates','competitions','stages','stage_groups','stage_rounds','teams','season_teams',
    'division_teams','competition_entries','matches','match_participants','match_results','advancement_rules',
    'standings_rules','hall_of_fame_entries','pages','page_blocks','navigation_items','routes','news_posts',
    'rulesets','sponsors'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end $$;

create index if not exists seasons_status_idx on public.seasons(status);
create index if not exists divisions_season_idx on public.divisions(season_id, status);
create index if not exists competitions_division_idx on public.competitions(division_id, status);
create index if not exists stages_competition_idx on public.stages(competition_id, sort_order);
create index if not exists matches_stage_idx on public.matches(stage_id, starts_at);
create index if not exists season_teams_season_idx on public.season_teams(season_id);
create index if not exists division_teams_division_idx on public.division_teams(division_id);
create index if not exists competition_entries_competition_idx on public.competition_entries(competition_id);
create index if not exists pages_scope_idx on public.pages(scope, scope_id, status);
create index if not exists routes_path_idx on public.routes(path);
create index if not exists media_usages_entity_idx on public.media_usages(entity_type, entity_id);
create index if not exists snapshots_source_idx on public.snapshots(source_entity_type, source_entity_id, kind);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists statistics_entity_idx on public.statistics_aggregates(entity_type, entity_id, metric_key);

-- -----------------------------------------------------------------------------
-- RLS baseline
-- -----------------------------------------------------------------------------
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_role_assignments','site_settings','themes','media_assets','media_usages','seasons','divisions',
    'competition_templates','competition_template_versions','competitions','stages','stage_groups','stage_rounds',
    'teams','team_versions','season_teams','division_teams','competition_entries','stage_group_members','matches',
    'match_participants','match_results','advancement_rules','advancement_events','standings_rules','tiebreak_rules',
    'standings_adjustments','standings_cache','promotion_relegation_records','snapshots','hall_of_fame_entries',
    'hall_of_fame_entry_snapshots','statistics_aggregates','pages','page_blocks','navigation_items','routes','slug_history',
    'news_posts','rulesets','sponsors','audit_logs','entity_versions'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Public read policies are deliberately broad for public-facing records.
-- Publishing/status rules should be tightened per UI endpoint as implementation matures.
do $$
declare item record;
begin
  for item in
    select * from (values
      ('site_settings','public_read','true'),
      ('themes','public_read','is_active = true'),
      ('media_assets','public_read','state in (''active'',''replaced'',''archived'',''protected'')'),
      ('seasons','public_read','status <> ''deleted'''),
      ('divisions','public_read','status <> ''deleted'''),
      ('competitions','public_read','status <> ''deleted'''),
      ('stages','public_read','true'),
      ('stage_groups','public_read','true'),
      ('stage_rounds','public_read','true'),
      ('teams','public_read','status <> ''deleted'''),
      ('team_versions','public_read','true'),
      ('season_teams','public_read','status <> ''archived'''),
      ('division_teams','public_read','status <> ''archived'''),
      ('competition_entries','public_read','status <> ''archived'''),
      ('matches','public_read','status <> ''voided'''),
      ('match_participants','public_read','true'),
      ('match_results','public_read','status in (''completed'',''certified'')'),
      ('standings_cache','public_read','true'),
      ('snapshots','public_read','true'),
      ('hall_of_fame_entries','public_read','status = ''published'''),
      ('hall_of_fame_entry_snapshots','public_read','true'),
      ('statistics_aggregates','public_read','true'),
      ('pages','public_read','status = ''published'''),
      ('page_blocks','public_read','is_visible = true'),
      ('navigation_items','public_read','is_visible = true'),
      ('routes','public_read','true'),
      ('news_posts','public_read','status = ''published'''),
      ('rulesets','public_read','status = ''published'''),
      ('sponsors','public_read','status = ''published''')
    ) as policies(table_name, policy_name, expression)
  loop
    execute format('drop policy if exists %I on public.%I', item.policy_name, item.table_name);
    execute format('create policy %I on public.%I for select using (%s)', item.policy_name, item.table_name, item.expression);
  end loop;
end $$;

-- Admin baseline policy. Server actions should still enforce exact capabilities for each operation.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'site_settings','themes','media_assets','media_usages','seasons','divisions','competition_templates',
    'competition_template_versions','competitions','stages','stage_groups','stage_rounds','teams','team_versions',
    'season_teams','division_teams','competition_entries','stage_group_members','matches','match_participants',
    'match_results','advancement_rules','advancement_events','standings_rules','tiebreak_rules','standings_adjustments',
    'standings_cache','promotion_relegation_records','snapshots','hall_of_fame_entries','hall_of_fame_entry_snapshots',
    'statistics_aggregates','pages','page_blocks','navigation_items','routes','slug_history','news_posts','rulesets',
    'sponsors','audit_logs','entity_versions'
  ] loop
    execute format('drop policy if exists admin_all on public.%I', table_name);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.has_capability(auth.uid(), ''view_admin'')) with check (public.has_capability(auth.uid(), ''view_admin''))', table_name);
  end loop;
end $$;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.has_capability(auth.uid(), 'view_admin'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists role_assignments_admin on public.user_role_assignments;
create policy role_assignments_admin on public.user_role_assignments for all to authenticated using (public.has_capability(auth.uid(), 'manage_permissions')) with check (public.has_capability(auth.uid(), 'manage_permissions'));

-- 004_core_hierarchy.sql
-- Season -> Division -> Competition -> Stage -> Group/Round.
-- Important: core historical relationships use restrict, not cascade.

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references public.themes(id) on delete set null,
  name text not null,
  slug text not null,
  status public.season_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  summary text,
  settings jsonb not null default '{}'::jsonb,
  finalized_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists seasons_slug_live_unique on public.seasons(slug) where deleted_at is null;

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
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
  constraint divisions_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists divisions_season_slug_live_unique on public.divisions(season_id, slug) where deleted_at is null;

create table if not exists public.competition_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_templates_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.competition_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.competition_templates(id) on delete restrict,
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
  division_id uuid not null references public.divisions(id) on delete restrict,
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
  constraint competitions_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists competitions_division_slug_live_unique on public.competitions(division_id, slug) where deleted_at is null;

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete restrict,
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
  unique (competition_id, slug),
  constraint stages_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.stage_groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete restrict,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id, slug),
  constraint stage_groups_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.stage_rounds (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete restrict,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id, slug),
  constraint stage_rounds_slug_check check (slug ~ '^[a-z0-9-]+$')
);

-- 017_mvp_legacy_team_bridge.sql
-- Adapts the existing Season 1 team tables to the MVP Team Manager.

do 'begin
  create type public.entity_status as enum (''draft'',''published'',''archived'',''deleted'');
exception when duplicate_object then null;
end';

alter table if exists public.teams
  add column if not exists name text,
  add column if not exists canonical_name text,
  add column if not exists current_version_id uuid,
  add column if not exists description text,
  add column if not exists socials jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.teams team
set
  name = coalesce(
    nullif(team.name, ''),
    nullif(team.canonical_name, ''),
    team.slug
  ),
  canonical_name = coalesce(
    nullif(team.canonical_name, ''),
    nullif(to_jsonb(team)->>'name', ''),
    team.slug
  ),
  socials = case
    when team.socials = '{}'::jsonb and to_jsonb(team)->'social_links' is not null
      then to_jsonb(team)->'social_links'
    else team.socials
  end
where team.canonical_name is null
   or team.canonical_name = ''
   or team.socials = '{}'::jsonb;

alter table if exists public.teams
  alter column name set not null,
  alter column canonical_name set not null;

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
  created_at timestamptz not null default now()
);

alter table public.teams drop constraint if exists teams_current_version_fk;
alter table public.teams
  add constraint teams_current_version_fk
  foreign key (current_version_id)
  references public.team_versions(id)
  on delete set null;

insert into public.team_versions (
  team_id,
  name,
  tag,
  slug,
  logo_asset_id,
  description,
  created_reason
)
select
  team.id,
  team.canonical_name,
  nullif(to_jsonb(team)->>'tag', ''),
  team.slug,
  case
    when coalesce(to_jsonb(team)->>'default_logo_id', to_jsonb(team)->>'logo_asset_id', '') ~
      '^[0-9a-fA-F-]{36}$'
      then coalesce(to_jsonb(team)->>'default_logo_id', to_jsonb(team)->>'logo_asset_id')::uuid
    else null
  end,
  team.description,
  'Legacy team migration'
from public.teams team
where not exists (
  select 1
  from public.team_versions version
  where version.team_id = team.id
);

update public.teams team
set current_version_id = (
  select version.id
  from public.team_versions version
  where version.team_id = team.id
  order by version.created_at desc
  limit 1
)
where team.current_version_id is null;

alter table if exists public.season_teams
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists team_version_id uuid references public.team_versions(id) on delete restrict,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists season_teams_id_unique
  on public.season_teams(id);

update public.season_teams participation
set team_version_id = team.current_version_id
from public.teams team
where participation.team_id = team.id
  and participation.team_version_id is null;

alter table public.teams enable row level security;
alter table public.team_versions enable row level security;
alter table public.season_teams enable row level security;

drop policy if exists mvp_teams_manage on public.teams;
create policy mvp_teams_manage
on public.teams
for all
to authenticated
using (public.ams_can_manage_teams(auth.uid()))
with check (public.ams_can_manage_teams(auth.uid()));

drop policy if exists mvp_team_versions_manage on public.team_versions;
create policy mvp_team_versions_manage
on public.team_versions
for all
to authenticated
using (public.ams_can_manage_teams(auth.uid()))
with check (public.ams_can_manage_teams(auth.uid()));

drop policy if exists mvp_season_teams_manage on public.season_teams;
create policy mvp_season_teams_manage
on public.season_teams
for all
to authenticated
using (public.ams_can_manage_teams(auth.uid()))
with check (public.ams_can_manage_teams(auth.uid()));

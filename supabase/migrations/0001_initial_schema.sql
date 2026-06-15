create extension if not exists pgcrypto;

create type public.app_role as enum (
  'super_admin',
  'admin',
  'designer',
  'tournament_manager',
  'content_manager',
  'media_manager',
  'viewer'
);

create type public.entity_status as enum (
  'draft',
  'published',
  'archived',
  'deleted'
);

create type public.season_status as enum (
  'draft',
  'active',
  'archived',
  'deleted'
);

create type public.match_status as enum (
  'scheduled',
  'live',
  'completed',
  'postponed',
  'cancelled'
);

create type public.stage_type as enum (
  'group',
  'single_elimination',
  'double_elimination'
);

create type public.route_target_type as enum (
  'page',
  'season',
  'team',
  'player',
  'news',
  'redirect',
  'gone'
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  default_title text not null,
  default_description text,
  contact_label text,
  contact_url text,
  footer_text text,
  logo_text text,
  logo_subtext text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  title text,
  alt_text text,
  mime_type text,
  size_bytes bigint,
  public_url text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_asset_id uuid references public.media_assets(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets
  add column uploaded_by uuid references public.profiles(id);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'season')),
  season_id uuid,
  name text not null,
  tokens jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.season_status not null default 'draft',
  theme_id uuid references public.themes(id),
  logo_asset_id uuid references public.media_assets(id),
  hero_asset_id uuid references public.media_assets(id),
  launch_label text,
  map_name text,
  match_format text,
  min_teams int not null default 16 check (min_teams > 0),
  summary text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.themes
  add constraint themes_season_id_fkey
  foreign key (season_id) references public.seasons(id) on delete cascade;

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  status public.entity_status not null default 'draft',
  scope text not null default 'global' check (scope in ('global', 'season')),
  season_id uuid references public.seasons(id) on delete cascade,
  seo_title text,
  seo_description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, season_id, slug)
);

create table public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  status public.entity_status not null default 'published',
  target_type public.route_target_type not null,
  target_id uuid,
  redirect_to text,
  status_code int check (status_code in (301, 302, 307, 308, 410)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique,
  destination_path text not null,
  status_code int not null default 308 check (status_code in (301, 302, 307, 308)),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  scope text not null default 'global' check (scope in ('global', 'season')),
  season_id uuid references public.seasons(id) on delete cascade,
  sort_order int not null default 0,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_text text,
  logo_asset_id uuid references public.media_assets(id),
  social_links jsonb not null default '{}'::jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null,
  slug text not null unique,
  role text,
  avatar_asset_id uuid references public.media_assets(id),
  bio text,
  social_links jsonb not null default '{}'::jsonb,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.season_teams (
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed int,
  status text not null default 'pending',
  group_name text,
  achievements text,
  created_at timestamptz not null default now(),
  primary key (season_id, team_id)
);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  role text,
  joined_at date,
  left_at date,
  unique (player_id, team_id, season_id)
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  slug text not null,
  status public.entity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, slug)
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  type public.stage_type not null,
  sort_order int not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  stage_id uuid references public.stages(id) on delete set null,
  title text not null,
  status public.match_status not null default 'scheduled',
  starts_at timestamptz,
  round_label text,
  bracket_position int,
  winner_team_id uuid references public.teams(id) on delete set null,
  next_match_id uuid references public.matches(id) on delete set null,
  next_match_slot int check (next_match_slot in (1, 2)),
  stream_url text,
  vod_url text,
  report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.match_participants (
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  slot int not null check (slot in (1, 2)),
  score int,
  result text,
  seed_source text,
  primary key (match_id, slot)
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.bracket_edges (
  id uuid primary key default gen_random_uuid(),
  from_match_id uuid not null references public.matches(id) on delete cascade,
  outcome text not null check (outcome in ('winner', 'loser')),
  to_match_id uuid not null references public.matches(id) on delete cascade,
  to_slot int not null check (to_slot in (1, 2)),
  unique (from_match_id, outcome, to_match_id, to_slot)
);

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade,
  title text not null,
  slug text not null unique,
  excerpt text,
  category text,
  status public.entity_status not null default 'draft',
  published_at timestamptz,
  href text,
  hero_asset_id uuid references public.media_assets(id),
  body jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rulesets (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade,
  title text not null,
  status public.entity_status not null default 'draft',
  body text not null,
  pdf_asset_id uuid references public.media_assets(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete cascade,
  name text not null,
  url text,
  logo_text text,
  logo_asset_id uuid references public.media_assets(id),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and (role = required_role or role = 'super_admin')
  );
$$;

create or replace function public.can_manage_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('content_manager');
$$;

create or replace function public.can_manage_tournaments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('tournament_manager');
$$;

create or replace function public.can_manage_design()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('designer');
$$;

create or replace function public.can_manage_media()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('media_manager');
$$;

create or replace function public.advance_match_winner(match_id_input uuid, winner_team_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_record record;
begin
  if not public.can_manage_tournaments() then
    raise exception 'not authorized';
  end if;

  update public.matches
  set winner_team_id = winner_team_id_input,
      status = 'completed',
      updated_at = now()
  where id = match_id_input;

  for edge_record in
    select * from public.bracket_edges
    where from_match_id = match_id_input and outcome = 'winner'
  loop
    insert into public.match_participants (match_id, team_id, slot, result)
    values (edge_record.to_match_id, winner_team_id_input, edge_record.to_slot, null)
    on conflict (match_id, slot)
    do update set team_id = excluded.team_id;
  end loop;
end;
$$;

create or replace function public.create_season_from_template(
  season_name text,
  season_slug text,
  theme_tokens jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_season_id uuid;
  new_theme_id uuid;
  overview_page_id uuid;
  teams_page_id uuid;
  schedule_page_id uuid;
  bracket_page_id uuid;
  rules_page_id uuid;
  news_page_id uuid;
begin
  if not public.has_role('admin') then
    raise exception 'not authorized';
  end if;

  insert into public.seasons (name, slug, status)
  values (season_name, season_slug, 'draft')
  returning id into new_season_id;

  insert into public.themes (scope, season_id, name, tokens)
  values ('season', new_season_id, season_name || ' Theme', theme_tokens)
  returning id into new_theme_id;

  update public.seasons set theme_id = new_theme_id where id = new_season_id;

  insert into public.pages (title, slug, status, scope, season_id)
  values
    (season_name, season_slug, 'draft', 'season', new_season_id),
    ('Teams', 'teams', 'draft', 'season', new_season_id),
    ('Schedule', 'schedule', 'draft', 'season', new_season_id),
    ('Bracket', 'bracket', 'draft', 'season', new_season_id),
    ('Rules', 'rules', 'draft', 'season', new_season_id),
    ('News', 'news', 'draft', 'season', new_season_id);

  select id into overview_page_id from public.pages where season_id = new_season_id and slug = season_slug;
  select id into teams_page_id from public.pages where season_id = new_season_id and slug = 'teams';
  select id into schedule_page_id from public.pages where season_id = new_season_id and slug = 'schedule';
  select id into bracket_page_id from public.pages where season_id = new_season_id and slug = 'bracket';
  select id into rules_page_id from public.pages where season_id = new_season_id and slug = 'rules';
  select id into news_page_id from public.pages where season_id = new_season_id and slug = 'news';

  insert into public.routes (path, status, target_type, target_id)
  values
    ('/seasons/' || season_slug, 'draft', 'page', overview_page_id),
    ('/seasons/' || season_slug || '/teams', 'draft', 'page', teams_page_id),
    ('/seasons/' || season_slug || '/schedule', 'draft', 'page', schedule_page_id),
    ('/seasons/' || season_slug || '/bracket', 'draft', 'page', bracket_page_id),
    ('/seasons/' || season_slug || '/rules', 'draft', 'page', rules_page_id),
    ('/seasons/' || season_slug || '/news', 'draft', 'page', news_page_id);

  return new_season_id;
end;
$$;

alter table public.site_settings enable row level security;
alter table public.media_assets enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.themes enable row level security;
alter table public.seasons enable row level security;
alter table public.pages enable row level security;
alter table public.page_blocks enable row level security;
alter table public.routes enable row level security;
alter table public.redirects enable row level security;
alter table public.navigation_items enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.season_teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.tournaments enable row level security;
alter table public.stages enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_results enable row level security;
alter table public.bracket_edges enable row level security;
alter table public.news_posts enable row level security;
alter table public.rulesets enable row level security;
alter table public.sponsors enable row level security;
alter table public.audit_logs enable row level security;

create policy "Public read site settings" on public.site_settings for select using (true);
create policy "Super admins manage settings" on public.site_settings for all using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

create policy "Public read published themes" on public.themes for select using (is_published = true or public.has_role('viewer'));
create policy "Designers manage themes" on public.themes for all using (public.can_manage_design()) with check (public.can_manage_design());

create policy "Public read active seasons" on public.seasons for select using (status in ('active', 'archived') or public.has_role('viewer'));
create policy "Admins manage seasons" on public.seasons for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "Public read published pages" on public.pages for select using (status = 'published' or public.has_role('viewer'));
create policy "Content managers manage pages" on public.pages for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Public read visible page blocks" on public.page_blocks for select using (
  is_visible = true and exists (
    select 1 from public.pages
    where pages.id = page_blocks.page_id and pages.status = 'published'
  )
  or public.has_role('viewer')
);
create policy "Content managers manage page blocks" on public.page_blocks for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Public read published routes" on public.routes for select using (status = 'published' or public.has_role('viewer'));
create policy "Content managers manage routes" on public.routes for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Public read redirects" on public.redirects for select using (is_active = true);
create policy "Content managers manage redirects" on public.redirects for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Public read navigation" on public.navigation_items for select using (is_visible = true or public.has_role('viewer'));
create policy "Content managers manage navigation" on public.navigation_items for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Public read media" on public.media_assets for select using (is_deleted = false);
create policy "Media managers manage media" on public.media_assets for all using (public.can_manage_media()) with check (public.can_manage_media());

create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.has_role('viewer'));
create policy "Users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Users read own roles" on public.user_roles for select using (user_id = auth.uid() or public.has_role('viewer'));
create policy "Super admins manage roles" on public.user_roles for all using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

create policy "Public read teams" on public.teams for select using (is_deleted = false);
create policy "Admins manage teams" on public.teams for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "Public read players" on public.players for select using (is_deleted = false);
create policy "Admins manage players" on public.players for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "Public read season teams" on public.season_teams for select using (true);
create policy "Admins manage season teams" on public.season_teams for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "Public read team memberships" on public.team_memberships for select using (true);
create policy "Admins manage team memberships" on public.team_memberships for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "Public read tournaments" on public.tournaments for select using (status = 'published' or public.has_role('viewer'));
create policy "Tournament managers manage tournaments" on public.tournaments for all using (public.can_manage_tournaments()) with check (public.can_manage_tournaments());

create policy "Public read stages" on public.stages for select using (true);
create policy "Tournament managers manage stages" on public.stages for all using (public.can_manage_tournaments()) with check (public.can_manage_tournaments());

create policy "Public read matches" on public.matches for select using (true);
create policy "Tournament managers manage matches" on public.matches for all using (public.can_manage_tournaments()) with check (public.can_manage_tournaments());

create policy "Public read match participants" on public.match_participants for select using (true);
create policy "Tournament managers manage match participants" on public.match_participants for all using (public.can_manage_tournaments()) with check (public.can_manage_tournaments());

create policy "Tournament managers manage match results" on public.match_results for all using (public.can_manage_tournaments()) with check (public.can_manage_tournaments());
create policy "Public read bracket edges" on public.bracket_edges for select using (true);
create policy "Tournament managers manage bracket edges" on public.bracket_edges for all using (public.can_manage_tournaments()) with check (public.can_manage_tournaments());

create policy "Public read published news" on public.news_posts for select using (status = 'published' and (published_at is null or published_at <= now()) or public.has_role('viewer'));
create policy "Content managers manage news" on public.news_posts for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Public read published rulesets" on public.rulesets for select using (status = 'published' or public.has_role('viewer'));
create policy "Content managers manage rulesets" on public.rulesets for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Public read active sponsors" on public.sponsors for select using (is_active = true or public.has_role('viewer'));
create policy "Content managers manage sponsors" on public.sponsors for all using (public.can_manage_content()) with check (public.can_manage_content());

create policy "Admins read audit logs" on public.audit_logs for select using (public.has_role('viewer'));
create policy "Privileged users insert audit logs" on public.audit_logs for insert with check (
  public.has_role('admin')
  or public.has_role('designer')
  or public.has_role('tournament_manager')
  or public.has_role('content_manager')
  or public.has_role('media_manager')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('global', 'global', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']),
  ('seasons', 'seasons', true, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']),
  ('teams', 'teams', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('players', 'players', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('news', 'news', true, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('sponsors', 'sponsors', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('documents', 'documents', true, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy "Public read public AMS storage"
on storage.objects for select
using (bucket_id in ('global', 'seasons', 'teams', 'players', 'news', 'sponsors', 'documents'));

create policy "Media managers upload AMS storage"
on storage.objects for insert
with check (
  bucket_id in ('global', 'seasons', 'teams', 'players', 'news', 'sponsors', 'documents')
  and public.can_manage_media()
);

create policy "Media managers update AMS storage"
on storage.objects for update
using (
  bucket_id in ('global', 'seasons', 'teams', 'players', 'news', 'sponsors', 'documents')
  and public.can_manage_media()
)
with check (
  bucket_id in ('global', 'seasons', 'teams', 'players', 'news', 'sponsors', 'documents')
  and public.can_manage_media()
);

create policy "Media managers delete AMS storage"
on storage.objects for delete
using (
  bucket_id in ('global', 'seasons', 'teams', 'players', 'news', 'sponsors', 'documents')
  and public.can_manage_media()
);

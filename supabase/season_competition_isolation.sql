-- AMS season competition isolation migration
-- Run this after the base app schema.
-- Goal: new seasons keep pages/navigation/templates, but do not copy teams, matches, brackets, rules or news.

alter table if exists public.teams
  add column if not exists tag text,
  add column if not exists default_logo_id uuid references public.media_assets(id) on delete set null;

alter table if exists public.season_teams
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists logo_asset_id uuid references public.media_assets(id) on delete set null,
  add column if not exists tag text,
  add column if not exists display_name text,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.season_teams
  drop constraint if exists season_teams_status_check;

alter table if exists public.season_teams
  add constraint season_teams_status_check
  check (status in ('active', 'inactive', 'eliminated', 'archived', 'confirmed', 'pending', 'withdrawn'));

update public.season_teams
set status = case status
  when 'confirmed' then 'active'
  when 'pending' then 'inactive'
  when 'withdrawn' then 'archived'
  else status
end
where status in ('confirmed', 'pending', 'withdrawn');

create unique index if not exists season_teams_unique_season_team
  on public.season_teams(season_id, team_id);

create index if not exists season_teams_season_id_idx on public.season_teams(season_id);
create index if not exists matches_season_id_idx on public.matches(season_id);
create index if not exists news_posts_season_id_idx on public.news_posts(season_id);
create index if not exists rulesets_season_id_idx on public.rulesets(season_id);
create index if not exists sponsors_season_id_idx on public.sponsors(season_id);

create or replace function public.create_season_from_template(
  season_name text,
  season_slug text,
  theme_tokens jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_season_id uuid := gen_random_uuid();
  new_theme_id uuid := gen_random_uuid();
  overview_page_id uuid := gen_random_uuid();
  teams_page_id uuid := gen_random_uuid();
  schedule_page_id uuid := gen_random_uuid();
  bracket_page_id uuid := gen_random_uuid();
  rules_page_id uuid := gen_random_uuid();
  news_page_id uuid := gen_random_uuid();
begin
  insert into public.themes (id, scope, season_id, name, tokens)
  values (new_theme_id, 'season', new_season_id, season_name || ' Theme', theme_tokens);

  insert into public.seasons (id, name, slug, status, theme_id)
  values (new_season_id, season_name, season_slug, 'draft', new_theme_id);

  insert into public.pages (id, title, slug, scope, season_id, status, seo_title, seo_description)
  values
    (overview_page_id, season_name || ' Overview', season_slug, 'season', new_season_id, 'draft', season_name, null),
    (teams_page_id, season_name || ' Teams', 'teams', 'season', new_season_id, 'draft', season_name || ' Teams', null),
    (schedule_page_id, season_name || ' Schedule', 'schedule', 'season', new_season_id, 'draft', season_name || ' Schedule', null),
    (bracket_page_id, season_name || ' Bracket', 'bracket', 'season', new_season_id, 'draft', season_name || ' Bracket', null),
    (rules_page_id, season_name || ' Rules', 'rules', 'season', new_season_id, 'draft', season_name || ' Rules', null),
    (news_page_id, season_name || ' News', 'news', 'season', new_season_id, 'draft', season_name || ' News', null);

  insert into public.routes (path, status, target_type, target_id)
  values
    ('/seasons/' || season_slug, 'draft', 'page', overview_page_id),
    ('/seasons/' || season_slug || '/teams', 'draft', 'page', teams_page_id),
    ('/seasons/' || season_slug || '/schedule', 'draft', 'page', schedule_page_id),
    ('/seasons/' || season_slug || '/bracket', 'draft', 'page', bracket_page_id),
    ('/seasons/' || season_slug || '/rules', 'draft', 'page', rules_page_id),
    ('/seasons/' || season_slug || '/news', 'draft', 'page', news_page_id);

  insert into public.page_blocks (page_id, type, sort_order, is_visible, content)
  values
    (overview_page_id, 'hero', 10, true, jsonb_build_object('title', season_name, 'body', 'Season overview', 'seasonId', new_season_id)),
    (teams_page_id, 'team_list', 10, true, jsonb_build_object('title', 'Teams', 'seasonId', new_season_id)),
    (schedule_page_id, 'match_list', 10, true, jsonb_build_object('title', 'Schedule', 'seasonId', new_season_id)),
    (bracket_page_id, 'bracket_embed', 10, true, jsonb_build_object('title', 'Bracket', 'seasonId', new_season_id)),
    (rules_page_id, 'rules_block', 10, true, jsonb_build_object('title', 'Rules', 'seasonId', new_season_id)),
    (news_page_id, 'news_list', 10, true, jsonb_build_object('title', 'News', 'seasonId', new_season_id));

  -- Important: do not insert into season_teams, tournaments, stages, matches,
  -- match_participants, bracket_edges, rulesets or news_posts here.
  -- Those Competition and Content records are managed per season after creation.

  return new_season_id;
end;
$$;

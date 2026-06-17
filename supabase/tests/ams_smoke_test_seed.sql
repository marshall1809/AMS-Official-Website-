-- AMS smoke-test seed data.
-- Run only after `supabase db reset` completes successfully.
-- Do not run against production.
--
-- This file intentionally does not use supabase/ams_platform_schema.sql.
-- It assumes migrations 001 through 015 have been applied.
--
-- Auth/admin note:
-- This seed does not insert auth.users records. For permission tests, create real
-- Supabase Auth users first, then add rows to public.user_role_assignments with
-- those user IDs. See rls_smoke_test_checklist.md.
--
-- Hall of Fame category note:
-- The current schema has no hall_of_fame_categories table. Category is currently
-- represented by public.hall_of_fame_entries.type.

begin;

-- Known IDs used across this smoke test.
-- Season / division / competition
-- 10000000-0000-0000-0000-000000000001 season 1
-- 10000000-0000-0000-0000-000000000099 draft season
-- 20000000-0000-0000-0000-000000000001 division 1
-- 20000000-0000-0000-0000-000000000099 draft division
-- 30000000-0000-0000-0000-000000000001 league competition
-- 30000000-0000-0000-0000-000000000099 draft competition
-- 40000000-0000-0000-0000-000000000001 league stage
-- 50000000-0000-0000-0000-000000000001 match
-- 60000000-0000-0000-0000-000000000001 team alpha
-- 60000000-0000-0000-0000-000000000002 team beta
-- 70000000-0000-0000-0000-000000000001 team alpha version
-- 70000000-0000-0000-0000-000000000002 team beta version
-- 80000000-0000-0000-0000-000000000001 season team alpha
-- 80000000-0000-0000-0000-000000000002 season team beta
-- 81000000-0000-0000-0000-000000000001 division team alpha
-- 81000000-0000-0000-0000-000000000002 division team beta
-- 82000000-0000-0000-0000-000000000001 competition entry alpha
-- 82000000-0000-0000-0000-000000000002 competition entry beta

-- Site setting: update the singleton row inserted by 014_seed_defaults.sql, or create it if absent.
update public.site_settings
set
  site_name = 'Alliance Master Series Smoke Test',
  default_title = 'Alliance Master Series',
  default_description = 'Smoke-test data for the AMS platform.',
  logo_text = 'AMS',
  logo_subtext = 'Alliance Master Series',
  footer_text = 'Alliance Master Series',
  settings = jsonb_build_object('smokeTest', true),
  updated_at = now();

insert into public.site_settings (
  id,
  site_name,
  default_title,
  default_description,
  logo_text,
  logo_subtext,
  footer_text,
  settings
)
select
  '00000000-0000-0000-0000-000000000001',
  'Alliance Master Series Smoke Test',
  'Alliance Master Series',
  'Smoke-test data for the AMS platform.',
  'AMS',
  'Alliance Master Series',
  'Alliance Master Series',
  jsonb_build_object('smokeTest', true)
where not exists (select 1 from public.site_settings);

-- Global theme: 014_seed_defaults.sql creates the active global theme. Keep a deterministic smoke theme inactive.
insert into public.themes (id, scope, scope_id, name, tokens, is_active)
values (
  '01000000-0000-0000-0000-000000000001',
  'global',
  null,
  'AMS Smoke Test Theme',
  jsonb_build_object(
    'colorBg', '#050b16',
    'colorBgSoft', '#071120',
    'colorPanel', 'rgba(10, 24, 54, 0.72)',
    'colorText', '#f4f7fb',
    'colorTextMuted', '#8ea0ba',
    'colorAccent', '#c9a84c',
    'radiusCard', '6px',
    'radiusButton', '6px'
  ),
  false
)
on conflict (id) do nothing;

-- Public season hierarchy.
insert into public.seasons (id, name, slug, status, starts_at, summary, settings)
values (
  '10000000-0000-0000-0000-000000000001',
  'Season 1',
  'season-1',
  'active',
  now(),
  'Smoke-test Season 1.',
  jsonb_build_object('smokeTest', true)
)
on conflict (id) do nothing;

insert into public.divisions (id, season_id, name, slug, tier, status, summary, settings)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Division 1',
  'division-1',
  1,
  'published',
  'Smoke-test Division 1.',
  jsonb_build_object('smokeTest', true)
)
on conflict (id) do nothing;

insert into public.competitions (id, division_id, name, slug, status, format_key, generated_config, starts_at)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'League Competition',
  'league-competition',
  'ready',
  'league',
  jsonb_build_object('pointsWin', 3, 'pointsDraw', 1, 'pointsLoss', 0),
  now()
)
on conflict (id) do nothing;

insert into public.stages (id, competition_id, name, slug, type, status, sort_order, config)
values (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'League Stage',
  'league-stage',
  'league',
  'active',
  1,
  jsonb_build_object('table', true)
)
on conflict (id) do nothing;

-- Draft hierarchy for RLS draft-protection checks.
insert into public.seasons (id, name, slug, status, summary)
values (
  '10000000-0000-0000-0000-000000000099',
  'Draft Season',
  'draft-season',
  'draft',
  'Should not be readable anonymously.'
)
on conflict (id) do nothing;

insert into public.divisions (id, season_id, name, slug, tier, status, summary)
values (
  '20000000-0000-0000-0000-000000000099',
  '10000000-0000-0000-0000-000000000099',
  'Draft Division',
  'draft-division',
  99,
  'draft',
  'Should not be readable anonymously.'
)
on conflict (id) do nothing;

insert into public.competitions (id, division_id, name, slug, status, format_key)
values (
  '30000000-0000-0000-0000-000000000099',
  '20000000-0000-0000-0000-000000000099',
  'Draft Competition',
  'draft-competition',
  'draft',
  'league'
)
on conflict (id) do nothing;

-- Teams and team versions.
insert into public.teams (id, canonical_name, slug, status, description, socials)
values
  ('60000000-0000-0000-0000-000000000001', 'AMS Alpha', 'ams-alpha', 'published', 'Smoke-test Team Alpha.', jsonb_build_object('website', 'https://example.com/alpha')),
  ('60000000-0000-0000-0000-000000000002', 'AMS Beta', 'ams-beta', 'published', 'Smoke-test Team Beta.', jsonb_build_object('website', 'https://example.com/beta'))
on conflict (id) do nothing;

insert into public.team_versions (id, team_id, name, tag, slug, primary_color, secondary_color, description, created_reason)
values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'AMS Alpha', 'ALP', 'ams-alpha', '#c9a84c', '#050b16', 'Season 1 Alpha identity.', 'Smoke test version.'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'AMS Beta', 'BET', 'ams-beta', '#8ea0ba', '#050b16', 'Season 1 Beta identity.', 'Smoke test version.')
on conflict (id) do nothing;

update public.teams
set current_version_id = '70000000-0000-0000-0000-000000000001', updated_at = now()
where id = '60000000-0000-0000-0000-000000000001';

update public.teams
set current_version_id = '70000000-0000-0000-0000-000000000002', updated_at = now()
where id = '60000000-0000-0000-0000-000000000002';

-- Season, division, and competition participation.
insert into public.season_teams (id, season_id, team_id, team_version_id, status, seed)
values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'active', 1),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'active', 2)
on conflict (id) do nothing;

insert into public.division_teams (id, division_id, season_team_id, status, seed, settings)
values
  ('81000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'active', 1, jsonb_build_object('smokeTest', true)),
  ('81000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'active', 2, jsonb_build_object('smokeTest', true))
on conflict (id) do nothing;

insert into public.competition_entries (id, competition_id, division_team_id, seed, status, source)
values
  ('82000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 1, 'active', 'smoke-test'),
  ('82000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', 2, 'active', 'smoke-test')
on conflict (id) do nothing;

-- One completed match with certified result.
insert into public.matches (id, stage_id, title, status, starts_at, bracket_position, best_of)
values (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'AMS Alpha vs AMS Beta',
  'certified',
  now(),
  1,
  1
)
on conflict (id) do nothing;

insert into public.match_participants (id, match_id, competition_entry_id, slot, source_type)
values
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 1, 'manual'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', 2, 'manual')
on conflict (id) do nothing;

insert into public.match_results (id, match_id, revision, is_current, winner_participant_id, status, score, aggregate_score, result_notes, certified_at)
values (
  '52000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  1,
  true,
  '51000000-0000-0000-0000-000000000001',
  'certified',
  jsonb_build_object('teams', jsonb_build_array(
    jsonb_build_object('slot', 1, 'score', 1),
    jsonb_build_object('slot', 2, 'score', 0)
  )),
  '{}'::jsonb,
  'Smoke-test certified result.',
  now()
)
on conflict (id) do nothing;

-- Standings table and two standings rows.
insert into public.standings_rules (id, stage_id, points_win, points_draw, points_loss, config)
values (
  '53000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  3,
  1,
  0,
  jsonb_build_object('smokeTest', true)
)
on conflict (id) do nothing;

insert into public.standings_cache (
  id,
  stage_id,
  competition_entry_id,
  calculation_version,
  position,
  played,
  wins,
  draws,
  losses,
  score_for,
  score_against,
  score_difference,
  points,
  adjusted_points,
  tiebreak_data,
  is_snapshot
)
values
  ('54000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 1, 1, 1, 1, 0, 0, 1, 0, 1, 3, 3, jsonb_build_object('headToHead', 1), false),
  ('54000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', 1, 2, 1, 0, 0, 1, 0, 1, -1, 0, 0, jsonb_build_object('headToHead', 0), false)
on conflict (id) do nothing;

-- Champion snapshot and Hall of Fame entry.
insert into public.snapshots (
  id,
  kind,
  source_entity_type,
  source_entity_id,
  scope,
  scope_id,
  revision,
  data,
  created_reason
)
values (
  '90000000-0000-0000-0000-000000000001',
  'champion',
  'competition',
  '30000000-0000-0000-0000-000000000001',
  'competition',
  '30000000-0000-0000-0000-000000000001',
  1,
  jsonb_build_object(
    'title', 'Season 1 Division 1 Champion',
    'teamName', 'AMS Alpha',
    'teamTag', 'ALP',
    'competition', 'League Competition',
    'season', 'Season 1',
    'division', 'Division 1'
  ),
  'Smoke-test champion snapshot.'
)
on conflict (id) do nothing;

insert into public.hall_of_fame_entries (
  id,
  type,
  season_id,
  division_id,
  competition_id,
  title,
  slug,
  description,
  primary_snapshot_id,
  status,
  published_at
)
values (
  '91000000-0000-0000-0000-000000000001',
  'competition_champion',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'Season 1 Division 1 Champion',
  'season-1-division-1-champion',
  'Hall of Fame smoke-test entry. Category is represented by type = competition_champion.',
  '90000000-0000-0000-0000-000000000001',
  'published',
  now()
)
on conflict (id) do nothing;

insert into public.hall_of_fame_entry_snapshots (id, entry_id, snapshot_id, relation_label, sort_order)
values (
  '92000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000001',
  'Champion',
  1
)
on conflict (id) do nothing;

-- Internal draft snapshot used by RLS checks. It should not be readable anonymously.
insert into public.snapshots (
  id,
  kind,
  source_entity_type,
  source_entity_id,
  scope,
  scope_id,
  revision,
  data,
  created_reason
)
values (
  '90000000-0000-0000-0000-000000000099',
  'season_summary',
  'season',
  '10000000-0000-0000-0000-000000000099',
  'season',
  '10000000-0000-0000-0000-000000000099',
  1,
  jsonb_build_object('internal', true, 'title', 'Draft internal snapshot'),
  'Smoke-test draft/internal snapshot.'
)
on conflict (id) do nothing;

-- Public CMS page, block, and route.
insert into public.pages (id, scope, scope_id, title, slug, status, seo_title, seo_description, published_at)
values (
  'a0000000-0000-0000-0000-000000000001',
  'global',
  null,
  'Smoke Test Page',
  'smoke-test',
  'published',
  'Smoke Test Page',
  'Public smoke-test page for AMS.',
  now()
)
on conflict (id) do nothing;

insert into public.page_blocks (id, page_id, type, sort_order, is_visible, content)
values (
  'a1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'text',
  1,
  true,
  jsonb_build_object('body', 'AMS smoke-test page block.')
)
on conflict (id) do nothing;

insert into public.routes (id, path, target_type, target_id, status, canonical_path)
values (
  'a2000000-0000-0000-0000-000000000001',
  '/smoke-test',
  'page',
  'a0000000-0000-0000-0000-000000000001',
  'active',
  '/smoke-test'
)
on conflict (id) do nothing;

-- Draft page used by RLS checks. It should not be readable anonymously.
insert into public.pages (id, scope, scope_id, title, slug, status, seo_title, seo_description)
values (
  'a0000000-0000-0000-0000-000000000099',
  'global',
  null,
  'Draft Smoke Test Page',
  'draft-smoke-test',
  'draft',
  'Draft Smoke Test Page',
  'Should not be readable anonymously.'
)
on conflict (id) do nothing;

commit;

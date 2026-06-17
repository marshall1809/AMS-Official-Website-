-- 014_seed_defaults.sql
-- Minimal seed data for a fresh AMS Supabase project.
-- Replace the admin UUID before running if you want automatic Super Admin bootstrap.

insert into public.site_settings (
  site_name,
  default_title,
  default_description,
  logo_text,
  logo_subtext,
  footer_text,
  settings
)
select
  'Alliance Master Series',
  'Alliance Master Series',
  'Competition platform for the Alliance Master Series.',
  'AMS',
  'Alliance Master Series',
  'Alliance Master Series',
  '{}'::jsonb
where not exists (select 1 from public.site_settings);

insert into public.themes (scope, scope_id, name, tokens, is_active)
select
  'global',
  null,
  'AMS Global Theme',
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
  true
where not exists (select 1 from public.themes where scope = 'global');

insert into public.competition_templates (name, slug, description, is_active)
values
  ('AMS League Template', 'ams-league', 'Round-robin league competition with standings.', true),
  ('AMS Knockout Template', 'ams-knockout', 'Single-elimination knockout competition.', true),
  ('AMS Group + Knockout Template', 'ams-group-knockout', 'Group stage with qualification into knockout rounds.', true),
  ('AMS Home & Away Knockout Template', 'ams-home-away-knockout', 'Two-leg knockout competition with aggregate scoring.', true)
on conflict (slug) do nothing;

insert into public.competition_template_versions (template_id, version, format_key, config, stage_blueprint, advancement_blueprint, standings_blueprint, is_published)
select id, 1, 'league',
  jsonb_build_object('supportsDraws', true),
  jsonb_build_array(jsonb_build_object('type', 'league', 'name', 'League Stage')),
  '[]'::jsonb,
  jsonb_build_object('pointsWin', 3, 'pointsDraw', 1, 'pointsLoss', 0),
  true
from public.competition_templates
where slug = 'ams-league'
on conflict (template_id, version) do nothing;

insert into public.competition_template_versions (template_id, version, format_key, config, stage_blueprint, advancement_blueprint, standings_blueprint, is_published)
select id, 1, 'single_elimination',
  jsonb_build_object('supportsByes', true),
  jsonb_build_array(jsonb_build_object('type', 'single_elimination', 'name', 'Knockout Stage')),
  jsonb_build_array(jsonb_build_object('source', 'winner', 'target', 'next_match')),
  '{}'::jsonb,
  true
from public.competition_templates
where slug = 'ams-knockout'
on conflict (template_id, version) do nothing;

insert into public.competition_template_versions (template_id, version, format_key, config, stage_blueprint, advancement_blueprint, standings_blueprint, is_published)
select id, 1, 'group_knockout',
  jsonb_build_object('defaultGroups', 4, 'qualifiersPerGroup', 2),
  jsonb_build_array(
    jsonb_build_object('type', 'group', 'name', 'Group Stage'),
    jsonb_build_object('type', 'single_elimination', 'name', 'Playoffs')
  ),
  jsonb_build_array(jsonb_build_object('source', 'group_rank', 'target', 'playoffs')),
  jsonb_build_object('pointsWin', 3, 'pointsDraw', 1, 'pointsLoss', 0),
  true
from public.competition_templates
where slug = 'ams-group-knockout'
on conflict (template_id, version) do nothing;

insert into public.competition_template_versions (template_id, version, format_key, config, stage_blueprint, advancement_blueprint, standings_blueprint, is_published)
select id, 1, 'home_away_knockout',
  jsonb_build_object('aggregateScoring', true),
  jsonb_build_array(jsonb_build_object('type', 'home_away_knockout', 'name', 'Home & Away Knockout')),
  jsonb_build_array(jsonb_build_object('source', 'aggregate_winner', 'target', 'next_match')),
  '{}'::jsonb,
  true
from public.competition_templates
where slug = 'ams-home-away-knockout'
on conflict (template_id, version) do nothing;

-- Optional Super Admin bootstrap:
-- Replace 00000000-0000-0000-0000-000000000000 with your auth.users.id, then uncomment.
-- insert into public.user_role_assignments (user_id, role, scope, scope_id, capabilities, is_active)
-- values (
--   '00000000-0000-0000-0000-000000000000',
--   'super_admin',
--   'global',
--   null,
--   array[
--     'view_admin','manage_settings','manage_users','manage_permissions','manage_seasons','manage_divisions',
--     'manage_competitions','manage_templates','manage_teams','manage_media','delete_media','manage_themes',
--     'manage_pages','publish_pages','enter_results','certify_results','override_results','manage_standings',
--     'manage_brackets','finalize_competition','create_snapshots','manage_hall_of_fame','manage_statistics',
--     'view_audit_log','restore_versions'
--   ],
--   true
-- )
-- on conflict do nothing;

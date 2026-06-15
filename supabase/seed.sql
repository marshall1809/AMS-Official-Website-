insert into public.site_settings (
  id,
  site_name,
  default_title,
  default_description,
  contact_label,
  contact_url,
  footer_text,
  logo_text,
  logo_subtext
) values (
  '00000000-0000-0000-0000-000000000001',
  'Alliance Master Series',
  'Alliance Master Series',
  'A structured competitive alliance league for Supremacy: World War 3.',
  'Marc1809',
  'https://discord.gg/Ssz3z7vvcB',
  'Season One - June 2026 - Supremacy: World War 3',
  'AMS',
  'Alliance Master Series'
) on conflict (id) do nothing;

insert into public.themes (id, scope, name, tokens)
values (
  '10000000-0000-0000-0000-000000000001',
  'global',
  'AMS Global Default',
  '{
    "colorBg":"#050B16",
    "colorBgSoft":"#071120",
    "colorPanel":"rgba(12, 28, 60, 0.48)",
    "colorPanelStrong":"rgba(8, 20, 48, 0.78)",
    "colorText":"#F4F7FB",
    "colorTextMuted":"#7D91AD",
    "colorTextSoft":"#B9C7DC",
    "colorAccent":"#C9A84C",
    "colorAccentStrong":"#AA8730",
    "colorBorder":"rgba(201, 168, 76, 0.20)",
    "colorSuccess":"#4EB36A",
    "colorDanger":"#E05C5C",
    "fontDisplay":"Georgia, ''Times New Roman'', serif",
    "fontBody":"Arial, Helvetica, sans-serif",
    "radiusCard":"4px",
    "radiusButton":"2px",
    "shadowPanel":"0 24px 80px rgba(0, 0, 0, 0.28)",
    "buttonTransform":"uppercase",
    "backgroundTexture":"grid"
  }'::jsonb
) on conflict (id) do nothing;

insert into public.seasons (
  id,
  name,
  slug,
  status,
  theme_id,
  launch_label,
  map_name,
  match_format,
  min_teams,
  summary
) values (
  '20000000-0000-0000-0000-000000000001',
  'Season One',
  'season-one',
  'active',
  '10000000-0000-0000-0000-000000000001',
  'June 2026',
  'Antarctica 4x Alliance Map',
  '6 vs 6',
  16,
  'The Alliance Master Series is the most structured, prestigious, and competitive alliance league ever organised for Supremacy: World War 3.'
) on conflict (id) do nothing;

insert into public.pages (id, title, slug, status, scope, season_id, seo_title, seo_description)
values
  ('30000000-0000-0000-0000-000000000001', 'Home', 'home', 'published', 'global', '20000000-0000-0000-0000-000000000001', 'Alliance Master Series', 'Where alliances become legends.'),
  ('30000000-0000-0000-0000-000000000002', 'Season One', 'season-one', 'published', 'season', '20000000-0000-0000-0000-000000000001', 'Season One', 'Season One overview.'),
  ('30000000-0000-0000-0000-000000000003', 'Teams', 'teams', 'published', 'season', '20000000-0000-0000-0000-000000000001', 'Season One Teams', 'Season One participating teams.'),
  ('30000000-0000-0000-0000-000000000004', 'Schedule', 'schedule', 'published', 'season', '20000000-0000-0000-0000-000000000001', 'Season One Schedule', 'Season One match schedule.'),
  ('30000000-0000-0000-0000-000000000005', 'Bracket', 'bracket', 'published', 'season', '20000000-0000-0000-0000-000000000001', 'Season One Bracket', 'Season One tournament bracket.'),
  ('30000000-0000-0000-0000-000000000006', 'Rules', 'rules', 'published', 'season', '20000000-0000-0000-0000-000000000001', 'Season One Rules', 'Season One rules.'),
  ('30000000-0000-0000-0000-000000000007', 'News', 'news', 'published', 'season', '20000000-0000-0000-0000-000000000001', 'Season One News', 'Season One news.')
on conflict (id) do nothing;

insert into public.routes (id, path, status, target_type, target_id)
values
  ('40000000-0000-0000-0000-000000000001', '/', 'published', 'page', '30000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '/seasons/season-one', 'published', 'page', '30000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003', '/seasons/season-one/teams', 'published', 'page', '30000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000004', '/seasons/season-one/schedule', 'published', 'page', '30000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000005', '/seasons/season-one/bracket', 'published', 'page', '30000000-0000-0000-0000-000000000005'),
  ('40000000-0000-0000-0000-000000000006', '/seasons/season-one/rules', 'published', 'page', '30000000-0000-0000-0000-000000000006'),
  ('40000000-0000-0000-0000-000000000007', '/seasons/season-one/news', 'published', 'page', '30000000-0000-0000-0000-000000000007')
on conflict (id) do nothing;

insert into public.redirects (id, source_path, destination_path, status_code, is_active)
values
  ('50000000-0000-0000-0000-000000000001', '/teams', '/seasons/season-one/teams', 308, true),
  ('50000000-0000-0000-0000-000000000002', '/schedule', '/seasons/season-one/schedule', 308, true),
  ('50000000-0000-0000-0000-000000000003', '/brackets', '/seasons/season-one/bracket', 308, true),
  ('50000000-0000-0000-0000-000000000004', '/news', '/seasons/season-one/news', 308, true)
on conflict (id) do nothing;

insert into public.navigation_items (id, label, href, scope, sort_order, is_visible)
values
  ('60000000-0000-0000-0000-000000000001', 'Home', '/', 'global', 1, true),
  ('60000000-0000-0000-0000-000000000002', 'Teams', '/seasons/season-one/teams', 'global', 2, true),
  ('60000000-0000-0000-0000-000000000003', 'Schedule', '/seasons/season-one/schedule', 'global', 3, true),
  ('60000000-0000-0000-0000-000000000004', 'Bracket', '/seasons/season-one/bracket', 'global', 4, true),
  ('60000000-0000-0000-0000-000000000005', 'Rules', '/seasons/season-one/rules', 'global', 5, true),
  ('60000000-0000-0000-0000-000000000006', 'News', '/seasons/season-one/news', 'global', 6, true)
on conflict (id) do nothing;

insert into public.page_blocks (id, page_id, type, sort_order, content)
values
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'announcement', 1, '{"text":"Season One is now open for registration. Minimum 16 teams required to commence. Contact Marc1809 on Discord."}'::jsonb),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'hero', 2, '{"kicker":"Season One - June 2026","title":"Where Alliances Become Legends.","body":"The Alliance Master Series is the most structured, prestigious, and competitive alliance league ever organised for Supremacy: World War 3.","primaryLabel":"View Teams","primaryHref":"/seasons/season-one/teams","secondaryLabel":"Open Bracket","secondaryHref":"/seasons/season-one/bracket"}'::jsonb),
  ('70000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'team_list', 3, '{"title":"Confirmed Alliances","seasonId":"20000000-0000-0000-0000-000000000001"}'::jsonb),
  ('70000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'match_list', 4, '{"title":"Next Matches","seasonId":"20000000-0000-0000-0000-000000000001"}'::jsonb),
  ('70000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 'bracket_embed', 1, '{"title":"Tournament Path","tournamentId":"90000000-0000-0000-0000-000000000001"}'::jsonb)
on conflict (id) do nothing;

insert into public.teams (id, name, slug, logo_text, description)
values
  ('80000000-0000-0000-0000-000000000001', 'Shadow Raiders', 'shadow-raiders', 'SR', 'A disciplined alliance built around controlled map pressure and late-game coordination.'),
  ('80000000-0000-0000-0000-000000000002', 'The Crusaders', 'the-crusaders', 'TC', 'A veteran roster known for defensive planning, deep diplomacy and patient expansion.'),
  ('80000000-0000-0000-0000-000000000003', 'Fallen Angels Resurrection', 'fallen-angels-resurrection', 'FA', 'An aggressive squad with fast starts and coordinated strike windows.'),
  ('80000000-0000-0000-0000-000000000004', 'Wolf Company', 'wolf-company', 'WC', 'A balanced team with flexible commanders and consistent tournament attendance.'),
  ('80000000-0000-0000-0000-000000000005', 'Azrael Empire', 'azrael-empire', 'AE', 'A rising alliance with high-tempo decision making and ambitious season objectives.')
on conflict (id) do nothing;

insert into public.season_teams (season_id, team_id, seed, status)
values
  ('20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 1, 'confirmed'),
  ('20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 2, 'confirmed'),
  ('20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000003', 3, 'confirmed'),
  ('20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000004', 4, 'confirmed'),
  ('20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000005', 5, 'confirmed')
on conflict do nothing;

insert into public.tournaments (id, season_id, name, slug, status)
values ('90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Season One Playoffs', 'season-one-playoffs', 'published')
on conflict (id) do nothing;

insert into public.stages (id, tournament_id, name, type, sort_order)
values ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Playoffs', 'single_elimination', 1)
on conflict (id) do nothing;

insert into public.matches (id, season_id, tournament_id, stage_id, title, status, starts_at, round_label, bracket_position, next_match_id, next_match_slot, stream_url)
values
  ('92000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Opening Match', 'scheduled', '2026-06-21T19:00:00Z', 'Round 1', 1, '92000000-0000-0000-0000-000000000003', 1, 'https://twitch.tv/'),
  ('92000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Group A Feature', 'scheduled', '2026-06-24T20:00:00Z', 'Round 1', 2, '92000000-0000-0000-0000-000000000003', 2, null),
  ('92000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'Semifinal', 'scheduled', null, 'Semifinals', 1, null, null, null)
on conflict (id) do nothing;

insert into public.match_participants (match_id, team_id, slot)
values
  ('92000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 1),
  ('92000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000005', 2),
  ('92000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 1),
  ('92000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000004', 2)
on conflict do nothing;

insert into public.bracket_edges (id, from_match_id, outcome, to_match_id, to_slot)
values
  ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'winner', '92000000-0000-0000-0000-000000000003', 1),
  ('93000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000002', 'winner', '92000000-0000-0000-0000-000000000003', 2)
on conflict (id) do nothing;

insert into public.rulesets (id, season_id, title, status, body)
values ('94000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Season One Rulebook', 'published', 'All AMS matches are contested on the Antarctica 4x alliance map. The standard format is 6 versus 6.')
on conflict (id) do nothing;

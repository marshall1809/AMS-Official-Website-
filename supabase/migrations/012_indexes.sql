-- 012_indexes.sql
-- Performance and foreign-key support indexes.

create index if not exists user_role_assignments_user_idx on public.user_role_assignments(user_id, is_active);

create index if not exists media_assets_scope_idx on public.media_assets(scope, scope_id, state);
create index if not exists media_usages_asset_idx on public.media_usages(media_asset_id);
create index if not exists media_usages_entity_idx on public.media_usages(entity_type, entity_id);

create index if not exists themes_scope_idx on public.themes(scope, scope_id, is_active);
create index if not exists seasons_status_idx on public.seasons(status);
create index if not exists divisions_season_idx on public.divisions(season_id, status);
create index if not exists competitions_division_idx on public.competitions(division_id, status);
create index if not exists stages_competition_idx on public.stages(competition_id, sort_order);
create index if not exists stage_groups_stage_idx on public.stage_groups(stage_id, sort_order);
create index if not exists stage_rounds_stage_idx on public.stage_rounds(stage_id, sort_order);

create index if not exists teams_status_idx on public.teams(status);
create index if not exists team_versions_team_idx on public.team_versions(team_id, valid_from desc);
create index if not exists season_teams_season_idx on public.season_teams(season_id, status);
create index if not exists season_teams_team_idx on public.season_teams(team_id);
create index if not exists division_teams_division_idx on public.division_teams(division_id, status);
create index if not exists competition_entries_competition_idx on public.competition_entries(competition_id, status);
create index if not exists stage_group_members_group_idx on public.stage_group_members(group_id);
create index if not exists stage_group_members_entry_idx on public.stage_group_members(competition_entry_id);

create index if not exists matches_stage_idx on public.matches(stage_id, starts_at);
create index if not exists matches_group_idx on public.matches(group_id);
create index if not exists matches_round_idx on public.matches(round_id);
create index if not exists match_participants_match_idx on public.match_participants(match_id);
create index if not exists match_participants_entry_idx on public.match_participants(competition_entry_id);
create index if not exists match_results_match_idx on public.match_results(match_id, is_current);
create index if not exists advancement_rules_stage_idx on public.advancement_rules(stage_id);
create index if not exists advancement_rules_competition_idx on public.advancement_rules(competition_id);
create index if not exists advancement_events_source_idx on public.advancement_events(source_match_id);
create index if not exists advancement_events_target_idx on public.advancement_events(target_match_id);

create index if not exists standings_rules_stage_idx on public.standings_rules(stage_id);
create index if not exists standings_adjustments_stage_idx on public.standings_adjustments(stage_id);
create index if not exists standings_cache_stage_idx on public.standings_cache(stage_id, position);
create index if not exists promotion_relegation_source_idx on public.promotion_relegation_records(source_season_id, source_division_id);

create index if not exists snapshots_source_idx on public.snapshots(source_entity_type, source_entity_id, kind);
create index if not exists snapshots_scope_idx on public.snapshots(scope, scope_id, kind);
create index if not exists hall_of_fame_scope_idx on public.hall_of_fame_entries(season_id, division_id, competition_id, status);
create index if not exists statistics_entity_idx on public.statistics_aggregates(entity_type, entity_id, metric_key);
create index if not exists statistics_scope_idx on public.statistics_aggregates(scope, scope_id, metric_key);

create index if not exists pages_scope_idx on public.pages(scope, scope_id, status);
create index if not exists page_blocks_page_idx on public.page_blocks(page_id, sort_order);
create index if not exists navigation_scope_idx on public.navigation_items(scope, scope_id, sort_order);
create index if not exists routes_path_idx on public.routes(path);
create index if not exists news_scope_idx on public.news_posts(scope, scope_id, status, published_at desc);
create index if not exists rules_scope_idx on public.rulesets(scope, scope_id, status);
create index if not exists sponsors_scope_idx on public.sponsors(scope, scope_id, status, sort_order);

create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists entity_versions_entity_idx on public.entity_versions(entity_type, entity_id, version desc);

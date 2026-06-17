-- 013_rls_policies.sql
-- Row Level Security baseline with separated read/write capabilities.

create or replace function public.can_manage_division(user_id_input uuid, division_id_input uuid, capability_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_capability(user_id_input, capability_input, 'global', null)
      or public.has_capability(user_id_input, capability_input, 'division', division_id_input)
      or exists (
        select 1
        from public.divisions d
        where d.id = division_id_input
          and public.has_capability(user_id_input, capability_input, 'season', d.season_id)
      );
$$;

create or replace function public.can_manage_competition(user_id_input uuid, competition_id_input uuid, capability_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_capability(user_id_input, capability_input, 'global', null)
      or public.has_capability(user_id_input, capability_input, 'competition', competition_id_input)
      or exists (
        select 1
        from public.competitions c
        join public.divisions d on d.id = c.division_id
        where c.id = competition_id_input
          and (
            public.has_capability(user_id_input, capability_input, 'division', d.id)
            or public.has_capability(user_id_input, capability_input, 'season', d.season_id)
          )
      );
$$;

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

-- Public reads
do $$
declare item record;
begin
  for item in
    select * from (values
      ('site_settings','public_read','true'),
      ('themes','public_read','is_active = true'),
      ('media_assets','public_read','state in (''active'',''replaced'',''archived'',''protected'')'),
      ('seasons','public_read','status in (''ready'',''active'',''finished'',''archived'')'),
      ('divisions','public_read','status in (''published'',''archived'')'),
      ('competitions','public_read','status in (''ready'',''active'',''locked'',''finalized'',''archived'')'),
      ('stages','public_read','status in (''generated'',''active'',''completed'',''locked'',''archived'')'),
      ('stage_groups','public_read','true'),
      ('stage_rounds','public_read','true'),
      ('teams','public_read','status in (''published'',''archived'')'),
      ('team_versions','public_read','true'),
      ('season_teams','public_read','status <> ''archived'''),
      ('division_teams','public_read','status <> ''archived'''),
      ('competition_entries','public_read','status <> ''archived'''),
      ('matches','public_read','status <> ''voided'''),
      ('match_participants','public_read','true'),
      ('match_results','public_read','status = ''certified'' and is_current = true'),
      ('standings_cache','public_read','true'),
      ('snapshots','public_read','true'),
      ('hall_of_fame_entries','public_read','status = ''published'''),
      ('hall_of_fame_entry_snapshots','public_read','true'),
      ('statistics_aggregates','public_read','is_final = true'),
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

-- Profiles and permissions
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.has_capability(auth.uid(), 'view_admin'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists role_assignments_manage on public.user_role_assignments;
create policy role_assignments_manage on public.user_role_assignments for all to authenticated using (public.has_capability(auth.uid(), 'manage_permissions')) with check (public.has_capability(auth.uid(), 'manage_permissions'));

-- Global/admin settings
drop policy if exists site_settings_manage on public.site_settings;
create policy site_settings_manage on public.site_settings for all to authenticated using (public.has_capability(auth.uid(), 'manage_settings')) with check (public.has_capability(auth.uid(), 'manage_settings'));

-- Media
drop policy if exists media_manage on public.media_assets;
create policy media_manage on public.media_assets for insert to authenticated with check (public.has_capability(auth.uid(), 'manage_media', scope, scope_id));
drop policy if exists media_update on public.media_assets;
create policy media_update on public.media_assets for update to authenticated using (public.has_capability(auth.uid(), 'manage_media', scope, scope_id)) with check (public.has_capability(auth.uid(), 'manage_media', scope, scope_id));
drop policy if exists media_delete on public.media_assets;
create policy media_delete on public.media_assets for delete to authenticated using (public.has_capability(auth.uid(), 'delete_media', scope, scope_id) and state not in ('protected','archived'));

drop policy if exists media_usages_manage on public.media_usages;
create policy media_usages_manage on public.media_usages for all to authenticated using (public.has_capability(auth.uid(), 'manage_media', scope, scope_id)) with check (public.has_capability(auth.uid(), 'manage_media', scope, scope_id));

-- Themes
drop policy if exists themes_manage on public.themes;
create policy themes_manage on public.themes for all to authenticated using (public.has_capability(auth.uid(), 'manage_themes', scope, scope_id)) with check (public.has_capability(auth.uid(), 'manage_themes', scope, scope_id));

-- Seasons and hierarchy
drop policy if exists seasons_manage on public.seasons;
create policy seasons_manage on public.seasons for all to authenticated using (public.can_manage_season(auth.uid(), id, 'manage_seasons')) with check (public.has_capability(auth.uid(), 'manage_seasons'));

drop policy if exists divisions_manage on public.divisions;
create policy divisions_manage on public.divisions for all to authenticated using (public.can_manage_division(auth.uid(), id, 'manage_divisions')) with check (public.can_manage_season(auth.uid(), season_id, 'manage_divisions'));

drop policy if exists competitions_manage on public.competitions;
create policy competitions_manage on public.competitions for all to authenticated using (public.can_manage_competition(auth.uid(), id, 'manage_competitions')) with check (public.can_manage_division(auth.uid(), division_id, 'manage_competitions'));

-- Template management
drop policy if exists templates_manage on public.competition_templates;
create policy templates_manage on public.competition_templates for all to authenticated using (public.has_capability(auth.uid(), 'manage_templates')) with check (public.has_capability(auth.uid(), 'manage_templates'));

drop policy if exists template_versions_manage on public.competition_template_versions;
create policy template_versions_manage on public.competition_template_versions for all to authenticated using (public.has_capability(auth.uid(), 'manage_templates')) with check (public.has_capability(auth.uid(), 'manage_templates'));

-- Competition operational tables use competition-level capability via joins in server actions; RLS baseline protects admin access.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'stages','stage_groups','stage_rounds','competition_entries','stage_group_members','matches','match_participants',
    'match_results','advancement_rules','advancement_events','standings_rules','tiebreak_rules','standings_adjustments','standings_cache',
    'promotion_relegation_records'
  ] loop
    execute format('drop policy if exists competition_ops_manage on public.%I', table_name);
    execute format('create policy competition_ops_manage on public.%I for all to authenticated using (public.has_capability(auth.uid(), ''manage_competitions'') or public.has_capability(auth.uid(), ''enter_results'') or public.has_capability(auth.uid(), ''certify_results'')) with check (public.has_capability(auth.uid(), ''manage_competitions'') or public.has_capability(auth.uid(), ''enter_results'') or public.has_capability(auth.uid(), ''certify_results''))', table_name);
  end loop;
end $$;

-- Teams
do $$
declare table_name text;
begin
  foreach table_name in array array['teams','team_versions','season_teams','division_teams'] loop
    execute format('drop policy if exists teams_manage on public.%I', table_name);
    execute format('create policy teams_manage on public.%I for all to authenticated using (public.has_capability(auth.uid(), ''manage_teams'')) with check (public.has_capability(auth.uid(), ''manage_teams''))', table_name);
  end loop;
end $$;

-- CMS/content
do $$
declare table_name text;
begin
  foreach table_name in array array['pages','page_blocks','navigation_items','routes','slug_history','news_posts','rulesets','sponsors'] loop
    execute format('drop policy if exists content_manage on public.%I', table_name);
    execute format('create policy content_manage on public.%I for all to authenticated using (public.has_capability(auth.uid(), ''manage_pages'') or public.has_capability(auth.uid(), ''publish_pages'')) with check (public.has_capability(auth.uid(), ''manage_pages'') or public.has_capability(auth.uid(), ''publish_pages''))', table_name);
  end loop;
end $$;

-- Historical systems
drop policy if exists snapshots_insert on public.snapshots;
create policy snapshots_insert on public.snapshots for insert to authenticated with check (public.has_capability(auth.uid(), 'create_snapshots') or public.has_capability(auth.uid(), 'finalize_competition'));

drop policy if exists hall_of_fame_manage on public.hall_of_fame_entries;
create policy hall_of_fame_manage on public.hall_of_fame_entries for all to authenticated using (public.has_capability(auth.uid(), 'manage_hall_of_fame')) with check (public.has_capability(auth.uid(), 'manage_hall_of_fame'));

drop policy if exists hall_of_fame_snapshots_manage on public.hall_of_fame_entry_snapshots;
create policy hall_of_fame_snapshots_manage on public.hall_of_fame_entry_snapshots for all to authenticated using (public.has_capability(auth.uid(), 'manage_hall_of_fame')) with check (public.has_capability(auth.uid(), 'manage_hall_of_fame'));

drop policy if exists statistics_manage on public.statistics_aggregates;
create policy statistics_manage on public.statistics_aggregates for all to authenticated using (public.has_capability(auth.uid(), 'manage_statistics')) with check (public.has_capability(auth.uid(), 'manage_statistics'));

-- Audit and versions
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated using (public.has_capability(auth.uid(), 'view_audit_log'));

drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert to authenticated with check (public.has_capability(auth.uid(), 'view_admin'));

drop policy if exists versions_manage on public.entity_versions;
create policy versions_manage on public.entity_versions for all to authenticated using (public.has_capability(auth.uid(), 'restore_versions')) with check (public.has_capability(auth.uid(), 'restore_versions'));

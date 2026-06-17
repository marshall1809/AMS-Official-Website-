-- 015_scoped_rls_hardening.sql
-- Tightens public read policies and replaces broad admin write policies with scope-aware checks.
-- This migration intentionally supersedes selected baseline policies from 013_rls_policies.sql.

create or replace function public.is_public_season(season_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.seasons s
    where s.id = season_id_input
      and s.status in ('ready','active','finished','archived')
      and s.deleted_at is null
  );
$$;

create or replace function public.is_public_division(division_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.divisions d
    where d.id = division_id_input
      and d.status in ('published','archived')
      and d.deleted_at is null
      and public.is_public_season(d.season_id)
  );
$$;

create or replace function public.is_public_competition(competition_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.competitions c
    where c.id = competition_id_input
      and c.status in ('ready','active','locked','finalized','archived')
      and c.deleted_at is null
      and public.is_public_division(c.division_id)
  );
$$;

create or replace function public.is_public_stage(stage_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stages st
    where st.id = stage_id_input
      and st.status in ('generated','active','completed','locked','archived')
      and public.is_public_competition(st.competition_id)
  );
$$;

create or replace function public.is_public_match(match_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = match_id_input
      and m.status <> 'voided'
      and public.is_public_stage(m.stage_id)
  );
$$;

create or replace function public.is_public_scope(scope_input public.scope_type, scope_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when scope_input = 'global' then scope_id_input is null
    when scope_input = 'season' then public.is_public_season(scope_id_input)
    when scope_input = 'division' then public.is_public_division(scope_id_input)
    when scope_input = 'competition' then public.is_public_competition(scope_id_input)
    else false
  end;
$$;

create or replace function public.can_manage_scope(
  user_id_input uuid,
  capability_input text,
  scope_input public.scope_type,
  scope_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when scope_input = 'global' then public.has_capability(user_id_input, capability_input, 'global', null)
    when scope_input = 'season' then public.can_manage_season(user_id_input, scope_id_input, capability_input)
    when scope_input = 'division' then public.can_manage_division(user_id_input, scope_id_input, capability_input)
    when scope_input = 'competition' then public.can_manage_competition(user_id_input, scope_id_input, capability_input)
    else public.has_capability(user_id_input, capability_input, scope_input, scope_id_input)
  end;
$$;

create or replace function public.can_operate_competition(user_id_input uuid, competition_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_competition(user_id_input, competition_id_input, 'manage_competitions')
      or public.can_manage_competition(user_id_input, competition_id_input, 'manage_brackets')
      or public.can_manage_competition(user_id_input, competition_id_input, 'manage_standings')
      or public.can_manage_competition(user_id_input, competition_id_input, 'enter_results')
      or public.can_manage_competition(user_id_input, competition_id_input, 'certify_results')
      or public.can_manage_competition(user_id_input, competition_id_input, 'override_results');
$$;

create or replace function public.can_operate_stage(user_id_input uuid, stage_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stages st
    where st.id = stage_id_input
      and public.can_operate_competition(user_id_input, st.competition_id)
  );
$$;

create or replace function public.can_operate_match(user_id_input uuid, match_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = match_id_input
      and public.can_operate_stage(user_id_input, m.stage_id)
  );
$$;

-- Harden public reads so draft parent records do not leak child data.
drop policy if exists public_read on public.themes;
create policy public_read on public.themes for select using (is_active = true and public.is_public_scope(scope, scope_id));

drop policy if exists public_read on public.media_assets;
create policy public_read on public.media_assets for select using (state in ('active','replaced','archived','protected') and public.is_public_scope(scope, scope_id));

drop policy if exists public_read on public.stages;
create policy public_read on public.stages for select using (public.is_public_stage(id));

drop policy if exists public_read on public.stage_groups;
create policy public_read on public.stage_groups for select using (public.is_public_stage(stage_id));

drop policy if exists public_read on public.stage_rounds;
create policy public_read on public.stage_rounds for select using (public.is_public_stage(stage_id));

drop policy if exists public_read on public.team_versions;
create policy public_read on public.team_versions for select using (
  exists (
    select 1 from public.teams t
    where t.id = team_versions.team_id
      and t.status in ('published','archived')
      and t.deleted_at is null
  )
);

drop policy if exists public_read on public.season_teams;
create policy public_read on public.season_teams for select using (status <> 'archived' and public.is_public_season(season_id));

drop policy if exists public_read on public.division_teams;
create policy public_read on public.division_teams for select using (status <> 'archived' and public.is_public_division(division_id));

drop policy if exists public_read on public.competition_entries;
create policy public_read on public.competition_entries for select using (status <> 'archived' and public.is_public_competition(competition_id));

drop policy if exists public_read on public.matches;
create policy public_read on public.matches for select using (public.is_public_match(id));

drop policy if exists public_read on public.match_participants;
create policy public_read on public.match_participants for select using (public.is_public_match(match_id));

drop policy if exists public_read on public.match_results;
create policy public_read on public.match_results for select using (status = 'certified' and is_current = true and public.is_public_match(match_id));

drop policy if exists public_read on public.snapshots;
create policy public_read on public.snapshots for select using (
  public.is_public_scope(scope, scope_id)
  or exists (
    select 1
    from public.hall_of_fame_entry_snapshots hes
    join public.hall_of_fame_entries h on h.id = hes.entry_id
    where hes.snapshot_id = snapshots.id
      and h.status = 'published'
  )
);

drop policy if exists public_read on public.standings_cache;
create policy public_read on public.standings_cache for select using (
  public.is_public_stage(stage_id)
  or (
    is_snapshot = true
    and snapshot_id is not null
    and exists (
      select 1 from public.snapshots s
      where s.id = standings_cache.snapshot_id
        and public.is_public_scope(s.scope, s.scope_id)
    )
  )
);

drop policy if exists public_read on public.pages;
create policy public_read on public.pages for select using (status = 'published' and public.is_public_scope(scope, scope_id));

drop policy if exists public_read on public.page_blocks;
create policy public_read on public.page_blocks for select using (
  is_visible = true
  and exists (
    select 1 from public.pages p
    where p.id = page_blocks.page_id
      and p.status = 'published'
      and public.is_public_scope(p.scope, p.scope_id)
  )
);

drop policy if exists public_read on public.navigation_items;
create policy public_read on public.navigation_items for select using (is_visible = true and public.is_public_scope(scope, scope_id));

drop policy if exists public_read on public.routes;
create policy public_read on public.routes for select using (status in ('active','redirect','gone'));

drop policy if exists public_read on public.news_posts;
create policy public_read on public.news_posts for select using (status = 'published' and public.is_public_scope(scope, scope_id));

drop policy if exists public_read on public.rulesets;
create policy public_read on public.rulesets for select using (status = 'published' and public.is_public_scope(scope, scope_id));

drop policy if exists public_read on public.sponsors;
create policy public_read on public.sponsors for select using (status = 'published' and public.is_public_scope(scope, scope_id));

drop policy if exists public_read on public.hall_of_fame_entry_snapshots;
create policy public_read on public.hall_of_fame_entry_snapshots for select using (
  exists (
    select 1 from public.hall_of_fame_entries h
    where h.id = hall_of_fame_entry_snapshots.entry_id
      and h.status = 'published'
  )
);

-- Replace broad media/theme policies with inheritance-aware scoped checks.
drop policy if exists media_manage on public.media_assets;
create policy media_manage on public.media_assets for insert to authenticated
with check (public.can_manage_scope(auth.uid(), 'manage_media', scope, scope_id));

drop policy if exists media_update on public.media_assets;
create policy media_update on public.media_assets for update to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_media', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_media', scope, scope_id));

drop policy if exists media_delete on public.media_assets;
create policy media_delete on public.media_assets for delete to authenticated
using (public.can_manage_scope(auth.uid(), 'delete_media', scope, scope_id) and state not in ('protected','archived'));

drop policy if exists media_usages_manage on public.media_usages;
create policy media_usages_manage on public.media_usages for all to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_media', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_media', scope, scope_id));

drop policy if exists themes_manage on public.themes;
create policy themes_manage on public.themes for all to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_themes', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_themes', scope, scope_id));

-- Season creation remains global; season updates/deletes can be scoped to that season.
drop policy if exists seasons_manage on public.seasons;
drop policy if exists seasons_read_admin on public.seasons;
drop policy if exists seasons_insert_global on public.seasons;
drop policy if exists seasons_update_scoped on public.seasons;
drop policy if exists seasons_delete_global on public.seasons;

create policy seasons_read_admin on public.seasons for select to authenticated
using (public.has_capability(auth.uid(), 'view_admin') or public.can_manage_season(auth.uid(), id, 'manage_seasons'));
create policy seasons_insert_global on public.seasons for insert to authenticated
with check (public.has_capability(auth.uid(), 'manage_seasons', 'global', null));
create policy seasons_update_scoped on public.seasons for update to authenticated
using (public.can_manage_season(auth.uid(), id, 'manage_seasons'))
with check (public.can_manage_season(auth.uid(), id, 'manage_seasons'));
create policy seasons_delete_global on public.seasons for delete to authenticated
using (public.has_capability(auth.uid(), 'manage_seasons', 'global', null));

-- Replace broad competition operational policy with row-scoped checks.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'stages','stage_groups','stage_rounds','competition_entries','stage_group_members','matches','match_participants',
    'match_results','advancement_rules','advancement_events','standings_rules','tiebreak_rules','standings_adjustments','standings_cache',
    'promotion_relegation_records'
  ] loop
    execute format('drop policy if exists competition_ops_manage on public.%I', table_name);
  end loop;
end $$;

create policy competition_ops_manage on public.stages for all to authenticated
using (public.can_operate_competition(auth.uid(), competition_id))
with check (public.can_operate_competition(auth.uid(), competition_id));

create policy competition_ops_manage on public.stage_groups for all to authenticated
using (public.can_operate_stage(auth.uid(), stage_id))
with check (public.can_operate_stage(auth.uid(), stage_id));

create policy competition_ops_manage on public.stage_rounds for all to authenticated
using (public.can_operate_stage(auth.uid(), stage_id))
with check (public.can_operate_stage(auth.uid(), stage_id));

create policy competition_ops_manage on public.competition_entries for all to authenticated
using (public.can_operate_competition(auth.uid(), competition_id))
with check (public.can_operate_competition(auth.uid(), competition_id));

create policy competition_ops_manage on public.stage_group_members for all to authenticated
using (
  exists (
    select 1 from public.stage_groups g
    where g.id = stage_group_members.group_id
      and public.can_operate_stage(auth.uid(), g.stage_id)
  )
)
with check (
  exists (
    select 1 from public.stage_groups g
    where g.id = stage_group_members.group_id
      and public.can_operate_stage(auth.uid(), g.stage_id)
  )
);

create policy competition_ops_manage on public.matches for all to authenticated
using (public.can_operate_stage(auth.uid(), stage_id))
with check (public.can_operate_stage(auth.uid(), stage_id));

create policy competition_ops_manage on public.match_participants for all to authenticated
using (public.can_operate_match(auth.uid(), match_id))
with check (public.can_operate_match(auth.uid(), match_id));

create policy competition_ops_manage on public.match_results for all to authenticated
using (public.can_operate_match(auth.uid(), match_id))
with check (public.can_operate_match(auth.uid(), match_id));

create policy competition_ops_manage on public.advancement_rules for all to authenticated
using (
  (stage_id is not null and public.can_operate_stage(auth.uid(), stage_id))
  or (competition_id is not null and public.can_operate_competition(auth.uid(), competition_id))
)
with check (
  (stage_id is not null and public.can_operate_stage(auth.uid(), stage_id))
  or (competition_id is not null and public.can_operate_competition(auth.uid(), competition_id))
);

create policy competition_ops_manage on public.advancement_events for all to authenticated
using (
  (source_match_id is not null and public.can_operate_match(auth.uid(), source_match_id))
  or (target_match_id is not null and public.can_operate_match(auth.uid(), target_match_id))
  or public.has_capability(auth.uid(), 'manage_competitions', 'global', null)
)
with check (
  (source_match_id is not null and public.can_operate_match(auth.uid(), source_match_id))
  or (target_match_id is not null and public.can_operate_match(auth.uid(), target_match_id))
  or public.has_capability(auth.uid(), 'manage_competitions', 'global', null)
);

create policy competition_ops_manage on public.standings_rules for all to authenticated
using (public.can_operate_stage(auth.uid(), stage_id))
with check (public.can_operate_stage(auth.uid(), stage_id));

create policy competition_ops_manage on public.tiebreak_rules for all to authenticated
using (
  exists (
    select 1 from public.standings_rules sr
    where sr.id = tiebreak_rules.standings_rule_id
      and public.can_operate_stage(auth.uid(), sr.stage_id)
  )
)
with check (
  exists (
    select 1 from public.standings_rules sr
    where sr.id = tiebreak_rules.standings_rule_id
      and public.can_operate_stage(auth.uid(), sr.stage_id)
  )
);

create policy competition_ops_manage on public.standings_adjustments for all to authenticated
using (public.can_operate_stage(auth.uid(), stage_id))
with check (public.can_operate_stage(auth.uid(), stage_id));

create policy competition_ops_manage on public.standings_cache for all to authenticated
using (public.can_operate_stage(auth.uid(), stage_id))
with check (public.can_operate_stage(auth.uid(), stage_id));

create policy competition_ops_manage on public.promotion_relegation_records for all to authenticated
using (
  public.can_manage_season(auth.uid(), source_season_id, 'manage_competitions')
  or public.can_manage_division(auth.uid(), source_division_id, 'manage_competitions')
)
with check (
  public.can_manage_season(auth.uid(), source_season_id, 'manage_competitions')
  or public.can_manage_division(auth.uid(), source_division_id, 'manage_competitions')
);

-- Team identity is global, participation is scoped to season/division.
do $$
declare table_name text;
begin
  foreach table_name in array array['teams','team_versions','season_teams','division_teams'] loop
    execute format('drop policy if exists teams_manage on public.%I', table_name);
  end loop;
end $$;

create policy teams_manage_global on public.teams for all to authenticated
using (public.has_capability(auth.uid(), 'manage_teams', 'global', null))
with check (public.has_capability(auth.uid(), 'manage_teams', 'global', null));

create policy team_versions_manage_global on public.team_versions for all to authenticated
using (public.has_capability(auth.uid(), 'manage_teams', 'global', null))
with check (public.has_capability(auth.uid(), 'manage_teams', 'global', null));

create policy season_teams_manage_scoped on public.season_teams for all to authenticated
using (public.can_manage_season(auth.uid(), season_id, 'manage_teams'))
with check (public.can_manage_season(auth.uid(), season_id, 'manage_teams'));

create policy division_teams_manage_scoped on public.division_teams for all to authenticated
using (public.can_manage_division(auth.uid(), division_id, 'manage_teams'))
with check (public.can_manage_division(auth.uid(), division_id, 'manage_teams'));

-- CMS policies now respect global/season/division/competition scope inheritance.
do $$
declare table_name text;
begin
  foreach table_name in array array['pages','page_blocks','navigation_items','routes','slug_history','news_posts','rulesets','sponsors'] loop
    execute format('drop policy if exists content_manage on public.%I', table_name);
  end loop;
end $$;

create policy content_manage on public.pages for all to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id) or public.can_manage_scope(auth.uid(), 'publish_pages', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id) or public.can_manage_scope(auth.uid(), 'publish_pages', scope, scope_id));

create policy content_manage on public.navigation_items for all to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id));

create policy content_manage on public.news_posts for all to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id) or public.can_manage_scope(auth.uid(), 'publish_pages', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id) or public.can_manage_scope(auth.uid(), 'publish_pages', scope, scope_id));

create policy content_manage on public.rulesets for all to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id) or public.can_manage_scope(auth.uid(), 'publish_pages', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id) or public.can_manage_scope(auth.uid(), 'publish_pages', scope, scope_id));

create policy content_manage on public.sponsors for all to authenticated
using (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id))
with check (public.can_manage_scope(auth.uid(), 'manage_pages', scope, scope_id));

create policy content_manage on public.page_blocks for all to authenticated
using (
  exists (
    select 1 from public.pages p
    where p.id = page_blocks.page_id
      and public.can_manage_scope(auth.uid(), 'manage_pages', p.scope, p.scope_id)
  )
)
with check (
  exists (
    select 1 from public.pages p
    where p.id = page_blocks.page_id
      and public.can_manage_scope(auth.uid(), 'manage_pages', p.scope, p.scope_id)
  )
);

create policy content_manage on public.routes for all to authenticated
using (public.has_capability(auth.uid(), 'manage_pages', 'global', null))
with check (public.has_capability(auth.uid(), 'manage_pages', 'global', null));

create policy content_manage on public.slug_history for all to authenticated
using (public.has_capability(auth.uid(), 'manage_pages', 'global', null))
with check (public.has_capability(auth.uid(), 'manage_pages', 'global', null));

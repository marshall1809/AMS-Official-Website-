-- 011_integrity_triggers.sql
-- Cross-hierarchy integrity checks that plain foreign keys cannot express.

create or replace function public.ensure_division_team_matches_division()
returns trigger
language plpgsql
as $$
declare
  division_season_id uuid;
  season_team_season_id uuid;
begin
  select season_id into division_season_id from public.divisions where id = new.division_id;
  select season_id into season_team_season_id from public.season_teams where id = new.season_team_id;

  if division_season_id is null or season_team_season_id is null or division_season_id <> season_team_season_id then
    raise exception 'Division team must reference a season team from the same season.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_division_team_matches_division on public.division_teams;
create trigger ensure_division_team_matches_division
before insert or update on public.division_teams
for each row execute function public.ensure_division_team_matches_division();

create or replace function public.ensure_competition_entry_matches_division()
returns trigger
language plpgsql
as $$
declare
  competition_division_id uuid;
  entry_division_id uuid;
begin
  select division_id into competition_division_id from public.competitions where id = new.competition_id;
  select division_id into entry_division_id from public.division_teams where id = new.division_team_id;

  if competition_division_id is null or entry_division_id is null or competition_division_id <> entry_division_id then
    raise exception 'Competition entry must reference a division team from the same division.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_competition_entry_matches_division on public.competition_entries;
create trigger ensure_competition_entry_matches_division
before insert or update on public.competition_entries
for each row execute function public.ensure_competition_entry_matches_division();

create or replace function public.ensure_group_member_matches_stage_competition()
returns trigger
language plpgsql
as $$
declare
  group_competition_id uuid;
  entry_competition_id uuid;
begin
  select s.competition_id
    into group_competition_id
    from public.stage_groups g
    join public.stages s on s.id = g.stage_id
   where g.id = new.group_id;

  select competition_id into entry_competition_id from public.competition_entries where id = new.competition_entry_id;

  if group_competition_id is null or entry_competition_id is null or group_competition_id <> entry_competition_id then
    raise exception 'Group member must belong to the same competition as the group stage.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_group_member_matches_stage_competition on public.stage_group_members;
create trigger ensure_group_member_matches_stage_competition
before insert or update on public.stage_group_members
for each row execute function public.ensure_group_member_matches_stage_competition();

create or replace function public.ensure_match_scope_consistency()
returns trigger
language plpgsql
as $$
declare
  match_competition_id uuid;
  group_competition_id uuid;
  round_competition_id uuid;
begin
  select competition_id into match_competition_id from public.stages where id = new.stage_id;

  if new.group_id is not null then
    select s.competition_id
      into group_competition_id
      from public.stage_groups g
      join public.stages s on s.id = g.stage_id
     where g.id = new.group_id;

    if group_competition_id <> match_competition_id then
      raise exception 'Match group must belong to the same competition as match stage.';
    end if;
  end if;

  if new.round_id is not null then
    select s.competition_id
      into round_competition_id
      from public.stage_rounds r
      join public.stages s on s.id = r.stage_id
     where r.id = new.round_id;

    if round_competition_id <> match_competition_id then
      raise exception 'Match round must belong to the same competition as match stage.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_match_scope_consistency on public.matches;
create trigger ensure_match_scope_consistency
before insert or update on public.matches
for each row execute function public.ensure_match_scope_consistency();

create or replace function public.ensure_match_participant_matches_competition()
returns trigger
language plpgsql
as $$
declare
  match_competition_id uuid;
  entry_competition_id uuid;
begin
  if new.competition_entry_id is null then
    return new;
  end if;

  select s.competition_id
    into match_competition_id
    from public.matches m
    join public.stages s on s.id = m.stage_id
   where m.id = new.match_id;

  select competition_id into entry_competition_id from public.competition_entries where id = new.competition_entry_id;

  if match_competition_id is null or entry_competition_id is null or match_competition_id <> entry_competition_id then
    raise exception 'Match participant must belong to the same competition as the match.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_match_participant_matches_competition on public.match_participants;
create trigger ensure_match_participant_matches_competition
before insert or update on public.match_participants
for each row execute function public.ensure_match_participant_matches_competition();

create or replace function public.ensure_current_match_result_singleton()
returns trigger
language plpgsql
as $$
begin
  if new.is_current then
    update public.match_results
       set is_current = false
     where match_id = new.match_id
       and id <> new.id
       and is_current = true;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_current_match_result_singleton on public.match_results;
create trigger ensure_current_match_result_singleton
before insert or update on public.match_results
for each row execute function public.ensure_current_match_result_singleton();

create or replace function public.prevent_protected_media_delete()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.media_usages
     where media_asset_id = old.id
       and (is_protected = true or is_historical = true)
  ) then
    raise exception 'Media asset is protected by historical usage and cannot be deleted.';
  end if;

  return old;
end;
$$;

drop trigger if exists prevent_protected_media_delete on public.media_assets;
create trigger prevent_protected_media_delete
before delete on public.media_assets
for each row execute function public.prevent_protected_media_delete();

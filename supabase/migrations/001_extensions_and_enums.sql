-- 001_extensions_and_enums.sql
-- AMS platform baseline: extensions and stable enum types.

create extension if not exists pgcrypto;

-- Roles and scopes
do $$ begin create type public.app_role as enum ('super_admin','admin','designer','tournament_manager','content_manager','media_manager','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.scope_type as enum ('global','season','division','competition','stage','content','media'); exception when duplicate_object then null; end $$;

-- Lifecycle and publishing
do $$ begin create type public.entity_status as enum ('draft','published','archived','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.season_status as enum ('draft','setup','ready','active','finished','archived','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.competition_status as enum ('draft','generated','ready','active','locked','finalized','archived','deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stage_status as enum ('draft','generated','active','completed','locked','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.match_status as enum ('scheduled','live','completed','disputed','certified','voided'); exception when duplicate_object then null; end $$;
do $$ begin create type public.result_status as enum ('draft','submitted','certified','disputed','voided'); exception when duplicate_object then null; end $$;

-- Competition and platform concepts
do $$ begin create type public.stage_type as enum ('league','group','single_elimination','double_elimination','home_away_knockout','custom'); exception when duplicate_object then null; end $$;
do $$ begin create type public.media_state as enum ('active','replaced','archived','unused','protected','soft_deleted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.route_target_type as enum ('page','season','division','competition','team','news','hall_of_fame','redirect','gone'); exception when duplicate_object then null; end $$;
do $$ begin create type public.snapshot_kind as enum ('team_identity','media','standings','bracket','match_result','competition_result','champion','season_summary','division_summary','hall_of_fame'); exception when duplicate_object then null; end $$;
do $$ begin create type public.hall_of_fame_type as enum ('season_champion','division_champion','competition_champion','mvp','record','award'); exception when duplicate_object then null; end $$;
do $$ begin create type public.participation_status as enum ('active','inactive','eliminated','promoted','relegated','archived'); exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

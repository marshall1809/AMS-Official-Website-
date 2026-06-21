-- 020_public_team_logo_read.sql
-- Ensures active Season team logos are available to the anonymous public website.

create or replace function public.is_public_team_logo(asset_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_versions version
    join public.teams team
      on team.id = version.team_id
    join public.season_teams participation
      on participation.team_id = team.id
     and participation.team_version_id = version.id
    join public.seasons season
      on season.id = participation.season_id
    where version.logo_asset_id = asset_id_input
      and team.deleted_at is null
      and coalesce(to_jsonb(team)->>'status', 'published') in ('published', 'archived')
      and participation.status::text <> 'archived'
      and season.deleted_at is null
      and season.status::text in ('ready', 'active', 'finished', 'archived')
  );
$$;

grant execute on function public.is_public_team_logo(uuid) to anon, authenticated;

drop policy if exists public_team_logo_read on public.media_assets;
create policy public_team_logo_read
on public.media_assets
for select
to anon, authenticated
using (
  state::text in ('active', 'replaced', 'archived', 'protected')
  and public.is_public_team_logo(id)
);

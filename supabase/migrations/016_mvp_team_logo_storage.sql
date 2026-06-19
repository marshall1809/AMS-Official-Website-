-- 016_mvp_team_logo_storage.sql
-- Launch MVP: public team-logo bucket and narrowly scoped authenticated write access.

create or replace function public.ams_can_manage_teams(user_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as 'select exists (
  select 1
  from public.user_role_assignments assignment
  where assignment.user_id = user_id_input
    and assignment.is_active = true
    and (
      assignment.role::text in (''super_admin'', ''admin'')
      or ''manage_teams'' = any(coalesce(assignment.capabilities, ''{}''::text[]))
    )
)';

grant execute on function public.ams_can_manage_teams(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ams-media',
  'ams-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ams_media_public_read on storage.objects;
create policy ams_media_public_read
on storage.objects
for select
to public
using (bucket_id = 'ams-media');

drop policy if exists ams_team_logo_insert on storage.objects;
create policy ams_team_logo_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ams-media'
  and public.ams_can_manage_teams(auth.uid())
);

drop policy if exists ams_team_logo_update on storage.objects;
create policy ams_team_logo_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ams-media'
  and public.ams_can_manage_teams(auth.uid())
)
with check (
  bucket_id = 'ams-media'
  and public.ams_can_manage_teams(auth.uid())
);

drop policy if exists team_logo_media_select on public.media_assets;
create policy team_logo_media_select
on public.media_assets
for select
to authenticated
using (
  scope = 'season'
  and public.ams_can_manage_teams(auth.uid())
);

drop policy if exists team_logo_media_insert on public.media_assets;
create policy team_logo_media_insert
on public.media_assets
for insert
to authenticated
with check (
  scope = 'season'
  and public.ams_can_manage_teams(auth.uid())
);

drop policy if exists team_logo_media_update on public.media_assets;
create policy team_logo_media_update
on public.media_assets
for update
to authenticated
using (
  scope = 'season'
  and public.ams_can_manage_teams(auth.uid())
)
with check (
  scope = 'season'
  and public.ams_can_manage_teams(auth.uid())
);

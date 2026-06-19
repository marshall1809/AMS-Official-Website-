-- 016_mvp_team_logo_storage.sql
-- Launch MVP: public team-logo bucket and narrowly scoped authenticated write access.

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
  and public.has_capability(auth.uid(), 'manage_teams')
);

drop policy if exists ams_team_logo_update on storage.objects;
create policy ams_team_logo_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ams-media'
  and public.has_capability(auth.uid(), 'manage_teams')
)
with check (
  bucket_id = 'ams-media'
  and public.has_capability(auth.uid(), 'manage_teams')
);

drop policy if exists team_logo_media_select on public.media_assets;
create policy team_logo_media_select
on public.media_assets
for select
to authenticated
using (
  scope = 'season'
  and public.has_capability(auth.uid(), 'manage_teams')
);

drop policy if exists team_logo_media_insert on public.media_assets;
create policy team_logo_media_insert
on public.media_assets
for insert
to authenticated
with check (
  scope = 'season'
  and public.has_capability(auth.uid(), 'manage_teams')
);

drop policy if exists team_logo_media_update on public.media_assets;
create policy team_logo_media_update
on public.media_assets
for update
to authenticated
using (
  scope = 'season'
  and public.has_capability(auth.uid(), 'manage_teams')
)
with check (
  scope = 'season'
  and public.has_capability(auth.uid(), 'manage_teams')
);

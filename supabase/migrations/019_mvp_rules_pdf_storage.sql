-- 019_mvp_rules_pdf_storage.sql
-- Launch MVP: allow Season rules PDFs in the existing public AMS media bucket.

create or replace function public.ams_can_manage_content(user_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments assignment
    where assignment.user_id = user_id_input
      and assignment.is_active = true
      and (
        assignment.role::text in ('super_admin', 'admin')
        or 'manage_pages' = any(coalesce(assignment.capabilities, '{}'::text[]))
      )
  );
$$;

grant execute on function public.ams_can_manage_content(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ams-media',
  'ams-media',
  true,
  5242880,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ams_rules_pdf_insert on storage.objects;
create policy ams_rules_pdf_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ams-media'
  and public.ams_can_manage_content(auth.uid())
);

drop policy if exists ams_rules_pdf_update on storage.objects;
create policy ams_rules_pdf_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ams-media'
  and public.ams_can_manage_content(auth.uid())
)
with check (
  bucket_id = 'ams-media'
  and public.ams_can_manage_content(auth.uid())
);

drop policy if exists ams_rules_pdf_delete on storage.objects;
create policy ams_rules_pdf_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ams-media'
  and public.ams_can_manage_content(auth.uid())
);

drop policy if exists rules_pdf_media_select on public.media_assets;
create policy rules_pdf_media_select
on public.media_assets
for select
to authenticated
using (
  scope = 'season'
  and public.ams_can_manage_content(auth.uid())
);

drop policy if exists rules_pdf_media_insert on public.media_assets;
create policy rules_pdf_media_insert
on public.media_assets
for insert
to authenticated
with check (
  scope = 'season'
  and mime_type = 'application/pdf'
  and public.ams_can_manage_content(auth.uid())
);

drop policy if exists rules_pdf_media_update on public.media_assets;
create policy rules_pdf_media_update
on public.media_assets
for update
to authenticated
using (
  scope = 'season'
  and mime_type = 'application/pdf'
  and public.ams_can_manage_content(auth.uid())
)
with check (
  scope = 'season'
  and mime_type = 'application/pdf'
  and public.ams_can_manage_content(auth.uid())
);

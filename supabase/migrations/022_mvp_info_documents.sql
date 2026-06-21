-- 022_mvp_info_documents.sql
-- Extends the former Rules PDF upload into Season Info document management.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ams-media',
  'ams-media',
  true,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.ams_is_public_info_asset(asset_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rulesets info
    left join public.seasons season
      on info.scope::text = 'season'
     and season.id = info.scope_id
    where info.pdf_asset_id = asset_id_input
      and info.status::text = 'published'
      and (
        info.scope::text = 'global'
        or (
          info.scope::text = 'season'
          and coalesce(to_jsonb(season)->>'status', 'draft')
            in ('ready', 'active', 'finished', 'archived')
          and nullif(to_jsonb(season)->>'deleted_at', '') is null
        )
      )
  );
$$;

grant execute on function public.ams_is_public_info_asset(uuid) to anon, authenticated;

drop policy if exists public_info_document_read on public.media_assets;
create policy public_info_document_read
on public.media_assets
for select
to anon, authenticated
using (
  state::text in ('active', 'replaced', 'archived', 'protected')
  and public.ams_is_public_info_asset(id)
);

drop policy if exists info_document_media_insert on public.media_assets;
create policy info_document_media_insert
on public.media_assets
for insert
to authenticated
with check (
  scope::text = 'season'
  and mime_type in (
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
  and public.ams_can_manage_content(auth.uid())
);

drop policy if exists info_document_media_update on public.media_assets;
create policy info_document_media_update
on public.media_assets
for update
to authenticated
using (
  scope::text = 'season'
  and public.ams_can_manage_content(auth.uid())
)
with check (
  scope::text = 'season'
  and public.ams_can_manage_content(auth.uid())
);

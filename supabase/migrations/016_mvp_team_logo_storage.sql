-- 016_mvp_team_logo_storage.sql
-- Launch MVP: public team-logo bucket and narrowly scoped authenticated write access.

-- Compatibility bridge for existing AMS databases that still use public.user_roles.
do 'begin
  create type public.scope_type as enum (''global'',''season'',''division'',''competition'',''stage'',''content'',''media'');
exception when duplicate_object then null;
end';

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  capabilities text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_role_assignments_scope_check check (
    (scope = 'global' and scope_id is null)
    or (scope <> 'global' and scope_id is not null)
  )
);

create unique index if not exists user_role_global_unique
  on public.user_role_assignments(user_id, role, scope)
  where scope = 'global';

create unique index if not exists user_role_scoped_unique
  on public.user_role_assignments(user_id, role, scope, scope_id)
  where scope <> 'global';

alter table public.user_role_assignments enable row level security;

drop policy if exists role_assignments_self_read on public.user_role_assignments;
create policy role_assignments_self_read
on public.user_role_assignments
for select
to authenticated
using (user_id = auth.uid());

insert into public.user_role_assignments (
  user_id,
  role,
  scope,
  scope_id,
  capabilities,
  is_active
)
select
  auth_user.id,
  'super_admin'::public.app_role,
  'global'::public.scope_type,
  null,
  array[
    'view_admin','manage_settings','manage_users','manage_permissions',
    'manage_seasons','manage_teams','manage_media','delete_media',
    'manage_themes','manage_pages','enter_results','certify_results',
    'manage_brackets','view_audit_log'
  ]::text[],
  true
from auth.users auth_user
where auth_user.id in (
  '091e5078-1d24-4e61-b25b-ce5979135a4c'::uuid,
  '36f82853-e603-4f9c-8d79-867a2cb3f63f'::uuid
)
and not exists (
  select 1
  from public.user_role_assignments existing
  where existing.user_id = auth_user.id
    and existing.role::text = 'super_admin'
    and existing.scope::text = 'global'
);

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

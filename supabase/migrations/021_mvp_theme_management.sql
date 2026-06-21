-- 021_mvp_theme_management.sql
-- Makes global and Season themes editable by AMS admins and publicly readable.

alter table if exists public.themes
  add column if not exists scope public.scope_type not null default 'global',
  add column if not exists scope_id uuid,
  add column if not exists tokens jsonb not null default '{}'::jsonb,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.ams_can_manage_themes(user_id_input uuid)
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
        assignment.role::text in ('super_admin', 'admin', 'designer')
        or 'manage_themes' = any(coalesce(assignment.capabilities, '{}'::text[]))
      )
  );
$$;

create or replace function public.ams_is_public_theme(
  scope_input public.scope_type,
  scope_id_input uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (scope_input::text = 'global' and scope_id_input is null)
    or (
      scope_input::text = 'season'
      and exists (
        select 1
        from public.seasons season
        where season.id = scope_id_input
          and coalesce(to_jsonb(season)->>'status', 'draft')
            in ('ready', 'active', 'finished', 'archived')
          and nullif(to_jsonb(season)->>'deleted_at', '') is null
      )
    );
$$;

grant execute on function public.ams_can_manage_themes(uuid) to authenticated;
grant execute on function public.ams_is_public_theme(public.scope_type, uuid) to anon, authenticated;

alter table public.themes enable row level security;

drop policy if exists ams_theme_public_read on public.themes;
create policy ams_theme_public_read
on public.themes
for select
to anon, authenticated
using (
  is_active = true
  and public.ams_is_public_theme(scope, scope_id)
);

drop policy if exists ams_theme_admin_read on public.themes;
create policy ams_theme_admin_read
on public.themes
for select
to authenticated
using (public.ams_can_manage_themes(auth.uid()));

drop policy if exists ams_theme_admin_insert on public.themes;
create policy ams_theme_admin_insert
on public.themes
for insert
to authenticated
with check (public.ams_can_manage_themes(auth.uid()));

drop policy if exists ams_theme_admin_update on public.themes;
create policy ams_theme_admin_update
on public.themes
for update
to authenticated
using (public.ams_can_manage_themes(auth.uid()))
with check (public.ams_can_manage_themes(auth.uid()));

drop policy if exists ams_theme_admin_delete on public.themes;
create policy ams_theme_admin_delete
on public.themes
for delete
to authenticated
using (public.ams_can_manage_themes(auth.uid()));

grant select on public.themes to anon, authenticated;
grant insert, update, delete on public.themes to authenticated;

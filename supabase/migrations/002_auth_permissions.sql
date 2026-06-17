-- 002_auth_permissions.sql
-- Profiles, role assignments, and scoped permission helpers.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  constraint user_role_assignments_scope_id_check check (
    (scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)
  )
);

create unique index if not exists user_role_global_unique
  on public.user_role_assignments(user_id, role, scope)
  where scope = 'global';

create unique index if not exists user_role_scoped_unique
  on public.user_role_assignments(user_id, role, scope, scope_id)
  where scope <> 'global';

create or replace function public.has_capability(
  user_id_input uuid,
  capability_input text,
  scope_input public.scope_type default 'global',
  scope_id_input uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    where ura.user_id = user_id_input
      and ura.is_active = true
      and (
        ura.role = 'super_admin'
        or ura.role = 'admin'
        or capability_input = any(ura.capabilities)
      )
      and (
        ura.scope = 'global'
        or (ura.scope = scope_input and ura.scope_id = scope_id_input)
      )
  );
$$;

create or replace function public.can_manage_season(user_id_input uuid, season_id_input uuid, capability_input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_capability(user_id_input, capability_input, 'global', null)
      or public.has_capability(user_id_input, capability_input, 'season', season_id_input);
$$;

-- These functions reference tables created in later migrations through dynamic SQL-safe subqueries.
-- They are created/replaced again after core hierarchy tables exist in 012_rls_policies.sql.

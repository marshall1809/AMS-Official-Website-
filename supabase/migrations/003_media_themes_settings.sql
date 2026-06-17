-- 003_media_themes_settings.sql
-- Platform settings, media governance, and theme inheritance.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  public_url text,
  title text,
  alt_text text,
  mime_type text,
  size_bytes bigint,
  state public.media_state not null default 'active',
  scope public.scope_type not null default 'global',
  scope_id uuid,
  replaced_by_asset_id uuid references public.media_assets(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)),
  unique (bucket, path)
);

create table if not exists public.media_usages (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  field_name text not null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  is_historical boolean not null default false,
  is_protected boolean not null default false,
  created_at timestamptz not null default now(),
  constraint media_usages_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)),
  unique (media_asset_id, entity_type, entity_id, field_name)
);

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  parent_theme_id uuid references public.themes(id) on delete set null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  name text not null,
  tokens jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint themes_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null))
);

create unique index if not exists themes_one_active_global
  on public.themes(scope)
  where scope = 'global' and is_active = true;

create index if not exists themes_scope_idx on public.themes(scope, scope_id, is_active);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'Alliance Master Series',
  default_title text not null default 'Alliance Master Series',
  default_description text,
  logo_text text not null default 'AMS',
  logo_subtext text,
  logo_image_asset_id uuid references public.media_assets(id) on delete set null,
  contact_label text,
  contact_url text,
  footer_text text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists site_settings_singleton on public.site_settings((true));

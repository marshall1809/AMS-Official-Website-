-- 009_cms_routes_navigation.sql
-- CMS pages, blocks, navigation, routes, news, rules, and sponsors.

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  title text not null,
  slug text not null,
  status public.entity_status not null default 'draft',
  seo_title text,
  seo_description text,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)),
  constraint pages_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists pages_global_slug_live_unique
  on public.pages(slug)
  where scope = 'global' and deleted_at is null;

create unique index if not exists pages_scoped_slug_live_unique
  on public.pages(scope, scope_id, slug)
  where scope <> 'global' and deleted_at is null;

create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)),
  constraint navigation_href_check check (href like '/%')
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  target_type public.route_target_type not null,
  target_id uuid,
  status text not null default 'active',
  redirect_to text,
  status_code integer,
  canonical_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routes_path_check check (path like '/%'),
  constraint routes_redirect_check check (redirect_to is null or redirect_to like '/%'),
  constraint routes_status_code_check check (status_code is null or status_code in (301,302,307,308,410))
);

create table if not exists public.slug_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  old_slug text not null,
  old_path text,
  new_path text,
  created_at timestamptz not null default now(),
  unique (entity_type, old_slug, old_path),
  constraint slug_history_old_slug_check check (old_slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  title text not null,
  slug text not null,
  excerpt text,
  body jsonb not null default '{}'::jsonb,
  category text,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  status public.entity_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)),
  constraint news_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists news_global_slug_unique
  on public.news_posts(slug)
  where scope = 'global';

create unique index if not exists news_scoped_slug_unique
  on public.news_posts(scope, scope_id, slug)
  where scope <> 'global';

create table if not exists public.rulesets (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  title text not null,
  body text not null,
  pdf_asset_id uuid references public.media_assets(id) on delete set null,
  status public.entity_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rules_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null))
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null default 'global',
  scope_id uuid,
  name text not null,
  url text,
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  status public.entity_status not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null))
);

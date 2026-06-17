-- 008_snapshots_hall_of_fame_stats.sql
-- Immutable-ish snapshots, Hall of Fame records, and statistics aggregates.

create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  kind public.snapshot_kind not null,
  source_entity_type text not null,
  source_entity_id uuid not null,
  scope public.scope_type not null default 'global',
  scope_id uuid,
  revision integer not null default 1,
  data jsonb not null,
  supersedes_snapshot_id uuid references public.snapshots(id) on delete set null,
  created_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint snapshots_revision_check check (revision > 0),
  constraint snapshots_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)),
  unique (kind, source_entity_type, source_entity_id, revision)
);

create table if not exists public.hall_of_fame_entries (
  id uuid primary key default gen_random_uuid(),
  type public.hall_of_fame_type not null,
  season_id uuid references public.seasons(id) on delete set null,
  division_id uuid references public.divisions(id) on delete set null,
  competition_id uuid references public.competitions(id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  primary_snapshot_id uuid references public.snapshots(id) on delete restrict,
  status public.entity_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hall_of_fame_slug_check check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists hall_of_fame_scope_slug_unique
  on public.hall_of_fame_entries(type, coalesce(season_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(division_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(competition_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create table if not exists public.hall_of_fame_entry_snapshots (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.hall_of_fame_entries(id) on delete cascade,
  snapshot_id uuid not null references public.snapshots(id) on delete restrict,
  relation_label text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (entry_id, snapshot_id)
);

create table if not exists public.statistics_aggregates (
  id uuid primary key default gen_random_uuid(),
  scope public.scope_type not null,
  scope_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  metric_key text not null,
  metric_value numeric not null default 0,
  metric_payload jsonb not null default '{}'::jsonb,
  source_from timestamptz,
  source_to timestamptz,
  calculation_version integer not null default 1,
  calculated_at timestamptz not null default now(),
  is_final boolean not null default false,
  constraint statistics_scope_check check ((scope = 'global' and scope_id is null) or (scope <> 'global' and scope_id is not null)),
  constraint statistics_calculation_version_check check (calculation_version > 0)
);

create unique index if not exists statistics_global_unique
  on public.statistics_aggregates(entity_type, entity_id, metric_key, calculation_version)
  where scope = 'global';

create unique index if not exists statistics_scoped_unique
  on public.statistics_aggregates(scope, scope_id, entity_type, entity_id, metric_key, calculation_version)
  where scope <> 'global';

alter table public.standings_cache
  drop constraint if exists standings_cache_snapshot_fk;

alter table public.standings_cache
  add constraint standings_cache_snapshot_fk foreign key (snapshot_id) references public.snapshots(id) on delete restrict;

create or replace function public.prevent_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Snapshots are immutable. Create a new revision instead.';
end;
$$;

drop trigger if exists prevent_snapshot_update on public.snapshots;
create trigger prevent_snapshot_update
before update on public.snapshots
for each row execute function public.prevent_snapshot_mutation();

drop trigger if exists prevent_snapshot_delete on public.snapshots;
create trigger prevent_snapshot_delete
before delete on public.snapshots
for each row execute function public.prevent_snapshot_mutation();

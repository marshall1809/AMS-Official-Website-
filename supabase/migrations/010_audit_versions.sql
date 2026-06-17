-- 010_audit_versions.sql
-- Audit logs and entity version storage.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  scope public.scope_type,
  scope_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.entity_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  version integer not null,
  data jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_reason text,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, version),
  constraint entity_versions_version_check check (version > 0)
);

create or replace function public.write_audit_log(
  action_input text,
  entity_type_input text,
  entity_id_input uuid,
  before_data_input jsonb default null,
  after_data_input jsonb default null,
  reason_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data, reason)
  values (auth.uid(), action_input, entity_type_input, entity_id_input, before_data_input, after_data_input, reason_input)
  returning id into new_id;

  return new_id;
end;
$$;

# AMS RLS Smoke-Test Checklist

Run this checklist only after:

1. `supabase db reset` passes
2. `supabase/tests/ams_smoke_test_seed.sql` has been inserted successfully

Important: SQL executed as the `postgres` owner can bypass RLS. For realistic checks, test through the Supabase client with anon/authenticated keys, or use transaction-scoped role changes as shown below.

## Fixed smoke-test IDs

- Public season: `10000000-0000-0000-0000-000000000001`
- Draft season: `10000000-0000-0000-0000-000000000099`
- Public division: `20000000-0000-0000-0000-000000000001`
- Draft division: `20000000-0000-0000-0000-000000000099`
- Public competition: `30000000-0000-0000-0000-000000000001`
- Draft competition: `30000000-0000-0000-0000-000000000099`
- Public page: `a0000000-0000-0000-0000-000000000001`
- Draft page: `a0000000-0000-0000-0000-000000000099`
- Public champion snapshot: `90000000-0000-0000-0000-000000000001`
- Draft/internal snapshot: `90000000-0000-0000-0000-000000000099`

## Test 1: Anonymous public read

Expected: all counts are `1`.

```sql
begin;
set local role anon;

select count(*) as public_pages
from public.pages
where id = 'a0000000-0000-0000-0000-000000000001';

select count(*) as public_seasons
from public.seasons
where id = '10000000-0000-0000-0000-000000000001';

select count(*) as public_divisions
from public.divisions
where id = '20000000-0000-0000-0000-000000000001';

select count(*) as public_competitions
from public.competitions
where id = '30000000-0000-0000-0000-000000000001';

select count(*) as public_hall_of_fame_entries
from public.hall_of_fame_entries
where id = '91000000-0000-0000-0000-000000000001';

rollback;
```

## Test 2: Anonymous draft protection

Expected: all counts are `0`.

```sql
begin;
set local role anon;

select count(*) as draft_pages
from public.pages
where id = 'a0000000-0000-0000-0000-000000000099';

select count(*) as draft_seasons
from public.seasons
where id = '10000000-0000-0000-0000-000000000099';

select count(*) as draft_divisions
from public.divisions
where id = '20000000-0000-0000-0000-000000000099';

select count(*) as draft_competitions
from public.competitions
where id = '30000000-0000-0000-0000-000000000099';

select count(*) as internal_snapshots
from public.snapshots
where id = '90000000-0000-0000-0000-000000000099';

rollback;
```

## Test 3: Authenticated user without role cannot write

Create a real Supabase Auth user, then replace this placeholder with its user ID:

```sql
-- Replace before running:
-- 11111111-1111-1111-1111-111111111111
```

Expected: each insert/update fails with an RLS policy error.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.seasons (name, slug, status)
values ('No Role Season', 'no-role-season', 'draft');

rollback;
```

Repeat the same pattern for:

- `public.divisions`
- `public.competitions`
- `public.teams`
- `public.match_results`
- `public.media_assets`
- `public.pages`

## Test 4: Super Admin can manage everything

Create a real Supabase Auth user, then add a role assignment. Replace the placeholder ID with the real Auth user ID.

```sql
insert into public.user_role_assignments (user_id, role, scope, scope_id, capabilities, is_active)
values (
  '22222222-2222-2222-2222-222222222222',
  'super_admin',
  'global',
  null,
  array[
    'view_admin','manage_settings','manage_users','manage_permissions','manage_seasons','manage_divisions',
    'manage_competitions','manage_templates','manage_teams','manage_media','delete_media','manage_themes',
    'manage_pages','publish_pages','enter_results','certify_results','override_results','manage_standings',
    'manage_brackets','finalize_competition','create_snapshots','manage_hall_of_fame','manage_statistics',
    'view_audit_log','restore_versions'
  ],
  true
);
```

Expected: the authenticated user can write season, division, competition, team, result, media, and page records.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.seasons (id, name, slug, status)
values ('b0000000-0000-0000-0000-000000000001', 'Super Admin Test Season', 'super-admin-test-season', 'draft');

rollback;
```

## Test 5: Scoped admin can write only inside assigned scope

Create a real Supabase Auth user and grant Division 1 result rights:

```sql
insert into public.user_role_assignments (user_id, role, scope, scope_id, capabilities, is_active)
values (
  '33333333-3333-3333-3333-333333333333',
  'tournament_manager',
  'division',
  '20000000-0000-0000-0000-000000000001',
  array['view_admin','manage_competitions','enter_results','certify_results','manage_standings','manage_brackets'],
  true
);
```

Expected: this user can edit operational data for Division 1's competition.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

update public.matches
set report = 'Scoped manager smoke-test update.'
where id = '50000000-0000-0000-0000-000000000001';

rollback;
```

To prove the scope boundary, create another season/division/competition/match outside Division 1 and verify the same user cannot update it. Expected result: RLS policy denial or zero rows affected, depending on the query.

## Test 6: Snapshot protection

Expected: both statements fail with:

```text
Snapshots are immutable. Create a new revision instead.
```

```sql
update public.snapshots
set data = jsonb_build_object('illegal', true)
where id = '90000000-0000-0000-0000-000000000001';

delete from public.snapshots
where id = '90000000-0000-0000-0000-000000000001';
```

Expected revised-snapshot behavior: insert a new row with the same kind/source and `revision = 2`, optionally using `supersedes_snapshot_id`.

## Test 7: Media protection

The smoke seed does not create media assets because the schema stores metadata in Postgres and the binary file in Supabase Storage. To test media protection:

1. Insert a media asset row.
2. Add a `media_usages` row with `is_protected = true` or `is_historical = true`.
3. Try to delete the media asset.

Expected: deletion fails with:

```text
Media asset is protected by historical usage and cannot be deleted.
```

Example:

```sql
begin;

insert into public.media_assets (id, bucket, path, public_url, title, state, scope, scope_id)
values (
  'd0000000-0000-0000-0000-000000000001',
  'media',
  'smoke/protected-logo.png',
  'https://example.com/smoke/protected-logo.png',
  'Protected smoke logo',
  'protected',
  'competition',
  '30000000-0000-0000-0000-000000000001'
);

insert into public.media_usages (media_asset_id, entity_type, entity_id, field_name, scope, scope_id, is_historical, is_protected)
values (
  'd0000000-0000-0000-0000-000000000001',
  'hall_of_fame_entry',
  '91000000-0000-0000-0000-000000000001',
  'logo_asset_id',
  'competition',
  '30000000-0000-0000-0000-000000000001',
  true,
  true
);

delete from public.media_assets
where id = 'd0000000-0000-0000-0000-000000000001';

rollback;
```

## Pass criteria

- Anonymous user sees public records only.
- Anonymous user cannot see draft records or internal snapshots.
- Authenticated user without role cannot write.
- Super Admin can write globally.
- Scoped admin can write only inside assigned scope.
- Snapshots cannot be updated or deleted.
- Protected or historical media cannot be deleted.

## If something fails

Send back:

1. The exact SQL block you ran
2. The exact error output
3. Whether you were testing as `anon`, `authenticated`, or `postgres`
4. Whether the seed file had run successfully first

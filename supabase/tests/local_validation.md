# AMS Supabase Local Validation

This guide validates only the Supabase backend migration chain and security behavior.

Do not use `supabase/ams_platform_schema.sql`. It is deprecated.

Use only the migration files in `supabase/migrations`, in the order documented by `supabase/migrations/README.md`.

## Requirements

- Docker Desktop running
- Supabase CLI installed
- `psql` installed and available locally
- Repository root opened locally

## Step 1: Start local Supabase

From the repository root:

```bash
supabase start
```

Expected result:

- Supabase starts local services
- The output shows local API, DB, Studio, and Inbucket URLs
- The default local database URL is usually:

```bash
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Step 2: Run migrations from a clean database

From the repository root:

```bash
supabase db reset
```

This command resets the local database and runs all files in `supabase/migrations` alphabetically.

Expected successful output should include migration names similar to:

```text
Applying migration 001_extensions_and_enums.sql...
Applying migration 002_auth_permissions.sql...
...
Applying migration 015_scoped_rls_hardening.sql...
Finished supabase db reset.
```

## If a migration fails

Stop at the first error and copy the complete error output.

Send back:

1. The migration file name shown by Supabase CLI
2. The exact SQL error
3. The statement or block printed near the error
4. Any line number shown

Do not continue with smoke-test data until `supabase db reset` completes successfully.

## Step 3: Run smoke-test seed data

After migrations pass, set the database URL if needed:

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Then run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ams_smoke_test_seed.sql
```

Expected successful output ends without `ERROR` and includes insert/update command tags such as:

```text
BEGIN
UPDATE 1
INSERT 0 1
COMMIT
```

## Step 4: RLS smoke checks

Use `supabase/tests/rls_smoke_test_checklist.md` after the seed has run.

Important: SQL run as the `postgres` database owner can bypass RLS. For meaningful RLS checks, use one of these methods:

- Supabase client using the anon key
- Supabase client authenticated as a real user
- SQL with `set local role anon` or `set local role authenticated`, plus JWT claim settings where needed

## Optional npm shortcuts

If package scripts are available, these commands are equivalent helpers:

```bash
npm run db:start
npm run db:reset
npm run db:test:smoke
```

`npm run db:test:smoke` expects `DATABASE_URL` to be set.

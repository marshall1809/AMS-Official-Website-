# AMS Supabase Migrations

Run these files in order on a fresh Supabase project.

1. `001_extensions_and_enums.sql`
2. `002_auth_permissions.sql`
3. `003_media_themes_settings.sql`
4. `004_core_hierarchy.sql`
5. `005_teams_versions_participation.sql`
6. `006_matches_results_advancement.sql`
7. `007_standings_movement.sql`
8. `008_snapshots_hall_of_fame_stats.sql`
9. `009_cms_routes_navigation.sql`
10. `010_audit_versions.sql`
11. `011_integrity_triggers.sql`
12. `012_indexes.sql`
13. `013_rls_policies.sql`
14. `014_seed_defaults.sql`

## Important

This migration set is the hardened competition-first schema. It is safer than the old monolithic `supabase/ams_platform_schema.sql` draft.

Do not run this directly over the current production database without a migration/backup plan. For a clean Supabase project, run the files in the order above.

Before running `014_seed_defaults.sql`, optionally replace the commented Super Admin UUID with your real `auth.users.id` and uncomment that block.

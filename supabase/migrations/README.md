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
15. `015_scoped_rls_hardening.sql`
16. `016_mvp_team_logo_storage.sql`
17. `017_mvp_legacy_team_bridge.sql`
18. `018_mvp_single_elimination.sql`
19. `019_mvp_rules_pdf_storage.sql`
20. `020_public_team_logo_read.sql`
21. `021_mvp_theme_management.sql`
22. `022_mvp_info_documents.sql`

## Important

This migration set is the hardened competition-first schema. It is safer than the old monolithic `supabase/ams_platform_schema.sql` draft.

Do not run this directly over the current production database without a migration/backup plan. For a clean Supabase project, run the files in the order above.

Before running `014_seed_defaults.sql`, optionally replace the commented Super Admin UUID with your real `auth.users.id` and uncomment that block.

`015_scoped_rls_hardening.sql` must be run after `013_rls_policies.sql`. It deliberately replaces selected baseline policies with stricter season/division/competition-aware rules.

`016_mvp_team_logo_storage.sql` creates the public `ams-media` bucket and the minimum authenticated policies required for Season team logos.

`017_mvp_legacy_team_bridge.sql` adapts legacy Team and Season participation columns for the MVP Team Manager.

`018_mvp_single_elimination.sql` adds the launch-only Single Elimination bracket tables and policies.

`019_mvp_rules_pdf_storage.sql` allows Season rules PDFs in `ams-media` and adds Content Manager upload/removal policies.

`020_public_team_logo_read.sql` ensures that logo assets used by teams in public Seasons can be read by the anonymous public website.

`021_mvp_theme_management.sql` adds compatible Theme Manager permissions and public reads for global and Season themes.

`022_mvp_info_documents.sql` expands the former Rules PDF upload into public Season Info documents, including embedded PDFs and downloadable files.

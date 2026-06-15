# Alliance Master Series Platform

Production-oriented Next.js and Supabase platform for the Alliance Master Series.

## Includes

- Dynamic CMS routing through a route/page table
- Season packages with themes, pages, teams, matches, brackets, rules, news and sponsors
- CSS-variable theme system
- Admin area with Supabase Auth protection
- Server Actions with role checks
- Supabase Postgres schema, RLS policies and Storage buckets
- Sitemap and robots generation
- Bundled AMS default content as fallback data

## No-terminal installation

Use [INSTALLATION-OHNE-TERMINAL.md](./INSTALLATION-OHNE-TERMINAL.md) for a browser-only setup with GitHub, Supabase and Vercel.

## Environment variables

Copy `.env.example` to your deployment provider:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

`SUPABASE_SERVICE_ROLE_KEY` is intentionally not required by the current app runtime.

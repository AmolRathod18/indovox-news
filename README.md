# INDOVOX — The Voice of India

Responsive React + TypeScript newsroom frontend with an optional Supabase-backed NewsAPI.org importer.

## Local development

```sh
npm install
copy .env.example .env.local
npm run dev
```

When Supabase environment variables are empty, the site uses clearly marked sample stories. Once connected, it reads published records from Supabase and does not silently fall back to sample news on database errors.

## Daily NewsAPI import

The importer makes one NewsAPI `/v2/everything` request per scheduled run (up to 100 results), filters out stale, malformed, duplicate, and unapproved-domain items, then stores the publisher-provided headline, description, image URL, author, publisher, source URL, date, category, and keyword tags. A normalized source URL key prevents duplicates that differ only by common tracking parameters. The NewsAPI key and Supabase service-role key are only used server-side; neither belongs in frontend environment variables.

### Supabase setup

1. Create a Supabase project and apply the migrations in order: first `supabase/migrations/202610230001_news_feed.sql`, then `supabase/migrations/202610230002_editorial_dashboard.sql`. Alternatively, link the project and run `npx supabase db push`.
2. Set the frontend values in `.env.local` (or the hosting provider's public build environment):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
3. Create your editor account with Supabase Auth. Grant the editor role once using a trusted administrator tool or the SQL editor after replacing the email below. Never set this role from the website or user-editable metadata:
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'editor')
   where email = 'you@example.com';
   ```
   Sign out and back in after changing the role. Routine article, category, image, and importer management can then be done at `/admin`.
4. Deploy the function: `npx supabase functions deploy fetch-news`.
5. In Supabase Edge Function secrets, set:
   - `NEWS_API_KEY` — your NewsAPI.org key
   - `NEWS_IMPORT_SECRET` — a random secret of at least 32 characters, also stored in Supabase Vault for the cron job
   - `NEWS_ALLOWED_DOMAINS` — comma-separated publisher domains you have reviewed and are permitted to use, such as `publisher.example,another.example`. The importer refuses to fetch stories when this allowlist is empty.
6. Enable `pg_cron`, `pg_net`, and Vault in Supabase. Create these named secrets in the Supabase Vault dashboard: `indovox_project_url`, `indovox_service_role_key`, and `indovox_news_import_secret`. Use the project URL, service-role key, and the same random import secret set for the Edge Function. Do not place their values in source files or chat. Then run `supabase/setup/schedule-news-import.sql` once in the Supabase SQL editor. It schedules the function daily at 01:00 UTC. The schedule can be changed in the cron expression there.
7. Sign in at `/admin` with the editor account. The dashboard supports creating/editing/publishing articles, drafts, image uploads, category management, and manual imports. The importer switch enables or pauses scheduled fetching; every imported story remains a draft for editorial review.

Do not commit `.env.local`, API keys, Vault values, or the service-role key. The service-role key bypasses RLS and must stay in Supabase server-side configuration.

### Editorial, licensing, and provider constraints

- NewsAPI.org's Developer plan is for development/testing only and is not permitted for production. A paid subscription suitable for production is required before enabling the public scheduled feed. Check current NewsAPI terms and source licensing before launch.
- NewsAPI provides metadata and often-truncated content, not full article text. INDOVOX displays the supplied description as a publisher description and links to the original article; it does not scrape or republish full articles.
- Automatic categorization and tags are keyword-based heuristics, not editorial verification. The allowlist should contain only publisher domains approved for the intended use. NewsAPI can return irrelevant search matches, and no automatic system can guarantee that every item is accurate or newsworthy.
- The importer filters to English results from the last 36 hours, uses one request per daily run, and relies on a unique normalized source URL to prevent duplicates. It cannot promise breaking-news speed; change the schedule only after checking the provider quota and plan.
- Missing publisher images use `public/news-placeholder.svg`. Missing descriptions are not invented or auto-published. No AI-written summaries are generated.
- If NewsAPI fails or storage fails, the run records an error and no stories from that failed write are reported as published. The admin page displays the last run status and allows editors to pause/resume scheduled imports.
- The `article-images` Storage bucket and editor-only upload/delete policies are created by migration 002. Images are public to read so published stories can display them.

## Checks

```sh
npm run build
npm run lint
```

The app is currently client-rendered with React Router. Article pages set canonical, description, Open Graph, Twitter, and structured-data metadata at runtime; use an SSR/prerendering deployment strategy if stronger crawler coverage is required.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (length(trim(title)) between 8 and 300),
  summary text,
  image_url text,
  category text not null check (
    category in (
      'India', 'Politics', 'Crime', 'World', 'Business',
      'Technology', 'Sports', 'Entertainment', 'Current Affairs'
    )
  ),
  author text,
  source_name text not null,
  source_url text not null unique,
  source_key text not null unique,
  tags text[] not null default '{}',
  status text not null default 'published' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_feed_idx
  on public.articles (published_at desc)
  where status = 'published';
create index if not exists articles_category_feed_idx
  on public.articles (category, published_at desc)
  where status = 'published';
create index if not exists articles_search_idx
  on public.articles using gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
  );

create table if not exists public.news_feed_settings (
  id boolean primary key default true check (id),
  auto_publish_enabled boolean not null default false,
  last_run_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

insert into public.news_feed_settings (id)
values (true)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists news_feed_settings_set_updated_at on public.news_feed_settings;
create trigger news_feed_settings_set_updated_at
before update on public.news_feed_settings
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
alter table public.news_feed_settings enable row level security;

drop policy if exists "Published stories are public" on public.articles;
create policy "Published stories are public"
on public.articles for select
using (
  status = 'published'
  or (auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
);

drop policy if exists "Editors can manage stories" on public.articles;
create policy "Editors can manage stories"
on public.articles for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Editors can read feed settings" on public.news_feed_settings;
create policy "Editors can read feed settings"
on public.news_feed_settings for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

drop policy if exists "Editors can update feed settings" on public.news_feed_settings;
create policy "Editors can update feed settings"
on public.news_feed_settings for update
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

grant select on public.articles to anon, authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select, update on public.news_feed_settings to authenticated;

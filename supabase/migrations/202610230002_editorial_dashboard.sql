create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  category_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists category_key text;

create unique index if not exists categories_category_key_idx
  on public.categories (category_key)
  where category_key is not null;

insert into public.categories (name, slug, category_key)
values
  ('India', 'india', 'india'),
  ('Politics', 'politics', 'politics'),
  ('Crime', 'crime', 'crime'),
  ('World', 'world', 'world'),
  ('Business', 'business', 'business'),
  ('Technology', 'technology', 'technology'),
  ('Sports', 'sports', 'sports'),
  ('Entertainment', 'entertainment', 'entertainment'),
  ('Current Affairs', 'current-affairs', 'current-affairs'),
  ('Explainers', 'explainers', null)
on conflict (name) do update
set category_key = coalesce(public.categories.category_key, excluded.category_key);

alter table public.articles
  add column if not exists full_content text not null default '',
  add column if not exists is_breaking boolean not null default false,
  add column if not exists is_imported boolean not null default false;

alter table public.articles
  drop constraint if exists articles_category_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'articles_category_name_fkey'
      and conrelid = 'public.articles'::regclass
  ) then
    alter table public.articles
      add constraint articles_category_name_fkey
      foreign key (category) references public.categories(name)
      on update cascade on delete restrict;
  end if;
end
$$;

alter table public.news_feed_settings
  add column if not exists last_successful_import_at timestamptz,
  add column if not exists last_import_count integer not null default 0;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

drop policy if exists "Categories are public" on public.categories;
create policy "Categories are public"
on public.categories for select
using (true);

drop policy if exists "Editors can manage categories" on public.categories;
create policy "Editors can manage categories"
on public.categories for all
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view article images" on storage.objects;
create policy "Public can view article images"
on storage.objects for select
using (bucket_id = 'article-images');

drop policy if exists "Editors can upload article images" on storage.objects;
create policy "Editors can upload article images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'article-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
);

drop policy if exists "Editors can update article images" on storage.objects;
create policy "Editors can update article images"
on storage.objects for update to authenticated
using (
  bucket_id = 'article-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
)
with check (
  bucket_id = 'article-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
);

drop policy if exists "Editors can delete article images" on storage.objects;
create policy "Editors can delete article images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'article-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'editor'
);

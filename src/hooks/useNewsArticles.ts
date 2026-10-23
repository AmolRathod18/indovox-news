import { useEffect, useState } from 'react';
import { articleData, type Article, type Category } from '../data/newsData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type NewsRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  category: Category;
  author: string | null;
  source_name: string;
  source_url: string;
  published_at: string;
  tags: string[];
  is_featured: boolean;
  is_trending: boolean;
  full_content: string | null;
  is_breaking: boolean;
  is_imported: boolean;
};

type NewsState = {
  articles: Article[];
  isLoading: boolean;
  error: string | null;
  isPreview: boolean;
};

function toArticle(row: NewsRow): Article {
  const summary = row.summary?.trim() ?? '';

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary,
    content: row.full_content?.trim()
      ? row.full_content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
      : summary ? [summary] : [],
    category: row.category,
    date: row.published_at,
    author: row.author || row.source_name,
    readTime: 'Read source',
    image: row.image_url || '/news-placeholder.svg',
    featured: row.is_featured,
    breaking: row.is_breaking,
    trending: row.is_trending,
    tags: row.tags ?? [],
    source: row.source_name,
    sourceUrl: row.source_url,
  };
}

export function useNewsArticles(): NewsState {
  const [state, setState] = useState<NewsState>({
    articles: isSupabaseConfigured ? [] : articleData,
    isLoading: isSupabaseConfigured,
    error: null,
    isPreview: !isSupabaseConfigured,
  });

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let active = true;

    async function loadArticles(newsClient: NonNullable<typeof supabase>) {
      const { data, error } = await newsClient
        .from('articles')
        .select(
          'id, slug, title, summary, full_content, image_url, category, author, source_name, source_url, published_at, tags, is_featured, is_trending, is_breaking, is_imported',
        )
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(60);

      if (!active) return;

      if (error) {
        const message = error.code === '42703'
          ? 'Apply supabase/migrations/202610230002_editorial_dashboard.sql after the initial news-feed migration to add the current article fields.'
          : error.code === '42P01'
            ? 'Apply supabase/migrations/202610230001_news_feed.sql to create the news database tables.'
            : error.message;
        setState({ articles: [], isLoading: false, error: message, isPreview: false });
        return;
      }

      setState({
        articles: (data as NewsRow[]).map(toArticle),
        isLoading: false,
        error: null,
        isPreview: false,
      });
    }

    void loadArticles(client).catch((error: unknown) => {
      if (!active) return;
      setState({
        articles: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Could not load published stories.',
        isPreview: false,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

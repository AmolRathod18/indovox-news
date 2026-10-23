import { useEffect, useState } from 'react';
import { categories } from '../data/newsData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type NewsCategory = {
  id: string;
  name: string;
  slug: string;
};

const defaultCategories = categories.map(({ name }) => ({
  id: name,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
}));

export function useNewsCategories() {
  const [items, setItems] = useState<NewsCategory[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    void (async () => {
      try {
        const { data, error: loadError } = await client.from('categories').select('id, name, slug').order('name');
        if (!active) return;
        if (loadError) {
          setError(loadError.message);
          return;
        }
        if (data) setItems(data as NewsCategory[]);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load categories.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { categories: items, isLoading, error };
}

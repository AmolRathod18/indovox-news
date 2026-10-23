import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import NewsCard from '../components/NewsCard';
import { useNewsArticles } from '../hooks/useNewsArticles';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { articles, isLoading, error } = useNewsArticles();
  const query = searchParams.get('q')?.trim() ?? '';
  const normalizedQuery = query.toLocaleLowerCase();
  const results = normalizedQuery
    ? articles.filter((article) =>
        [article.title, article.summary, article.category, article.author, ...article.tags]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : [];

  return (
    <main className="mx-auto min-h-[55vh] max-w-[1380px] px-4 py-10 md:px-8">
      <div className="mb-8 border-b-2 border-[#171717] pb-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#c5222a]">Search the newsroom</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-[-0.05em] text-[#171717]">
          <Search className="h-7 w-7 text-[#c5222a]" />
          {query ? `Results for “${query}”` : 'Search'}
        </h1>
        {query && <p className="mt-2 text-sm text-stone-500">{results.length} published {results.length === 1 ? 'story' : 'stories'} found</p>}
      </div>

      {isLoading ? (
        <div role="status" className="border border-stone-200 bg-white p-8 text-center text-stone-600">Searching published stories…</div>
      ) : error ? (
        <div role="alert" className="border border-red-200 bg-red-50 p-8 text-center text-red-800">Could not search published stories: {error}</div>
      ) : results.length > 0 ? (
        <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((article) => <NewsCard key={article.id} article={article} />)}
        </div>
      ) : (
        <div className="border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-black text-[#171717]">{query ? 'No stories matched your search' : 'Enter a search term to get started'}</h2>
          <p className="mt-2 text-sm text-stone-500">{query ? 'Try a different topic, category, or keyword.' : 'Search sample headlines, story summaries, categories, or tags.'}</p>
        </div>
      )}
    </main>
  );
}

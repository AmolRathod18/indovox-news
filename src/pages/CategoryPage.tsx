import { Link, useParams } from 'react-router-dom';
import NewsCard from '../components/NewsCard';
import { useNewsArticles } from '../hooks/useNewsArticles';
import { useNewsCategories } from '../hooks/useNewsCategories';

export default function CategoryPage() {
  const { slug } = useParams();
  const { articles, isLoading, error } = useNewsArticles();
  const { categories: availableCategories, error: categoryLoadError } = useNewsCategories();

  const categoryName = availableCategories.find((item) => item.slug === slug)?.name;
  const filtered = articles.filter((item) => item.category === categoryName);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-8 bg-[#171717] p-8 text-white">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#ff8a00]">Category</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">{categoryName ? `${categoryName} News` : 'Category not found'}</h1>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {availableCategories.map((category) => (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className={`border px-4 py-2 text-sm font-semibold transition ${
              category.name === categoryName ? 'border-red-600 bg-red-600 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-red-500 hover:text-red-600'
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {categoryLoadError && <div role="alert" className="mb-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Could not refresh category links: {categoryLoadError}</div>}
      {!categoryName ? (
        <div className="border border-dashed border-stone-300 bg-white p-10 text-center">
          <h2 className="text-2xl font-black text-stone-900">That category does not exist</h2>
          <p className="mt-2 text-stone-600">Choose a category from the list above.</p>
        </div>
      ) : isLoading ? (
        <div role="status" className="border border-stone-200 bg-white p-8 text-center text-stone-600">Loading stories…</div>
      ) : error ? (
        <div role="alert" className="border border-red-200 bg-red-50 p-8 text-center text-red-800">Could not load stories: {error}</div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => <NewsCard key={article.id} article={article} />)}
        </div>
      ) : (
        <div className="border border-dashed border-stone-300 bg-white p-10 text-center">
          <h2 className="text-2xl font-black text-stone-900">No stories available yet</h2>
          <p className="mt-2 text-stone-600">This category will publish soon.</p>
        </div>
      )}
    </div>
  );
}

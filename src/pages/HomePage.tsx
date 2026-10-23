import { ArrowRight, Clock3, Flame, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import NewsCard from '../components/NewsCard';
import { breakingStories } from '../data/newsData';
import { formatDate } from '../lib/utils';
import { useNewsArticles } from '../hooks/useNewsArticles';
import { useNewsCategories } from '../hooks/useNewsCategories';

export default function HomePage() {
  const { articles, isLoading, error, isPreview } = useNewsArticles();
  const { categories } = useNewsCategories();
  const featuredArticles = articles.filter((item) => item.featured);
  const latestArticles = articles.slice(0, 6);
  const trendingArticles = articles.filter((item) => item.trending).slice(0, 4);
  const leadStory = featuredArticles[0] ?? articles[0];
  const sideStories = articles.filter((item) => item.id !== leadStory?.id).slice(0, 3);
  const tickerStories = isPreview
    ? breakingStories.map((story) => ({ id: story.id, title: story.title, link: story.link }))
    : articles.slice(0, 5).map((story) => ({ id: story.id, title: story.title, link: `/news/${story.slug}` }));

  return (
    <main>
      <div className="bg-[#c5222a] text-white">
        <div className="mx-auto flex max-w-[1380px] items-center gap-3 overflow-hidden px-4 py-2.5 md:px-8">
          <span className="shrink-0 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#c5222a]">{isPreview ? 'Preview' : 'Latest'}</span>
          <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] sm:inline">{isPreview ? 'Sample headlines' : 'From the newsroom'}</span>
          <div className="flex min-w-0 items-center gap-8 overflow-hidden whitespace-nowrap text-xs font-semibold">
            {tickerStories.slice(0, 2).map((story) => (
              <Link key={story.id} to={story.link} className="transition hover:text-orange-100">{story.title}</Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-7 md:px-8 md:pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-300 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5222a]">{isPreview ? 'Design preview · News that matters' : 'Latest edition · News that matters'}</p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[#171717] sm:text-3xl">THE DAILY VOICE</h1>
          </div>
          <p className="max-w-xs text-right text-[10px] leading-4 text-stone-500 sm:text-xs">
            {isPreview ? 'DESIGN PREVIEW — sample stories only. Replace with verified reporting before publishing.' : 'News headlines and descriptions are attributed to their original publishers.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Published news could not be loaded: {error}
          </div>
        )}

        {isLoading && (
          <div className="mb-5 border border-stone-200 bg-white px-4 py-5 text-sm text-stone-600" role="status">
            Loading the latest published news…
          </div>
        )}

        {!isLoading && !error && articles.length === 0 && (
          <div className="mb-5 border border-stone-200 bg-white px-5 py-8 text-sm text-stone-600">
            No published stories are available yet. Stories appear here after an editor publishes them from the admin dashboard.
          </div>
        )}

        {leadStory && (
        <section className="grid gap-7 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.75fr)]">
          <article className="grid overflow-hidden border-b border-stone-300 bg-white sm:grid-cols-[1.15fr_0.85fr]">
            <Link to={`/news/${leadStory.slug}`} className="group relative block min-h-[300px] overflow-hidden sm:min-h-[470px]">
              <img
                src={leadStory.image}
                alt={leadStory.title}
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-black/10" />
              <span className="absolute left-5 top-5 bg-[#c5222a] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                {leadStory.category}
              </span>
              <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white sm:hidden">
                <Clock3 className="h-3.5 w-3.5" /> {leadStory.readTime}
              </span>
            </Link>

            <div className="flex flex-col justify-center px-5 py-7 sm:px-7 lg:px-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c5222a]">Top story <span className="px-1 text-stone-300">/</span> {formatDate(leadStory.date)}</p>
              <Link to={`/news/${leadStory.slug}`} className="mt-4">
                <h2 className="text-[2rem] font-black leading-[1.04] tracking-[-0.055em] text-[#171717] transition hover:text-[#c5222a] sm:text-[2.6rem]">
                  {leadStory.title}
                </h2>
              </Link>
              <p className="mt-5 text-sm leading-6 text-stone-600">{leadStory.summary}</p>
              <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-4">
                <span className="text-xs font-semibold text-stone-700">{leadStory.author}</span>
                <Link to={`/news/${leadStory.slug}`} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c5222a]">
                  Read story <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>

          <aside className="border-t-2 border-[#171717] bg-white px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[#171717]">Editor’s picks</h2>
              <span className="h-2 w-2 rounded-full bg-[#c5222a]" />
            </div>
            <div className="divide-y divide-stone-200">
              {sideStories.map((story, index) => (
                <Link key={story.id} to={`/news/${story.slug}`} className="group flex gap-4 py-4 first:pt-1 last:pb-1">
                  <span className="pt-1 text-2xl font-black tracking-[-0.08em] text-stone-300">0{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#c5222a]">{story.category}</span>
                    <span className="mt-1 block text-base font-extrabold leading-snug tracking-[-0.03em] text-[#171717] transition group-hover:text-[#c5222a]">{story.title}</span>
                    <span className="mt-2 block text-[10px] text-stone-500">{formatDate(story.date)} · {story.readTime}</span>
                  </span>
                </Link>
              ))}
            </div>
            <a href="https://www.instagram.com/indo_vox/" target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-between border-t border-stone-200 pt-4 text-xs font-bold text-[#171717] hover:text-[#c5222a]">
              Follow the newsroom on Instagram <ArrowRight className="h-4 w-4" />
            </a>
          </aside>
        </section>
        )}

        {(isPreview || trendingArticles.length > 0) && <section className="mt-12 border-y border-stone-300 py-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#c5222a]" />
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-[#171717]">{isPreview ? 'Trending · preview data' : 'Trending · editor selected'}</h2>
            </div>
            <TrendingUp className="h-4 w-4 text-stone-400" />
          </div>
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {trendingArticles.map((story, index) => (
              <Link key={story.id} to={`/news/${story.slug}`} className="flex gap-3 border-t border-stone-200 py-4 sm:px-4 sm:first:pl-0 sm:nth-[2]:border-l sm:nth-[3]:border-l sm:nth-[4]:border-l lg:border-t-0 lg:first:pl-0">
                <span className="text-xl font-black text-[#c5222a]">0{index + 1}</span>
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-stone-500">{story.category}</span>
                  <span className="mt-1 block text-sm font-bold leading-5 text-[#171717] hover:text-[#c5222a]">{story.title}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>}

        {articles.length > 0 && <section className="mt-12">
          <div className="mb-5 flex items-end justify-between border-b-2 border-[#171717] pb-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#c5222a]">Across the country</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[#171717] sm:text-3xl">Latest stories</h2>
            </div>
            <Link to="/category/india" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c5222a]">
              All news <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((article) => <NewsCard key={article.id} article={article} />)}
          </div>
        </section>}

        <section className="mt-14 grid items-center gap-6 bg-[#171717] px-6 py-8 text-white sm:grid-cols-[1fr_auto] sm:px-9">
          <div className="flex items-center gap-5">
            <img src="/indovox-logo.png" alt="INDOVOX logo" className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24" />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff8a00]">On Instagram</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] sm:text-3xl">News that moves with you.</h2>
              <p className="mt-2 max-w-xl text-xs leading-5 text-stone-400">Follow INDOVOX for updates and explainers. This site links to the channel and does not embed its feed.</p>
            </div>
          </div>
          <a href="https://www.instagram.com/indo_vox/" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 border border-[#ff8a00] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff8a00] transition hover:bg-[#ff8a00] hover:text-[#171717]">
            Follow @indo_vox <ArrowRight className="h-4 w-4" />
          </a>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between border-b border-stone-300 pb-3">
            <h2 className="text-xl font-black tracking-[-0.04em] text-[#171717]">Explore by section</h2>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-stone-500">The stories shaping today</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-[#c5222a] hover:text-[#c5222a]">
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Link2, Share2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useNewsArticles } from '../hooks/useNewsArticles';
import { formatDateTime } from '../lib/utils';

function setMeta(name: string, content: string, property = false) {
  const attribute = property ? 'property' : 'name';
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.append(meta);
  }
  meta.content = content;
}

export default function ArticlePage() {
  const { slug } = useParams();
  const { articles, isLoading, error, isPreview } = useNewsArticles();
  const article = articles.find((item) => item.slug === slug);

  useEffect(() => {
    if (!article) return;

    const canonicalUrl = window.location.href;
    const description = article.summary || article.title;
    document.title = `${article.title} | INDOVOX`;
    setMeta('description', description);
    setMeta('og:type', 'article', true);
    setMeta('og:title', article.title, true);
    setMeta('og:description', description, true);
    setMeta('og:image', new URL(article.image, window.location.origin).href, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('twitter:card', 'summary_large_image');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;

    const articleStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: article.title,
      description,
      image: [new URL(article.image, window.location.origin).href],
      datePublished: article.date,
      publisher: { '@type': 'Organization', name: 'INDOVOX' },
      mainEntityOfPage: canonicalUrl,
    };
    let structuredData = document.getElementById('article-structured-data');
    if (!structuredData) {
      structuredData = document.createElement('script');
      structuredData.id = 'article-structured-data';
      structuredData.setAttribute('type', 'application/ld+json');
      document.head.append(structuredData);
    }
    structuredData.textContent = JSON.stringify(articleStructuredData);
  }, [article]);

  if (isLoading) {
    return <div role="status" className="mx-auto min-h-[55vh] max-w-3xl px-4 py-20 text-center text-stone-600">Loading story…</div>;
  }
  if (error) {
    return <div role="alert" className="mx-auto min-h-[55vh] max-w-3xl px-4 py-20 text-center text-red-800">Could not load this story: {error}</div>;
  }
  if (!article) {
    return (
      <div className="mx-auto min-h-[55vh] max-w-3xl px-4 py-20 text-center">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-red-600">Article not found</p>
        <h1 className="mt-4 text-4xl font-black text-stone-900">This story is unavailable.</h1>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 bg-red-600 px-5 py-3 font-bold text-white">
          <ArrowLeft className="h-4 w-4" /> Return home
        </Link>
      </div>
    );
  }

  const relatedStories = articles.filter((item) => item.category === article.category && item.id !== article.id).slice(0, 3);
  const pageUrl = window.location.href;
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTitle = encodeURIComponent(article.title);

  async function shareStory(title: string, summary: string) {
    if (navigator.share) {
      await navigator.share({ title, text: summary, url: pageUrl });
      return;
    }
    await navigator.clipboard.writeText(pageUrl);
  }

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-10">
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link to="/" className="font-medium hover:text-red-600">Home</Link>
        <span>/</span>
        <Link to={`/category/${article.category.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-red-600">{article.category}</Link>
      </div>

      {!isPreview && (
        <div className="mb-4 border-l-2 border-[#c5222a] bg-white px-4 py-3 text-xs leading-5 text-stone-600">
          This story uses the original publisher’s headline and available description. It is not a full republication or an independent fact-check.
        </div>
      )}

      <div className="overflow-hidden border border-stone-200 bg-white">
        <img
          src={article.image}
          alt={article.title}
          onError={(event) => {
            event.currentTarget.src = '/news-placeholder.svg';
          }}
          className="h-[280px] w-full object-cover md:h-[480px]"
        />
      </div>

      <header className="mx-auto max-w-4xl pt-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
          <span className="bg-red-100 px-3 py-1 text-red-600">{article.category}</span>
          <span>{formatDateTime(article.date)}</span>
        </div>

        <h1 className="text-3xl font-black leading-tight text-stone-900 md:text-5xl">{article.title}</h1>
        {article.summary && <p className="mt-4 text-lg leading-7 text-stone-600">{article.summary}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-stone-200 py-4">
          <div>
            <div className="text-sm font-bold text-stone-900">{article.author}</div>
            <div className="mt-1 text-xs text-stone-500">
              Source: {article.source || 'INDOVOX sample desk'} · Published {formatDateTime(article.date)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void shareStory(article.title, article.summary).catch((shareError: unknown) => console.error('Sharing was not completed:', shareError))}
              className="border border-stone-200 p-2.5 text-stone-700 transition hover:border-red-500 hover:text-red-600"
              aria-label="Share this INDOVOX story"
              title="Share story"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <a
              href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
              className="border border-stone-200 px-3 py-2.5 text-xs font-bold text-stone-700 hover:border-green-600 hover:text-green-700"
              aria-label="Share on WhatsApp"
            >
              WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
              className="border border-stone-200 px-3 py-2.5 text-xs font-bold text-stone-700 hover:border-blue-600 hover:text-blue-700"
              aria-label="Share on Facebook"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
              className="border border-stone-200 px-3 py-2.5 text-xs font-bold text-stone-700 hover:border-stone-900 hover:text-stone-900"
              aria-label="Share on X"
            >
              X
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-stone-200 bg-white p-5 md:p-8">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c5222a]">
            <Link2 className="h-4 w-4" /> {isPreview ? 'Story' : 'Publisher description'}
          </div>
          {article.summary ? (
            <p className="mb-6 text-lg leading-8 text-stone-700">{article.summary}</p>
          ) : (
            <p className="mb-6 text-sm text-stone-600">The publisher did not provide a description for this story.</p>
          )}
          {article.content.map((paragraph, index) => (
            <p key={index} className="mb-5 whitespace-pre-line text-base leading-8 text-stone-700">
              {paragraph}
            </p>
          ))}
          {article.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#c5222a] px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#a91d23]"
            >
              Read full story at {article.source || 'publisher'} <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {!article.sourceUrl && (
            <p className="border-l-2 border-stone-300 pl-3 text-xs leading-5 text-stone-500">
              Preview story only. Replace this sample with verified reporting before publishing.
            </p>
          )}
        </div>

        <aside className="space-y-6">
          <div className="border-t-2 border-[#171717] bg-white p-5">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#c5222a]">Latest headlines</div>
            <ul className="mt-4 divide-y divide-stone-200">
              {articles.slice(0, 4).map((story) => (
                <li key={story.id} className="py-3 first:pt-0 last:pb-0">
                  <Link to={`/news/${story.slug}`} className="block text-sm font-bold leading-5 text-stone-800 transition hover:text-red-600">{story.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          {relatedStories.length > 0 && (
            <div className="border border-stone-200 bg-white p-5">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#c5222a]">Related stories</div>
              <div className="mt-4 space-y-4">
                {relatedStories.map((story) => (
                  <Link key={story.id} to={`/news/${story.slug}`} className="flex gap-3 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                    <img
                      src={story.image}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src = '/news-placeholder.svg';
                      }}
                      className="h-20 w-20 object-cover"
                    />
                    <div>
                      <div className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-stone-500">{story.category}</div>
                      <h3 className="mt-1 text-sm font-black leading-5 text-stone-900">{story.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="mx-auto mt-10 flex max-w-4xl items-center justify-between gap-3 border border-stone-200 bg-white p-5">
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-stone-700 hover:text-red-600"><ArrowLeft className="h-4 w-4" /> All stories</Link>
        <Link to={`/category/${article.category.toLowerCase().replace(/\s+/g, '-')}`} className="inline-flex items-center gap-2 font-bold text-red-600">More {article.category} <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </article>
  );
}

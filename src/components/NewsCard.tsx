import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Article } from '../data/newsData';
import { formatDateTime } from '../lib/utils';

type NewsCardProps = {
  article: Article;
};

export default function NewsCard({ article }: NewsCardProps) {
  return (
    <article className="group overflow-hidden border-b border-stone-300 bg-white transition hover:shadow-lg">
      <Link to={`/news/${article.slug}`} className="block">
        <div className="relative overflow-hidden bg-stone-200">
          <img
            src={article.image}
            alt={article.title}
            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = '/news-placeholder.svg';
            }}
          />
          <span className="absolute bottom-3 left-3 bg-[#c5222a] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
            {article.category}
          </span>
        </div>
      </Link>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          <CalendarDays className="h-3.5 w-3.5 text-[#c5222a]" />
          <span>{formatDateTime(article.date)}</span>
        </div>

        <Link to={`/news/${article.slug}`} className="block">
          <h3 className="text-lg font-black leading-tight tracking-[-0.035em] text-[#171717] transition group-hover:text-[#c5222a]">
            {article.title}
          </h3>
        </Link>

        <p className="text-xs leading-5 text-stone-600">{article.summary}</p>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-xs">
          <span className="font-semibold text-stone-500">{article.author}</span>
          <Link to={`/news/${article.slug}`} className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.08em] text-[#c5222a]">
            Read <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

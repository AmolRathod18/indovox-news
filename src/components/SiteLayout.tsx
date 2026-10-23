import { useState, type FormEvent } from 'react';
import { Camera, Menu, Search, X } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useNewsCategories } from '../hooks/useNewsCategories';

const copyrightYear = new Date().getFullYear();

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { categories } = useNewsCategories();
  const navLinks = [
    { name: 'Home', to: '/' },
    ...categories.map((category) => ({ name: category.name, to: `/category/${category.slug}` })),
  ];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setMenuOpen(false);
  }

  return (
    <header className="relative z-40 bg-[#10100f] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 md:px-8">
          <span>Independent perspective. Informed India.</span>
          <a
            href="https://www.instagram.com/indo_vox/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-[#ff8a00]"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>@indo_vox</span>
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
        <Link to="/" aria-label="INDOVOX home" className="flex min-w-0 items-center gap-3">
          <img
            src="/indovox-logo.png"
            alt="INDOVOX — The Voice of India logo"
            className="h-[66px] w-[66px] shrink-0 rounded-full object-cover ring-1 ring-white/20 sm:h-[78px] sm:w-[78px]"
          />
          <span className="min-w-0">
            <span className="block text-2xl font-black leading-none tracking-[-0.07em] sm:text-3xl">
              INDO<span className="text-[#ff8a00]">VOX</span>
            </span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.25em] text-stone-400 sm:text-[10px]">
              The Voice of India
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          {searchOpen && (
            <form onSubmit={submitSearch} className="flex items-center border-b border-white/30">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stories"
                aria-label="Search stories"
                className="w-40 bg-transparent py-2 text-sm text-white outline-none placeholder:text-stone-500"
              />
              <button aria-label="Submit search" className="p-2 text-stone-300 hover:text-white">
                <Search className="h-4 w-4" />
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={searchOpen ? 'Close search' : 'Open search'}
            className="p-2 text-stone-300 transition hover:text-[#ff8a00]"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <a
            href="https://www.instagram.com/indo_vox/"
            target="_blank"
            rel="noreferrer"
            className="border border-[#ff8a00] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#ff8a00] transition hover:bg-[#ff8a00] hover:text-[#10100f]"
          >
            Follow us
          </a>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Toggle search"
            className="p-2 text-stone-200"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 text-stone-200"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} className="border-t border-white/10 px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-[1380px] items-center border-b border-white/30">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search headlines, topics and stories"
              aria-label="Search stories"
              className="w-full bg-transparent py-2 text-sm text-white outline-none placeholder:text-stone-500"
            />
            <button type="submit" aria-label="Submit search" className="p-2 text-stone-300">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      <nav className="hidden border-y border-white/10 md:block">
        <div className="mx-auto flex max-w-[1380px] items-center gap-7 overflow-x-auto px-8 py-3">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] text-stone-300 transition hover:text-[#ff8a00]"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </nav>

      {menuOpen && (
        <nav className="absolute inset-x-0 top-full border-t border-white/10 bg-[#10100f] px-4 pb-5 shadow-2xl md:hidden">
          <div className="mx-auto grid max-w-[1380px] grid-cols-2 gap-x-4">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/10 py-3 text-xs font-bold uppercase tracking-[0.12em] text-stone-200"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const { categories } = useNewsCategories();

  return (
    <footer className="bg-[#10100f] text-white">
      <div className="mx-auto grid max-w-[1380px] gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <img src="/indovox-logo.png" alt="" className="h-14 w-14 rounded-full object-cover" />
            <div>
              <div className="text-xl font-black tracking-[-0.06em]">INDO<span className="text-[#ff8a00]">VOX</span></div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-stone-400">The Voice of India</div>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-stone-400">
            A digital newsroom bringing you reporting, context, and perspectives from India and around the world.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a00]">Explore</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
            {categories.slice(0, 8).map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="text-sm text-stone-300 hover:text-white">
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a00]">Stay connected</h2>
          <a
            href="https://www.instagram.com/indo_vox/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-stone-300 transition hover:text-white"
          >
            <Camera className="h-4 w-4" />
            Follow @indo_vox on Instagram
          </a>
          <Link
            to="/admin"
            className="mt-4 block text-xs text-stone-500 transition hover:text-white"
          >
            Admin sign in
          </Link>
          <p className="mt-6 text-xs leading-5 text-stone-500">
            Follow the original publisher links and verify every story.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-2 px-4 py-4 text-[10px] uppercase tracking-[0.12em] text-stone-500 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span>© {copyrightYear} INDOVOX. All rights reserved.</span>
          <span>Report with care. Verify every story.</span>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout() {
  return (
    <div className="min-h-screen bg-[#f2f0ec]">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}

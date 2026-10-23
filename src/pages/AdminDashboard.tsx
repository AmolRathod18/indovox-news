import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Pencil,
  Plus,
  Rss,
  Search,
  Settings,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { slugify } from '../lib/utils';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type ArticleStatus = 'draft' | 'published';
type WorkspaceView = 'overview' | 'articles' | 'categories' | 'newsapi';

type ArticleRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  full_content: string;
  image_url: string | null;
  category: string;
  author: string | null;
  source_name: string;
  source_url: string;
  source_key: string;
  tags: string[];
  status: ArticleStatus;
  is_featured: boolean;
  is_breaking: boolean;
  is_trending: boolean;
  is_imported: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  category_key: string | null;
};

type FeedSettings = {
  auto_publish_enabled: boolean;
  last_run_at: string | null;
  last_successful_import_at: string | null;
  last_import_count: number;
  last_error: string | null;
};

type WorkspaceStats = {
  total: number;
  published: number;
  drafts: number;
  featured: number;
};

type ArticleDraft = {
  id: string | null;
  title: string;
  summary: string;
  full_content: string;
  category: string;
  tags: string;
  author: string;
  source_name: string;
  source_url: string;
  image_url: string;
  is_featured: boolean;
  is_breaking: boolean;
};

const emptyDraft: ArticleDraft = {
  id: null,
  title: '',
  summary: '',
  full_content: '',
  category: '',
  tags: '',
  author: '',
  source_name: '',
  source_url: '',
  image_url: '',
  is_featured: false,
  is_breaking: false,
};

const inputClass =
  'mt-1.5 w-full border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-[#c5222a]';

function friendlyError(message: string) {
  if (/column .* does not exist|schema cache/i.test(message)) {
    return 'The editorial database migration is missing. Apply supabase/migrations/202610230002_editorial_dashboard.sql after the initial news-feed migration.';
  }
  if (message.includes('articles_category_name_fkey') || message.includes('foreign key constraint')) {
    return 'This category is in use by an article. Reassign those articles before deleting it.';
  }
  if (message.includes('article-images') || message.includes('Bucket not found')) {
    return 'Image storage is not configured. Apply the editorial dashboard migration to create the article-images bucket and editor policies.';
  }
  if (message.includes('row-level security') || message.includes('permission denied') || message.includes('42501')) {
    return 'Supabase denied this action. Confirm your account has app_metadata.role = editor and that the latest RLS migration has been applied.';
  }
  if (message.includes('articles_source_key_key') || message.includes('source_key')) {
    return 'An article with this original source URL already exists.';
  }
  return message;
}

function emptyToNull(value: string) {
  return value.trim() || null;
}

function canonicalSourceUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Source URL must be a secure HTTPS link without credentials or a nonstandard port.');
  }
  url.hash = '';
  for (const parameter of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|ref|source)$/i.test(parameter)) url.searchParams.delete(parameter);
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return { sourceUrl: value.trim(), sourceKey: url.toString() };
}

function getCategoryOptions(categories: CategoryRecord[]): CategoryRecord[] {
  const known: CategoryRecord[] = [
    'India', 'Politics', 'Crime', 'World', 'Business', 'Technology', 'Sports', 'Entertainment', 'Current Affairs',
  ].map((name) => ({ id: name, name, slug: slugify(name), category_key: slugify(name) }));
  const combined = [...categories, ...known];
  return combined.filter((category, index) => combined.findIndex((item) => item.name === category.name) === index);
}

export default function AdminDashboard() {
  const client = supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(client));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [view, setView] = useState<WorkspaceView>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [settings, setSettings] = useState<FeedSettings | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats>({ total: 0, published: 0, drafts: 0, featured: 0 });
  const [operation, setOperation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [articlePage, setArticlePage] = useState(1);
  const [articleEditorOpen, setArticleEditorOpen] = useState(false);
  const [articlePreviewOpen, setArticlePreviewOpen] = useState(false);
  const [draft, setDraft] = useState<ArticleDraft>(emptyDraft);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);

  useEffect(() => {
    if (!client) return;

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      setError(null);
    });

    void client.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch((sessionError: unknown) => {
        setError(sessionError instanceof Error ? sessionError.message : 'Could not restore your session.');
        setAuthLoading(false);
      });

    return () => authListener.subscription.unsubscribe();
  }, [client]);

  const isEditor = session?.user.app_metadata?.role === 'editor';

  const loadWorkspace = useCallback(async () => {
    if (!client || !isEditor) return;

    setWorkspaceLoading(true);
    setError(null);
    try {
      const [articleResult, categoryResult, settingsResult, totalCount, publishedCount, draftCount, featuredCount] = await Promise.all([
        client
          .from('articles')
          .select('id, slug, title, summary, full_content, image_url, category, author, source_name, source_url, source_key, tags, status, is_featured, is_breaking, is_trending, is_imported, published_at, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(500),
        client.from('categories')        .select('id, name, slug, category_key').order('name'),
        client
          .from('news_feed_settings')
          .select('auto_publish_enabled, last_run_at, last_successful_import_at, last_import_count, last_error')
          .eq('id', true)
          .maybeSingle(),
        client.from('articles').select('id', { count: 'exact', head: true }),
        client.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        client.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        client.from('articles').select('id', { count: 'exact', head: true }).eq('is_featured', true),
      ]);

      if (articleResult.error) throw new Error(`Could not load articles: ${articleResult.error.message}`);
      if (categoryResult.error) throw new Error(`Could not load categories: ${categoryResult.error.message}`);
      if (settingsResult.error) throw new Error(`Could not load importer settings: ${settingsResult.error.message}`);
      for (const countResult of [totalCount, publishedCount, draftCount, featuredCount]) {
        if (countResult.error) throw new Error(`Could not load dashboard counts: ${countResult.error.message}`);
      }

      setArticles((articleResult.data ?? []) as ArticleRecord[]);
      setCategories((categoryResult.data ?? []) as CategoryRecord[]);
      setSettings(settingsResult.data as FeedSettings | null);
      setStats({
        total: totalCount.count ?? 0,
        published: publishedCount.count ?? 0,
        drafts: draftCount.count ?? 0,
        featured: featuredCount.count ?? 0,
      });
    } catch (loadError) {
      setError(friendlyError(loadError instanceof Error ? loadError.message : 'Could not load the admin workspace.'));
    } finally {
      setWorkspaceLoading(false);
    }
  }, [client, isEditor]);

  useEffect(() => {
    if (isEditor) void Promise.resolve().then(() => loadWorkspace());
  }, [isEditor, loadWorkspace]);

  const categoryOptions = useMemo(() => getCategoryOptions(categories), [categories]);

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return articles.filter((article) => {
      const matchesSearch =
        !query ||
        [article.title, article.summary ?? '', article.author ?? '', article.source_name, article.tags.join(' ')]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [articles, categoryFilter, search, statusFilter]);
  const pageSize = 25;
  const totalArticlePages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const visibleArticles = filteredArticles.slice((articlePage - 1) * pageSize, articlePage * pageSize);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;

    setSignInLoading(true);
    setError(null);
    try {
      const { error: signInError } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      setPassword('');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Sign in failed. Check your email and password.');
    } finally {
      setSignInLoading(false);
    }
  }

  async function signOut() {
    if (!client) return;
    setOperation('sign-out');
    setError(null);
    try {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
      setArticles([]);
      setCategories([]);
      setSettings(null);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
    } finally {
      setOperation(null);
    }
  }

  function startNewArticle() {
    setDraft({ ...emptyDraft, category: categoryOptions[0]?.name ?? '' });
    setImageFile(null);
    setArticlePreviewOpen(false);
    setArticleEditorOpen(true);
    setError(null);
  }

  function startEditArticle(article: ArticleRecord) {
    setDraft({
      id: article.id,
      title: article.title,
      summary: article.summary ?? '',
      full_content: article.full_content ?? '',
      category: article.category,
      tags: article.tags.join(', '),
      author: article.author ?? '',
      source_name: article.source_name,
      source_url: article.source_url,
      image_url: article.image_url ?? '',
      is_featured: article.is_featured,
      is_breaking: article.is_breaking,
    });
    setImageFile(null);
    setArticlePreviewOpen(false);
    setArticleEditorOpen(true);
    setError(null);
  }

  async function saveArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === 'published' ? 'published' : 'draft';

    if (!draft.title.trim() || !draft.summary.trim() || !draft.category || !draft.source_name.trim()) {
      setError('Headline, summary, category, and source name are required.');
      return;
    }
    if (draft.title.trim().length < 8 || draft.title.trim().length > 300) {
      setError('Headline must be between 8 and 300 characters.');
      return;
    }

    setOperation('save-article');
    setError(null);
    setNotice(null);

    try {
      const { sourceUrl, sourceKey } = canonicalSourceUrl(draft.source_url);
      let imageUrl = draft.image_url.trim() || null;
      if (imageUrl) {
        const parsedImageUrl = new URL(imageUrl);
        if (parsedImageUrl.protocol !== 'https:' || parsedImageUrl.username || parsedImageUrl.password) {
          throw new Error('Featured image URL must be a secure HTTPS link without credentials.');
        }
        imageUrl = parsedImageUrl.toString();
      }

      if (imageFile) {
        if (!imageFile.type.startsWith('image/')) throw new Error('Choose a valid image file.');
        if (imageFile.size > 5 * 1024 * 1024) throw new Error('Featured images must be 5 MB or smaller.');
        const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const imagePath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage
          .from('article-images')
          .upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false });
        if (uploadError) throw new Error(friendlyError(uploadError.message));
        imageUrl = client.storage.from('article-images').getPublicUrl(imagePath).data.publicUrl;
      }

      const articleValues = {
        slug: draft.id
          ? articles.find((article) => article.id === draft.id)?.slug ?? slugify(draft.title)
          : `${slugify(draft.title) || 'news-story'}-${crypto.randomUUID().slice(0, 6)}`,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        full_content: draft.full_content.trim(),
        image_url: imageUrl,
        category: draft.category,
        author: emptyToNull(draft.author),
        source_name: draft.source_name.trim(),
        source_url: sourceUrl,
        source_key: sourceKey,
        tags: [...new Set(draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 20),
        status,
        is_featured: draft.is_featured,
        is_breaking: draft.is_breaking,
        is_imported: draft.id
          ? articles.find((article) => article.id === draft.id)?.is_imported ?? false
          : false,
        published_at: status === 'published'
          ? (draft.id ? articles.find((item) => item.id === draft.id)?.published_at : null) ?? new Date().toISOString()
          : (draft.id ? articles.find((item) => item.id === draft.id)?.published_at : null) ?? new Date().toISOString(),
      };

      const result = draft.id
        ? await client.from('articles').update(articleValues).eq('id', draft.id)
        : await client.from('articles').insert(articleValues);
      if (result.error) throw new Error(friendlyError(result.error.message));

      setNotice(status === 'published' ? 'Article published.' : 'Draft saved.');
      setArticleEditorOpen(false);
      await loadWorkspace();
    } catch (saveError) {
      setError(friendlyError(saveError instanceof Error ? saveError.message : 'Could not save the article.'));
    } finally {
      setOperation(null);
    }
  }

  async function setArticleStatus(article: ArticleRecord, status: ArticleStatus) {
    if (!client) return;
    setOperation(`status-${article.id}`);
    setError(null);
    try {
      const { error: updateError } = await client
        .from('articles')
        .update({
          status,
          published_at: status === 'published' ? new Date().toISOString() : article.published_at,
        })
        .eq('id', article.id);
      if (updateError) throw updateError;
      setNotice(status === 'published' ? 'Article published.' : 'Article moved to drafts.');
      await loadWorkspace();
    } catch (updateError) {
      setError(friendlyError(updateError instanceof Error ? updateError.message : 'Could not update article status.'));
    } finally {
      setOperation(null);
    }
  }

  async function deleteArticle(article: ArticleRecord) {
    if (!client || !window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
    setOperation(`delete-${article.id}`);
    setError(null);
    try {
      const { error: deleteError } = await client.from('articles').delete().eq('id', article.id);
      if (deleteError) throw deleteError;
      setNotice('Article deleted.');
      await loadWorkspace();
    } catch (deleteError) {
      setError(friendlyError(deleteError instanceof Error ? deleteError.message : 'Could not delete the article.'));
    } finally {
      setOperation(null);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    const name = categoryName.trim();
    if (name.length < 2 || name.length > 50) {
      setError('Category names must be between 2 and 50 characters.');
      return;
    }
    const slug = slugify(name);
    if (!slug) {
      setError('Enter a category name containing letters or numbers.');
      return;
    }

    setCategorySaving(true);
    setError(null);
    try {
      const result = editingCategory
        ? await client.from('categories').update({ name, slug }).eq('id', editingCategory.id)
        : await client.from('categories').insert({ name, slug });
      if (result.error) throw result.error;
      setCategoryName('');
      setEditingCategory(null);
      setNotice(editingCategory ? 'Category updated.' : 'Category created.');
      await loadWorkspace();
    } catch (categoryError) {
      setError(friendlyError(categoryError instanceof Error ? categoryError.message : 'Could not save this category.'));
    } finally {
      setCategorySaving(false);
    }
  }

  async function deleteCategory(category: CategoryRecord) {
    if (!client || !window.confirm(`Delete the “${category.name}” category? It cannot be deleted while articles use it.`)) return;
    setOperation(`delete-category-${category.id}`);
    setError(null);
    try {
      const { error: deleteError } = await client.from('categories').delete().eq('id', category.id);
      if (deleteError) throw deleteError;
      setNotice('Category deleted.');
      await loadWorkspace();
    } catch (deleteError) {
      setError(friendlyError(deleteError instanceof Error ? deleteError.message : 'Could not delete the category.'));
    } finally {
      setOperation(null);
    }
  }

  async function toggleAutoImport() {
    if (!client || !settings) return;
    setOperation('toggle-import');
    setError(null);
    try {
      const { data, error: updateError } = await client
        .from('news_feed_settings')
        .update({ auto_publish_enabled: !settings.auto_publish_enabled })
        .eq('id', true)
        .select('auto_publish_enabled, last_run_at, last_successful_import_at, last_import_count, last_error')
        .single();
      if (updateError) throw updateError;
      setSettings(data as FeedSettings);
      setNotice(data.auto_publish_enabled ? 'Automatic imports enabled.' : 'Automatic imports paused.');
    } catch (toggleError) {
      setError(friendlyError(toggleError instanceof Error ? toggleError.message : 'Could not update automatic import settings.'));
    } finally {
      setOperation(null);
    }
  }

  async function runNewsImport() {
    if (!client) return;
    setOperation('run-import');
    setError(null);
    setNotice(null);
    try {
      const { data, error: importError } = await client.functions.invoke('fetch-news', { body: { manual: true } });
      if (importError) {
        const response = importError.context instanceof Response ? await importError.context.clone().json().catch(() => null) as { error?: string } | null : null;
        throw new Error(response?.error || importError.message);
      }
      if (data?.error) throw new Error(data.error);
      if (data?.skipped) throw new Error(data.reason || 'Import was skipped.');
      setNotice(`Import completed. ${data?.imported ?? 0} new stories saved as drafts for review.`);
      await loadWorkspace();
    } catch (importError) {
      setError(friendlyError(importError instanceof Error ? importError.message : 'News import failed. Check Edge Function configuration and logs.'));
    } finally {
      setOperation(null);
    }
  }

  function navButton(key: WorkspaceView, label: string, Icon: typeof LayoutDashboard) {
    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          setView(key);
          setMobileNavOpen(false);
          setError(null);
        }}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition ${
          view === key ? 'border-l-2 border-[#ff8a00] bg-white/10 text-white' : 'text-stone-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon className="h-4 w-4" /> {label}
      </button>
    );
  }

  if (!isSupabaseConfigured || !client) {
    return (
      <main className="mx-auto min-h-[65vh] max-w-lg px-4 py-16">
        <div className="border border-amber-300 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
          Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code>, then restart Vite.
        </div>
      </main>
    );
  }

  if (authLoading) {
    return <main className="mx-auto min-h-[60vh] max-w-lg px-4 py-20 text-center text-sm text-stone-600">Restoring secure session…</main>;
  }

  if (!session) {
    return (
      <main className="flex min-h-[72vh] items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-4xl overflow-hidden border border-stone-200 bg-white shadow-xl md:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden flex-col justify-between bg-[#171717] p-8 text-white md:flex">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/indovox-logo.png" alt="" className="h-14 w-14 rounded-full object-cover" />
              <span className="text-xl font-black tracking-[-0.06em]">INDO<span className="text-[#ff8a00]">VOX</span></span>
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff8a00]">Newsroom access</p>
              <h1 className="mt-3 text-4xl font-black leading-tight">Your newsroom.<br />Your voice.</h1>
              <p className="mt-4 text-sm leading-6 text-stone-400">Sign in to manage stories, categories, images, and news imports.</p>
            </div>
            <p className="text-xs text-stone-500">The Voice of India</p>
          </div>

          <form onSubmit={(event) => void signIn(event)} className="p-6 sm:p-9">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500 hover:text-[#c5222a]">
              <ArrowLeft className="h-4 w-4" /> Back to site
            </Link>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c5222a]">Editor sign in</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-stone-900">Welcome back</h2>
            <p className="mt-2 text-sm text-stone-500">Use your Supabase Auth account.</p>

            <label className="mt-7 block text-xs font-bold uppercase tracking-[0.1em] text-stone-600">
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-[0.1em] text-stone-600">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            {error && <div role="alert" className="mt-4 border-l-2 border-red-600 bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</div>}
            <button disabled={signInLoading} className="mt-6 w-full bg-[#c5222a] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#a91d23] disabled:cursor-wait disabled:opacity-60">
              {signInLoading ? 'Signing in…' : 'Sign in securely'}
            </button>
            <p className="mt-4 text-center text-xs text-stone-500">Editor permissions are managed securely by your project administrator.</p>
          </form>
        </div>
      </main>
    );
  }

  if (!isEditor) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-xl px-4 py-16">
        <div className="border border-amber-300 bg-amber-50 p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">Editor role required</p>
          <h1 className="mt-2 text-2xl font-black text-stone-900">This account cannot manage the newsroom.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-700">You are signed in, but your account does not have the editor role. Contact the project owner to grant editor access. Do not change browser data; permissions are verified by Supabase.</p>
          <button type="button" onClick={() => void signOut()} className="mt-5 bg-stone-900 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-white">Sign out</button>
        </div>
      </main>
    );
  }

  const importedDraftCount = articles.filter((article) => article.is_imported && article.status === 'draft').length;

  return (
    <main className="mx-auto min-h-[75vh] max-w-[1500px] px-3 py-6 md:px-6 lg:py-9">
      <div className="overflow-hidden border border-stone-300 bg-white shadow-sm">
        <div className="flex min-h-[690px] flex-col md:flex-row">
          <aside className="w-full shrink-0 bg-[#171717] text-white md:w-60">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <Link to="/" className="flex items-center gap-3">
                <img src="/indovox-logo.png" alt="" className="h-10 w-10 rounded-full object-cover" />
                <span>
                  <span className="block text-sm font-black tracking-[-0.04em]">INDO<span className="text-[#ff8a00]">VOX</span></span>
                  <span className="block text-[8px] uppercase tracking-[0.16em] text-stone-400">Newsroom CMS</span>
                </span>
              </Link>
              <button type="button" className="p-2 text-stone-300 md:hidden" aria-label="Toggle admin navigation" onClick={() => setMobileNavOpen((open) => !open)}>
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            <div className={`${mobileNavOpen ? 'block' : 'hidden'} py-4 md:block`}>
              <p className="px-5 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-500">Workspace</p>
              {navButton('overview', 'Overview', LayoutDashboard)}
              {navButton('articles', 'Articles', FileText)}
              {navButton('categories', 'Categories', Tags)}
              {navButton('newsapi', 'NewsAPI imports', Rss)}
            </div>
            <div className="hidden border-t border-white/10 px-5 py-4 md:block">
              <p className="truncate text-xs font-semibold text-stone-300">{session.user.email}</p>
              <button type="button" onClick={() => void signOut()} disabled={operation === 'sign-out'} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white">
                <LogOut className="h-3.5 w-3.5" /> {operation === 'sign-out' ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </aside>

          <section className="min-w-0 flex-1 bg-[#f7f6f3]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-4 sm:px-7">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#c5222a]">INDOVOX / Admin</p>
                <h1 className="mt-1 text-xl font-black tracking-[-0.04em] text-stone-900">
                  {view === 'overview' ? 'Newsroom overview' : view === 'articles' ? 'Manage articles' : view === 'categories' ? 'Manage categories' : 'NewsAPI importer'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void loadWorkspace()} disabled={workspaceLoading} className="border border-stone-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-600 disabled:opacity-50">
                  {workspaceLoading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button type="button" onClick={() => void signOut()} disabled={operation === 'sign-out'} className="inline-flex items-center gap-2 bg-[#171717] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white md:hidden">
                  <LogOut className="h-3.5 w-3.5" /> Logout
                </button>
                <Link to="/" className="hidden items-center gap-2 text-xs font-semibold text-stone-600 hover:text-[#c5222a] sm:inline-flex">
                  <Newspaper className="h-4 w-4" /> View site
                </Link>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-7">
              {error && <div role="alert" className="flex items-start justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
              {notice && <div role="status" className="flex items-center gap-2 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><Check className="h-4 w-4" /> {notice}<button type="button" className="ml-auto" aria-label="Dismiss message" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}
              {workspaceLoading && articles.length === 0 && <div role="status" className="border border-stone-200 bg-white p-6 text-sm text-stone-600">Loading newsroom data…</div>}

              {view === 'overview' && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { title: 'Total articles', value: stats.total, icon: FileText, color: 'text-blue-700 bg-blue-50' },
                      { title: 'Published', value: stats.published, icon: Check, color: 'text-green-700 bg-green-50' },
                      { title: 'Drafts / review', value: stats.drafts, icon: Pencil, color: 'text-amber-700 bg-amber-50' },
                      { title: 'Featured', value: stats.featured, icon: BarChart3, color: 'text-red-700 bg-red-50' },
                    ].map(({ title, value, icon: Icon, color }) => (
                      <div key={title} className="flex items-center justify-between border border-stone-200 bg-white p-4">
                        <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">{title}</p><p className="mt-2 text-3xl font-black text-stone-900">{value}</p></div>
                        <div className={`p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                      </div>
                    ))}
                  </div>

                  {importedDraftCount > 0 && (
                    <button type="button" onClick={() => { setView('articles'); setStatusFilter('draft'); }} className="flex w-full items-center justify-between border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-900">
                      <span>{importedDraftCount} imported {importedDraftCount === 1 ? 'story needs' : 'stories need'} your review</span><ArrowLeft className="h-4 w-4 rotate-180" />
                    </button>
                  )}

                  <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
                    <section className="border border-stone-200 bg-white">
                      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4">
                        <div><h2 className="text-sm font-black text-stone-900">Recent articles</h2><p className="mt-1 text-xs text-stone-500">Latest edits and publishing activity</p></div>
                        <button type="button" onClick={() => setView('articles')} className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#c5222a]">View all</button>
                      </div>
                      {articles.slice(0, 6).length ? (
                        <div className="divide-y divide-stone-100">
                          {articles.slice(0, 6).map((article) => (
                            <div key={article.id} className="flex items-center justify-between gap-4 px-4 py-3">
                              <div className="min-w-0"><p className="truncate text-sm font-bold text-stone-800">{article.title}</p><p className="mt-1 text-[10px] text-stone-500">{article.category} · {article.source_name}</p></div>
                              <span className={`shrink-0 px-2 py-1 text-[9px] font-bold uppercase ${article.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{article.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="px-4 py-8 text-sm text-stone-500">No articles yet. Add the first story to get started.</p>}
                    </section>

                    <section className="border border-stone-200 bg-white p-4">
                      <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-[#c5222a]" /><h2 className="text-sm font-black text-stone-900">Categories</h2></div>
                      <p className="mt-1 text-xs text-stone-500">{categories.length} categories in your newsroom</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {categoryOptions.map((category) => <span key={category.id} className="border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[10px] font-semibold text-stone-700">{category.name}</span>)}
                      </div>
                      <button type="button" onClick={() => setView('categories')} className="mt-5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#c5222a]">Manage categories →</button>
                    </section>
                  </div>
                </>
              )}

              {view === 'articles' && (
                <section className="border border-stone-200 bg-white">
                  <div className="flex flex-col justify-between gap-4 border-b border-stone-200 p-4 sm:flex-row sm:items-center">
                    <div><h2 className="text-sm font-black text-stone-900">All stories</h2><p className="mt-1 text-xs text-stone-500">{filteredArticles.length} matching articles</p></div>
                    <button type="button" onClick={startNewArticle} className="inline-flex items-center justify-center gap-2 bg-[#c5222a] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:bg-[#a91d23]"><Plus className="h-4 w-4" /> New article</button>
                  </div>
                  <div className="grid gap-3 border-b border-stone-200 bg-stone-50 p-4 sm:grid-cols-[1fr_160px_180px]">
                    <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search headlines, authors, tags…" className="w-full border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#c5222a]" /></label>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | ArticleStatus)} className="border border-stone-300 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option></select>
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="border border-stone-300 bg-white px-3 py-2.5 text-sm"><option value="all">All categories</option>{categoryOptions.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select>
                  </div>
                  {filteredArticles.length ? (
                    <div className="divide-y divide-stone-100">
                      {visibleArticles.map((article) => (
                        <div key={article.id} className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <img src={article.image_url || '/news-placeholder.svg'} alt="" className="h-16 w-24 shrink-0 object-cover" onError={(event) => { event.currentTarget.src = '/news-placeholder.svg'; }} />
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-bold leading-5 text-stone-900">{article.title}</p>
                              <p className="mt-1 text-[10px] text-stone-500">{article.category} · {article.source_name}{article.is_imported ? ' · Imported' : ''}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {article.is_featured && <span className="bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-700">Featured</span>}
                                {article.is_breaking && <span className="bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">Breaking</span>}
                              </div>
                            </div>
                          </div>
                          <span className={`w-fit px-2 py-1 text-[9px] font-bold uppercase ${article.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{article.status}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => startEditArticle(article)} className="inline-flex items-center gap-1.5 border border-stone-300 px-3 py-2 text-[10px] font-bold uppercase text-stone-700 hover:border-stone-500"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                            <button type="button" disabled={operation === `status-${article.id}`} onClick={() => void setArticleStatus(article, article.status === 'published' ? 'draft' : 'published')} className="border border-stone-300 px-3 py-2 text-[10px] font-bold uppercase text-stone-700 hover:border-[#c5222a] hover:text-[#c5222a] disabled:opacity-50">
                              {article.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                            <button type="button" disabled={operation === `delete-${article.id}`} onClick={() => void deleteArticle(article)} aria-label={`Delete ${article.title}`} className="border border-stone-300 p-2 text-stone-500 hover:border-red-500 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="px-5 py-12 text-center text-sm text-stone-500">No stories match those filters.</div>}
                  {filteredArticles.length > pageSize && (
                    <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
                      <span className="text-xs text-stone-500">Page {articlePage} of {totalArticlePages}</span>
                      <div className="flex gap-2">
                        <button type="button" disabled={articlePage <= 1} onClick={() => setArticlePage((page) => page - 1)} className="border border-stone-300 px-3 py-2 text-xs font-semibold disabled:opacity-40">Previous</button>
                        <button type="button" disabled={articlePage >= totalArticlePages} onClick={() => setArticlePage((page) => page + 1)} className="border border-stone-300 px-3 py-2 text-xs font-semibold disabled:opacity-40">Next</button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {view === 'categories' && (
                <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                  <form onSubmit={(event) => void saveCategory(event)} className="h-fit border border-stone-200 bg-white p-5">
                    <h2 className="text-sm font-black text-stone-900">{editingCategory ? 'Rename category' : 'Add category'}</h2>
                    <p className="mt-1 text-xs leading-5 text-stone-500">Category changes apply to public archives and article editing.</p>
                    <label className="mt-4 block text-xs font-bold text-stone-600">
                      Category name
                      <input required minLength={2} maxLength={50} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className={inputClass} placeholder="e.g. Education" />
                    </label>
                    {categoryName.trim() && <p className="mt-2 text-[10px] text-stone-500">URL slug: /category/{slugify(categoryName)}</p>}
                    <div className="mt-4 flex gap-2">
                      <button disabled={categorySaving} className="bg-[#c5222a] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50">{categorySaving ? 'Saving…' : editingCategory ? 'Save category' : 'Add category'}</button>
                      {editingCategory && <button type="button" onClick={() => { setEditingCategory(null); setCategoryName(''); }} className="border border-stone-300 px-4 py-2.5 text-[10px] font-bold uppercase text-stone-600">Cancel</button>}
                    </div>
                  </form>

                  <section className="border border-stone-200 bg-white">
                    <div className="border-b border-stone-200 p-4"><h2 className="text-sm font-black text-stone-900">Available categories</h2><p className="mt-1 text-xs text-stone-500">Built-in categories are available to articles; custom categories are managed here.</p></div>
                    <div className="divide-y divide-stone-100">
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between gap-4 px-4 py-3">
                          <div><p className="text-sm font-bold text-stone-800">{category.name}</p><p className="mt-1 text-[10px] text-stone-500">/category/{category.slug}</p></div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setEditingCategory(category); setCategoryName(category.name); }} aria-label={`Rename ${category.name}`} className="border border-stone-300 p-2 text-stone-600 hover:text-[#c5222a]"><Pencil className="h-4 w-4" /></button>
                            <button type="button" disabled={Boolean(category.category_key) || operation === `delete-category-${category.id}`} onClick={() => void deleteCategory(category)} aria-label={`Delete ${category.name}`} title={category.category_key ? 'Built-in category is required for automatic imports' : 'Delete category'} className="border border-stone-300 p-2 text-stone-600 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {view === 'newsapi' && (
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <section className="border border-stone-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-50 p-3 text-[#c5222a]"><Rss className="h-5 w-5" /></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">NewsAPI importer</p><h2 className="mt-1 text-xl font-black text-stone-900">{settings ? settings.auto_publish_enabled ? 'Scheduled import setting enabled' : 'Scheduled imports paused' : 'Importer settings unavailable'}</h2></div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-stone-600">Imported news always lands as a draft. Review the original headline, description, publisher, and source link before publishing.</p>
                    <p className="mt-2 text-xs leading-5 text-stone-500">Enabling this setting does not deploy the Edge Function or daily cron job; both must be configured in Supabase first.</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="bg-stone-50 p-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-stone-500">Last successful import</p><p className="mt-2 text-sm font-bold text-stone-800">{settings?.last_successful_import_at ? new Date(settings.last_successful_import_at).toLocaleString() : 'No successful imports yet'}</p></div>
                      <div className="bg-stone-50 p-4"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-stone-500">New stories last run</p><p className="mt-2 text-2xl font-black text-stone-900">{settings?.last_import_count ?? '—'}</p></div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" disabled={operation !== null} onClick={() => void runNewsImport()} className="inline-flex items-center gap-2 bg-[#c5222a] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white disabled:cursor-wait disabled:opacity-50">
                        <Rss className="h-4 w-4" /> {operation === 'run-import' ? 'Importing…' : 'Run import now'}
                      </button>
                      <button type="button" disabled={operation !== null || !settings} onClick={() => void toggleAutoImport()} className="border border-stone-300 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-stone-700 disabled:opacity-50">
                        {operation === 'toggle-import' ? 'Saving…' : settings?.auto_publish_enabled ? 'Pause scheduled import' : 'Enable scheduled import'}
                      </button>
                    </div>
                    {settings?.last_run_at && <p className="mt-4 text-[10px] text-stone-500">Last attempted run: {new Date(settings.last_run_at).toLocaleString()}</p>}
                    {settings?.last_error && <div role="alert" className="mt-4 border-l-2 border-red-600 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">Last import error: {settings.last_error}</div>}
                  </section>
                  <section className="h-fit border border-amber-300 bg-amber-50 p-5">
                    <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-amber-800" /><h2 className="text-sm font-black text-amber-950">Backend readiness</h2></div>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-xs leading-5 text-amber-950">
                      <li>NewsAPI production-eligible subscription and server-side <code>NEWS_API_KEY</code>.</li>
                      <li><code>NEWS_IMPORT_SECRET</code> and approved publisher domains set as Edge Function secrets.</li>
                      <li>Deployed <code>fetch-news</code> Edge Function; authenticated editor import and daily schedule configured.</li>
                      <li>Imported articles are drafts. Nothing is published automatically.</li>
                    </ul>
                    <p className="mt-4 text-[10px] leading-5 text-amber-900">If any secret is missing, Run import now returns a setup error; it does not simulate a successful import.</p>
                    <button type="button" onClick={() => { setView('articles'); setStatusFilter('draft'); }} className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-950 underline">Review drafts ({importedDraftCount})</button>
                  </section>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {articleEditorOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !operation) setArticleEditorOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="article-editor-title" className="mx-auto my-4 w-full max-w-4xl bg-[#f7f6f3] shadow-2xl">
            <div className="flex items-center justify-between bg-[#171717] px-5 py-4 text-white">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ff8a00]">Article editor</p><h2 id="article-editor-title" className="mt-1 text-lg font-black">{draft.id ? 'Edit story' : 'Write a story'}</h2></div>
              <button type="button" onClick={() => setArticleEditorOpen(false)} disabled={operation === 'save-article'} aria-label="Close editor" className="p-2 text-stone-300 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(event) => void saveArticle(event)} className="space-y-4 p-4 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-bold text-stone-700 md:col-span-2">Headline *
                  <input required minLength={8} maxLength={300} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={inputClass} placeholder="Write an accurate, specific headline" />
                </label>
                <label className="text-xs font-bold text-stone-700 md:col-span-2">Summary *
                  <textarea required rows={3} maxLength={600} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} className={inputClass} placeholder="Short, sourced description. Do not add unverified claims." />
                </label>
                <label className="text-xs font-bold text-stone-700 md:col-span-2">Full article content
                  <textarea rows={8} value={draft.full_content} onChange={(event) => setDraft({ ...draft, full_content: event.target.value })} className={inputClass} placeholder="Write original reporting or content you have permission to publish. Separate paragraphs with blank lines." />
                </label>
                <label className="text-xs font-bold text-stone-700">Category *
                  <select required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={inputClass}>
                    <option value="">Choose category</option>
                    {categoryOptions.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-stone-700">Author / editorial desk
                  <input value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} className={inputClass} placeholder="INDOVOX Desk" />
                </label>
                <label className="text-xs font-bold text-stone-700">Original publisher / source *
                  <input required value={draft.source_name} onChange={(event) => setDraft({ ...draft, source_name: event.target.value })} className={inputClass} placeholder="Publisher or reporting source" />
                </label>
                <label className="text-xs font-bold text-stone-700">Source URL *
                  <input required type="url" value={draft.source_url} onChange={(event) => setDraft({ ...draft, source_url: event.target.value })} className={inputClass} placeholder="https://…" />
                </label>
                <label className="text-xs font-bold text-stone-700 md:col-span-2">Tags
                  <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} className={inputClass} placeholder="Comma-separated topics" />
                </label>
                <label className="text-xs font-bold text-stone-700 md:col-span-2">Featured image
                  <span className="mt-1.5 flex flex-wrap items-center gap-3 border border-dashed border-stone-300 bg-white p-3">
                    <Upload className="h-4 w-4 text-[#c5222a]" />
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs text-stone-600 file:mr-3 file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-xs file:font-bold" />
                    <span className="text-[10px] text-stone-500">JPEG, PNG, WebP, AVIF · max 5 MB</span>
                  </span>
                  <input value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} className={inputClass} placeholder="Or enter a licensed image URL (https://…)" />
                  {imageFile && <span className="mt-1 block text-[10px] text-stone-500">Upload selected: {imageFile.name}</span>}
                </label>
                <div className="flex flex-wrap gap-5 md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700"><input type="checkbox" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} className="accent-[#c5222a]" /> Featured story</label>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700"><input type="checkbox" checked={draft.is_breaking} onChange={(event) => setDraft({ ...draft, is_breaking: event.target.checked })} className="accent-[#c5222a]" /> Breaking news</label>
                </div>
              </div>

              {articlePreviewOpen && (
                <div className="border border-stone-300 bg-white p-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#c5222a]">Preview</p>
                {draft.image_url && <img src={draft.image_url} alt="" className="mt-3 max-h-56 w-full object-cover" onError={(event) => { event.currentTarget.src = '/news-placeholder.svg'; }} />}
                  <h3 className="mt-2 text-2xl font-black leading-tight text-stone-900">{draft.title || 'Your headline preview'}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{draft.summary || 'Your article summary will appear here.'}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">{draft.category || 'Category'} · {draft.source_name || 'Source'} · {draft.author || 'Author'}</p>
                  {draft.full_content && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-700">{draft.full_content}</p>}
                </div>
              )}

              <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-[#f7f6f3] pt-4">
                <button type="button" onClick={() => setArticlePreviewOpen((open) => !open)} className="border border-stone-300 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-700">{articlePreviewOpen ? 'Hide preview' : 'Preview'}</button>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setArticleEditorOpen(false)} disabled={operation === 'save-article'} className="border border-stone-300 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-700">Cancel</button>
                  <button type="submit" name="saveStatus" value="draft" disabled={operation === 'save-article'} className="border border-stone-700 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-800 disabled:opacity-50">{operation === 'save-article' ? 'Saving…' : 'Save draft'}</button>
                  <button type="submit" name="saveStatus" value="published" disabled={operation === 'save-article'} className="bg-[#c5222a] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50">{operation === 'save-article' ? 'Saving…' : 'Publish'}</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NewsApiArticle = {
  source?: { name?: string | null };
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
};

type NewsApiResponse = {
  status?: string;
  code?: string;
  message?: string;
  articles?: NewsApiArticle[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-news-import-secret',
};

type NewsCategory =
  | 'India'
  | 'Politics'
  | 'Crime'
  | 'World'
  | 'Business'
  | 'Technology'
  | 'Sports'
  | 'Entertainment'
  | 'Current Affairs';

function classify(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`.toLowerCase();
  const rules: Array<[NewsCategory, RegExp]> = [
    ['Politics', /\b(election|parliament|minister|government|politic|congress|bjp|lok sabha|rajya sabha|campaign|chief minister)\b/],
    ['Crime', /\b(police|crime|criminal|arrest|murder|fraud|court|investigation|custody|accused|allegation)\b/],
    ['Business', /\b(business|market|stock|economy|economic|bank|trade|company|rupee|inflation|startup|finance)\b/],
    ['Technology', /\b(technology|tech|ai|artificial intelligence|cyber|digital|software|internet|smartphone|telecom)\b/],
    ['Sports', /\b(sport|cricket|football|tennis|hockey|olympic|tournament|match|athlete|league)\b/],
    ['Entertainment', /\b(entertainment|film|cinema|actor|actress|music|television|box office|celebrity)\b/],
    ['World', /\b(world|international|global|diplomacy|foreign|united nations|summit|war|conflict)\b/],
  ];

  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? 'Current Affairs';
}

function makeSlug(title: string): string {
  const suffix = crypto.randomUUID().slice(0, 8);
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
  return `${base || 'news-story'}-${suffix || crypto.randomUUID().slice(0, 8)}`;
}

function validHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function sourceKey(value: string): string {
  const url = new URL(value);
  url.hash = '';
  for (const parameter of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|ref|source)$/i.test(parameter)) {
      url.searchParams.delete(parameter);
    }
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function isAllowedDomain(value: string, allowedDomains: string[]): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function extractTags(text: string): string[] {
  const terms = [
    'India', 'election', 'politics', 'crime', 'court', 'police', 'business',
    'markets', 'technology', 'artificial intelligence', 'sports', 'cricket',
    'entertainment', 'climate', 'health', 'education', 'foreign policy',
  ];
  const normalized = text.toLowerCase();
  return terms.filter((term) => normalized.includes(term.toLowerCase())).slice(0, 6);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders });
  }

  const apiKey = Deno.env.get('NEWS_API_KEY');
  const importSecret = Deno.env.get('NEWS_IMPORT_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const allowedDomains = (Deno.env.get('NEWS_ALLOWED_DOMAINS') ?? '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: 'Server configuration is incomplete. Set NEWS_API_KEY and configure Supabase secrets.' },
      { status: 503, headers: corsHeaders },
    );
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const scheduledSecret = request.headers.get('x-news-import-secret');
  const isScheduled = Boolean(importSecret && importSecret.length >= 32 && scheduledSecret === importSecret);
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  let isEditor = false;

  if (!isScheduled && bearerToken) {
    const { data: userData, error: userError } = await supabase.auth.getUser(bearerToken);
    if (!userError && userData.user?.app_metadata?.role === 'editor') {
      isEditor = true;
    }
  }

  if (!isScheduled && !isEditor) {
    return Response.json({ error: 'Only an authenticated editor can run a manual import.' }, { status: 403, headers: corsHeaders });
  }

  const requestBody = await request.json().catch(() => ({})) as { manual?: boolean };
  const manualRun = isEditor && requestBody.manual === true;
  if (!isScheduled && !manualRun) {
    return Response.json({ error: 'Invalid import request.' }, { status: 400, headers: corsHeaders });
  }

  const { data: settings, error: settingsError } = await supabase
    .from('news_feed_settings')
    .select('auto_publish_enabled')
    .eq('id', true)
    .single();

  if (settingsError) {
    console.error('Could not read news feed settings:', settingsError.message);
    return Response.json({ error: 'Could not read news feed settings.' }, { status: 500, headers: corsHeaders });
  }
  if (!settings.auto_publish_enabled && !manualRun) {
    return Response.json({ skipped: true, reason: 'Automatic publishing is disabled.' }, { headers: corsHeaders });
  }
  if (allowedDomains.length === 0) {
    return Response.json(
      { error: 'Import is blocked until NEWS_ALLOWED_DOMAINS contains approved publisher domains.' },
      { status: 503, headers: corsHeaders },
    );
  }

  try {
    const { data: categoryRows, error: categoriesError } = await supabase
      .from('categories')
      .select('name, category_key')
      .not('category_key', 'is', null);
    if (categoriesError) {
      console.error('Could not load news categories:', categoriesError.message);
      return Response.json({ error: 'Could not load categories. Apply the editorial dashboard migration.' }, { status: 500, headers: corsHeaders });
    }
    const categoryNames = new Map<string, string>(
      (categoryRows ?? []).flatMap((category: { name: string; category_key: string | null }) =>
        category.category_key ? [[category.category_key, category.name]] : [],
      ),
    );
    if (!categoryNames.has('current-affairs')) {
      return Response.json({ error: 'The Current Affairs system category is missing. Restore it before importing.' }, { status: 503, headers: corsHeaders });
    }

    const params = new URLSearchParams({
      q: 'India OR Indian OR "New Delhi" OR Mumbai OR Bengaluru OR Chennai OR Kolkata OR Hyderabad',
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: '100',
    });
    const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
      headers: { 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const details = await response.text();
      const message = `NewsAPI request failed (${response.status}): ${details.slice(0, 300)}`;
      await supabase.from('news_feed_settings').update({ last_error: message, last_run_at: new Date().toISOString() }).eq('id', true);
      return Response.json(
        { error: response.status === 429 ? 'NewsAPI rate limit reached. Try again at the next scheduled run.' : 'NewsAPI request failed.' },
        { status: response.status === 429 ? 429 : 502, headers: corsHeaders },
      );
    }

    const payload = (await response.json()) as NewsApiResponse;
    if (payload.status !== 'ok' || !Array.isArray(payload.articles)) {
      const message = payload.message || 'NewsAPI returned an invalid response.';
      await supabase.from('news_feed_settings').update({ last_error: message, last_run_at: new Date().toISOString() }).eq('id', true);
      return Response.json({ error: message }, { status: 502, headers: corsHeaders });
    }

    const earliestAllowed = Date.now() - 36 * 60 * 60 * 1000;
    const stories = payload.articles.flatMap((item) => {
      const title = item.title?.trim();
      const summary = item.description?.trim();
      const sourceUrl = validHttpsUrl(item.url);
      const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
      const sourceName = item.source?.name?.trim();

      if (
        !title ||
        title === '[Removed]' ||
        title.length < 12 ||
        !summary ||
        !sourceName ||
        !sourceUrl ||
        !isAllowedDomain(sourceUrl, allowedDomains) ||
        !publishedAt ||
        Number.isNaN(publishedAt.getTime()) ||
        publishedAt.getTime() > Date.now() ||
        publishedAt.getTime() < earliestAllowed
      ) {
        return [];
      }

      const categoryKey = classify(title, summary).toLowerCase().replace(/\s+/g, '-');
      const category = categoryNames.get(categoryKey) ?? categoryNames.get('current-affairs');
      if (!category) return [];
      return [{
        slug: makeSlug(title),
        title,
        summary,
        image_url: validHttpsUrl(item.urlToImage),
        category,
        author: item.author?.trim() || null,
        source_name: sourceName,
        source_url: sourceUrl,
        source_key: sourceKey(sourceUrl),
        tags: extractTags(`${title} ${summary}`),
        status: 'draft',
        is_imported: true,
        published_at: publishedAt.toISOString(),
      }];
    });

    let importedCount = 0;
    if (stories.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('articles')
        .upsert(stories, { onConflict: 'source_key', ignoreDuplicates: true })
        .select('id');

      if (insertError) {
        console.error('Could not store fetched news:', insertError.message);
        await supabase.from('news_feed_settings').update({ last_error: insertError.message, last_run_at: new Date().toISOString() }).eq('id', true);
        return Response.json({ error: 'Stories were fetched but could not be stored.' }, { status: 500, headers: corsHeaders });
      }
      importedCount = inserted?.length ?? 0;
    }

    const completedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('news_feed_settings')
      .update({
        last_error: null,
        last_run_at: completedAt,
        last_successful_import_at: completedAt,
        last_import_count: importedCount,
      })
      .eq('id', true);

    if (updateError) {
      console.error('Stories saved, but run status could not be updated:', updateError.message);
    }

    return Response.json(
      { fetched: payload.articles.length, eligible: stories.length, imported: importedCount, status: 'draft' },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown news import error.';
    console.error('News import failed:', message);
    await supabase.from('news_feed_settings').update({ last_error: message, last_run_at: new Date().toISOString() }).eq('id', true);
    return Response.json({ error: 'News import failed. Check Edge Function logs.' }, { status: 500, headers: corsHeaders });
  }
});

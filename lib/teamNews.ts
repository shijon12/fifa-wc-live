const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';

const CREDIBLE_SOURCE_HINTS = [
  'AP News',
  'Associated Press',
  'BBC',
  'BBC Sport',
  'CBS Sports',
  'ESPN',
  'FIFA',
  'FOX Sports',
  'The Athletic',
  'The Guardian',
  'Reuters',
  'Sky Sports',
  'NBC Sports',
  'Yahoo Sports',
  'Sports Illustrated',
  'Marca',
  'Mundo Deportivo',
  "L'Equipe",
  'La Gazzetta',
  'Kicker',
  'UEFA',
  'Goal.com',
  '90min',
];

const POSITIVE_WORDS = ['win', 'wins', 'boost', 'return', 'fit', 'ready', 'confident', 'record', 'star', 'dominant', 'advance', 'qualify', 'recovered'];
const NEGATIVE_WORDS = ['injury', 'injured', 'doubt', 'ban', 'suspended', 'loss', 'defeat', 'concern', 'crisis', 'out', 'miss', 'ruled out', 'setback', 'controversy'];

export type TeamNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

export type TeamNewsResult = {
  team: string;
  generatedAt: string;
  windowDays: number;
  sentiment: {
    label: 'positive' | 'neutral' | 'negative';
    positive: number;
    neutral: number;
    negative: number;
    summary: string;
  };
  items: TeamNewsItem[];
};

export async function fetchTeamNews(team: string): Promise<TeamNewsResult> {
  const normalizedTeam = team.trim().replace(/\s+/g, ' ');
  const paid = await fetchConfiguredNewsProvider(normalizedTeam);
  if (paid) return paid;
  const query = encodeURIComponent(`"${normalizedTeam}" football OR soccer when:30d`);
  const response = await fetch(`${GOOGLE_NEWS_RSS}?q=${query}&hl=en-US&gl=US&ceid=US:en`, {
    next: { revalidate: 60 * 30 },
    headers: { Accept: 'application/rss+xml, text/xml' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('News provider unavailable.');

  const xml = await response.text();
  const items = sortLatest(dedupeNews(parseRssItems(xml))
    .filter((item) => isRecent(item.publishedAt, 30))
    .filter((item) => credibleSource(item.source)))
    .slice(0, 12)
    .map((item) => ({ ...item, sentiment: scoreSentiment(item.title) }));
  const positive = items.filter((item) => item.sentiment === 'positive').length;
  const negative = items.filter((item) => item.sentiment === 'negative').length;
  const neutral = items.length - positive - negative;
  const label = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';

  return {
    team: normalizedTeam,
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    sentiment: {
      label,
      positive,
      neutral,
      negative,
      summary: sentimentSummary(normalizedTeam, label, positive, neutral, negative, items.length),
    },
    items,
  };
}

export async function fetchRecentFootballNews(): Promise<TeamNewsItem[]> {
  const paid = await fetchConfiguredNewsProvider('football');
  if (paid?.items.length) return paid.items.slice(0, 6);

  const query = encodeURIComponent('football OR soccer when:30d');
  const response = await fetch(`${GOOGLE_NEWS_RSS}?q=${query}&hl=en-US&gl=US&ceid=US:en`, {
    next: { revalidate: 60 * 30 },
    headers: { Accept: 'application/rss+xml, text/xml' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return [];
  const xml = await response.text();
  return sortLatest(dedupeNews(parseRssItems(xml))
    .filter((item) => isRecent(item.publishedAt, 30))
    .filter((item) => credibleSource(item.source)))
    .slice(0, 6)
    .map((item) => ({ ...item, sentiment: scoreSentiment(item.title) }));
}

async function fetchConfiguredNewsProvider(team: string): Promise<TeamNewsResult | null> {
  const endpoint = process.env.NEWS_API_URL;
  const key = process.env.NEWS_API_KEY;
  if (!endpoint || !key) return null;
  try {
    const url = new URL(endpoint);
    url.searchParams.set('q', `${team} football soccer`);
    url.searchParams.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    url.searchParams.set('pageSize', '12');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 60 * 30 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as {
      articles?: Array<{ title?: string; url?: string; source?: { name?: string }; publishedAt?: string }>;
    };
    const items = sortLatest((payload.articles ?? []).flatMap((article) => {
      if (!article.title || !article.url || !article.publishedAt) return [];
      return [{
        title: article.title,
        url: article.url,
        source: article.source?.name ?? 'News provider',
        publishedAt: article.publishedAt,
        sentiment: scoreSentiment(article.title),
      }];
    })).slice(0, 12);
    const positive = items.filter((item) => item.sentiment === 'positive').length;
    const negative = items.filter((item) => item.sentiment === 'negative').length;
    const neutral = items.length - positive - negative;
    const label = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';
    return {
      team,
      generatedAt: new Date().toISOString(),
      windowDays: 30,
      sentiment: { label, positive, neutral, negative, summary: sentimentSummary(team, label, positive, neutral, negative, items.length) },
      items,
    };
  } catch {
    return null;
  }
}

function parseRssItems(xml: string): TeamNewsItem[] {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).flatMap((match) => {
    const item = match[1];
    const title = textValue(item, 'title');
    const url = textValue(item, 'link');
    const publishedAt = textValue(item, 'pubDate');
    const source = sourceValue(item);
    if (!title || !url || !publishedAt || !source) return [];
    return [{ title, url, source, publishedAt: new Date(publishedAt).toISOString(), sentiment: 'neutral' as const }];
  });
}

function textValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXml(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim()) : '';
}

function sourceValue(xml: string) {
  const match = xml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
  return match ? decodeXml(match[1].trim()) : '';
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isRecent(date: string, days: number) {
  const published = new Date(date).getTime();
  return Number.isFinite(published) && Date.now() - published <= days * 24 * 60 * 60 * 1000;
}

function credibleSource(source: string) {
  return CREDIBLE_SOURCE_HINTS.some((hint) => source.toLowerCase().includes(hint.toLowerCase()));
}

function dedupeNews(items: TeamNewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortLatest(items: TeamNewsItem[]) {
  return [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function scoreSentiment(title: string): TeamNewsItem['sentiment'] {
  const text = title.toLowerCase();
  const positive = POSITIVE_WORDS.filter((word) => text.includes(word)).length;
  const negative = NEGATIVE_WORDS.filter((word) => text.includes(word)).length;
  if (positive > negative) return 'positive';
  if (negative > positive) return 'negative';
  return 'neutral';
}

function sentimentSummary(team: string, label: TeamNewsResult['sentiment']['label'], positive: number, neutral: number, negative: number, total: number) {
  if (!total) return `No recent credible news was found for ${team} in the last 30 days.`;
  if (label === 'positive') return `${team} news sentiment is leaning positive across ${total} recent credible stories.`;
  if (label === 'negative') return `${team} news sentiment is leaning cautious/negative across ${total} recent credible stories.`;
  return `${team} news sentiment is mostly balanced across ${total} recent credible stories, with ${neutral} neutral headlines.`;
}

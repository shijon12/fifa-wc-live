'use client';

import { useEffect, useState } from 'react';

type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

type NewsResult = {
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
  items: NewsItem[];
};

export function TeamNewsSentiment({ teams }: { teams: string[] }) {
  const [selectedTeam, setSelectedTeam] = useState(teams[0] ?? '');
  const [expanded, setExpanded] = useState(false);
  const [news, setNews] = useState<NewsResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadNews() {
      if (!selectedTeam) return;
      setLoading(true);
      setExpanded(false);
      try {
        const response = await fetch(`/api/team-news?team=${encodeURIComponent(selectedTeam)}`);
        const data = await response.json() as NewsResult;
        if (active) setNews(data);
      } catch {
        if (active) setNews(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadNews();
    return () => { active = false; };
  }, [selectedTeam]);

  const visible = expanded ? news?.items ?? [] : news?.items.slice(0, 5) ?? [];

  return (
    <section className="mt-8 rounded-[2rem] border border-sky-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.12),transparent_35%),rgba(255,255,255,0.035)] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Team news</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Recent news</h2>
        </div>
        <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1 sm:w-auto sm:flex sm:flex-wrap sm:rounded-full">
          {teams.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => setSelectedTeam(team)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${selectedTeam === team ? 'bg-sky-300 text-[#07120d]' : 'text-stone-300 hover:bg-white/10'}`}
            >
              {team}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
        {loading ? (
          <NewsSkeleton selectedTeam={selectedTeam} />
        ) : news ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-6 text-stone-300">{news.sentiment.summary}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${sentimentClass(news.sentiment.label)}`}>
                {news.sentiment.label}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <SentimentMetric label="Positive" value={news.sentiment.positive} />
              <SentimentMetric label="Neutral" value={news.sentiment.neutral} />
              <SentimentMetric label="Negative" value={news.sentiment.negative} />
            </div>
            <div className="mt-5 space-y-3">
              {visible.length ? visible.map((item) => (
                <a key={`${item.source}-${item.title}`} href={item.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-sky-400/30 hover:bg-white/[0.06]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{item.source}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${sentimentClass(item.sentiment)}`}>{item.sentiment}</span>
                  </div>
                  <h3 className="mt-2 font-bold leading-6 text-white">{item.title}</h3>
                  <p className="mt-2 text-xs text-stone-500">{new Date(item.publishedAt).toLocaleDateString()}</p>
                </a>
              )) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-bold text-white">No recent news found for this team.</p>
                  <p className="mt-1 text-sm leading-6 text-stone-400">
                    Try another team or check back later. The match and statistics sections still work even when the news feed has no fresh headlines.
                  </p>
                </div>
              )}
            </div>
            {news.items.length > 5 && (
              <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-5 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:border-sky-400/40">
                {expanded ? 'Show less' : `Show more (${news.items.length - 5})`}
              </button>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-bold text-white">News is temporarily unavailable.</p>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              The feed could not load right now. You can still use predictions, team pages, fixtures, and stats while it recovers.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function NewsSkeleton({ selectedTeam }: { selectedTeam: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-stone-400">Loading recent news for {selectedTeam}…</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

function SentimentMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><p className="text-lg font-black text-white">{value}</p><p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p></div>;
}

function sentimentClass(sentiment: NewsItem['sentiment']) {
  if (sentiment === 'positive') return 'bg-emerald-400/15 text-emerald-200';
  if (sentiment === 'negative') return 'bg-rose-400/15 text-rose-200';
  return 'bg-stone-400/15 text-stone-200';
}

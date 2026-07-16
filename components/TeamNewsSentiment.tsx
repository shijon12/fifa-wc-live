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
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/20 p-1">
          {teams.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => setSelectedTeam(team)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedTeam === team ? 'bg-sky-300 text-[#07120d]' : 'text-stone-300 hover:bg-white/10'}`}
            >
              {team}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
        {loading ? (
          <p className="text-sm text-stone-400">Loading recent news for {selectedTeam}…</p>
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
              )) : <p className="rounded-xl border border-white/10 p-4 text-sm text-stone-500">No recent news found for this team.</p>}
            </div>
            {news.items.length > 5 && (
              <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-5 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:border-sky-400/40">
                {expanded ? 'Show less' : `Show more (${news.items.length - 5})`}
              </button>
            )}
          </>
        ) : <p className="text-sm text-stone-400">News is temporarily unavailable.</p>}
      </div>
    </section>
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

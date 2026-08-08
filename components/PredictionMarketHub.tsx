'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ForecastProbabilityChart } from '@/components/ForecastProbabilityChart';
import { TeamNewsSentiment } from '@/components/TeamNewsSentiment';
import type { LeagueMatch, SupportedLeague } from '@/lib/leagueData';
import { readPredictions, withPredictionHistory, writePredictions, type StoredPrediction } from '@/lib/predictionTypes';

export function PredictionMarketHub({
  leagues,
  selectedLeague,
  matches,
}: {
  leagues: SupportedLeague[];
  selectedLeague: SupportedLeague;
  matches: LeagueMatch[];
}) {
  const router = useRouter();
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? '');
  const [predictions, setPredictions] = useState<StoredPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? matches[0];
  const prediction = predictions.find((entry) => entry.matchId === selectedMatch?.id);

  useEffect(() => {
    const initialize = window.setTimeout(() => setPredictions(readPredictions()), 0);
    return () => window.clearTimeout(initialize);
  }, []);

  const upcomingLabel = useMemo(() => `${matches.length} upcoming fixture${matches.length === 1 ? '' : 's'}`, [matches.length]);

  async function generateForecast() {
    if (!selectedMatch) return;
    setLoading(true);
    setError('');
    try {
      const eventId = selectedMatch.id.split(':').at(-1) ?? selectedMatch.id;
      const response = await fetch(`/api/predictions/leagues/${encodeURIComponent(selectedLeague.id)}/${encodeURIComponent(eventId)}`, { method: 'POST' });
      const payload = await response.json() as StoredPrediction & { error?: string; usage?: { remaining: number } };
      if (payload.usage) setRemaining(payload.usage.remaining);
      if (!response.ok) throw new Error(payload.error || 'Forecast request failed.');
      const current = readPredictions();
      const previous = current.find((entry) => entry.matchId === payload.matchId);
      const next = withPredictionHistory(payload, previous);
      const updated = [next, ...current.filter((entry) => entry.matchId !== next.matchId)];
      writePredictions(updated);
      setPredictions(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Forecast request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-7 min-w-0 space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Choose your competition</p>
            <h2 className="mt-2 text-2xl font-black text-white">Upcoming match forecasts</h2>
          </div>
          <label className="block w-full sm:max-w-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">League</span>
            <select
              value={selectedLeague.id}
              onChange={(event) => router.push(`/predictions?league=${encodeURIComponent(event.target.value)}`)}
              className="w-full rounded-xl border border-white/10 bg-[#0b1b13] px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/50"
            >
              {leagues.map((league) => <option key={league.id} value={league.id}>{league.label}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm text-stone-500">{upcomingLabel} · Select one to open its probability view.</p>
      </div>

      {matches.length && selectedMatch ? (
        <>
        <div className="grid min-w-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="order-2 min-w-0 space-y-2 lg:order-1">
            {matches.slice(0, 12).map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => { setSelectedMatchId(match.id); setError(''); }}
                className={`w-full min-w-0 rounded-2xl border p-4 text-left transition ${selectedMatch.id === match.id ? 'border-emerald-300/40 bg-emerald-300/10' : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.07]'}`}
              >
                <p className="truncate text-sm font-black text-white">{match.homeTeam}</p>
                <p className="my-1 text-xs font-semibold text-stone-600">vs</p>
                <p className="truncate text-sm font-black text-white">{match.awayTeam}</p>
                <p className="mt-3 text-xs text-stone-500">{match.date} · {match.kickoff}</p>
              </button>
            ))}
          </div>

          <div className="order-1 min-w-0 lg:order-2">
          <article className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#0b1b13] p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{selectedLeague.shortLabel} · {selectedMatch.date}, {selectedMatch.kickoff}</p>
                <h3 className="mt-2 break-words text-2xl font-black text-white sm:text-4xl">{selectedMatch.homeTeam} <span className="text-stone-600">vs</span> {selectedMatch.awayTeam}</h3>
                <p className="mt-2 truncate text-sm text-stone-500">{selectedMatch.venue}</p>
              </div>
              <button type="button" onClick={generateForecast} disabled={loading} className="w-full shrink-0 rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-[#07120d] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {loading ? 'Updating forecast…' : prediction ? 'Refresh forecast' : 'Generate AI forecast'}
              </button>
            </div>
            {remaining !== null && <p className="mt-3 text-xs font-semibold text-stone-600">{remaining} AI messages left today</p>}
            {error && (
              <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
                <p>{error}</p>
                {/sign in/i.test(error) && <Link href={`/sign-in?next=${encodeURIComponent(`/predictions?league=${selectedLeague.id}`)}`} className="mt-2 inline-flex font-black underline">Sign in</Link>}
              </div>
            )}

            {prediction ? <ForecastView prediction={prediction} /> : <EmptyForecast match={selectedMatch} />}
          </article>
          <TeamNewsSentiment key={selectedMatch.id} teams={[selectedMatch.homeTeam, selectedMatch.awayTeam]} />
          </div>
        </div>
        </>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
          <p className="text-xl font-black text-white">No upcoming fixtures are published.</p>
          <p className="mt-2 text-sm text-stone-500">Choose another league or return when its next schedule is available.</p>
        </div>
      )}
    </section>
  );
}

function ForecastView({ prediction }: { prediction: StoredPrediction }) {
  const outcome = prediction.predictedOutcome === 'home' ? prediction.homeTeam : prediction.predictedOutcome === 'away' ? prediction.awayTeam : 'Draw';
  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <OutcomeContract label={prediction.homeTeam} value={prediction.homeWinPct} color="emerald" active={prediction.predictedOutcome === 'home'} />
        <OutcomeContract label="Draw" value={prediction.drawPct} color="amber" active={prediction.predictedOutcome === 'draw'} />
        <OutcomeContract label={prediction.awayTeam} value={prediction.awayWinPct} color="violet" active={prediction.predictedOutcome === 'away'} />
      </div>
      <ForecastProbabilityChart history={prediction.history ?? [{ generatedAt: prediction.generatedAt, homeWinPct: prediction.homeWinPct, drawPct: prediction.drawPct, awayWinPct: prediction.awayWinPct }]} homeTeam={prediction.homeTeam} awayTeam={prediction.awayTeam} />
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Model lean</p>
          <p className="mt-2 break-words text-xl font-black text-white">{outcome}</p>
          <p className="mt-3 text-4xl font-black text-emerald-300">{prediction.predictedScore.home}–{prediction.predictedScore.away}</p>
          <p className="mt-2 text-xs text-stone-500">Most likely scoreline, not a certainty.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-sm leading-7 text-stone-300">{prediction.summary}</p>
          <div className="mt-4 space-y-2">
            {prediction.factors.map((factor) => <p key={factor} className="text-sm leading-6 text-stone-500">• {factor}</p>)}
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-wider text-stone-600">AI model: {prediction.model} · Updated {new Date(prediction.generatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyForecast({ match }: { match: LeagueMatch }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-black/15 p-6">
      <p className="text-lg font-black text-white">No AI snapshot yet.</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Generate a forecast to see the estimated chance of a {match.homeTeam} win, a draw, or a {match.awayTeam} win. Each percentage means “out of 100 similar situations,” not betting odds.</p>
    </div>
  );
}

function OutcomeContract({ label, value, color, active }: { label: string; value: number; color: 'emerald' | 'amber' | 'violet'; active: boolean }) {
  const styles = color === 'emerald'
    ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-300'
    : color === 'amber' ? 'border-amber-300/25 bg-amber-300/10 text-amber-300' : 'border-violet-300/25 bg-violet-300/10 text-violet-300';
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${styles} ${active ? 'ring-2 ring-white/20' : ''}`}>
      <p className="truncate text-xs font-black uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-4xl font-black tabular-nums text-white">{value.toFixed(1)}%</p>
      <p className="mt-2 text-xs leading-5 text-stone-400">About {Math.round(value)} in 100 similar matches.</p>
    </div>
  );
}

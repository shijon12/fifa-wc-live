'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForecastProbabilityChart } from '@/components/ForecastProbabilityChart';
import { TeamNewsSentiment } from '@/components/TeamNewsSentiment';
import {
  readPredictions,
  withPredictionHistory,
  writePredictions,
  type PredictedOutcome,
  type StoredPrediction,
} from '@/lib/predictionTypes';

type MatchSnapshot = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

export function PredictionTracker({ match }: { match: MatchSnapshot }) {
  const [prediction, setPrediction] = useState<StoredPrediction | null>(null);
  const [trackedCount, setTrackedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const predictions = readPredictions();
    let changed = false;
    const updated = predictions.map((entry) => {
      if (entry.matchId !== match.id || !/final|full time/i.test(match.status) || match.homeScore === null || match.awayScore === null) return entry;
      const actualOutcome: PredictedOutcome = match.homeScore > match.awayScore ? 'home' : match.homeScore < match.awayScore ? 'away' : 'draw';
      changed = entry.actualOutcome !== actualOutcome;
      return { ...entry, actualOutcome, correct: entry.predictedOutcome === actualOutcome };
    });
    const initialize = window.setTimeout(() => {
      if (changed) writePredictions(updated);
      setPrediction(updated.find((entry) => entry.matchId === match.id) ?? null);
      setTrackedCount(updated.length);
    }, 0);
    return () => window.clearTimeout(initialize);
  }, [match]);

  async function generatePrediction() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/predictions/${match.id}`, {
        method: 'POST',
      });
      const data = (await response.json()) as StoredPrediction & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Prediction request failed.');

      const predictions = readPredictions();
      const previous = predictions.find((entry) => entry.matchId === match.id);
      const next = withPredictionHistory(data, previous);
      const updated = [next, ...predictions.filter((entry) => entry.matchId !== match.id)];
      writePredictions(updated);
      setPrediction(next);
      setTrackedCount(updated.length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prediction request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="mt-8 rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(167,139,250,0.14),transparent_35%),rgba(255,255,255,0.035)] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300">AI prediction lab</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Match forecast</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
              Forecasts use live standings and match context, with a fallback model when OpenAI is unavailable. They are probabilistic, not betting advice.
            </p>
          </div>
          <Link href="/predictions" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-stone-300 hover:border-violet-400/30 hover:text-violet-200">
            Tracker · {trackedCount}
          </Link>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}

        {prediction ? (
          <PredictionResult prediction={prediction} />
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="font-bold text-white">{match.homeTeam} vs {match.awayTeam}</p>
            <p className="mt-2 text-sm text-stone-500">No forecast has been saved for this match.</p>
            <button
              type="button"
              onClick={generatePrediction}
              disabled={loading || /final|full time/i.test(match.status)}
              className="mt-5 rounded-xl bg-violet-400 px-5 py-3 font-black text-[#120d1d] transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            >
              {loading ? 'Analyzing live data…' : /final|full time/i.test(match.status) ? 'Match completed' : 'Generate forecast'}
            </button>
          </div>
        )}
      </section>

      <TeamNewsSentiment teams={[match.homeTeam, match.awayTeam]} />
    </>
  );
}

function PredictionResult({ prediction }: { prediction: StoredPrediction }) {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-wider text-stone-500">Predicted score</p>
        <p className="mt-3 text-4xl font-black text-white">
          {prediction.predictedScore.home} <span className="text-stone-600">:</span> {prediction.predictedScore.away}
        </p>
        <p className="mt-2 text-sm font-semibold text-violet-300">
          {outcomeLabel(prediction.predictedOutcome)} · {Math.round(prediction.confidence)}% confidence
        </p>
        {prediction.actualOutcome && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${prediction.correct ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
            {prediction.correct ? 'Correct outcome' : `Actual: ${outcomeLabel(prediction.actualOutcome)}`}
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="space-y-3">
          <Probability label="Home" value={prediction.homeWinPct} color="bg-emerald-400" />
          <Probability label="Draw" value={prediction.drawPct} color="bg-amber-300" />
          <Probability label="Away" value={prediction.awayWinPct} color="bg-violet-400" />
        </div>
        <p className="mt-5 text-sm leading-6 text-stone-300">{prediction.summary}</p>
        <ul className="mt-4 space-y-2 text-sm text-stone-500">
          {prediction.factors.map((factor) => <li key={factor}>• {factor}</li>)}
        </ul>
        <p className="mt-4 text-[10px] uppercase tracking-wider text-stone-600">
          {prediction.model} · Last updated {new Date(prediction.generatedAt).toLocaleString()}
        </p>
      </div>
      <div className="lg:col-span-2">
        <ForecastProbabilityChart
          history={prediction.history ?? [{ generatedAt: prediction.generatedAt, homeWinPct: prediction.homeWinPct, drawPct: prediction.drawPct, awayWinPct: prediction.awayWinPct }]}
          homeTeam={prediction.homeTeam}
          awayTeam={prediction.awayTeam}
        />
      </div>
    </div>
  );
}

function Probability({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-stone-400"><span>{label}</span><span>{value.toFixed(1)}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function outcomeLabel(outcome: PredictedOutcome) {
  return outcome === 'home' ? 'Home win' : outcome === 'away' ? 'Away win' : 'Draw';
}

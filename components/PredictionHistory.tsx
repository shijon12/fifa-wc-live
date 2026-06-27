'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PREDICTIONS_STORAGE_KEY, readPredictions, type StoredPrediction } from '@/lib/predictionTypes';

type CompletedOutcome = {
  matchId: string;
  outcome: 'home' | 'draw' | 'away';
};

export function PredictionHistory({ completedOutcomes }: { completedOutcomes: CompletedOutcome[] }) {
  const [predictions, setPredictions] = useState<StoredPrediction[]>([]);

  useEffect(() => {
    const update = () => {
      const outcomes = new Map(completedOutcomes.map((entry) => [entry.matchId, entry.outcome]));
      const current = readPredictions();
      const next = current.map((prediction) => {
        const actualOutcome = outcomes.get(prediction.matchId);
        return actualOutcome
          ? { ...prediction, actualOutcome, correct: prediction.predictedOutcome === actualOutcome }
          : prediction;
      });
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        window.localStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(next));
      }
      setPredictions(next);
    };
    update();
    window.addEventListener('predictions-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('predictions-updated', update);
      window.removeEventListener('storage', update);
    };
  }, [completedOutcomes]);

  const settled = predictions.filter((prediction) => prediction.correct !== undefined);
  const correct = settled.filter((prediction) => prediction.correct).length;
  const accuracy = settled.length ? Math.round((correct / settled.length) * 100) : 0;

  function clearHistory() {
    window.localStorage.removeItem(PREDICTIONS_STORAGE_KEY);
    setPredictions([]);
  }

  return (
    <>
      <section className="mt-6 grid grid-cols-3 gap-3">
        <Metric label="Tracked" value={predictions.length} />
        <Metric label="Settled" value={settled.length} />
        <Metric label="Accuracy" value={`${accuracy}%`} accent />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">Saved forecasts</h2>
          {predictions.length > 0 && <button type="button" onClick={clearHistory} className="text-sm text-stone-500 hover:text-rose-300">Clear tracker</button>}
        </div>
        {predictions.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {predictions.map((prediction) => (
              <Link key={prediction.matchId} href={`/matches/${prediction.matchId}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-violet-400/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-stone-500">{new Date(prediction.generatedAt).toLocaleString()}</p>
                    <h3 className="mt-2 font-bold text-white">{prediction.homeTeam} vs {prediction.awayTeam}</h3>
                  </div>
                  {prediction.correct !== undefined && <span className={`rounded-full px-2 py-1 text-xs font-semibold ${prediction.correct ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>{prediction.correct ? 'Correct' : 'Missed'}</span>}
                </div>
                <p className="mt-4 text-2xl font-black text-white">{prediction.predictedScore.home} : {prediction.predictedScore.away}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-400">{prediction.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <p className="text-stone-400">No predictions tracked yet.</p>
            <Link href="/#matches" className="mt-4 inline-flex font-semibold text-violet-300 hover:text-violet-200">Choose a match →</Link>
          </div>
        )}
      </section>
    </>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return <div className={`min-w-0 rounded-2xl border p-3 sm:p-5 ${accent ? 'border-violet-400/20 bg-violet-400/10' : 'border-white/10 bg-white/[0.035]'}`}><p className={`truncate text-2xl font-black sm:text-3xl ${accent ? 'text-violet-300' : 'text-white'}`}>{value}</p><p className="mt-1 truncate text-[10px] uppercase tracking-wide text-stone-500 sm:text-xs sm:tracking-wider">{label}</p></div>;
}

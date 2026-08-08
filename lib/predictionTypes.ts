export type PredictedOutcome = 'home' | 'draw' | 'away';

export type ProbabilitySnapshot = {
  generatedAt: string;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
};

export type StoredPrediction = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  generatedAt: string;
  model: string;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  predictedOutcome: PredictedOutcome;
  confidence: number;
  predictedScore: { home: number; away: number };
  summary: string;
  factors: string[];
  leagueId?: string;
  league?: string;
  history?: ProbabilitySnapshot[];
  actualOutcome?: PredictedOutcome;
  correct?: boolean;
};

export const PREDICTIONS_STORAGE_KEY = 'world-cup-ai-predictions-v1';

export function readPredictions(): StoredPrediction[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(PREDICTIONS_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writePredictions(predictions: StoredPrediction[]) {
  window.localStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(predictions));
  window.dispatchEvent(new Event('predictions-updated'));
}

export function withPredictionHistory(next: StoredPrediction, previous?: StoredPrediction): StoredPrediction {
  const prior = previous?.history?.length
    ? previous.history
    : previous ? [snapshot(previous)] : [];
  const history = [...prior, snapshot(next)]
    .filter((entry, index, entries) => index === 0 || entry.generatedAt !== entries[index - 1].generatedAt)
    .slice(-20);
  return { ...next, history };
}

function snapshot(prediction: StoredPrediction): ProbabilitySnapshot {
  return {
    generatedAt: prediction.generatedAt,
    homeWinPct: prediction.homeWinPct,
    drawPct: prediction.drawPct,
    awayWinPct: prediction.awayWinPct,
  };
}

export type PredictedOutcome = 'home' | 'draw' | 'away';

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

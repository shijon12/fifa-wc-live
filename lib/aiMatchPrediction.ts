import type { PredictedOutcome } from '@/lib/predictionTypes';

export type ModelPrediction = {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  predictedOutcome: PredictedOutcome;
  confidence: number;
  predictedScore: { home: number; away: number };
  summary: string;
  factors: string[];
};

type OpenAIResponse = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string; code?: string };
};

const predictionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['homeWinPct', 'drawPct', 'awayWinPct', 'predictedOutcome', 'confidence', 'predictedScore', 'summary', 'factors'],
  properties: {
    homeWinPct: { type: 'number', minimum: 0, maximum: 100 },
    drawPct: { type: 'number', minimum: 0, maximum: 100 },
    awayWinPct: { type: 'number', minimum: 0, maximum: 100 },
    predictedOutcome: { type: 'string', enum: ['home', 'draw', 'away'] },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    predictedScore: {
      type: 'object',
      additionalProperties: false,
      required: ['home', 'away'],
      properties: {
        home: { type: 'integer', minimum: 0, maximum: 12 },
        away: { type: 'integer', minimum: 0, maximum: 12 },
      },
    },
    summary: { type: 'string', minLength: 20, maxLength: 500 },
    factors: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string', minLength: 3, maxLength: 140 } },
  },
} as const;

export async function generateAIMatchPrediction(context: unknown, fallback: ModelPrediction) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new PredictionServiceError('OpenAI API billing is not configured.', 503);
  const model = process.env.PREDICTION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-sol';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [{
            type: 'input_text',
            text: 'You are a cautious football forecasting analyst. Use only supplied data. Return calibrated probabilities totaling 100. Treat missing information as uncertainty. Never imply certainty or give gambling advice.',
          }],
        },
        { role: 'user', content: [{ type: 'input_text', text: `Forecast this match from the current provider data:\n${JSON.stringify(context)}` }] },
      ],
      text: { format: { type: 'json_schema', name: 'match_prediction', strict: true, schema: predictionSchema } },
      max_output_tokens: 900,
      store: false,
    }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as OpenAIResponse;
  if (!response.ok) {
    const quota = response.status === 429 || payload.error?.code === 'insufficient_quota';
    throw new PredictionServiceError(quota ? 'OpenAI prediction quota is unavailable.' : 'The AI prediction service is temporarily unavailable.', quota ? 429 : 502);
  }
  const outputText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text')?.text;
  if (!outputText) throw new PredictionServiceError('The AI returned no forecast.', 502);
  let prediction: ModelPrediction;
  try {
    prediction = JSON.parse(outputText) as ModelPrediction;
  } catch {
    throw new PredictionServiceError('The AI returned an invalid forecast.', 502);
  }
  const total = prediction.homeWinPct + prediction.drawPct + prediction.awayWinPct;
  if (!Number.isFinite(total) || total <= 0) throw new PredictionServiceError('The AI returned invalid probabilities.', 502);
  const homeWinPct = Number((prediction.homeWinPct / total * 100).toFixed(1));
  const drawPct = Number((prediction.drawPct / total * 100).toFixed(1));
  const awayWinPct = Number((100 - homeWinPct - drawPct).toFixed(1));
  return { prediction: { ...fallback, ...prediction, homeWinPct, drawPct, awayWinPct }, model };
}

export class PredictionServiceError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

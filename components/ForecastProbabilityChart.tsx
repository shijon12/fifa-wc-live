'use client';

import type { ProbabilitySnapshot } from '@/lib/predictionTypes';

const WIDTH = 720;
const HEIGHT = 260;
const PAD_X = 42;
const PAD_Y = 24;

export function ForecastProbabilityChart({
  history,
  homeTeam,
  awayTeam,
}: {
  history: ProbabilitySnapshot[];
  homeTeam: string;
  awayTeam: string;
}) {
  const points = history.length ? history : [];
  const chartPoints = points.length === 1 ? [points[0], points[0]] : points;
  const labels = [
    { key: 'homeWinPct' as const, label: homeTeam, color: '#34d399' },
    { key: 'drawPct' as const, label: 'Draw', color: '#fcd34d' },
    { key: 'awayWinPct' as const, label: awayTeam, color: '#a78bfa' },
  ];

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Forecast movement</p>
          <p className="mt-1 text-sm text-stone-400">Probability snapshots each time the model is refreshed.</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-stone-400">{points.length} update{points.length === 1 ? '' : 's'}</span>
      </div>

      <div className="mt-4 w-full overflow-hidden">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Forecast probability movement for ${homeTeam} versus ${awayTeam}`} className="h-auto w-full">
          {[0, 25, 50, 75, 100].map((value) => {
            const y = scaleY(value);
            return (
              <g key={value}>
                <line x1={PAD_X} x2={WIDTH - 12} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <text x="4" y={y + 4} fill="rgba(168,162,158,0.7)" fontSize="12">{value}%</text>
              </g>
            );
          })}
          {labels.map((series) => (
            <g key={series.key}>
              <polyline
                fill="none"
                stroke={series.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartPoints.map((entry, index) => `${scaleX(index, chartPoints.length)},${scaleY(entry[series.key])}`).join(' ')}
              />
              {chartPoints.map((entry, index) => <circle key={`${series.key}-${index}`} cx={scaleX(index, chartPoints.length)} cy={scaleY(entry[series.key])} r="5" fill={series.color} stroke="#07120d" strokeWidth="3" />)}
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {labels.map((series) => (
          <span key={series.key} className="flex min-w-0 items-center gap-2 text-xs font-semibold text-stone-300">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: series.color }} />
            <span className="max-w-40 truncate">{series.label}</span>
            <b className="text-white">{points.at(-1)?.[series.key].toFixed(1)}%</b>
          </span>
        ))}
      </div>
      {points.length < 2 && <p className="mt-3 text-xs leading-5 text-stone-600">This is the first snapshot. Refresh the forecast closer to kickoff to see genuine movement.</p>}
    </div>
  );
}

function scaleX(index: number, length: number) {
  if (length <= 1) return PAD_X;
  return PAD_X + (index / (length - 1)) * (WIDTH - PAD_X - 12);
}

function scaleY(value: number) {
  return PAD_Y + ((100 - Math.max(0, Math.min(100, value))) / 100) * (HEIGHT - PAD_Y * 2);
}

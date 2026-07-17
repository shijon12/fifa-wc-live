'use client';

import { useMemo, useState } from 'react';
import type { ComparisonTeam } from '@/lib/teamComparison';
import { useAIAccessCode } from '@/lib/useAIAccessCode';

type AIComparison = {
  teamAWinPct: number;
  drawPct: number;
  teamBWinPct: number;
  favoredTeamId: string;
  summary: string;
  edges: string[];
  model: string;
};

export function TeamComparisonTool({ teams }: { teams: ComparisonTeam[] }) {
  const [teamAId, setTeamAId] = useState(teams[0]?.id ?? '');
  const [teamBId, setTeamBId] = useState(teams[1]?.id ?? '');
  const [analysis, setAnalysis] = useState<AIComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessCode, setAccessCode } = useAIAccessCode();
  const teamA = useMemo(() => teams.find((team) => team.id === teamAId), [teams, teamAId]);
  const teamB = useMemo(() => teams.find((team) => team.id === teamBId), [teams, teamBId]);

  function changeA(value: string) { setTeamAId(value); setAnalysis(null); setError(null); }
  function changeB(value: string) { setTeamBId(value); setAnalysis(null); setError(null); }

  async function compareWithAI() {
    if (!teamA || !teamB || teamA.id === teamB.id) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessCode ? { 'x-ai-access-code': accessCode } : {}),
        },
        body: JSON.stringify({ teamAId: teamA.id, teamBId: teamB.id }),
      });
      const data = (await response.json()) as AIComparison & { error?: string };
      if (!response.ok) throw new Error(data.error || 'AI comparison failed.');
      setAnalysis(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI comparison failed.');
    } finally { setLoading(false); }
  }

  return (
    <>
      <section className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:grid-cols-2 sm:p-7">
        <TeamSelect label="Team A" value={teamAId} onChange={changeA} teams={teams} excluded={teamBId} />
        <TeamSelect label="Team B" value={teamBId} onChange={changeB} teams={teams} excluded={teamAId} />
      </section>
      {teamA && teamB && teamA.id !== teamB.id && (
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <TeamHeader team={teamA} />
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-center text-sm font-black text-stone-500 sm:border-0 sm:bg-transparent sm:p-0 sm:text-stone-600">VS</span>
            <TeamHeader team={teamB} reverse />
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-5">
            <ComparisonRow label="Points" a={teamA.points} b={teamB.points} />
            <ComparisonRow label="Goals scored" a={teamA.goalsFor} b={teamB.goalsFor} />
            <ComparisonRow label="Goals conceded" a={teamA.goalsAgainst} b={teamB.goalsAgainst} lowerWins />
            <ComparisonRow label="Goal difference" a={teamA.goalDifference} b={teamB.goalDifference} />
            <ComparisonRow label="Wins" a={teamA.won} b={teamB.won} />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Form team={teamA} /><Form team={teamB} />
          </div>
          <div className="mt-8 border-t border-white/10 pt-6">
            <label className="mb-4 block max-w-sm">
              <span className="mb-1 block text-xs uppercase tracking-wider text-stone-500">Shared AI access code</span>
              <input type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="off" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-white outline-none focus:border-violet-400/40" placeholder="Provided by the site owner" />
            </label>
            <button type="button" onClick={compareWithAI} disabled={loading} className="rounded-xl bg-violet-400 px-5 py-3 font-black text-[#120d1d] disabled:bg-stone-700">
              {loading ? 'Analyzing live data…' : 'Generate AI forecast'}
            </button>
            {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}
            {analysis && <AIResult analysis={analysis} teamA={teamA} teamB={teamB} />}
          </div>
        </section>
      )}
    </>
  );
}

function TeamSelect({ label, value, onChange, teams, excluded }: { label: string; value: string; onChange: (value: string) => void; teams: ComparisonTeam[]; excluded: string }) {
  return <label><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0b1b13] px-4 py-3 font-bold text-white"><option value="">Choose a team</option>{teams.filter((team) => team.id !== excluded).map((team) => <option key={team.id} value={team.id}>{team.name} · Group {team.group}</option>)}</select></label>;
}

function TeamHeader({ team, reverse = false }: { team: ComparisonTeam; reverse?: boolean }) {
  return <div className={`flex min-w-0 items-center gap-3 ${reverse ? 'sm:flex-row-reverse sm:text-right' : ''}`}>{team.logo && <span className="h-11 w-11 shrink-0 bg-contain bg-center bg-no-repeat sm:h-14 sm:w-14" style={{ backgroundImage: `url("${team.logo}")` }} />}<div className="min-w-0"><h2 className="truncate text-lg font-black text-white sm:text-3xl">{team.name}</h2><p className="text-xs text-stone-500">Group {team.group} · #{team.rank}</p></div></div>;
}

function ComparisonRow({ label, a, b, lowerWins = false }: { label: string; a: number; b: number; lowerWins?: boolean }) {
  const total = Math.max(Math.abs(a) + Math.abs(b), 1);
  const aWins = lowerWins ? a < b : a > b; const bWins = lowerWins ? b < a : b > a;
  return <div><div className="mb-2 grid grid-cols-[50px_1fr_50px]"><b className={aWins ? 'text-emerald-300' : 'text-white'}>{a}</b><span className="text-center text-xs uppercase tracking-wider text-stone-500">{label}</span><b className={`text-right ${bWins ? 'text-violet-300' : 'text-white'}`}>{b}</b></div><div className="flex h-2 gap-1 overflow-hidden rounded-full"><span className="bg-emerald-400" style={{ width: `${Math.max(0, a) / total * 100}%` }} /><span className="bg-violet-400" style={{ width: `${Math.max(0, b) / total * 100}%` }} /></div></div>;
}

function Form({ team }: { team: ComparisonTeam }) {
  return <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-stone-500">{team.name} form</p><div className="mt-3 flex gap-2">{team.form.length ? team.form.map((result, index) => <span key={`${result}-${index}`} className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${result === 'W' ? 'bg-emerald-400 text-[#07120d]' : result === 'L' ? 'bg-rose-400 text-white' : 'bg-stone-500 text-white'}`}>{result}</span>) : <span className="text-sm text-stone-500">No completed matches</span>}</div></div>;
}

function AIResult({ analysis, teamA, teamB }: { analysis: AIComparison; teamA: ComparisonTeam; teamB: ComparisonTeam }) {
  return <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-5"><p className="text-xs uppercase tracking-wider text-violet-300">AI forecast · {analysis.model}</p><div className="mt-4 grid grid-cols-3 gap-3 text-center"><Probability label={teamA.name} value={analysis.teamAWinPct} /><Probability label="Draw" value={analysis.drawPct} /><Probability label={teamB.name} value={analysis.teamBWinPct} /></div><p className="mt-5 text-sm leading-7 text-stone-300">{analysis.summary}</p><ul className="mt-4 space-y-1 text-sm text-stone-500">{analysis.edges.map((edge) => <li key={edge}>• {edge}</li>)}</ul></div>;
}

function Probability({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-black/20 p-3"><p className="truncate text-xs text-stone-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value.toFixed(1)}%</p></div>;
}

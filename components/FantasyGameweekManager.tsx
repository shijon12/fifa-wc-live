'use client';

import { useCallback, useEffect, useState } from 'react';

type Chip = 'wildcard' | 'free_hit' | 'bench_boost' | 'triple_captain';
type Data = {
  state: { free_transfers: number; active_chip: Chip | null };
  targetGameweek: { id: number; name: string; deadline_time: string } | null;
  pendingTransfers: number;
  projectedTransferCost: number;
  chips: Array<{ chip: Chip; season_half: number; gameweek: number }>;
  history: Array<{ gameweek: number; net_points: number | null; gross_points: number | null; transfer_cost: number; bench_points: number | null; chip: Chip | null }>;
};

const CHIPS: Array<[Chip, string, string]> = [
  ['wildcard', 'Wildcard', 'Unlimited free transfers; your new squad remains.'],
  ['free_hit', 'Free Hit', 'Use a temporary squad for one gameweek.'],
  ['bench_boost', 'Bench Boost', 'All four substitutes score points.'],
  ['triple_captain', 'Triple Captain', 'Your captain scores three times.'],
];

export function FantasyGameweekManager() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/fantasy/game', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load gameweek.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function setChip(value: Chip | null) {
    setBusy(true);
    try {
      const response = await fetch('/api/fantasy/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chip: value }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update chip.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <p className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</p> : <div className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[.04]" />;
  const half = (data.targetGameweek?.id ?? 1) <= 19 ? 1 : 2;

  return <section className="min-w-0 overflow-hidden rounded-3xl border border-amber-300/20 bg-amber-300/[.05] p-4 sm:p-5">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-amber-300">Gameweek engine</p>
        <h2 className="mt-2 text-2xl font-black text-white">{data.targetGameweek?.name ?? 'Season'}</h2>
        <p className="mt-1 text-sm text-stone-400">Deadline {data.targetGameweek ? new Date(data.targetGameweek.deadline_time).toLocaleString() : 'unavailable'}. Your saved lineup locks automatically.</p>
      </div>
      {data.state.active_chip && <button type="button" onClick={() => setChip(null)} className="w-full rounded-full border border-rose-300/20 px-4 py-2 text-xs font-black text-rose-100 sm:w-auto">Cancel chip</button>}
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <Stat label="Free transfers" value={data.state.free_transfers} />
      <Stat label="Pending transfers" value={data.pendingTransfers} />
      <Stat label="Projected deduction" value={`-${data.projectedTransferCost} pts`} />
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{CHIPS.map(([id, label, body]) => {
      const used = data.chips.some((entry) => entry.chip === id && entry.season_half === half);
      const active = data.state.active_chip === id;
      return <button key={id} type="button" disabled={busy || used || Boolean(data.state.active_chip && !active)} onClick={() => setChip(id)} className={`rounded-2xl border p-3 text-left disabled:opacity-40 ${active ? 'border-amber-200 bg-amber-200/15' : 'border-white/10 bg-black/20'}`}>
        <b className="text-white">{label}{used ? ' · Used' : active ? ' · Active' : ''}</b>
        <p className="mt-1 text-xs text-stone-400">{body}</p>
      </button>;
    })}</div>
    <div className="mt-5 grid gap-2 sm:grid-cols-3">{data.history.length ? data.history.map((entry) => <div key={entry.gameweek} className="rounded-xl bg-black/20 p-3">
      <b className="text-white">GW {entry.gameweek}</b><b className="float-right text-emerald-300">{entry.net_points ?? 'Live'}</b>
      <p className="mt-1 text-xs text-stone-500">Gross {entry.gross_points ?? '—'} · hits -{entry.transfer_cost} · bench {entry.bench_points ?? '—'}{entry.chip ? ` · ${entry.chip.replace('_', ' ')}` : ''}</p>
    </div>) : <p className="text-sm text-stone-500">Your gameweek score history begins after your first deadline.</p>}</div>
    {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}
  </section>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>;
}

'use client';

import { useState } from 'react';

type Simulation = { passed: boolean; ranAt: string; checks: Array<{ name: string; passed: boolean }> };

export function GameweekSimulationPanel() {
  const [result, setResult] = useState<Simulation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/gameweek-simulation', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok && !payload.checks) throw new Error(payload.error ?? 'Simulation failed.');
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Simulation failed.');
    } finally {
      setBusy(false);
    }
  }
  return <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-2xl font-black text-white">Pre-deadline simulation</h2><p className="mt-1 text-sm text-stone-400">Runs isolated scoring scenarios without reading or changing real squads or scores.</p></div>
      <button type="button" onClick={run} disabled={busy} className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-[#07120d] disabled:opacity-50">{busy ? 'Running…' : 'Run safety checks'}</button>
    </div>
    {result && <div className="mt-4 grid gap-2 md:grid-cols-2">{result.checks.map((check) => <div key={check.name} className={`rounded-xl border p-3 text-sm ${check.passed ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100' : 'border-rose-300/20 bg-rose-300/10 text-rose-100'}`}>{check.passed ? 'Pass' : 'Fail'} · {check.name}</div>)}</div>}
    {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}
  </section>;
}

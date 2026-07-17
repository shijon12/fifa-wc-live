'use client';

import { FormEvent, useEffect, useState } from 'react';

type PrivateLeague = {
  id: string;
  name: string;
  joinCode: string;
  role: 'owner' | 'member';
  members: number;
  createdAt: string;
};

export function PrivateLeaguesManager() {
  const [leagues, setLeagues] = useState<PrivateLeague[]>([]);
  const [configured, setConfigured] = useState(true);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch('/api/fantasy/private-leagues');
    const data = await response.json() as { leagues?: PrivateLeague[]; configured?: boolean };
    setLeagues(data.leagues ?? []);
    setConfigured(data.configured !== false);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const code = new URLSearchParams(window.location.search).get('join');
      if (code) setJoinCode(code.toUpperCase());
      load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>, action: 'create' | 'join') {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/fantasy/private-leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, joinCode }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Action failed.');
        return;
      }
      setName('');
      setJoinCode('');
      await load();
    } catch {
      setError('Action failed.');
    } finally {
      setLoading(false);
    }
  }

  async function shareLeague(league: PrivateLeague) {
    const url = `${window.location.origin}/fantasy/leagues?join=${encodeURIComponent(league.joinCode)}`;
    const text = `Join my Matchroom private league "${league.name}" with code ${league.joinCode}: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Join ${league.name}`, text, url });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(league.id);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(league.id);
      window.setTimeout(() => setCopied(''), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          Private leagues are built into the app, but the production database migration still needs to be applied before they can store data.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={(event) => submit(event, 'create')} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Create</p>
          <h2 className="mt-2 text-2xl font-black text-white">Start a private league</h2>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="League name" className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 focus:ring-4" />
          <p className="mt-3 text-sm leading-6 text-stone-400">Create a group, share one invite link, and turn matchday picks into a social loop.</p>
          <button disabled={loading || !configured} className="mt-4 w-full rounded-full bg-emerald-400 px-5 py-3 font-black text-[#07120d] disabled:opacity-50 sm:w-auto">Create league</button>
        </form>

        <form onSubmit={(event) => submit(event, 'join')} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Join</p>
          <h2 className="mt-2 text-2xl font-black text-white">Enter a join code</h2>
          <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABCD1234" className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-sky-400/30 focus:ring-4" />
          <p className="mt-3 text-sm leading-6 text-stone-400">Paste a friend’s invite code or open their shared link to pre-fill it automatically.</p>
          <button disabled={loading || !configured} className="mt-4 w-full rounded-full bg-sky-300 px-5 py-3 font-black text-[#07120d] disabled:opacity-50 sm:w-auto">Join league</button>
        </form>
      </section>

      {error && <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>}

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <h2 className="text-2xl font-black text-white">Your private leagues</h2>
        <div className="mt-4 space-y-3">
          {leagues.length ? leagues.map((league) => (
            <div key={league.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{league.name}</p>
                  <p className="text-sm text-stone-500">{league.members} members · {league.role}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-emerald-300">Code {league.joinCode}</span>
                  <button type="button" onClick={() => shareLeague(league)} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100 hover:bg-amber-300/20">
                    {copied === league.id ? 'Copied' : 'Share invite'}
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="font-black text-white">No private leagues yet.</p>
              <p className="mt-2 text-sm leading-6 text-emerald-100/80">Create your first league, share the invite link, and bring friends into your matchday room.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

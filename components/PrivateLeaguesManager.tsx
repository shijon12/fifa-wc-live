'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type PrivateLeague = {
  id: string;
  name: string;
  joinCode: string;
  role: 'owner' | 'member';
  members: number;
  memberList?: Array<{
    userId: string;
    name: string;
    role: 'owner' | 'member';
    joinedAt: string;
  }>;
  createdAt: string;
};

type LeaderboardRow = {
  userId: string;
  managerName: string;
  totalScore?: number;
  score: number;
  squadScore?: number;
  picks: number;
  squadPlayers?: number;
};

export function PrivateLeaguesManager() {
  const [leagues, setLeagues] = useState<PrivateLeague[]>([]);
  const [configured, setConfigured] = useState(true);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(false);
  const [leagueLeaderboards, setLeagueLeaderboards] = useState<Record<string, LeaderboardRow[]>>({});

  async function load() {
    const response = await fetch('/api/fantasy/private-leagues');
    const data = await response.json() as { leagues?: PrivateLeague[]; configured?: boolean };
    const nextLeagues = data.leagues ?? [];
    setLeagues(nextLeagues);
    setConfigured(data.configured !== false);
    if (nextLeagues.length) {
      const entries = await Promise.all(nextLeagues.map(async (league) => {
        try {
          const leaderboardResponse = await fetch(`/api/fantasy/leaderboard?leagueId=${encodeURIComponent(league.id)}`);
          if (!leaderboardResponse.ok) return [league.id, []] as const;
          const leaderboardData = await leaderboardResponse.json() as { leaderboard?: LeaderboardRow[] };
          return [league.id, leaderboardData.leaderboard ?? []] as const;
        } catch {
          return [league.id, []] as const;
        }
      }));
      setLeagueLeaderboards(Object.fromEntries(entries));
    } else {
      setLeagueLeaderboards({});
    }
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

      <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">How private leagues work</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <HowItWorksStep step="1" title="Create a room" body="Give your group a league name. The app creates a private join code." />
          <HowItWorksStep step="2" title="Share invite" body="Send the link or code to friends on WhatsApp, Slack, LinkedIn, or chat." />
          <HowItWorksStep step="3" title="Everyone plays" body="Members build squads and make match predictions from their own accounts." />
          <HowItWorksStep step="4" title="Track the table" body="Use the leaderboard as the room scoreboard as saved picks and squads update." />
        </div>
      </section>

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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Members</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(league.memberList ?? []).length ? league.memberList?.map((member) => (
                      <span key={member.userId} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-stone-300">
                        {member.name}{member.role === 'owner' ? ' · owner' : ''}
                      </span>
                    )) : (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-stone-500">
                        Member names will appear here as people join.
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/fantasy" className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-400/20">
                    Make picks
                  </Link>
                  <Link href="/fantasy?tab=leaderboard" className="rounded-full border border-white/10 px-3 py-2 text-xs font-black text-stone-300 hover:bg-white/10">
                    View leaderboard
                  </Link>
                </div>
              </div>
              <RoomLeaderboard rows={leagueLeaderboards[league.id] ?? []} memberCount={league.members} />
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

function RoomLeaderboard({ rows, memberCount }: { rows: LeaderboardRow[]; memberCount: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Room leaderboard</p>
          <p className="mt-1 text-xs text-stone-500">Only members of this private league appear here.</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-stone-400">
          {rows.length || 0}/{memberCount} active
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.slice(0, 5).map((row, index) => (
          <div key={row.userId} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-black text-emerald-200">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{row.managerName}</p>
              <p className="text-[11px] text-stone-500">{row.squadPlayers ?? 0} squad players · {row.picks} picks</p>
            </div>
            <span className="text-lg font-black tabular-nums text-emerald-300">{row.totalScore ?? row.score}</span>
          </div>
        )) : (
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="font-bold text-amber-100">No scores in this room yet.</p>
            <p className="mt-1 text-sm leading-5 text-amber-100/75">
              Once members save a squad or make predictions, this becomes the room scoreboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HowItWorksStep({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400 text-sm font-black text-[#07120d]">{step}</span>
      <p className="mt-3 font-black text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-emerald-50/70">{body}</p>
    </div>
  );
}

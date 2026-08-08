import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { PredictionTracker } from '@/components/PredictionTracker';
import { MatchLiveCenter } from '@/components/MatchLiveCenter';
import { fetchWorldCupMatch, fetchWorldCupMatchDetails } from '@/lib/liveData';
import { winnerEmoji, winnerSide } from '@/lib/resultCelebrations';

export const dynamic = 'force-dynamic';

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const refreshedAt = new Date();
  const { matchId } = await params;
  const [match, details] = await Promise.all([
    fetchWorldCupMatch(matchId),
    fetchWorldCupMatchDetails(matchId),
  ]);
  if (!match) notFound();
  const winner = winnerSide(match);

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <Link href="/#matches" className="mt-8 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">← All live matches</Link>

        <header className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.13),transparent_35%),#0b1b13] px-5 py-8 text-center sm:p-12">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            <span>{match.group || match.round}</span>
            <span className="h-1 w-1 rounded-full bg-stone-600" />
            <span>{match.date} · {match.kickoff}</span>
          </div>
          <div className="mt-10 grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <TeamSide id={match.homeTeamId} name={match.homeTeam} badge={match.homeBadge} label="Home" emoji={winnerEmoji(match, 'home')} muted={winner === 'away'} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">{match.status}</p>
              <p className="mt-3 text-6xl font-black tabular-nums tracking-tight text-white sm:text-7xl">
                {match.homeScore ?? '–'} <span className="text-stone-600">:</span> {match.awayScore ?? '–'}
              </p>
            </div>
            <TeamSide id={match.awayTeamId} name={match.awayTeam} badge={match.awayBadge} label="Away" emoji={winnerEmoji(match, 'away')} muted={winner === 'home'} />
          </div>
          <div className="mx-auto mt-10 max-w-xl border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Venue</p>
            <p className="mt-2 text-lg font-bold text-white">{match.venue}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <Info label="Competition" value="FIFA World Cup 2026" />
          <Info label="Stage" value={match.group || match.round} />
          <Info label="Last updated" value={formatUpdated(refreshedAt)} />
        </section>
        <MatchLiveCenter details={details} />
        <PredictionTracker
          match={{
            id: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            status: match.status,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          }}
        />
      </div>
    </main>
  );
}

function formatUpdated(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function TeamSide({ id, name, badge, label, emoji = '', muted = false }: { id: string; name: string; badge: string | null; label: string; emoji?: string; muted?: boolean }) {
  return (
    <Link href={`/teams/${id}`} className={`group flex flex-col items-center ${muted ? 'opacity-60' : ''}`}>
      {badge ? (
        <span role="img" aria-label={`${name} badge`} className="h-24 w-24 bg-contain bg-center bg-no-repeat transition group-hover:scale-105 sm:h-32 sm:w-32" style={{ backgroundImage: `url("${badge}")` }} />
      ) : <span className="text-7xl">⚽</span>}
      <h1 className="mt-5 text-2xl font-black text-white group-hover:text-emerald-300 sm:text-3xl">{emoji && <span className="mr-2">{emoji}</span>}{name}</h1>
      <p className="mt-1 text-xs uppercase tracking-widest text-stone-500">{label}</p>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-xs uppercase tracking-wider text-stone-500">{label}</p><p className="mt-2 font-bold text-white">{value}</p></div>;
}

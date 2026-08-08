import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { getCurrentUser } from '@/lib/auth';
import { getPrivateLeaguePreview } from '@/lib/fantasyStore';

export const dynamic = 'force-dynamic';

export default async function FantasyInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [league, user] = await Promise.all([getPrivateLeaguePreview(code), getCurrentUser()]);
  if (!league) notFound();
  const destination = `/fantasy/leagues?join=${encodeURIComponent(league.joinCode)}`;
  return <main className="min-h-screen bg-[#07120d] text-white"><div className="mx-auto max-w-4xl px-4 py-5 sm:px-6"><SiteNav /><section className="mt-12 rounded-[2rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_80%_10%,rgba(52,211,153,.18),transparent_35%),#0b1b13] p-6 text-center sm:p-12"><p className="text-xs font-bold uppercase tracking-[.26em] text-emerald-300">Private Matchroom invitation</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Join {league.name}</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-300">{league.ownerName} invited you to a private fantasy room with {league.members} {league.members === 1 ? 'member' : 'members'}. Build a squad, compare scores, chat, and follow matchday together.</p><div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-2"><Stat value={league.members} label="Members" /><Stat value="15" label="Player squad" /><Stat value="£100m" label="Budget" /></div><Link href={user ? destination : `/sign-up?next=${encodeURIComponent(destination)}`} className="mt-8 inline-flex rounded-full bg-emerald-300 px-6 py-3 font-black text-[#07120d]">{user ? 'Join this room' : 'Sign up to join'}</Link><p className="mt-3 text-xs text-stone-500">You can review the room before creating an account. Joining is free.</p></section></div></main>;
}

function Stat({ value, label }: { value: string | number; label: string }) { return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-xl font-black text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-stone-500">{label}</p></div>; }

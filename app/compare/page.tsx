import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';
import { TeamComparisonTool } from '@/components/TeamComparisonTool';
import { fetchComparisonTeams } from '@/lib/teamComparison';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const teams = await fetchComparisonTeams();
  return <main className="min-h-screen bg-[#07120d] text-stone-100"><div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10"><SiteNav /><Link href="/" className="mt-8 inline-flex text-sm font-semibold text-emerald-300">← Dashboard</Link><header className="mt-5 rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(167,139,250,0.16),transparent_35%),#0b1b13] p-6 sm:rounded-[2rem] sm:p-12"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300 sm:tracking-[0.3em]">Head to head</p><h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] text-white sm:text-7xl">Team comparison</h1><p className="mt-4 max-w-2xl text-stone-400">Compare live form, scoring, defense, standings, and an optional OpenAI forecast.</p></header><TeamComparisonTool teams={teams} /></div></main>;
}

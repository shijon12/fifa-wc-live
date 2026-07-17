import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { ReportIssueForm } from '@/components/ReportIssueForm';
import { SignOutButton } from '@/components/SignOutButton';
import { SiteNav } from '@/components/SiteNav';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/account');

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#0b1b13] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Account</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Welcome, {user.displayName}</h1>
          <p className="mt-4 max-w-2xl text-stone-400">
            You are signed in as {user.email}. Protected fantasy features are available for this account.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/fantasy" className="rounded-full bg-emerald-400 px-5 py-3 font-black text-[#07120d] hover:bg-emerald-300">
              Go to fantasy
            </Link>
            <Link href="/fantasy/leagues" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-black text-white hover:bg-white/10">
              Private leagues
            </Link>
            {user.role === 'admin' && (
              <Link href="/admin" className="rounded-full border border-amber-300/30 bg-amber-300/10 px-5 py-3 font-black text-amber-100 hover:bg-amber-300/20">
                Admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </section>
        <OnboardingChecklist />
        <ReportIssueForm />
      </div>
    </main>
  );
}

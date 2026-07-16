import Link from 'next/link';
import { redirect } from 'next/navigation';
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
            <SignOutButton />
          </div>
        </section>
      </div>
    </main>
  );
}

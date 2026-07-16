import { redirect } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { getCurrentUser } from '@/lib/auth';
import { listModerationReports } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin');
  if (user.role !== 'admin') redirect('/account');
  const { reports, configured } = await listModerationReports();

  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <header className="mt-8 rounded-[2rem] border border-amber-300/20 bg-[#0b1b13] p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Admin</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Trust & operations</h1>
          <p className="mt-4 max-w-2xl text-stone-400">Moderation reports and operational visibility for running the product beyond a demo.</p>
        </header>

        {!configured && (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            Admin storage needs the Supabase growth migration before reports can persist.
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-black text-white">Moderation reports</h2>
          <div className="mt-4 space-y-3">
            {reports.length ? reports.map((report) => (
              <article key={report.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-bold text-white">{report.reason}</p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-stone-300">{report.status}</span>
                </div>
                <p className="mt-2 text-sm text-stone-500">{report.target_type} · {report.target_id ?? 'no target'} · {new Date(report.created_at).toLocaleString()}</p>
                {report.details && <p className="mt-3 text-sm leading-6 text-stone-300">{report.details}</p>}
              </article>
            )) : <p className="text-sm text-stone-500">No reports yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

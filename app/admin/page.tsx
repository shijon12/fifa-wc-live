import { redirect } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { getCurrentUser } from '@/lib/auth';
import { getGrowthSummary } from '@/lib/growth';
import { listModerationReports } from '@/lib/moderation';
import { getNewsletterSummary } from '@/lib/newsletter';
import { getOperationsHealth } from '@/lib/operations';
import { GameweekSimulationPanel } from '@/components/GameweekSimulationPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/admin');
  if (user.role !== 'admin') redirect('/account');
  const [{ reports, configured }, growth, newsletter, health] = await Promise.all([
    listModerationReports(),
    getGrowthSummary(),
    getNewsletterSummary(),
    getOperationsHealth(),
  ]);

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

        {!growth.configured && (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            Growth analytics and feedback storage need the latest Supabase migration before they can persist.
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <GrowthMetric label="Signups" value={growth.signups} />
          <GrowthMetric label="Active users" value={growth.activeUsers} />
          <GrowthMetric label="Tracked events" value={growth.totalEvents} />
          <GrowthMetric label="Unique visitors" value={growth.uniqueVisitors} />
          <GrowthMetric label="Returning visitors" value={growth.returningVisitors} />
          <GrowthMetric label="Private leagues" value={growth.privateLeagues} />
          <GrowthMetric label="Notification opt-ins" value={growth.notificationOptIns} />
          <GrowthMetric label="Feedback notes" value={growth.waitlistCount} />
          <GrowthMetric label="Newsletter subscribers" value={newsletter.count} />
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Production health</p><h2 className="mt-2 text-2xl font-black text-white">Live operations</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${health.recentErrors.length ? 'bg-rose-300/10 text-rose-200' : 'bg-emerald-300/10 text-emerald-200'}`}>{health.recentErrors.length ? `${health.recentErrors.length} recent errors` : 'Healthy'}</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HealthCard title="Gameweek processor" event={health.latestGameweekRun} />
            <HealthCard title="FPL response" event={health.latestFplResponse} />
            <HealthCard title="Notifications" event={health.latestNotificationRun} />
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold uppercase text-stone-500">Queue</p><p className="mt-2 text-2xl font-black text-white">{health.pendingSnapshots} pending</p><p className="mt-1 text-xs text-stone-500">{health.failedScoringJobs.length} scoring jobs report an error</p></div>
          </div>
          <p className="mt-4 text-xs text-stone-500">Sentry: {health.sentryConfigured ? 'configured' : 'awaiting DSN'} · Durable server telemetry remains active either way.</p>
          {(health.failedScoringJobs.length > 0 || health.notificationFailures.length > 0) && <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <HealthList title="Failed scoring jobs" rows={health.failedScoringJobs.map((job) => `GW ${job.gameweek} · attempt ${job.scoring_attempts} · ${job.last_scoring_error}`)} />
            <HealthList title="Notification failures" rows={health.notificationFailures.map((event) => `${new Date(event.created_at).toLocaleString()} · ${event.message}`)} />
          </div>}
        </section>

        <div className="mt-8"><GameweekSimulationPanel /></div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-2xl font-black text-white">Feature signals</h2>
            <div className="mt-4 space-y-3">
              {growth.topFeatures.length ? growth.topFeatures.map((feature) => (
                <div key={feature.feature} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                  <span className="font-semibold capitalize text-white">{feature.feature.replace(/-/g, ' ')}</span>
                  <span className="font-black text-emerald-300">{feature.count}</span>
                </div>
              )) : <p className="text-sm text-stone-500">No feature events yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-2xl font-black text-white">Recent feedback</h2>
            <div className="mt-4 space-y-3">
              {growth.recentFeedback.length ? growth.recentFeedback.slice(0, 5).map((note) => (
                <article key={note.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold text-white">{note.name || note.email || 'Anonymous fan'}</p>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase text-emerald-300">{note.interest}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{note.message}</p>
                  <p className="mt-3 text-xs text-stone-600">{new Date(note.created_at).toLocaleString()} · {note.source_path}</p>
                </article>
              )) : <p className="text-sm text-stone-500">No feedback yet.</p>}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-black text-white">Newsletter subscribers</h2>
          {!newsletter.configured ? (
            <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              Newsletter storage needs the Supabase newsletter migration before subscribers can persist.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {newsletter.recent.length ? newsletter.recent.slice(0, 8).map((subscriber) => (
                <article key={subscriber.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold text-white">{subscriber.name || subscriber.email}</p>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase text-emerald-300">{subscriber.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">{subscriber.email}{subscriber.favorite_team ? ` · ${subscriber.favorite_team}` : ''}</p>
                  <p className="mt-2 text-xs text-stone-600">Joined {new Date(subscriber.subscribed_at).toLocaleString()} · {subscriber.source_path}</p>
                </article>
              )) : <p className="text-sm text-stone-500">No newsletter subscribers yet.</p>}
            </div>
          )}
        </section>

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

function GrowthMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{label}</p>
    </div>
  );
}

function HealthCard({ title, event }: { title: string; event: { status: string; message: string | null; duration_ms: number | null; created_at: string } | null }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold uppercase text-stone-500">{title}</p><p className={`mt-2 font-black ${event?.status === 'error' ? 'text-rose-200' : event ? 'text-emerald-200' : 'text-stone-400'}`}>{event ? event.status : 'No run recorded'}</p><p className="mt-1 text-xs leading-5 text-stone-500">{event ? `${new Date(event.created_at).toLocaleString()}${event.duration_ms !== null ? ` · ${event.duration_ms} ms` : ''}` : 'Waiting for the next scheduled run.'}</p></div>;
}

function HealthList({ title, rows }: { title: string; rows: string[] }) {
  return <div><h3 className="font-black text-white">{title}</h3><div className="mt-2 space-y-2">{rows.length ? rows.map((row, index) => <p key={`${row}-${index}`} className="rounded-xl bg-black/20 p-3 text-xs text-stone-400">{row}</p>) : <p className="text-sm text-stone-500">None.</p>}</div></div>;
}

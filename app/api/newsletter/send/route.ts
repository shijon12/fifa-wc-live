import { NextResponse } from 'next/server';
import { fetchWorldCupMatches } from '@/lib/liveData';
import { getActiveNewsletterSubscribers, markNewsletterSent } from '@/lib/newsletter';
import { fetchRecentFootballNews } from '@/lib/teamNews';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json({
      configured: false,
      sent: 0,
      message: 'Newsletter sending is disabled until RESEND_API_KEY and NEWSLETTER_FROM_EMAIL are configured.',
    });
  }

  const [subscribers, matches, news] = await Promise.all([
    getActiveNewsletterSubscribers(200),
    fetchWorldCupMatches(),
    fetchRecentFootballNews(),
  ]);
  if (!subscribers.length) return NextResponse.json({ configured: true, sent: 0, message: 'No active subscribers.' });

  const digest = buildWeeklyDigest(matches, news);
  const results = await Promise.all(subscribers.map(async (subscriber) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: subscriber.email,
        subject: digest.subject,
        html: renderNewsletterHtml({
          name: subscriber.name,
          digest,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://the-matchroom.vercel.app'}/api/newsletter/unsubscribe`,
        }),
      }),
    });
    return { id: subscriber.id, ok: response.ok };
  }));

  const sentIds = results.filter((result) => result.ok).map((result) => result.id);
  await markNewsletterSent(sentIds);

  return NextResponse.json({ configured: true, sent: sentIds.length, attempted: subscribers.length });
}

function buildWeeklyDigest(
  matches: Awaited<ReturnType<typeof fetchWorldCupMatches>>,
  news: Awaited<ReturnType<typeof fetchRecentFootballNews>>,
) {
  const completed = matches.filter((match) => /final|full time/i.test(match.status)).slice(-6).reverse();
  const upcoming = matches.filter((match) => match.status === 'Scheduled').slice(0, 6);
  return {
    subject: 'The Matchroom Weekly: football stories, fixtures, and matchday notes',
    completed,
    upcoming,
    news: news.slice(0, 5),
  };
}

function renderNewsletterHtml({
  name,
  digest,
  unsubscribeUrl,
}: {
  name: string | null;
  digest: ReturnType<typeof buildWeeklyDigest>;
  unsubscribeUrl: string;
}) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi football fan,';
  const completed = digest.completed.map((match) =>
    `<li>${escapeHtml(match.homeTeam)} ${match.homeScore ?? '-'}-${match.awayScore ?? '-'} ${escapeHtml(match.awayTeam)}</li>`,
  ).join('');
  const upcoming = digest.upcoming.map((match) =>
    `<li>${escapeHtml(match.date)} · ${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</li>`,
  ).join('');
  const news = digest.news.map((item) =>
    `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a> <span style="color:#64748b">(${escapeHtml(item.source)})</span></li>`,
  ).join('');

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#07120d;color:#f5f5f4;padding:32px">
      <div style="max-width:680px;margin:auto;background:#0b1b13;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:28px">
        <p style="color:#34d399;text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:700">The Matchroom Weekly</p>
        <h1 style="font-size:30px;margin:8px 0 16px">Your football week, in one calm digest.</h1>
        <p>${greeting}</p>
        <p>Here are the recent results, upcoming fixtures, and football stories worth keeping an eye on.</p>
        <h2>Recent results</h2>
        <ul>${completed || '<li>No completed matches in the current feed.</li>'}</ul>
        <h2>Coming up</h2>
        <ul>${upcoming || '<li>No upcoming fixtures in the current feed.</li>'}</ul>
        <h2>Recent football news</h2>
        <ul>${news || '<li>No news stories available right now.</li>'}</ul>
        <p style="margin-top:28px"><a href="https://the-matchroom.vercel.app" style="color:#34d399;font-weight:700">Open The Matchroom</a></p>
        <p style="margin-top:28px;color:#94a3b8;font-size:12px">To unsubscribe, send a POST request to ${escapeHtml(unsubscribeUrl)} with your email. A one-click unsubscribe page can be added next.</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

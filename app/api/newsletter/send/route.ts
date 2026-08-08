import { NextResponse } from 'next/server';
import { fetchWorldCupMatches } from '@/lib/liveData';
import { getActiveNewsletterSubscribers, markNewsletterSent } from '@/lib/newsletter';
import { fetchRecentFootballNews } from '@/lib/teamNews';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://the-matchroom.vercel.app';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return sendNewsletter();
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return sendNewsletter();
}

async function sendNewsletter() {
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
          unsubscribeUrl: `${SITE_URL}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`,
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
  const matchOfTheWeek = completed[0] ?? upcoming[0] ?? null;
  const fantasyPick = findFantasyPick(completed);
  const featureNote = upcoming.length
    ? `Set up a private room before ${upcoming[0].homeTeam} vs ${upcoming[0].awayTeam} and let your group make picks before kickoff.`
    : 'Create a private room, invite your football group chat, and keep everyone around one shared matchday table.';

  return {
    subject: 'The Matchroom Weekly: fixtures, football stories, and matchday picks',
    completed,
    upcoming,
    matchOfTheWeek,
    fantasyPick,
    featureNote,
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
  const completed = digest.completed.map((match) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.09)">
        <strong>${escapeHtml(match.homeTeam)}</strong>
        <span style="color:#94a3b8"> vs </span>
        <strong>${escapeHtml(match.awayTeam)}</strong>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px">${escapeHtml(match.venue ?? 'Venue TBC')}</div>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.09);font-size:22px;font-weight:800">
        ${match.homeScore ?? '-'}-${match.awayScore ?? '-'}
      </td>
    </tr>
  `).join('');
  const upcoming = digest.upcoming.map((match) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.09)">
        <strong>${escapeHtml(match.homeTeam)}</strong>
        <span style="color:#94a3b8"> vs </span>
        <strong>${escapeHtml(match.awayTeam)}</strong>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px">${formatDate(match.date)} · ${escapeHtml(match.venue ?? 'Venue TBC')}</div>
      </td>
    </tr>
  `).join('');
  const news = digest.news.map((item) => `
    <a href="${escapeHtml(item.url)}" style="display:block;color:#f8fafc;text-decoration:none;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px 16px;margin-top:10px;background:rgba(255,255,255,.035)">
      <span style="display:block;color:#34d399;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(item.source)}</span>
      <span style="display:block;font-size:16px;line-height:1.45;margin-top:6px">${escapeHtml(item.title)}</span>
    </a>
  `).join('');
  const matchOfTheWeek = digest.matchOfTheWeek
    ? `${digest.matchOfTheWeek.homeTeam} vs ${digest.matchOfTheWeek.awayTeam}`
    : 'The next big matchday';
  const fantasyPick = digest.fantasyPick ?? 'Back the team with the fresher legs and check lineups before kickoff.';

  return `
    <div style="margin:0;background:#06100b;color:#f8fafc;font-family:Inter,Arial,sans-serif;padding:32px 16px">
      <div style="max-width:680px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0c2418,#10281b 45%,#172313);border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:32px;box-shadow:0 24px 80px rgba(0,0,0,.28)">
          <p style="margin:0;color:#34d399;text-transform:uppercase;letter-spacing:.2em;font-size:12px;font-weight:800">The Matchroom Weekly</p>
          <h1 style="font-size:34px;line-height:1.08;margin:12px 0 16px;color:#ffffff">Your football week, without the tab chaos.</h1>
          <p style="font-size:16px;line-height:1.7;color:#d6f5e5;margin:0">${greeting}</p>
          <p style="font-size:16px;line-height:1.7;color:#d6f5e5">Here is the weekly pulse: the fixtures to watch, recent results, football stories, and one small matchday nudge for your private room.</p>
          <a href="${SITE_URL}" style="display:inline-block;background:#34d399;color:#052e16;text-decoration:none;font-weight:900;border-radius:999px;padding:13px 18px;margin-top:8px">Open The Matchroom</a>
        </div>

        <div style="display:block;margin-top:16px;background:#0b1b13;border:1px solid rgba(255,255,255,.11);border-radius:24px;padding:24px">
          <p style="margin:0;color:#94a3b8;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.12em">Matchroom pick</p>
          <h2 style="font-size:22px;margin:8px 0 6px;color:#ffffff">${escapeHtml(matchOfTheWeek)}</h2>
          <p style="color:#cbd5e1;line-height:1.65;margin:0">${escapeHtml(fantasyPick)}</p>
        </div>

        <div style="display:block;margin-top:16px;background:#0b1b13;border:1px solid rgba(255,255,255,.11);border-radius:24px;padding:24px">
          <p style="margin:0;color:#94a3b8;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.12em">For your group chat</p>
          <h2 style="font-size:22px;margin:8px 0 6px;color:#ffffff">Best used with friends.</h2>
          <p style="color:#cbd5e1;line-height:1.65;margin:0">${escapeHtml(digest.featureNote)}</p>
        </div>

        <div style="margin-top:16px;background:#0b1b13;border:1px solid rgba(255,255,255,.11);border-radius:24px;padding:24px">
          <h2 style="font-size:22px;margin:0 0 12px;color:#ffffff">Recent results</h2>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;color:#f8fafc">
            ${completed || '<tr><td style="color:#94a3b8;padding:10px 0">No completed matches in the current feed.</td></tr>'}
          </table>
        </div>

        <div style="margin-top:16px;background:#0b1b13;border:1px solid rgba(255,255,255,.11);border-radius:24px;padding:24px">
          <h2 style="font-size:22px;margin:0 0 12px;color:#ffffff">Coming up</h2>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;color:#f8fafc">
            ${upcoming || '<tr><td style="color:#94a3b8;padding:10px 0">No upcoming fixtures in the current feed.</td></tr>'}
          </table>
        </div>

        <div style="margin-top:16px;background:#0b1b13;border:1px solid rgba(255,255,255,.11);border-radius:24px;padding:24px">
          <h2 style="font-size:22px;margin:0 0 12px;color:#ffffff">Recent football news</h2>
          ${news || '<p style="color:#94a3b8">No news stories available right now.</p>'}
        </div>

        <p style="text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;margin:22px 0 0">
          You are receiving this because you subscribed to The Matchroom Weekly.
          <br />
          <a href="${escapeHtml(unsubscribeUrl)}" style="color:#34d399">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;
}

function findFantasyPick(matches: Awaited<ReturnType<typeof fetchWorldCupMatches>>) {
  const decisive = matches.find((match) =>
    typeof match.homeScore === 'number'
    && typeof match.awayScore === 'number'
    && match.homeScore !== match.awayScore
  );
  if (!decisive || typeof decisive.homeScore !== 'number' || typeof decisive.awayScore !== 'number') return null;

  const winner = decisive.homeScore > decisive.awayScore ? decisive.homeTeam : decisive.awayTeam;
  const loser = decisive.homeScore > decisive.awayScore ? decisive.awayTeam : decisive.homeTeam;
  return `${winner} just edged ${loser}. If they are back on the slate this week, they are worth watching before your room locks picks.`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return escapeHtml(new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

# Uptime monitoring

The Matchroom should be monitored from the outside, not only through successful Vercel deploys.

Recommended free/low-cost monitors:

- `https://the-matchroom.vercel.app/`
- `https://the-matchroom.vercel.app/statistics`
- `https://the-matchroom.vercel.app/statistics?league=premier-league`
- `https://the-matchroom.vercel.app/api/live-snapshot`
- `https://the-matchroom.vercel.app/api/push/public-key`

Suggested settings:

- Check interval: 1 to 5 minutes.
- Alert channels: email first, then Slack/Discord once a team exists.
- Expected status: `200`.
- Alert after: 2 consecutive failures.

What each check proves:

- Home page: app shell, server rendering, core football feed.
- Stats page: World Cup player/table rendering and source-health UI.
- League stats page: major-league result-derived stats rendering.
- Live snapshot API: notification checker can read match state.
- Push public key API: browser notification setup can still initialize.

Suggested services:

- Better Stack
- UptimeRobot
- Vercel monitoring/checks

Before a public launch, add at least the home page, stats page, and live snapshot API checks.

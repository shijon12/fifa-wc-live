# World Cup 2026 Live

A responsive FIFA World Cup 2026 tracker built with Next.js. It presents near-real-time fixtures, results, standings, match events, commentary, player statistics, favorites, browser alerts, team comparisons, and optional OpenAI forecasts.

**Live application:** [the-matchroom.vercel.app](https://the-matchroom.vercel.app)

> This is an independent portfolio project. It is not affiliated with or endorsed by FIFA, ESPN, TheSportsDB, or OpenAI.

## Features

- All 104 tournament fixtures and results
- Group tables and best third-place qualification ranking
- Knockout bracket
- Match centers with scores, timeline events, statistics, and commentary
- Team profiles, tournament records, form, and fixtures
- Tournament leaderboards and player profile pages
- ESPN headshots with a TheSportsDB image fallback
- Device-local favorite teams
- Background Web Push notifications for kickoff, goals, and full time
- Weekly football newsletter subscriptions and optional digest sending
- Side-by-side team comparison
- Optional OpenAI match forecasts and team analysis
- Multi-league AI probability desk with outcome cards and genuine forecast-movement charts
- Device-local prediction history and accuracy tracking
- Responsive phone, tablet, and desktop layouts
- Security headers, input validation, and baseline API rate limiting
- Conversational fantasy agent backed by an application-owned beam-search optimizer for live player scoring, budgets, current picks, preferences, transfers, captaincy, and rule-valid XIs
- Membership-gated private-league chat with on-demand refresh and rate-limited posting

## Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | React 19 and Tailwind CSS 3 |
| Football data | ESPN soccer JSON endpoints |
| Image fallback | TheSportsDB |
| Optional AI | OpenAI Responses API |
| Push storage/scheduler | Supabase Postgres and Cron |
| Hosting | Vercel |
| Persistence | Browser `localStorage` and `sessionStorage` |

Supabase stores anonymous Web Push subscriptions, notification delivery state, application user accounts, fantasy profiles, private leagues, and private-room messages.

## Quick start

Requirements:

- Node.js 20.9 or newer
- npm

Install and start the development server:

```bash
npm install
copy .env.example .env.local
npm run dev
```

On macOS or Linux, replace the `copy` command with:

```bash
cp .env.example .env.local
```

Open [http://localhost:3000](http://localhost:3000).

Football data works without environment variables. Leave `OPENAI_API_KEY` empty when AI features are not required.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Only for AI | Server-side OpenAI API key |
| `OPENAI_MODEL` | No | Model override; defaults to `gpt-5.4-mini` |
| `FANTASY_AGENT_MODEL` | No | Fantasy-agent model override; defaults to `gpt-5.6-sol` |
| `PREDICTION_MODEL` | No | Prediction model override; defaults to `OPENAI_MODEL`, then `gpt-5.6-sol` |
| `FANTASY_AGENT_DAILY_LIMIT` | No | Signed-in fantasy-agent messages per UTC day; defaults to `20` |
| `AI_ACCESS_CODE` | For protected comparison AI | A separate shared password retained for the team-comparison endpoint |
| `AUTH_SECRET` | Required for production auth | Long random value used to sign HTTP-only auth sessions |
| `SUPABASE_URL` | For push/auth | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For push/auth | Server-only database key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Public Web Push application key |
| `VAPID_PRIVATE_KEY` | For push | Server-only Web Push signing key |
| `VAPID_SUBJECT` | For push | Contact URL or `mailto:` address |
| `CRON_SECRET` | For push | Protects the scheduled delivery endpoint |
| `RESEND_API_KEY` | For newsletter sending | Optional Resend API key for weekly digest delivery |
| `NEWSLETTER_FROM_EMAIL` | For newsletter sending | Verified sender, for example `The Matchroom <newsletter@example.com>` |

Never expose `OPENAI_API_KEY` to browser code or commit `.env.local`. `AI_ACCESS_CODE` is not an API key and does not provide OpenAI credits.

## Commands

```bash
npm run dev        # Development server
npm run lint       # ESLint
npm run typecheck  # TypeScript validation
npm run build      # Production build
npm run start      # Serve a completed production build
npm run check      # Lint, type-check, and build
```

Run `npm run check` before every deployment.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard, fixtures, standings, third-place table, and bracket |
| `/groups/[group]` | Group table and fixtures |
| `/matches/[matchId]` | Match score, timeline, statistics, commentary, and forecast |
| `/teams/[teamId]` | Team profile, record, form, and tournament matches |
| `/statistics` | Tournament totals and player leaderboards |
| `/players/[playerId]` | Player profile and tournament match log |
| `/favorites` | Favorite teams and notification controls |
| `/compare` | Team comparison and optional AI analysis |
| `/predictions` | Saved forecast results and accuracy |
| `/fantasy` | Fantasy squad, conversational co-manager, match picks, and leaderboard |

## How “live” data works

Server-rendered pages request the current tournament feed through `lib/liveData.ts`. Next.js revalidates upstream responses on short intervals:

- Fixtures and standings: 15 seconds
- Match summaries: 10 seconds
- Rosters: 60 seconds
- Team profiles: 5 minutes
- Fallback player images: 24 hours

Open pages call `router.refresh()` every 15 seconds. Supabase Cron invokes the protected push checker every minute; a service worker receives alerts even when the site is closed.

Newsletter subscriptions are stored in Supabase. Weekly digest sending is disabled until `RESEND_API_KEY` and `NEWSLETTER_FROM_EMAIL` are configured. Trigger `POST /api/newsletter/send` with `x-cron-secret: <CRON_SECRET>` from a weekly cron job to send the digest.

This is near-real-time polling, not an official low-latency data stream. Provider updates, caching, network conditions, and browser throttling can introduce delay.

## Documentation

- [User guide](docs/USER_GUIDE.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Local development](docs/DEVELOPMENT.md)
- [API reference](docs/API.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Operations, security, and troubleshooting](docs/OPERATIONS.md)
- [Uptime monitoring](docs/UPTIME_MONITORING.md)
- [Contributing](CONTRIBUTING.md)

## Current limitations

- Push delivery can be delayed by the one-minute scheduler, upstream updates, or device power-saving policies.
- On iPhone/iPad, Web Push requires adding the site to the Home Screen before enabling alerts.
- Favorites and predictions are stored on one browser/device and are not synchronized.
- AI features require separate OpenAI API billing and can be disabled independently.
- Rate limiting is in process memory, so it is only a baseline safeguard on serverless hosting.
- Upstream football endpoints are external dependencies and can change or become unavailable.
- There is no automated unit, integration, or end-to-end test suite yet.
- Data and image licensing must be reviewed before commercial use.

## License and data use

No open-source license has been added to this repository. Copyright remains with the project owner unless a license is added.

Third-party data, team marks, player images, and trademarks remain the property of their respective owners. Review each provider’s terms before public or commercial distribution.
Optional Sentry monitoring uses `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`. Source-map upload can additionally use `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`. Server-side Supabase operational monitoring remains enabled when Sentry is omitted.

Run a controlled local or production read-load test with `npm run test:load`. Configure `LOAD_TEST_URL`, `LOAD_TEST_CONCURRENCY`, and `LOAD_TEST_REQUESTS`; defaults are localhost, 10 workers, and 30 requests per route.

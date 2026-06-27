# World Cup 2026 Live

A responsive FIFA World Cup 2026 tracker built with Next.js. It presents near-real-time fixtures, results, standings, match events, commentary, player statistics, favorites, browser alerts, team comparisons, and optional OpenAI forecasts.

**Live application:** [fifa-wc-live.vercel.app](https://fifa-wc-live.vercel.app)

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
- Foreground browser notifications for kickoff, goals, and full time
- Side-by-side team comparison
- Optional OpenAI match forecasts and team analysis
- Device-local prediction history and accuracy tracking
- Responsive phone, tablet, and desktop layouts
- Security headers, input validation, and baseline API rate limiting

## Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | React 19 and Tailwind CSS 3 |
| Football data | ESPN soccer JSON endpoints |
| Image fallback | TheSportsDB |
| Optional AI | OpenAI Responses API |
| Hosting | Vercel |
| Persistence | Browser `localStorage` and `sessionStorage` |

The application does not currently use a database or authentication service.

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
| `AI_ACCESS_CODE` | Required for production AI | A separate shared password that protects paid AI endpoints |

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

## How “live” data works

Server-rendered pages request the current tournament feed through `lib/liveData.ts`. Next.js revalidates upstream responses on short intervals:

- Fixtures and standings: 15 seconds
- Match summaries: 10 seconds
- Rosters: 60 seconds
- Team profiles: 5 minutes
- Fallback player images: 24 hours

Open pages call `router.refresh()` every 15 seconds. Notifications compare a lightweight score snapshot every 30 seconds while the site remains open.

This is near-real-time polling, not an official low-latency data stream. Provider updates, caching, network conditions, and browser throttling can introduce delay.

## Documentation

- [User guide](docs/USER_GUIDE.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Local development](docs/DEVELOPMENT.md)
- [API reference](docs/API.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Operations, security, and troubleshooting](docs/OPERATIONS.md)
- [Contributing](CONTRIBUTING.md)

## Current limitations

- Notifications work only while the website is open; there is no service worker or push provider.
- Favorites and predictions are stored on one browser/device and are not synchronized.
- AI features require separate OpenAI API billing and can be disabled independently.
- Rate limiting is in process memory, so it is only a baseline safeguard on serverless hosting.
- Upstream football endpoints are external dependencies and can change or become unavailable.
- There is no automated unit, integration, or end-to-end test suite yet.
- Data and image licensing must be reviewed before commercial use.

## License and data use

No open-source license has been added to this repository. Copyright remains with the project owner unless a license is added.

Third-party data, team marks, player images, and trademarks remain the property of their respective owners. Review each provider’s terms before public or commercial distribution.

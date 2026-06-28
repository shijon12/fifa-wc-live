# Operations, security, and troubleshooting

## Service dependencies

| Dependency | Used for | Failure impact |
| --- | --- | --- |
| ESPN site API | Fixtures, teams, rosters, match summary | Core live panels become empty or incomplete |
| ESPN web API | Standings | Tables, comparisons, and roster discovery become unavailable |
| TheSportsDB | Missing player images | Initials are shown instead |
| OpenAI Responses API | Optional forecasts | Only AI features fail |
| Vercel | Hosting and serverless execution | Application is unavailable |
| Supabase | Push subscriptions, state, and one-minute scheduler | Background alerts stop |
| Browser Push service | Notification transport | Affected browser subscriptions do not receive alerts |
| Browser storage | Favorites and prediction history | Device-local features reset if storage is cleared |

## Routine health check

Check:

1. The homepage returns HTTP 200.
2. `/api/live-snapshot` returns a non-empty JSON array.
3. The number of matches is plausible for the tournament feed.
4. `/statistics` displays players or an explicit provider-unavailable message.
5. A known match page displays teams and status.
6. Vercel function logs do not show repeated timeouts or HTTP 429/5xx errors.
7. If AI is enabled, one controlled pre-match request succeeds.

Do not use repeated AI calls as a health probe; they consume quota.

## Logging and observability

The application currently has no structured application logger, error tracker, or uptime monitor. Next.js/Vercel request and function logs are the primary diagnostic source.

Recommended production additions:

- Sentry or equivalent error reporting
- External uptime monitoring for `/` and `/api/live-snapshot`
- Structured provider timing/status logs without secrets
- Alerts for sustained upstream empty responses
- Web analytics with an appropriate privacy notice

## Rate limiting

`lib/security.ts` stores counters in a module-level `Map`.

This is suitable as a light deterrent for a small private demo, but not as authoritative distributed enforcement because:

- Each serverless instance has separate counters.
- Counters disappear when an instance restarts.
- There is no persistent abuse history.
- Source IP headers depend on the deployment proxy.

For wider public use, replace it with a shared store such as Vercel KV/Redis or another managed rate-limit service.

## Security controls

Current controls:

- OpenAI key remains server-side.
- Supabase service-role and VAPID private keys remain server-side.
- Production AI routes require `AI_ACCESS_CODE`.
- Access codes are compared with `timingSafeEqual`.
- Cost-sensitive and polling endpoints are rate-limited.
- Team ID and player-name inputs are validated.
- External query values are URL-encoded.
- Responses include anti-sniffing, anti-framing, referrer, permissions, opener, and resource-policy headers.
- `X-Powered-By` is disabled.
- Local environment files are excluded from Git and Vercel uploads.

Known gaps:

- Shared access codes are not user authentication.
- There is no account-level authorization or audit trail.
- There is no Content Security Policy.
- Rate limiting is not distributed.
- Browser-stored data is not encrypted.
- Third-party data licensing is not enforced by code.

## Secret rotation

If an OpenAI key is exposed:

1. Revoke it in the OpenAI platform immediately.
2. Create a replacement.
3. Update Vercel environment variables and `.env.local`.
4. Redeploy.
5. Review provider usage and deployment logs.
6. Remove the secret from Git history if it was committed.

If only `AI_ACCESS_CODE` is exposed, replace it in Vercel and share the new code privately. The code itself does not grant direct OpenAI account access, but it can permit others to spend your API quota through the application.

## Incident response

### Core football data is unavailable

1. Test `/api/live-snapshot`.
2. Check Vercel logs for timeouts.
3. Test the ESPN scoreboard and standings URLs from the deployment region if possible.
4. Confirm the tournament date range and league slug are still valid.
5. Avoid increasing retry frequency during an outage.
6. If the provider changed its payload, update mappings in `lib/liveData.ts`.

### Only player images fail

1. Check whether ESPN roster headshots are present.
2. Call `/api/player-image?name=...`.
3. Check TheSportsDB availability and response structure.
4. Keep the initials fallback; image failure should not block player pages.

### AI returns HTTP 503

Likely causes:

- `AI_ACCESS_CODE` is absent in production.
- `OPENAI_API_KEY` is absent.
- Environment variables were changed without a redeploy.

### AI returns HTTP 401

The supplied shared access code does not match `AI_ACCESS_CODE`. Clear the field/session and enter the current code.

### AI returns HTTP 429

The local route rate limit was reached, or the team-comparison route forwarded an OpenAI rate limit. Respect `Retry-After`, verify OpenAI billing/quota, and do not loop retries.

### AI returns HTTP 502

The OpenAI request failed or its payload did not pass application validation. The prediction route also maps upstream OpenAI quota errors to 502. Check logs and the returned provider message, verify billing, and confirm the configured model supports the requested structured output.

## User troubleshooting

### Notifications do not arrive

- Follow at least one team.
- Grant browser notification permission.
- Confirm the enabled test notification.
- Wait for the first scheduled run to establish a baseline.
- Confirm Supabase Cron is running every minute.
- Confirm the subscription exists in `push_subscriptions`.
- Confirm the browser and operating system allow notifications.
- On iPhone/iPad, install the site to the Home Screen first.
- Reset blocked permission in browser site settings.

### Favorites or predictions disappeared

They are device-local. Clearing site data, changing browsers, using private mode, or switching devices creates a separate state.

### Page looks stale

Wait 15 seconds, refresh manually, and check whether the provider itself has updated. The application cache and upstream feed can both introduce delay.

### Mobile layout appears outdated

Close and reopen the tab or hard-refresh it. Vercel may already serve the latest deployment while the phone retains older browser assets.

## Performance considerations

The player statistics page fetches rosters for every team in batches of eight. Player detail pages first search that complete dataset and then load summaries for the player’s completed/live matches.

For higher traffic:

- Persist normalized team/player data.
- Precompute leaderboards.
- Cache player lookup by ID.
- Limit match-log concurrency.
- Add stale-while-revalidate behavior with explicit provider status.
- Move repeated upstream work to scheduled ingestion.

## Backup and recovery

There is no server-side user data to back up. Favorites and forecasts live only in individual browsers.

Recovery consists of:

- Redeploying a known-good build
- Restoring environment variables
- Revalidating external integrations

If accounts or a database are added, define automated backups, retention, restore testing, and data-deletion procedures before launch.

## Production-readiness roadmap

Before high-traffic or commercial use:

1. Obtain a licensed, supported sports-data source.
2. Add authentication and synchronized user data.
3. Replace in-memory limits with distributed enforcement.
4. Add automated tests and deployment gates.
5. Add observability and incident alerts.
6. Add a Content Security Policy.
7. Complete privacy, data-processing, trademark, and licensing review.

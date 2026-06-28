# API reference

All routes are relative to the application origin and return JSON.

## Authentication model

Only AI endpoints use application-level authorization. In production, send:

```http
x-ai-access-code: your-shared-code
```

The shared code must match `AI_ACCESS_CODE`. It protects OpenAI spend but is not a user account or API credential.

## Rate limits

| Endpoint | Limit |
| --- | ---: |
| `POST /api/predictions/[matchId]` | 5 requests/minute/IP |
| `POST /api/compare` | 5 requests/minute/IP |
| `GET /api/live-snapshot` | 10 requests/minute/IP |
| `GET /api/player-image` | 30 requests/minute/IP |
| `POST /api/push/subscriptions` | 12 requests/minute/IP |
| `DELETE /api/push/subscriptions` | 6 requests/minute/IP |
| `POST /api/push/test` | 3 requests/minute/IP |

Rate limits are held in process memory. They can reset when a serverless instance restarts and do not coordinate across instances.

An exceeded limit returns:

```json
{
  "error": "Too many requests."
}
```

with HTTP 429 and a `Retry-After` header. The exact message varies by route.

## `GET /api/live-snapshot`

Returns the lightweight match state used by notifications.

### Response

```json
[
  {
    "id": "760415",
    "homeTeamId": "203",
    "awayTeamId": "467",
    "homeTeam": "Mexico",
    "awayTeam": "South Africa",
    "homeScore": 2,
    "awayScore": 0,
    "status": "Full Time"
  }
]
```

Scores can be `null` when not reported.

### Example

```bash
curl https://fifa-wc-live.vercel.app/api/live-snapshot
```

### Status codes

- `200` — Success
- `429` — Rate limit exceeded

## `GET /api/player-image?name=[playerName]`

Searches TheSportsDB for a fallback player cutout or thumbnail.

### Query

- `name`: required, trimmed, maximum 100 characters

### Response

```json
{
  "image": "https://..."
}
```

When no image is available:

```json
{
  "image": null
}
```

### Status codes

- `200` — Search completed, including no-result cases
- `400` — Missing or invalid name
- `429` — Rate limit exceeded

Results are revalidated for 24 hours.

## `POST /api/predictions/[matchId]`

Generates a structured pre-match forecast using current match context and standings.

### Headers

```http
x-ai-access-code: your-shared-code
```

No request body is required.

### Example

```bash
curl -X POST \
  -H "x-ai-access-code: YOUR_CODE" \
  https://fifa-wc-live.vercel.app/api/predictions/MATCH_ID
```

### Success response

```json
{
  "matchId": "760480",
  "homeTeam": "Croatia",
  "awayTeam": "Ghana",
  "generatedAt": "2026-06-27T18:00:00.000Z",
  "model": "gpt-5.4-mini",
  "homeWinPct": 45.5,
  "drawPct": 29.2,
  "awayWinPct": 25.3,
  "predictedOutcome": "home",
  "confidence": 58,
  "predictedScore": {
    "home": 2,
    "away": 1
  },
  "summary": "Forecast summary.",
  "factors": [
    "Current group position",
    "Goals scored and conceded"
  ]
}
```

The server normalizes the three probabilities to total exactly 100%.

### Status codes

- `200` — Forecast generated
- `401` — Invalid shared access code
- `404` — Match not found
- `409` — Match already complete
- `429` — Local route rate limit exceeded
- `502` — OpenAI request failed, including upstream quota errors, or response validation failed
- `503` — AI access or API key is not configured

## `POST /api/compare`

Generates a structured comparison of two teams from the live standings and recent tournament form.

### Headers

```http
Content-Type: application/json
x-ai-access-code: your-shared-code
```

### Request

```json
{
  "teamAId": "203",
  "teamBId": "467"
}
```

The IDs must identify two different teams in the current standings.

### Example

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-ai-access-code: YOUR_CODE" \
  -d "{\"teamAId\":\"203\",\"teamBId\":\"467\"}" \
  https://fifa-wc-live.vercel.app/api/compare
```

### Success response

```json
{
  "teamAWinPct": 51.2,
  "drawPct": 27.1,
  "teamBWinPct": 21.7,
  "favoredTeamId": "203",
  "summary": "Comparison summary.",
  "edges": [
    "Stronger goal difference",
    "Better recent form"
  ],
  "model": "gpt-5.4-mini"
}
```

### Status codes

- `200` — Comparison generated
- `400` — Invalid JSON or team selection
- `401` — Invalid shared access code
- `404` — Team data not found
- `429` — Local rate limit or OpenAI quota/rate limit
- `502` — OpenAI request or response validation failed
- `503` — AI access or API key is not configured

## `GET /api/push/public-key`

Returns whether background notifications are configured and the public VAPID application key. The key is intentionally public.

```json
{
  "configured": true,
  "publicKey": "..."
}
```

Returns HTTP 503 with `configured: false` until all push environment variables are available.

## `POST /api/push/subscriptions`

Creates or updates an anonymous browser Push API subscription and its favorite-team IDs.

```json
{
  "subscription": {
    "endpoint": "https://push-service.example/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "favoriteTeamIds": ["203", "467"]
}
```

The endpoint must use HTTPS, key values must be base64url, and at most 48 numeric team IDs are stored. The Supabase service-role key is used only by the server route.

## `DELETE /api/push/subscriptions`

Deletes a browser subscription before the browser unsubscribes.

```json
{
  "endpoint": "https://push-service.example/..."
}
```

## `POST /api/push/check`

Protected scheduler endpoint. It:

1. Verifies `Authorization: Bearer <CRON_SECRET>`.
2. loads current matches and previous Supabase state;
3. claims unique kickoff, score, and full-time events;
4. sends Web Push messages only to subscriptions following either team;
5. removes expired subscriptions returning HTTP 404 or 410.

This endpoint is for Supabase Cron, not browsers. It returns HTTP 401 without the exact cron secret.

## `POST /api/push/test`

Sends a fixed, non-user-controlled confirmation message through the Web Push service to an exact stored endpoint. It is called once after a browser subscribes, proving that server-side delivery works.

```json
{
  "endpoint": "https://push-service.example/..."
}
```

The endpoint must already exist in `push_subscriptions`. Test content cannot be customized.

## Error handling

Clients should:

1. Check `response.ok`.
2. Read the JSON `error` field.
3. Respect `Retry-After` for HTTP 429.
4. Treat HTTP 502/503 as recoverable service failures.
5. Never retry paid AI calls in a tight loop.

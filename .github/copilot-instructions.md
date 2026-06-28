# World Cup 2026 Live repository instructions

## Stack

- Next.js 16 App Router
- React 19
- TypeScript with strict checking
- Tailwind CSS 3
- Vercel deployment

## Current architecture

- Dynamic Server Components load near-real-time ESPN tournament data.
- `lib/liveData.ts` owns all ESPN payload types, mapping, timeouts, and cache intervals.
- Client components own browser-only interaction and storage.
- Favorites and predictions use browser storage.
- Supabase stores anonymous Web Push subscriptions, match state, delivery deduplication, and runs the one-minute notification schedule.
- TheSportsDB is used only as a fallback for missing player images.
- OpenAI is optional and called only from server API routes.

## Implementation rules

- Do not expose `OPENAI_API_KEY` or other server secrets to client components.
- Keep provider-specific response shapes out of pages and components.
- Validate and URL-encode untrusted inputs.
- Rate-limit endpoints that create cost or meaningful provider load.
- Handle missing upstream fields and provider failures gracefully.
- Use Server Components unless browser APIs or interactivity require `'use client'`.
- Preserve responsive behavior at 375px; wide data must scroll inside its panel.
- Do not add static placeholder scores, standings, events, or player statistics.
- Run `npm run check` before deployment.
- Update documentation when behavior, routes, dependencies, configuration, or limitations change.

## Reference

Start with `README.md`, then use the focused guides in `docs/`.

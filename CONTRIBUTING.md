# Contributing

## Before starting

Read:

- [Architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [API reference](docs/API.md) when changing server routes

## Change guidelines

- Keep provider-specific parsing in `lib/liveData.ts`.
- Preserve server-only handling of API keys.
- Validate all new API inputs.
- Add rate limits to endpoints that create cost or meaningful provider load.
- Handle missing upstream data with an explicit empty state.
- Keep client components focused on browser-only behavior.
- Test layouts at desktop and 375px phone widths.
- Do not commit `.env.local`, `.next`, `node_modules`, or `.vercel`.

## Validation

Run:

```bash
npm run check
```

For UI changes, manually verify:

- Homepage
- One group page
- One match page
- Statistics and one player page
- Favorites
- Team comparison
- Phone navigation and any wide tables

For API changes, test success, invalid input, rate limit, missing configuration, and provider failure.

## Commit scope

Prefer small changes with a clear purpose. Update the relevant documentation in the same change whenever behavior, configuration, routes, dependencies, or limitations change.

## Pull request description

Include:

- What changed
- Why it changed
- Routes/components affected
- Validation performed
- Screenshots for visible UI changes
- New environment variables or operational risks

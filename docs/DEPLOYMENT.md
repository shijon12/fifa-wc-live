# Deployment

The application is currently designed for Vercel, but any Node.js host capable of running Next.js 16 can serve it.

## Pre-deployment checklist

```bash
npm install
npm run check
npm audit --omit=dev
```

Also confirm:

- `.env.local` is ignored and has not been committed.
- No API key appears in client code, logs, or screenshots.
- The upstream football feed is reachable.
- AI is intentionally enabled or disabled.
- Mobile layouts have been checked at approximately 375px width.

## Deploy with the Vercel CLI

Authenticate:

```bash
npx vercel login
```

Create or link the project and deploy:

```bash
npx vercel --prod
```

If the local folder contains spaces, Vercel may require a valid lowercase project name during first-time project creation. Project names can use letters, numbers, hyphens, underscores, and periods.

After the first deployment, `.vercel/project.json` links the local directory to the Vercel project. The `.vercel` directory is ignored by Git.

## Deploy through Git

1. Create a Git repository.
2. Commit the project without `.env.local`, `.next`, `node_modules`, or `.vercel`.
3. Push to GitHub, GitLab, or Bitbucket.
4. In Vercel, select **Add New → Project**.
5. Import the repository.
6. Keep the detected Next.js build settings.
7. Configure environment variables.
8. Deploy.

Git integration creates preview deployments for branches and production deployments from the configured production branch.

## Environment configuration

In **Vercel → Project → Settings → Environment Variables**, configure only what is needed.

### Deploy without AI

Do not add `OPENAI_API_KEY` or `AI_ACCESS_CODE`.

The football tracker, statistics, favorites, notifications, and statistical comparison continue to work. AI routes return HTTP 503.

### Deploy with AI

Add:

```text
OPENAI_API_KEY
OPENAI_MODEL
AI_ACCESS_CODE
```

Use a unique, random access code. Do not reuse the OpenAI key, Vercel password, or another personal password.

Apply secrets to Production and, only when needed, Preview. Redeploy after adding or changing variables.

## Production verification

Check these routes:

```text
/
/statistics
/favorites
/compare
/matches/760415
/api/live-snapshot
```

Verify:

- Pages return HTTP 200.
- The snapshot returns a JSON array.
- A match page displays live provider data.
- The layout stays within a phone viewport.
- Favorites survive a reload.
- Notification permission shows a confirmation notification.
- AI returns HTTP 503 when disabled.
- AI returns HTTP 401 for a wrong access code when enabled.
- Response headers include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.

## Domains and HTTPS

Vercel provides a `vercel.app` domain and HTTPS automatically. A custom domain is optional and configured under **Project → Settings → Domains**.

Browser notifications require a secure context in production; the Vercel HTTPS URL satisfies this requirement.

## Rollback

In the Vercel project:

1. Open **Deployments**.
2. Choose a previously working deployment.
3. Promote it to Production.

Keep environment-variable changes in mind: promoting code does not necessarily restore previous secret values.

## Cost boundaries

- Vercel hosting and OpenAI API usage are separate services.
- The Vercel Hobby plan is intended for personal, non-commercial use and has usage limits.
- OpenAI API calls require API billing/credits even if the user has a ChatGPT subscription.
- ESPN and TheSportsDB usage remains subject to their terms and availability.

Review current provider pricing and terms before a public or commercial launch.

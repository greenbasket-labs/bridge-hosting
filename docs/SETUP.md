# Bridge setup

## Database

Use PostgreSQL and set `DATABASE_URL`. Run `npx prisma migrate deploy` in production or `npx prisma db push` for a disposable development database.

## Session security

Set `SESSION_SECRET` to a long random value. Never commit `.env`.

## GitHub

Create a GitHub OAuth application and configure its callback to `/api/auth/github/callback`. For automatic deployments, configure a webhook on each connected repository pointing to `/api/webhooks/github` and sign it with `GITHUB_WEBHOOK_SECRET`.

## Provider

`PROVIDER=local` runs without an infrastructure provider and is intended for UI/integration development. Set `PROVIDER=render` and `RENDER_API_KEY` only when the Render account is configured.

## Deployment

The included `render.yaml` can be used as the initial deployment blueprint. Keep provider credentials in the hosting provider's secret environment configuration.

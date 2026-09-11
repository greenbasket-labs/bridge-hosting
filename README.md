# Bridge Hosting

Bridge is a provider-independent managed application hosting control plane.

## Product flow

Create account → connect GitHub → configure application → choose plan → deploy → live URL → custom domain → automatic deployments.

## Architecture

Bridge is a modular monolith. Provider-specific infrastructure is isolated behind `src/lib/providers`.

The first provider adapter is Render-compatible and requires credentials at runtime. A local simulation provider is included for development.

## Stack

- Next.js + TypeScript
- Prisma ORM
- PostgreSQL in production
- Secure cookie sessions
- Provider abstraction
- GitHub OAuth/webhooks

## Run locally

1. Copy `.env.example` to `.env`.
2. Configure `DATABASE_URL`.
3. Run `npm install`.
4. Run `npx prisma migrate dev`.
5. Run `npm run dev`.

Never commit real credentials. See `docs/ARCHITECTURE.md` and `docs/SETUP.md`.

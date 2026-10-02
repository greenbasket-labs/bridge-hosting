# Bridge Hosting

**Bridge is a provider-independent managed application hosting control plane.**

It is designed to give customers a simpler hosting experience while keeping infrastructure-provider details behind a provider abstraction.

## Product idea

```
Customer
   ↓
GitHub
   ↓
Bridge
   ↓
Infrastructure Provider
   ↓
Live application
```

The initial provider is Render, but the architecture keeps provider-specific infrastructure behind an adapter boundary so another provider can be introduced without redesigning the customer-facing product.

## What it demonstrates

- Customer authentication and sessions
- GitHub OAuth and repository selection
- Application provisioning
- Provider abstraction
- Deployment tracking and reconciliation
- Deployment history
- Health checks
- Custom-domain workflows
- Usage collection
- Backup/recovery foundations
- Billing and subscription foundations
- Audit and notification systems
- Customer-facing operational controls

## Architecture

Bridge is a **modular monolith**.

Provider-specific infrastructure is isolated behind `src/lib/providers`. The customer-facing product owns the account, application, plan, billing, operational, and branding experience while the provider supplies the underlying infrastructure.

## Stack

- Next.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Secure cookie sessions
- GitHub OAuth / webhooks
- Provider adapter architecture
- Paystack billing foundation

## Current state

The foundation is substantially implemented, while several areas remain in **production verification**.

The most important current engineering problem is not simply creating a provider deployment; it is proving the complete lifecycle:

```
GitHub push
  → webhook
  → Bridge deployment record
  → provider deployment
  → status reconciliation
  → health verification
  → LIVE
```

A deployment should not be presented as live merely because the provider accepted the request.

## Roadmap

### Completed foundation

- Customer authentication
- Application and plan data models
- Deployment history
- Domain data model
- Provider abstraction
- Local development provider
- Render-compatible provider
- GitHub OAuth
- GitHub repository selection
- GitHub webhooks
- Application creation
- Production Bridge deployment
- Production PostgreSQL foundation

### Active verification

- End-to-end deployment lifecycle
- Deployment reconciliation
- Stale/superseded deployment handling
- Retry and cancellation behavior
- Application health transitions
- Custom-domain verification
- Provider-backed usage metrics
- Backup and recovery verification
- Production billing hardening

## Pricing direction

Bridge is intended to use provider-backed plans rather than inventing arbitrary infrastructure resources.

The planned pricing model separates:

1. Provider infrastructure cost
2. Configurable USD/NGN exchange rate
3. Explicit Bridge service/transaction fee

The underlying provider remains the source of truth for infrastructure limits.

## Local development

1. Copy `.env.example` to `.env`.
2. Configure `DATABASE_URL`.
3. Run `npm install`.
4. Run `npx prisma migrate dev`.
5. Run `npm run dev`.

Never commit real credentials.

See `docs/ARCHITECTURE.md` and `docs/SETUP.md` for implementation details.

## Engineering principle

**Make infrastructure understandable without pretending it is simpler than it really is.**

## Author

**Mohammed Musbahu Abdullahi**

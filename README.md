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

---

# Development Roadmap

Bridge is being developed in stages. This roadmap is the source of truth for the build sequence and will be updated as each stage is completed.

## Phase 0 — Control Plane Foundation

**Status: 🟢 Completed**

- [x] Customer authentication and sessions
- [x] Customer/application data model
- [x] Plans and subscriptions data model
- [x] Deployment history data model
- [x] Domain data model
- [x] Usage and backup data models
- [x] Audit/notification foundation
- [x] Provider abstraction
- [x] Local development provider
- [x] Render-compatible provider adapter
- [x] GitHub OAuth connection
- [x] GitHub repository selection
- [x] GitHub webhook registration
- [x] Application creation flow

## Phase 1 — Reliable Deployment Engine

**Status: 🟢 Completed**

Goal: make `GitHub → Bridge → Provider → LIVE` reliable instead of optimistic.

- [x] Store provider deployment IDs
- [x] Track asynchronous provider deployments
- [x] Deployment reconciliation endpoint
- [x] Automatic reconciliation worker
- [x] Scheduled reconciliation every 5 minutes
- [x] Preserve last known live version when a newer deployment fails
- [x] Roll back to the previous successful commit
- [x] Add real application health checks
- [x] Make deployment success depend on health verification
- [x] Prevent stale/older deployments from replacing newer commits
- [x] Coalesce superseded deployments
- [x] Add deployment timeout handling
- [x] Add deployment retry policy
- [x] Add deployment cancellation
- [x] Improve deployment logs and customer-facing deployment states

## Phase 2 — Application Health & Availability

**Status: 🟢 Completed**

Goal: Bridge should know whether the customer's application is actually healthy.

- [x] HTTP health checks
- [x] Configurable health-check path
- [x] Health-check timeout and retry policy
- [x] Persistent application availability status
- [x] Provider deployment + application health combined state
- [x] Automatic unhealthy detection
- [x] Recovery detection
- [ ] Customer notifications for outages/recovery
- [ ] Admin health dashboard

## Phase 3 — Domains & HTTPS

**Status: 🟡 In progress**

Goal: turn a provider URL into a professional customer-owned application address.

- [x] Custom-domain setup flow
- [x] DNS instructions
- [x] DNS verification
- [x] Domain lifecycle reconciliation
- [x] SSL provisioning verification
- [x] HTTPS active state
- [x] Domain error handling
- [x] Multiple domains per application
- [x] Customer-facing domain management UI
- [ ] Optional Bridge-managed domain registration
- [ ] Domain renewal/lifecycle support

## Phase 4 — Real Usage & Resource Control

**Status: 🟡 In progress**

Goal: measure actual resource consumption and enforce fair plan limits.

- [x] Provider metrics collection worker
- [x] Usage collection scheduler command
- [x] Render CPU monitoring
- [x] Render RAM monitoring
- [x] Render persistent-storage monitoring
- [ ] Bandwidth monitoring
- [x] Render request monitoring
- [x] Plan-relative request usage percentage
- [x] Plan-relative concurrent-user usage percentage
- [ ] Concurrent-user monitoring where supported
- [ ] Database usage monitoring
- [ ] File-storage monitoring
- [x] Usage history data capture
- [x] Usage percentage against plan for supported metrics
- [x] Soft usage warnings for supported plan metrics
- [x] Hard usage protection for supported plan metrics
- [ ] Resource overage policy
- [x] Automatic suspension when a supported plan metric reaches 100%
- [x] Usage dashboard

## Phase 5 — Backups & Recovery

**Status: 🟢 Completed**

Goal: protect customer applications and make recovery practical.

- [x] Existing backup data model
- [x] Provider backup capability boundary
- [x] Render Postgres export backup capability
- [x] Render backup export status lookup
- [x] Manual backup creation
- [x] Backup record listing/status tracking
- [x] Automated backup scheduling
- [x] Backup retention enforcement
- [ ] Backup storage abstraction
- [x] Backup integrity checks
- [x] Safe Render PITR recovery initiation
- [x] Recovery verification endpoint
- [x] Recovery history
- [x] Customer backup controls

Recovery history reuses the existing audit log rather than adding another persistence model. The customer-scoped history endpoint returns the latest 50 recovery lifecycle events for the application, including started, verified, not-ready, and failed attempts.

Customer backup controls now expose the existing safe operations on the application page: create a backup, view recent backup status, start an isolated point-in-time recovery, and review recovery history. Production database cutover remains deliberately manual.

## Phase 6 — Billing & Plans

**Status: 🟡 In progress**

Goal: connect Bridge plans to real customer billing and resource economics.

- [x] Billing transaction persistence
- [x] Paystack payment initialization
- [x] Paystack payment verification
- [x] Signed Paystack webhook handling
- [x] Paystack transaction identity/replay hardening
- [ ] Production payment provider integration hardening
- [x] Subscription lifecycle reconciliation
- [x] Payment webhooks for recurring lifecycle events
- [x] Failed/expired billing-period detection
- [ ] Trial handling
- [x] Monthly/yearly billing period activation
- [x] Upgrade flow — plan selection + correctly priced checkout
- [ ] Downgrade flow
- [ ] Custom plans
- [ ] Invoice/receipt history
- [ ] Usage-to-plan enforcement
- [x] Billing attention notification for expired periods
- [x] Customer plan and billing status view

The billing foundation persists payment references, initializes server-side Paystack checkout, verifies amount/currency/reference, and accepts signed `charge.success` webhooks. Webhook and verification fulfillment use Paystack transaction identity to prevent duplicate/concurrent payment fulfillment. Plans can optionally store a Paystack `plan_code`; when configured, Bridge includes it during checkout and stores the resulting Paystack subscription identity. Recurring subscription and invoice lifecycle events now synchronize Bridge subscription status, while the protected billing reconciliation worker remains the fallback for expired periods. Customers can select another active plan and start a checkout using that plan's exact stored price; the subscription changes only after successful payment confirmation.

## Phase 7 — Customer Experience

**Status: 🟢 Completed**

Goal: make infrastructure feel simple to a non-technical customer.

- [x] Customer dashboard
- [x] Application overview
- [x] Clear Online/Offline/Updating states
- [x] Deployment history UI
- [x] Deployment logs UI
- [x] One-click redeploy
- [x] One-click rollback
- [x] Domain management UI
- [x] Usage dashboard
- [x] Plan management — current plan/status view
- [x] Plan management — plan selection + checkout
- [x] Backup management
- [x] Notifications center
- [x] Customer support/contact flow
- [x] Mobile-friendly experience

The customer experience now adapts its navigation, cards, forms, action buttons, typography, and data tables for smaller screens. Wide tables remain horizontally scrollable instead of forcing a desktop layout onto mobile devices. The support page provides a configured support email and guidance for reporting application or deployment issues without introducing a ticketing system.

## Phase 8 — Admin & Operations

**Status: 🟡 In progress**

Goal: give Bridge operators the tools needed to operate many customers safely.

- [x] Customer administration
- [ ] Application administration
- [ ] Provider resource view
- [ ] Deployment operations dashboard
- [ ] Failed deployment queue
- [ ] Health/outage dashboard
- [ ] Usage overview
- [ ] Resource capacity overview
- [ ] Provider configuration management
- [ ] Audit log viewer
- [ ] Customer support tools
- [ ] Manual intervention controls
- [ ] Operational alerts

The first admin operations screen is protected by the existing `ADMIN` role. Customer administration provides a simple read-only view of up to 100 newest customer accounts with name, email, application count, live application count, latest plan, and join date. No destructive customer controls or new customer-management persistence were added.

## Phase 9 — Security & Production Hardening

**Status: ⚪ Planned**

Goal: make Bridge safe to operate as a real hosting business.

- [ ] Production secret enforcement
- [ ] Separate GitHub token encryption key
- [ ] Least-privilege GitHub permissions / GitHub App evaluation
- [ ] Webhook replay protection
- [ ] Rate limiting
- [ ] Request validation hardening
- [ ] Secure environment-variable handling
- [ ] Tenant isolation review
- [ ] Authorization audit
- [ ] Security event logging
- [ ] Backup security review
- [ ] Provider credential isolation
- [ ] Production database migration workflow
- [ ] Disaster recovery plan

## Phase 10 — Multi-Provider Infrastructure

**Status: ⚪ Planned**

Goal: keep Bridge independent from any single infrastructure provider.

- [ ] Harden provider interface
- [ ] Provider capability detection
- [ ] Provider health monitoring
- [ ] DigitalOcean adapter
- [ ] Additional provider adapters
- [ ] Provider selection rules
- [ ] Provider failover strategy
- [ ] Provider migration workflow
- [ ] Customer migration without application redesign

## Phase 11 — Advanced Bridge Services

**Status: ⚪ Future**

These come after the core hosting product is reliable.

- [ ] Managed databases
- [ ] Managed file/object storage
- [ ] CDN integration
- [ ] Email/service integrations
- [ ] Scheduled jobs
- [ ] Queue/background workers
- [ ] Managed AI workloads
- [ ] AI operations and monitoring
- [ ] Advanced observability
- [ ] Organization/team accounts
- [ ] API and developer access
- [ ] Infrastructure automation marketplace

---

# Current Build Order

We do **not** jump randomly between features. The current priority is:

1. **Reliable deployments**
2. **Real health checks**
3. **Domains + HTTPS**
4. **Real usage monitoring**
5. **Backups + restore**
6. **Billing + plan enforcement**
7. **Customer experience**
8. **Admin operations**
9. **Security hardening**
10. **Multi-provider infrastructure**
11. **Advanced services**

Each completed development step should update this README so the repository always shows what is finished, what is currently being built, and what remains.

## Current milestone

**Phase 8 — Admin & Operations**

Completed: **customer administration.**

Next task: **application administration — give Bridge operators a simple read-only view of customer applications and their operational state.**

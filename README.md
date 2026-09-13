# Bridge Hosting

Bridge is a provider-independent managed application hosting control plane.

## Product flow

Create account → connect GitHub → configure application → choose plan → deploy → live URL → custom domain → automatic deployments.

## Product position

Bridge is **not intended to be another Render clone**. The initial focus is simple, transparent, managed hosting for applications built by Green Basket and for Nigerian developers, businesses, schools, and organizations.

Bridge sits above infrastructure providers:

**Customer → GitHub → Bridge → Provider → Live application**

The provider can change without requiring the customer to redesign the application.

## Pricing principles

Bridge pricing is designed to be fair and transparent rather than hiding infrastructure costs behind arbitrary packages.

- No hidden fees.
- If a service is genuinely free, show it as **₦0**.
- A single-user application should have a legitimate affordable hosting path.
- Infrastructure/resource costs and Bridge management/support fees should be clearly separated.
- Resource limits should be visible before deployment.
- Prefer hard limits and upgrade prompts over unexpected overage bills.
- Managed support should be explicit and optional where practical.
- Plans should be configurable rather than permanently hard-coded.
- As an application's real resource requirements grow, its plan should be able to grow with it.

The exact commercial prices are **not yet final**. Pricing will be calibrated against real provider costs, resource usage, support effort, and sustainable margins before public launch.

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

Bridge is being developed in stages. **This roadmap is the source of truth for the current build sequence.** Update it whenever a meaningful development step is completed, deferred, or reprioritized.

A future developer should be able to open this README and immediately understand what Bridge is, what has already been built, what is currently being fixed, and what remains before V1 launch.

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

**Status: 🟡 Verification / hardening**

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
- [x] Make Render deploy requests tolerate successful empty/non-JSON responses
- [ ] Complete an end-to-end production deployment verification

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
- [x] Customer notifications for outages/recovery
- [x] Admin health dashboard

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

Customer backup controls expose the existing safe operations on the application page: create a backup, view recent backup status, start an isolated point-in-time recovery, and review recovery history. Production database cutover remains deliberately manual.

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

The billing foundation persists payment references, initializes server-side Paystack checkout, verifies amount/currency/reference, and accepts signed `charge.success` webhooks. Webhook and verification fulfillment use Paystack transaction identity to prevent duplicate/concurrent payment fulfillment. Plans can optionally store a Paystack `plan_code`; when configured, Bridge includes it during checkout and stores the resulting Paystack subscription identity. Recurring subscription and invoice lifecycle events synchronize Bridge subscription status, while the protected billing reconciliation worker remains the fallback for expired periods. Customers can select another active plan and start a checkout using that plan's exact stored price; the subscription changes only after successful payment confirmation.

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

The customer experience adapts its navigation, cards, forms, action buttons, typography, and data tables for smaller screens. Wide tables remain horizontally scrollable instead of forcing a desktop layout onto mobile devices. The support page provides a configured support email and guidance for reporting application or deployment issues without introducing a ticketing system.

## Phase 8 — Admin & Operations

**Status: 🟢 Completed**

Goal: give Bridge operators the tools needed to operate many customers safely.

- [x] Customer administration
- [x] Application administration
- [x] Provider resource view
- [x] Deployment operations dashboard
- [x] Failed deployment queue
- [x] Health/outage dashboard
- [x] Usage overview
- [x] Resource capacity overview
- [x] Provider configuration management
- [x] Audit log viewer
- [x] Customer support tools
- [x] Manual intervention controls
- [x] Operational alerts

Operational alerts reuse the existing notification center and generate deduplicated customer/admin alerts for failed deployments, application outages, and critical supported usage limits, without introducing a separate alerting system.

## Phase 9 — Security & Production Hardening

**Status: 🟡 Next for V1**

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

We do **not** jump randomly between features. The active work is driven by the V1 finish line and real test results.

1. **Redeploy Bridge with the Render response fix and retest the existing `bridge-hosting` application**
2. **Complete launch-critical security hardening**
3. **Finish the remaining domain/usage/billing controls required for V1**
4. **Run a real end-to-end production smoke test**
5. **Only then begin multi-provider work**

Future features should not be added simply because they are technically interesting. They should be added when they solve a real customer or operational problem.

## Current status

**Bridge is in V1 integration and production-verification stage.**

The core control plane, GitHub connection, application creation, provider abstraction, local provider, Render adapter, customer experience, admin operations, health monitoring, backups/recovery foundation, and billing foundation are already implemented.

The production deployment investigation identified that the Render adapter must not assume a deployment-trigger response contains JSON. The provider API helper now reads the response body once, accepts an empty successful response, and reports malformed non-empty responses explicitly. The deployment trigger also omits a request body when no commit SHA is supplied, while still sending `commitId` for GitHub push deployments.

The fix is committed to `main` and now needs a fresh Render deployment and an end-to-end verification. Do not mark Phase 1 production-ready until that real verification succeeds.

### Immediate next task

**Redeploy Bridge from the latest `main` commit, then retest the existing `bridge-hosting` application end-to-end.**

Do not create unnecessary duplicate test applications while the existing production test is available.

### After the deployment fix

1. Confirm Bridge itself builds and runs on Render.
2. Confirm Bridge can create a customer application through Render.
3. Confirm the provider deployment is tracked correctly.
4. Confirm health checks move the application to `LIVE` only when actually healthy.
5. Confirm GitHub push → webhook → automatic deployment.
6. Confirm domain/DNS/HTTPS flow.
7. Confirm usage collection and plan protection.
8. Confirm backup/recovery controls.
9. Confirm billing/payment flow in the intended production configuration.
10. Complete launch-critical security hardening.

---

# Bridge V1 finish line

Bridge V1 does **not** require every future roadmap item. V1 is ready when the core loop works reliably in production:

**Customer → GitHub → Bridge → Provider → Live application → Domain/HTTPS → Billing → Usage/health monitoring → Alerts → Support.**

The V1 finish line is about **reliability and safe operation**, not feature count.

Before launch, the remaining work is a focused verification and hardening pass covering provider deployment reliability, secrets/credentials, webhook replay protection, rate limiting, validation, tenant authorization, secure environment handling, database migration/recovery procedures, production billing/provider configuration, and an end-to-end smoke test with a real application.

Multi-provider infrastructure, advanced services, and other future roadmap items remain **post-V1**.

## Handoff rule

If another developer takes over this repository:

1. Read this README first.
2. Check **Current status** and **Immediate next task** before changing code.
3. Inspect the existing implementation before adding new architecture.
4. Keep provider-specific logic inside `src/lib/providers`.
5. Update this roadmap after meaningful changes.
6. Do not mark a feature completed until it has been tested at the appropriate environment level.
7. Prefer the smallest change that moves Bridge toward the V1 finish line.

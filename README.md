# Bridge Hosting

Bridge is a provider-independent managed application hosting control plane.

## Product flow

Create account → connect GitHub → configure application → choose Bridge plan → deploy → live URL → custom domain → automatic deployments → billing → monitoring.

## Product position

Bridge is **not intended to be another Render clone**. Bridge provides a simple customer-facing hosting experience while infrastructure is supplied by a provider behind the scenes.

The initial provider is Render. Bridge owns the customer experience, plans, billing relationship, operational controls, and branding; Render supplies the underlying application infrastructure.

**Customer → GitHub → Bridge → Render/Provider → Live application**

The provider layer remains abstracted so another provider can be added later without redesigning the customer-facing product.

## Current commercial model

Bridge plans are backed by real provider infrastructure rather than arbitrary resource packages.

For the initial Render-backed model:

- **Bridge Free** maps to Render Free where applicable.
- Paid Bridge plans map to an underlying Render compute tier.
- Render's infrastructure limitations remain the source of truth for the underlying service.
- Bridge converts the provider cost from USD to NGN using a configurable exchange rate.
- Bridge adds an explicit Bridge transaction/service fee.
- The customer sees the Bridge plan and Bridge branding rather than needing to understand the provider dashboard.
- No hidden infrastructure or service fees.
- If the underlying provider service is genuinely free, Bridge can show **₦0**.
- Each customer application uses its own provider service in the initial Option A architecture.
- Higher provider tiers can become higher Bridge plans later.

The exact public NGN prices, exchange-rate policy, and Bridge service-fee values still need final production configuration. They should remain configurable rather than hard-coded into the customer experience.

## Pricing principles

- No hidden fees.
- Show genuinely free services as **₦0**.
- Keep provider infrastructure economics understandable.
- Keep Bridge's service/transaction fee explicit.
- A small or single-user application should have an affordable path.
- Show plan/resource limits before deployment.
- Prefer clear limits and upgrade prompts over surprise overage bills.
- Let real usage drive upgrades.
- Do not duplicate the provider's entire infrastructure-pricing system inside Bridge.
- Keep the initial billing model simple enough to operate safely.

## Architecture

Bridge is a modular monolith. Provider-specific infrastructure is isolated behind `src/lib/providers`.

The first provider adapter is Render-compatible. A local simulation provider is included for development.

## Stack

- Next.js + TypeScript
- Prisma ORM
- PostgreSQL in production
- Secure cookie sessions
- Provider abstraction
- GitHub OAuth/webhooks
- Paystack billing foundation

## Run locally

1. Copy `.env.example` to `.env`.
2. Configure `DATABASE_URL`.
3. Run `npm install`.
4. Run `npx prisma migrate dev`.
5. Run `npm run dev`.

Never commit real credentials. See `docs/ARCHITECTURE.md` and `docs/SETUP.md`.

---

# Development Roadmap

This roadmap is the **source of truth** for the Bridge build. Update it whenever a meaningful feature is completed, verified, deferred, or reprioritized.

The roadmap separates:

- what is implemented,
- what is implemented but still needs real production verification,
- what is required before V1,
- and what intentionally belongs after V1.

A future developer should be able to read this file first and immediately know the current state without reconstructing the project history.

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
- [x] Production Bridge deployment on Render
- [x] Production PostgreSQL database

## Phase 1 — Reliable Deployment Engine

**Status: 🟠 Active — production verification blocked**

Goal: make `GitHub → Bridge → Provider → LIVE` reliable instead of optimistic.

### Implemented

- [x] Store provider deployment IDs
- [x] Create deployment records before provider deployment tracking
- [x] Track asynchronous provider deployments
- [x] Deployment reconciliation path
- [x] Automatic reconciliation worker/scheduler foundation
- [x] Preserve deployment history and previous successful deployment information
- [x] Superseded/stale deployment handling foundation
- [x] Deployment timeout handling foundation
- [x] Deployment retry handling foundation
- [x] Deployment cancellation foundation
- [x] Customer-facing deployment states
- [x] Customer-facing deployment logs
- [x] Render deploy requests tolerate successful empty/non-JSON responses
- [x] Initial Render deploy without a commit SHA does not send an unnecessary JSON body
- [x] GitHub push deployments can pass the commit SHA to the provider

### Still required

- [ ] Fresh production deployment of the latest Bridge code
- [ ] Confirm a real provider deployment moves beyond `QUEUED`
- [ ] Confirm provider status is reconciled into Bridge correctly
- [ ] Confirm successful deployment reaches `LIVE` only after health verification
- [ ] Confirm failed deployment reaches `FAILED` with useful error information
- [ ] Confirm newer deployments cannot be replaced by stale deployment results
- [ ] Confirm automatic GitHub push → webhook → deployment in production
- [ ] Confirm retry/cancellation behavior against a real provider deployment
- [ ] Complete one clean end-to-end production deployment test

**Current known issue:** the production application has been reaching `QUEUED` after Bridge successfully creates/tracks the provider deployment. The next investigation is the **deployment reconciliation/status path**, not another rewrite of the Render request parser unless new evidence requires it.

Do not mark Phase 1 complete until the existing production test application has successfully completed the full deployment lifecycle.

## Phase 2 — Application Health & Availability

**Status: 🟡 Implemented — production verification pending**

Goal: Bridge must know whether the customer's application is actually healthy.

- [x] HTTP health checks
- [x] Configurable health-check path
- [x] Health-check timeout and retry policy
- [x] Persistent application availability status
- [x] Provider deployment + application health combined state
- [x] Automatic unhealthy detection
- [x] Recovery detection
- [x] Customer notifications for outages/recovery
- [x] Admin health dashboard
- [ ] Verify health transition against a real deployed customer application
- [ ] Verify outage → recovery lifecycle in production

## Phase 3 — Domains & HTTPS

**Status: 🟡 Implemented — production verification pending**

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
- [ ] Verify a real custom domain end-to-end in production
- [ ] Optional Bridge-managed domain registration
- [ ] Domain renewal/lifecycle support

## Phase 4 — Real Usage & Resource Control

**Status: 🟠 Active — provider capability verification pending**

Goal: measure real usage and use provider-backed limits fairly without rebuilding the provider's entire metering system.

### Implemented

- [x] Provider metrics collection worker
- [x] Usage collection scheduler command
- [x] Render CPU monitoring
- [x] Render RAM monitoring
- [x] Render persistent-storage monitoring
- [x] Render request monitoring
- [x] Plan-relative request usage percentage
- [x] Plan-relative concurrent-user usage percentage
- [x] Usage history data capture
- [x] Usage percentage against plan for supported metrics
- [x] Soft usage warnings for supported plan metrics
- [x] Hard usage protection for supported plan metrics
- [x] Automatic suspension when a supported plan metric reaches its configured protection threshold
- [x] Usage dashboard

### Still required

- [ ] Confirm which bandwidth metric can be reliably obtained from the provider
- [ ] Concurrent-user monitoring where provider data supports it
- [ ] Database usage monitoring
- [ ] File-storage monitoring
- [ ] Verify all displayed resource percentages against real provider values
- [ ] Finalize resource overage policy
- [ ] Production test of warning/protection behavior

Bridge should not invent provider metrics that cannot be measured reliably. Unsupported metrics should remain clearly marked rather than displaying misleading percentages.

## Phase 5 — Backups & Recovery

**Status: 🟢 Implemented — production verification pending**

Goal: protect customer applications and make recovery practical.

- [x] Backup data model
- [x] Provider backup capability boundary
- [x] Render Postgres export backup capability
- [x] Render backup export status lookup
- [x] Manual backup creation
- [x] Backup record listing/status tracking
- [x] Automated backup scheduling
- [x] Backup retention enforcement
- [x] Backup integrity checks
- [x] Safe Render PITR recovery initiation
- [x] Recovery verification endpoint
- [x] Recovery history
- [x] Customer backup controls
- [ ] Verify backup creation against the production database
- [ ] Verify recovery verification against a real recovery operation
- [ ] Backup storage abstraction
- [ ] Production disaster-recovery drill

Recovery history reuses the existing audit log rather than adding another persistence model. Customer-scoped history returns recent recovery lifecycle events.

Production database cutover remains deliberately manual until recovery has been proven safe.

## Phase 6 — Billing & Plans

**Status: 🟠 Active — pricing model being aligned to Render-backed plans**

Goal: make Bridge billing simple, transparent, provider-backed, and sustainable.

### Billing foundation implemented

- [x] Billing transaction persistence
- [x] Paystack payment initialization
- [x] Paystack payment verification
- [x] Signed Paystack webhook handling
- [x] Paystack transaction identity/replay hardening
- [x] Subscription lifecycle reconciliation foundation
- [x] Payment webhook lifecycle handling
- [x] Failed/expired billing-period detection
- [x] Monthly/yearly billing period activation
- [x] Upgrade flow — plan selection + correctly priced checkout
- [x] Billing attention notification for expired periods
- [x] Customer plan and billing status view

### New V1 pricing direction

- [ ] Replace the current arbitrary Bridge plan/resource assumptions with explicit Render-backed plan mappings
- [ ] Add provider plan/tier identity to the plan configuration
- [ ] Add configurable USD provider cost
- [ ] Add configurable USD/NGN exchange rate
- [ ] Add configurable Bridge transaction/service fee
- [ ] Calculate displayed NGN price from provider cost + exchange rate + Bridge fee
- [ ] Keep Free at ₦0 when the mapped provider tier is genuinely free
- [ ] Clearly show Bridge plan name and included limits to customers
- [ ] Keep provider limitations as the source of truth for the underlying service
- [ ] Verify the paid-plan checkout amount matches the calculated Bridge price
- [ ] Verify the price shown before checkout is the price sent to Paystack

### Remaining billing features

- [ ] Production payment provider integration hardening
- [ ] Trial handling
- [ ] Downgrade flow
- [ ] Custom plans
- [ ] Invoice/receipt history
- [ ] Usage-to-plan enforcement across all supported metrics
- [ ] Final production pricing configuration

**Important:** do not build a large billing/commerce system. V1 needs a small reliable model: provider cost → exchange rate → Bridge fee → customer price → Paystack payment → subscription state.

## Phase 7 — Customer Experience

**Status: 🟢 Implemented — production verification pending**

Goal: make infrastructure feel simple to a non-technical customer.

- [x] Customer dashboard
- [x] Application overview
- [x] Clear Online/Offline/Updating states
- [x] Deployment history UI
- [x] Deployment logs UI
- [x] One-click redeploy
- [x] One-click rollback foundation
- [x] Domain management UI
- [x] Usage dashboard
- [x] Current plan/status view
- [x] Plan selection + checkout
- [x] Backup management
- [x] Notifications center
- [x] Customer support/contact flow
- [x] Mobile-friendly experience
- [ ] Verify the complete customer journey in production
- [ ] Verify customer-visible states during a real deployment
- [ ] Verify customer-visible billing and plan information after pricing update

The UI intentionally hides unnecessary infrastructure complexity. Customers should primarily understand their application, status, domain, plan, usage, billing, and available actions.

## Phase 8 — Admin & Operations

**Status: 🟢 Implemented — production verification pending**

Goal: give Bridge operators the minimum safe tools needed to operate multiple customers.

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
- [ ] Verify admin operations against production data
- [ ] Verify manual intervention cannot bypass tenant authorization

Operational alerts reuse the existing notification center and avoid introducing a separate alerting system for V1.

## Phase 9 — Security & Production Hardening

**Status: 🔴 Required before V1 launch**

Goal: make Bridge safe to operate as a real hosting business.

- [ ] Require `SESSION_SECRET` in production; remove the development fallback from production execution
- [ ] Separate/encrypt GitHub token storage with a dedicated encryption key
- [ ] Least-privilege GitHub permissions review
- [ ] Evaluate GitHub App architecture for production scale
- [ ] Webhook signature verification audit
- [ ] Webhook replay protection
- [ ] Rate limiting on authentication, deployment, webhook, billing, and expensive API routes
- [ ] Request validation hardening
- [ ] Secure environment-variable handling
- [ ] Tenant isolation review
- [ ] Authorization audit for customer/admin routes
- [ ] Security event logging
- [ ] Provider credential isolation
- [ ] Backup security review
- [ ] Production database migration workflow
- [ ] Disaster recovery runbook
- [ ] Production secret rotation procedure
- [ ] Final dependency/security audit

## Phase 10 — Multi-Provider Infrastructure

**Status: ⚪ Post-V1**

Goal: add infrastructure choice only after the Render-backed product is reliable.

- [ ] Harden provider interface based on real V1 lessons
- [ ] Provider capability detection
- [ ] Provider health monitoring
- [ ] DigitalOcean adapter
- [ ] Additional provider adapters
- [ ] Provider selection rules
- [ ] Provider failover strategy
- [ ] Provider migration workflow
- [ ] Customer migration without application redesign

Do not start this phase while the primary Render deployment lifecycle is still being verified.

## Phase 11 — Advanced Bridge Services

**Status: ⚪ Future**

Only begin these after the core hosting product is reliable and commercially validated.

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

Work should follow this order. Do not jump to future infrastructure features while the current production loop is unresolved.

### 1. Fix and verify the deployment lifecycle

- Deploy the latest `main` to Bridge on Render.
- Retest the existing `bridge-hosting` customer application.
- Trace `QUEUED → BUILDING/DEPLOYING → LIVE/FAILED` through the reconciliation path.
- Confirm Bridge reads the real provider deployment state.
- Confirm health verification controls the final application state.
- Confirm GitHub push triggers a new deployment.

### 2. Finish Render-backed Bridge pricing

- Keep Render as the infrastructure source of truth.
- Map Bridge plans to Render tiers.
- Add configurable exchange rate and explicit Bridge fee.
- Keep genuine provider Free at Bridge ₦0.
- Verify Paystack receives the calculated customer price.

### 3. Production smoke-test the core customer journey

**Customer → GitHub → Bridge → Render → deployment → health → live application → domain → usage → billing.**

### 4. Complete launch-critical security hardening

Prioritize secrets, webhook security, rate limiting, tenant authorization, credential protection, validation, and recovery procedures.

### 5. Only after V1 reliability: expand

Then consider multi-provider support and advanced Bridge services.

---

# Current Status

**Bridge is in V1 integration and production-verification stage.**

The control-plane foundation is in place, including authentication, application management, provider abstraction, GitHub integration, Render integration, deployment records, health/usage foundations, backups/recovery, customer UI, admin operations, and billing foundations.

Bridge is already deployed on Render with a production PostgreSQL database.

The latest deployment investigation established that the Render deployment trigger must not assume a successful response contains JSON. That provider-side fix is now implemented. The production test has subsequently reached the point where Bridge records provider deployments as `QUEUED` instead of failing immediately on JSON parsing.

That means the **next blocker is deployment reconciliation/status progression**. The priority is to determine why the tracked provider deployment is not being advanced to its real provider state and then to `LIVE`/`FAILED` after health verification.

Do not restart the architecture or add another provider until this lifecycle is proven.

---

# Immediate Next Task

**Production deployment reconciliation verification.**

1. Deploy the latest `main` commit to the Bridge Render service.
2. Open the existing `bridge-hosting` application.
3. Trigger/retry one deployment.
4. Inspect the stored provider deployment ID.
5. Confirm the reconciliation path polls that deployment.
6. Confirm the Bridge deployment status changes from `QUEUED` to the real provider state.
7. Confirm a healthy application becomes `LIVE`.
8. Confirm a failed deployment becomes `FAILED` without destroying the last known good version.
9. Confirm a GitHub push produces the same lifecycle automatically.
10. Update this README immediately after the result.

**Do not create unnecessary duplicate applications while the existing production test application is available.**

---

# V1 Finish Line

Bridge V1 is ready when this core loop works reliably in production:

**Customer → GitHub → Bridge → Render → Live application → Domain/HTTPS → Billing → Usage/health monitoring → Alerts → Support.**

V1 does **not** require:

- multiple infrastructure providers,
- an advanced marketplace,
- managed AI infrastructure,
- complex enterprise organizations,
- or a large custom billing engine.

V1 is about **reliable managed hosting**, transparent pricing, safe operations, and a simple customer experience.

Before launch, the remaining critical work is:

1. reliable production deployment reconciliation;
2. real health-verified application state;
3. production domain/HTTPS verification;
4. provider-backed usage verification;
5. Render-backed Bridge pricing configuration;
6. Paystack production billing verification;
7. launch-critical security hardening;
8. backup/recovery verification;
9. one complete production smoke test.

---

# Handoff Rule

If another developer takes over this repository:

1. Read this README first.
2. Check **Current Status** and **Immediate Next Task** before changing code.
3. Inspect the existing implementation before adding architecture.
4. Keep provider-specific logic inside `src/lib/providers`.
5. Treat Render/provider capabilities as the source of truth for provider-backed resources.
6. Do not recreate complex provider infrastructure unnecessarily.
7. Keep Bridge pricing transparent: provider cost + exchange rate + explicit Bridge fee.
8. Update this roadmap after every meaningful development step.
9. Do not mark a feature complete until it is tested at the appropriate environment level.
10. Prefer the smallest change that moves Bridge toward the V1 finish line.
11. Do not begin Phase 10 or Phase 11 work while a launch-critical V1 blocker remains unresolved.

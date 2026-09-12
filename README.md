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
- [ ] Optional Bridge-managed domain registration
- [ ] Domain renewal/lifecycle support

## Phase 4 — Real Usage & Resource Control

**Status: ⚪ Planned**

Goal: measure actual resource consumption and enforce fair plan limits.

- [ ] Provider metrics collection
- [ ] CPU monitoring
- [ ] RAM monitoring
- [ ] Storage monitoring
- [ ] Bandwidth monitoring
- [ ] Request monitoring
- [ ] Concurrent-user monitoring where supported
- [ ] Database usage monitoring
- [ ] File-storage monitoring
- [ ] Usage history
- [ ] Usage percentage against plan
- [ ] Soft usage warnings
- [ ] Hard usage protection
- [ ] Resource overage policy
- [ ] Automatic suspension policy for severe abuse/overuse
- [ ] Usage dashboard

## Phase 5 — Backups & Recovery

**Status: ⚪ Planned**

Goal: protect customer applications and make recovery practical.

- [ ] Automated backup scheduling
- [ ] Backup storage abstraction
- [ ] Backup retention enforcement
- [ ] Backup status tracking
- [ ] Backup integrity checks
- [ ] Manual backup creation
- [ ] Restore workflow
- [ ] Restore verification
- [ ] Recovery history
- [ ] Customer backup controls

## Phase 6 — Billing & Plans

**Status: ⚪ Planned**

Goal: connect Bridge plans to real customer billing and resource economics.

- [ ] Production payment provider integration
- [ ] Subscription lifecycle
- [ ] Payment webhooks
- [ ] Failed-payment handling
- [ ] Trial handling
- [ ] Monthly/yearly billing
- [ ] Upgrade flow
- [ ] Downgrade flow
- [ ] Custom plans
- [ ] Invoice/receipt history
- [ ] Usage-to-plan enforcement
- [ ] Billing notifications

## Phase 7 — Customer Experience

**Status: ⚪ Planned**

Goal: make infrastructure feel simple to a non-technical customer.

- [ ] Customer dashboard
- [ ] Application overview
- [ ] Clear Online/Offline/Updating states
- [ ] Deployment history UI
- [ ] Deployment logs UI
- [ ] One-click redeploy
- [ ] One-click rollback
- [ ] Domain management UI
- [ ] Usage dashboard
- [ ] Plan management
- [ ] Backup management
- [ ] Notifications center
- [ ] Customer support/contact flow
- [ ] Mobile-friendly experience

## Phase 8 — Admin & Operations

**Status: ⚪ Planned**

Goal: give Bridge operators the tools needed to operate many customers safely.

- [ ] Customer administration
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

**Phase 3 — Domains & HTTPS**

Next task: **domain management UI and final domain lifecycle/renewal handling.**

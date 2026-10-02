# Bridge Architecture

Bridge is a modular monolith. The application owns customer-facing workflows while infrastructure-provider behavior is isolated behind provider adapters.

## Lifecycle

```
GitHub repository
      |
      v
GitHub webhook
      |
      v
Bridge deployment record
      |
      v
Provider adapter
      |
      v
Infrastructure provider
      |
      v
Deployment status
      |
      v
Reconciliation + health verification
      |
      v
Application state: LIVE / transitional / failed
```

## Boundaries

### Customer domain

Owns accounts, applications, plans, billing state, domains, deployment history, and operational controls.

### GitHub integration

Handles OAuth, repository selection, and webhook-driven deployment events.

### Provider abstraction

Provider-specific API calls live behind `src/lib/providers`. The first provider is Render; a local provider supports development without a real infrastructure account.

### Reconciliation

Provider acceptance is not treated as proof that an application is live. Deployment state should be reconciled with provider state and health checks before presenting a successful live state.

## Production-sensitive areas

- session and OAuth credentials
- webhook signature verification
- provider credentials
- deployment state transitions
- billing state
- custom-domain verification
- backup/recovery behavior

See `docs/SETUP.md` and `SECURITY.md` for operational guidance.

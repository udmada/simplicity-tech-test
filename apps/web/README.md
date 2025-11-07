# @udmada/web

React Router + Cloudflare Workers shell that powers the Simplicity finance demo. It renders the Plaid-driven accounts dashboard and cashflow insights using the shared finance-client and powertools packages.

## Setup

```bash
pnpm install
pnpm --filter @udmada/web dev
```

Provide Plaid credentials via `.dev.vars` or `wrangler secret put`:

```
PLAID_CLIENT_ID=...
PLAID_SECRET=...
SANDBOX_ACCESS_TOKEN=...
PLAID_ENV=sandbox
```

## Key files

| Path | Purpose |
| --- | --- |
| `app/root.tsx` | Sidebar layout + error boundary. |
| `app/lib/runtime.server.ts` | Effect layer that wires Plaid + powertools. |
| `app/routes/accounts.tsx` | Lists accounts with balances & metadata. |
| `app/routes/insights.cashflow.tsx` | Aggregates transactions into cashflow metrics. |
| `workers/app.ts` | Cloudflare Worker entry (passes env/context into loaders). |

## Architecture

```mermaid
flowchart LR
  Routes --> RuntimeLayer
  RuntimeLayer --> Powertools[@udmada/finance-powertools]
  RuntimeLayer --> FinanceClient[@udmada/finance-client]
  FinanceClient --> Plaid[(Plaid API)]
  Powertools --> Observability[(console | OTEL)]
  RuntimeLayer -->|Effect| ReactUI[[React Router routes]]
```

Each loader creates the runtime layer once per request so observability + Plaid credentials stay centralized.

## Scripts

```bash
pnpm --filter @udmada/web dev      # HMR
pnpm --filter @udmada/web build    # react-router build
pnpm --filter @udmada/web preview  # vite preview
```

Deploy with `wrangler deploy` after building.

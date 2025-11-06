# @udmada/web

Remix + Tailwind app used to demo the finance monorepo. It shells accounts and cashflow routes around a Plaid sandbox backend and the powertools observability layer.

## Setup

```bash
pnpm install
pnpm --filter @udmada/web dev
```

Provide Plaid credentials via `.dev.vars` or exported env vars:

```
PLAID_CLIENT_ID=...
PLAID_SECRET=...
SANDBOX_ACCESS_TOKEN=...
PLAID_ENV=sandbox
```

The dev server runs at <http://localhost:5173>.

## What lives here?

| Path                               | Why it matters                                              |
| ---------------------------------- | ----------------------------------------------------------- |
| `app/root.tsx`                     | Layout/shell, sidebar, error boundary.                      |
| `app/lib/runtime.server.ts`        | Builds the Effect layer that combines Plaid and powertools. |
| `app/routes/accounts.tsx`          | Fetch accounts, map to domain models, render cards.         |
| `app/routes/insights.cashflow.tsx` | Aggregate transactions into cashflow insights.              |

## Architecture (quick view)

```mermaid
flowchart LR
  Browser --> Remix[Remix Routes]
  Remix --> RuntimeLayer
  RuntimeLayer --> Powertools[@udmada/finance-powertools]
  RuntimeLayer --> PlaidClient[@udmada/finance-client]
  PlaidClient --> PlaidAPI[(Plaid API)]
```

Every loader calls `createRuntimeLayer` before running its Effect program, so telemetry (console vs OTEL) and Plaid creds are wired once.

Cloudflare Pages is configured in `wrangler.toml`; preview mirrors the production runtime.

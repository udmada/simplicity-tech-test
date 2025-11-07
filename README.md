# Personal Finance Platform - Tech Interview Project

A domain-driven fintech application using TypeScript, Effect, and modern monorepo architecture.

Domain: Personal Finance & Open Banking (based off prepopulated data from Plaid Sandbox)
Architecture (big picture): Domain-Driven Design + Event-Driven Architecture

<details><summary><strong>Tech Stack</strong></summary>
  
  - Node@LTS + TypeScript structured in a pnpm monorepo 
  - Shared domain logic built on FP-inspired Effect
  - React Router (migrated from Remix) with Tailwind CSS and Vite
  - Test runner: Vitest >>> node test runner due to easier syntax
  - Packages publishable to npm via workspace tooling
  - Turning-complete DSL for CI workflow configuration

</details>

---

## Project Context & Decisions

### Why Finance Instead of Weather?

Original Plan: Weather forecasting app with Open-Meteo API, but soon it came to me that Simplicty is a fintech KiwiSaver provider advocating for open-banking.

Decision: Pivot to personal finance domain because:

- More relevant to the company's mission (KiwiSaver, open-banking)
- Provides better technical discussion points for the interview
- Finance domain has richer business logic for architecture patterns
- I have worked in the fintech industry for 5 years, building scalable and secure financial applications.
- Demonstrates research and understanding of the company

Trade-off: Less generic, more domain-specific. But at the same time, very sparsed LLM-ready material i.e. I can showcase my own skills.

---

## Why Plaid Over Akahu?

### API Selection Decision Matrix

| Criteria             | Akahu (NZ)                   | Plaid (Global)         |
| -------------------- | ---------------------------- | ---------------------- |
| **Setup Speed**      | 1-3 days (bank verification) | 5 minutes              |
| **Data Safety**      | Real bank account data       | Synthetic test data    |
| **Test Scenarios**   | Limited (your account only)  | Multiple user personas |
| **Risk Level**       | Medium-High (real money)     | Low (sandbox)          |
| **Documentation**    | Good                         | Excellent              |
| **Global Relevance** | NZ-specific                  | Industry standard      |

**Decision**: Use Plaid for development, but design architecture to support multiple providers.

**Rationale**: Plaid is the global standard for open banking. The patterns used here apply to any provider including Akahu. Using Plaid's sandbox allowed me to focus on architecture (DDD, Event-Driven) with synthetic test data instead of real financial data. The architecture is provider-agnostic - the `PlaidClient` interface can be extended with an `AkahuClient` implementation without changing the domain layer.

---

## Architecture Decisions

### Core Patterns

**1. Domain-Driven Design (DDD)**

Finance has rich business rules that fit DDD well:

- Ubiquitous Language: Terms like "depository", "available balance", "holder category" match industry language
- Value Objects: `Money<Currency>` with branded types prevents currency mismatch bugs
- Aggregates: `Account` enforces business rules (active state, sufficient funds)
- Bounded Contexts: Banking, Investments, Analytics (with Shared Kernel)

Anti-patterns avoided:

- Primitive Obsession: Used `Money<'NZD'>` instead of raw numbers
- Self-expending Domain Model: Business logic lives in domain entities, not services
- Stringly-Typed IDs: Branded types (`AccountId`, `TransactionId`) prevent ID misuse
- Manual Dependency Injection: Passing dependencies everywhere - Used Effect Layer system instead

**2. Event-Driven**

Enables loose coupling and audit trails needed for finance:

- Domain Events: `AccountLinked`, `BalanceUpdated`, `TransactionsSynced`
- Type-Safe Handlers: `TotalEventHandler` enforces exhaustive event handling at compile time
- Cache Invalidation: Events trigger cache updates automatically
- Audit Trail: Eventually add event sourcing with event store for audit/compliance.

**3. `Effect` for Functional-esque Pipelines**

Type-safe error handling and composable effects:

```typescript
// All errors are typed and handled
const syncAccount: Effect.Effect<Account, PlaidError | ValidationError, PlaidClient>;

// Errors accumulate through pipeline
pipe(
  fetchAccount(), // PlaidError
  validateActive(), // + ValidationError
  saveToRepo(), // + RepositoryError
  publishEvent(), // + EventBusError
);
// Result: Effect<void, PlaidError | ValidationError | RepositoryError | EventBusError>
```

Anti-patterns avoided:

- Try/Catch : Type-safe errors with discriminated unions
- Error-throwing: Effect forces error handling (Rust-like `Result`)
- Callback Hell: Composable pipelines with `pipe`

---

## Package Architecture

### Monorepo Structure (Powertools Pattern)

```
packages/
  ├── finance-client/        # @udmada/finance-client
  │   ├── domain/            # Pure domain logic (zero deps)
  │   ├── infrastructure/    # Plaid API client
  │   └── application/       # Use cases
  └── finance-powertools/    # @udmada/finance-powertools
      └── runtime/           # Observability & resilience
```

Inspired by AWS Lambda Powertools pattern.

Separate packages because:

1. Separation of Concerns: Domain logic doesn't depend on observability
2. Cleaner Dependencies: Client has minimal deps (effect, plaid)
3. Reusability: Powertools works with any Effect-based app

Trade-off: More dependencies to manage, but cleaner architecture and better boundaries.

---

## Type Safety & Advanced TypeScript

### Type-Level Programming Patterns

**1. Branded Types with Phantom Parameters**

```typescript
type Money<C extends Currency> = Brand.Branded<
  {
    amount: number;
    currency: C;
  },
  "Money"
>;

const nzd = makeMoney(100, "NZD"); // Money<'NZD'>
const usd = makeMoney(50, "USD"); // Money<'USD'>

add(nzd, usd); // Compile error: currency mismatch!
```

Prevents accidental currency mixing at compile time.

**2. Flow-Sensitive Type Narrowing**

```typescript
pipe(
  Effect.succeed(account),  // Account
  Effect.filterOrFail(isActive, ...),
  // Type is now ActiveAccount (narrowed)
  Effect.flatMap((active) => withdraw(active, amount))
)
```

Business rules enforced by types, not runtime checks.

**3. Exhaustive Event Handling**

```typescript
type TotalEventHandler = {
  [K in DomainEvent["_tag"]]: (event: EventByTag<K>) => Effect<void>
}

// Compiler enforces ALL events have handlers
const handlers: TotalEventHandler = {
  AccountLinked: ...,
  BalanceUpdated: ...,
  // Missing handler? Compile error!
}
```

Makes it impossible to forget handling an event type.

---

## Deployment & CI/CD

### Cloudflare Pages + Workers

Current setup:

- **Build**: Remix generates `build/client/` (static) + `build/server/` (SSR bundle)
- **Deploy**: `_worker.js` loads server bundle at runtime
- **CI/CD**: GitHub Actions with pkl-based workflows

Cloudflare was chosen for:

- Edge-first deployment (low latency globally)
- Generous free tier
- Modern platform

Trade-off: More complex than traditional Node.js hosting, and it always feels like Cloudflare docs are sitting somewhere from completely information-thin to pseudo-business-case-pamphlets

### Workflow Automation (pkl + GitHub Actions)

pkl over yaml because:

- Turninng-complete i.e. testing, LSP, type-checking, linting etc
- Type-safe workflow definitions
- Compile-time validation
- Prevents common yaml errors such as missing spaces, incorrect indentation, and invalid space, and space.

Workflows:

- `ci.yml` - Lint, typecheck, test, build
- `deploy-cloudflare.yml` - Deploy to Pages (preview + production)
- `version.yml` - Bump versions, tag (with `[skip ci]`)
- `publish.yml` - Publish to npm (triggered by version tags)

---

## What I'd Add for Production

### If This Were a Real System

**1. Testing (Currently Minimal)**

- Unit tests for domain logic (Vitest)
- Integration tests with Plaid sandbox fixtures
- No E2E tests at all at the moment(Playwright)
- Property-based testing for Money operations (fast-check)
- Type assertion tests (vitest --typecheck)
- Contract-based testing
- Target: 90%+ coverage with documented exceptions

**2. Observability (Currently Basic)**

- OpenTelemetry exporter to Datadog/Honeycomb
- Sentry error tracking with source maps
- Structured logging with request correlation IDs
- Real-user monitoring (RUM) for frontend
- Custom metrics dashboard for business KPIs

**3. Security & Compliance**

- SSO/OICD?
- Rate limiting/fail2ban
- CSRF protection for mutations
- CSP headers

**4. Performance**

- Optimistic UI updates
- Image optimization (Sharp/Cloudflare Images)
- Bundle size monitoring (bundlephobia CI)
- React.lazy() for code splitting
- Maybe memcached or redis?

**5. Resilience**

- Circuit breaker for Plaid API calls
- Exponential backoff retry (already have Schedule)
- Graceful degradation when Plaid is down
- Request deduplication (idempotency - already have in-memory)
- Saga pattern for rollback when erred.

**6. Multi-Provider Support**

- AkahuClient implementation
- Provider adapter interface
- Provider selection UI
- Unified account aggregation across providers

**7. Data Persistence**

- Well Database would be a whole shebang

**8. Advanced Features**

- Transaction categorization (Potentially LLM?)
- Budget tracking and alerts and prediction
- Spending insights dashboard
- Export to CSV/PDF (Definately something Marcro or MCP-achieveable)
- Mobile responsive design

### What I Prioritized

For a 15-20 hour interview project, I optimised for:

- Architecture demonstration >>> feature completeness
- Type safety >>> runtime flexibility
- Interview discussion points >>> production completeness
- Domain relevance >>> generic examples
- No compliance-complex PII test data

---

## Metrics & Time Investment

**Total Time**: ~20-25 hours

| Phase                         | Time | Status   |
| ----------------------------- | ---- | -------- |
| Plaid sandbox setup           | 1h   | Complete |
| Architecture planning         | 3.5h | Complete |
| Domain layer                  | 2.5h | Complete |
| Infrastructure (Plaid client) | 4h   | Complete |
| Powertools package            | 1h   | Complete |
| Remix web app                 | 5h   | Complete |
| CI/CD workflows               | 3h   | Complete |
| Deployment debugging          | 3h   | Complete |

---

## Getting Started

### Prerequisites

- Plaid sandbox account (free)
- mise

### Setup

```bash
mise install
# Install dependencies
pnpm install

# Copy environment template
cp apps/web/.dev.vars.example apps/web/.dev.vars

# Add your Plaid credentials
# Get them from: https://dashboard.plaid.com/developers/keys

# Build packages
pnpm build

# Run web app locally
cd apps/web
pnpm dev
```

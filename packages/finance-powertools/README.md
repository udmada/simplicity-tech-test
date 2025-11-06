# @udmada/finance-powertools

Effect-native observability & resilience helpers (logging, tracing, metrics, idempotency) inspired by AWS Powertools, used across this monorepo to bootstrap Remix loaders and other Effect programs.

## Install

```bash
pnpm add @udmada/finance-powertools effect
```

Targets Node 20+ with dual ESM/CJS exports.

## Quick start

```ts
import { developmentPowertoolsLayer } from "@udmada/finance-powertools";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.log("syncing");
  // your business logic
});

await Effect.runPromise(
  program.pipe(
    Effect.provide(
      developmentPowertoolsLayer({
        observability: { structured: true },
        idempotency: { ttlMs: 5 * 60_000 },
      }),
    ),
  ),
);
```

### Managed runtime helper

```ts
import { createDevelopmentRuntime } from "@udmada/finance-powertools";

const runtime = createDevelopmentRuntime();
export const run = <A, E>(effect: Effect.Effect<A, E>) => runtime.runPromise(effect);
```

Use `createProductionRuntime` with an OTEL tracer config for production workloads.

### Production snippet

```ts
import { productionPowertoolsLayer } from "@udmada/finance-powertools";
import { Effect } from "effect";

const layer = productionPowertoolsLayer({
  observability: {
    tracerConfig: {
      serviceName: "finance-api",
      url: "http://otel-collector:4318/v1/traces",
    },
  },
  // add your own idempotency layer (Redis, Dynamo, etc.)
});

await Effect.runPromise(program.pipe(Effect.provide(layer)));
```

## API surface

| Export                                                            | Purpose                                                                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `developmentPowertoolsLayer(options?)`                            | Console logger, native tracer, console metrics, in-memory idempotency.                                                                                |
| `productionPowertoolsLayer({ observability, idempotencyLayer? })` | Structured logger + OTEL tracer + optional custom idempotency layer.                                                                                  |
| `customPowertoolsLayer(observability, idempotency, extra?)`       | Compose your own stack from individual layers.                                                                                                        |
| `createDevelopmentRuntime`, `createProductionRuntime`             | ManagedRuntime wrappers with the above layers pre-wired.                                                                                              |
| `withPowertools`, `withProductionPowertools`                      | One-liner helpers that run an Effect inside the managed runtime.                                                                                      |
| Individual layers under `runtime/*`                               | `consoleLoggerLayer`, `structuredConsoleLoggerLayer`, `nativeTracerLayer`, `otelTracerLayer`, `consoleMetricsLayer`, `inMemoryIdempotencyLayer`, etc. |

## Architecture snapshot

```mermaid
flowchart LR
  subgraph Powertools Layer
    Logger[[Logger]]
    Tracer[[Tracer]]
    Metrics[[Metrics]]
    Idempotency[[Idempotency]]
  end

  EffectProgram[[Effect program]] -->|"provide powertools layer"| Powertools Layer
  Logger --> ObservabilitySinks[(console / structured)]
  Tracer --> Otel[(native tracer / OTEL)]
  Metrics --> MetricsSink[(console observer)]
  Idempotency --> Cache[(in-memory store or custom layer)]
```

Each helper builds a Layer that merges an observability bundle (`logger + tracer + metrics`) with an idempotency service, then hands it to your Effect runtime. Nothing leaks into business logic.

## Idempotency at a glance

- `inMemoryIdempotencyLayer({ ttlMs?, maxEntries? })` caches `Exit`s in a ring buffer.
- `noOpIdempotencyLayer` bypasses caching (useful for read-only workloads).
- Provide your own `Layer` through `productionPowertoolsLayer({ idempotencyLayer })` to plug Redis, Dynamo, etc.

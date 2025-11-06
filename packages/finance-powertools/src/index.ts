/**
 * @udmada/finance-powertools
 *
 * Observability and resilience layers for Effect-based applications.
 * Inspired by AWS Lambda Powertools.
 *
 * ## Layer-Based API (Primary)
 *
 * Use layers with Effect.provide for full control:
 *
 * ```typescript
 * import { developmentPowertoolsLayer } from '@udmada/finance-powertools';
 * import { Effect } from 'effect';
 *
 * const program = Effect.gen(function* () {
 *   yield* Effect.log('Hello from powertools!');
 *   return 'success';
 * });
 *
 * await Effect.runPromise(
 *   program.pipe(Effect.provide(developmentPowertoolsLayer()))
 * );
 * ```
 *
 * ## ManagedRuntime API (Convenience)
 *
 * Use runtime wrappers for simpler API:
 *
 * ```typescript
 * import { createDevelopmentRuntime } from '@udmada/finance-powertools';
 *
 * const runtime = createDevelopmentRuntime();
 * const result = await runtime.runPromise(program);
 * ```
 *
 * ## One-Liner API (AWS Powertools Style)
 *
 * Quick wrapper for simple cases:
 *
 * ```typescript
 * import { withPowertools } from '@udmada/finance-powertools';
 *
 * const result = await withPowertools(program);
 * ```
 */

// Primary Layer API
export * from "./layers.js";

// Convenience ManagedRuntime API
export * from "./managed.js";

// Low-level runtime internals (for advanced use)
export * from "./runtime/index.js";

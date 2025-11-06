/**
 * ManagedRuntime Wrappers
 *
 * Convenience API for creating Effect runtimes with powertools layers.
 * This is syntactic sugar over the Layer-based API.
 */

import { Effect, Layer, ManagedRuntime } from "effect";

import {
  customPowertoolsLayer,
  developmentPowertoolsLayer,
  productionPowertoolsLayer,
  type DevelopmentPowertoolsOptions,
  type ProductionPowertoolsOptions,
} from "./layers.js";

/**
 * Runtime with powertools layers applied
 */
export type PowertoolsRuntime = ManagedRuntime.ManagedRuntime<never, never>;

/**
 * Create development runtime with powertools
 *
 * @example
 * ```typescript
 * import { createDevelopmentRuntime } from '@udmada/finance-powertools';
 *
 * const runtime = createDevelopmentRuntime({
 *   observability: { structured: true, metricsIntervalMs: 5000 },
 *   idempotency: { ttlMs: 300_000 }
 * });
 *
 * const result = await runtime.runPromise(myEffect);
 * ```
 */
export const createDevelopmentRuntime = (
  options?: DevelopmentPowertoolsOptions,
): PowertoolsRuntime => {
  const layer = developmentPowertoolsLayer(options);
  return ManagedRuntime.make(layer);
};

/**
 * Create production runtime with powertools
 *
 * @example
 * ```typescript
 * import { createProductionRuntime } from '@udmada/finance-powertools';
 *
 * const runtime = createProductionRuntime({
 *   observability: {
 *     tracerConfig: {
 *       serviceName: 'my-service',
 *       endpoint: process.env.OTEL_ENDPOINT!,
 *     },
 *   },
 * });
 *
 * const result = await runtime.runPromise(myEffect);
 * ```
 */
export const createProductionRuntime = (
  options: ProductionPowertoolsOptions,
): PowertoolsRuntime => {
  const layer = productionPowertoolsLayer(options);
  return ManagedRuntime.make(layer);
};

/**
 * Create custom runtime from individual layers
 *
 * @example
 * ```typescript
 * import { createCustomRuntime, consoleLoggerLayer, nativeTracerLayer, noOpIdempotencyLayer } from '@udmada/finance-powertools';
 * import { Layer } from 'effect';
 *
 * const runtime = createCustomRuntime(
 *   Layer.mergeAll(consoleLoggerLayer(), nativeTracerLayer()),
 *   noOpIdempotencyLayer
 * );
 * ```
 */
export const createCustomRuntime = (
  observabilityLayer: Layer.Layer<never>,
  idempotencyLayer: Layer.Layer<never>,
  extraLayers?: Layer.Layer<never>,
): PowertoolsRuntime => {
  const layer = customPowertoolsLayer(observabilityLayer, idempotencyLayer, extraLayers);
  return ManagedRuntime.make(layer);
};

/**
 * Run an Effect with a powertools runtime
 *
 * @example
 * ```typescript
 * const runtime = createDevelopmentRuntime();
 * const result = await runWithPowertools(runtime, myEffect);
 * ```
 */
export const runWithPowertools = <A>(
  runtime: PowertoolsRuntime,
  effect: Effect.Effect<A>,
): Promise<A> => runtime.runPromise(effect);

/**
 * Convenience wrapper that applies powertools to an effect
 *
 * @example
 * ```typescript
 * import { withPowertools } from '@udmada/finance-powertools';
 *
 * const result = await withPowertools(
 *   myEffect,
 *   { observability: { structured: true } }
 * );
 * ```
 */
export const withPowertools = <A>(
  effect: Effect.Effect<A>,
  options?: DevelopmentPowertoolsOptions,
): Promise<A> => {
  const layer = developmentPowertoolsLayer(options);
  return Effect.runPromise(effect.pipe(Effect.provide(layer)));
};

/**
 * Production version of withPowertools
 *
 * @example
 * ```typescript
 * import { withProductionPowertools } from '@udmada/finance-powertools';
 *
 * const result = await withProductionPowertools(
 *   myEffect,
 *   {
 *     observability: {
 *       tracerConfig: { serviceName: 'my-service', endpoint: otelEndpoint },
 *     },
 *   }
 * );
 * ```
 */
export const withProductionPowertools = <A>(
  effect: Effect.Effect<A>,
  options: ProductionPowertoolsOptions,
): Promise<A> => {
  const layer = productionPowertoolsLayer(options);
  return Effect.runPromise(effect.pipe(Effect.provide(layer)));
};

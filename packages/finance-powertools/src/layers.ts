/**
 * Powertools Layer Builders
 *
 * Primary API for composing observability and resilience layers.
 * Follows Effect's Layer pattern for dependency injection.
 */

import { Layer } from "effect";

import {
  developmentObservabilityLayer,
  type DevelopmentObservabilityOptions,
  productionObservabilityLayer,
  type ProductionObservabilityOptions,
} from "./runtime/observability/layers.js";
import {
  Idempotency,
  inMemoryIdempotencyLayer,
  type InMemoryIdempotencyOptions,
  noOpIdempotencyLayer,
} from "./runtime/resilience/idempotency.js";

/**
 * Development powertools configuration
 */
export interface DevelopmentPowertoolsOptions {
  readonly observability?: DevelopmentObservabilityOptions;
  readonly idempotency?: InMemoryIdempotencyOptions;
  readonly extraLayers?: Layer.Layer<never>;
}

/**
 * Production powertools configuration
 */
export interface ProductionPowertoolsOptions {
  readonly observability: ProductionObservabilityOptions;
  readonly idempotencyLayer?: Layer.Layer<never>;
  readonly extraLayers?: Layer.Layer<never>;
}

/**
 * Development powertools layer
 *
 * Provides console-based logging, native tracing, console metrics, and in-memory idempotency.
 *
 * @example
 * ```typescript
 * import { developmentPowertoolsLayer } from '@udmada/finance-powertools';
 * import { Effect } from 'effect';
 *
 * const program = Effect.gen(function* () {
 *   yield* Effect.log('Hello world');
 * });
 *
 * await Effect.runPromise(
 *   program.pipe(Effect.provide(developmentPowertoolsLayer()))
 * );
 * ```
 */
export const developmentPowertoolsLayer = (
  options?: DevelopmentPowertoolsOptions,
): Layer.Layer<never> => {
  const observabilityLayer = developmentObservabilityLayer(options?.observability);
  const idempotencyLayer = inMemoryIdempotencyLayer(options?.idempotency);

  if (options?.extraLayers) {
    return Layer.mergeAll(observabilityLayer, idempotencyLayer, options.extraLayers);
  }

  return Layer.mergeAll(observabilityLayer, idempotencyLayer);
};

/**
 * Production powertools layer
 *
 * Provides structured logging, OTEL tracing, and configurable idempotency.
 *
 * @example
 * ```typescript
 * import { productionPowertoolsLayer } from '@udmada/finance-powertools';
 * import { Effect } from 'effect';
 *
 * const program = Effect.gen(function* () {
 *   yield* Effect.log('Hello world');
 * });
 *
 * await Effect.runPromise(
 *   program.pipe(
 *     Effect.provide(
 *       productionPowertoolsLayer({
 *         observability: {
 *           tracerConfig: {
 *             serviceName: 'my-service',
 *             endpoint: 'http://localhost:4318/v1/traces',
 *           },
 *         },
 *       })
 *     )
 *   )
 * );
 * ```
 */
export const productionPowertoolsLayer = (
  options: ProductionPowertoolsOptions,
): Layer.Layer<never> => {
  const observabilityLayer = productionObservabilityLayer(options.observability);
  const idempotencyLayer = options.idempotencyLayer ?? noOpIdempotencyLayer;

  if (options.extraLayers) {
    return Layer.mergeAll(observabilityLayer, idempotencyLayer, options.extraLayers);
  }

  return Layer.mergeAll(observabilityLayer, idempotencyLayer);
};

/**
 * Custom powertools layer
 *
 * Build a layer from individual observability and resilience layers.
 *
 * @example
 * ```typescript
 * import { customPowertoolsLayer } from '@udmada/finance-powertools';
 * import { consoleLoggerLayer, nativeTracerLayer } from '@udmada/finance-powertools';
 * import { Layer } from 'effect';
 *
 * const myLayer = customPowertoolsLayer(
 *   Layer.mergeAll(consoleLoggerLayer(), nativeTracerLayer()),
 *   noOpIdempotencyLayer
 * );
 * ```
 */
export const customPowertoolsLayer = (
  observabilityLayer: Layer.Layer<never>,
  idempotencyLayer: Layer.Layer<never>,
  extraLayers?: Layer.Layer<never>,
): Layer.Layer<never> => {
  if (extraLayers) {
    return Layer.mergeAll(observabilityLayer, idempotencyLayer, extraLayers);
  }

  return Layer.mergeAll(observabilityLayer, idempotencyLayer);
};

/**
 * Re-export idempotency tag for consumers
 */
export const idempotencyTag = Idempotency;

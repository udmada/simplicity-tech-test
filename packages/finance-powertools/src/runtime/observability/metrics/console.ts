import { Effect, Layer, Metric } from "effect";
import type * as MetricPair from "effect/MetricPair";
import * as MetricState from "effect/MetricState";

export interface ConsoleMetricsOptions {
  readonly intervalMs?: number;
}

const formatMetricPair = (pair: MetricPair.MetricPair.Untyped): Record<string, unknown> => {
  const { metricKey, metricState } = pair;
  const tags = Object.fromEntries((metricKey.tags ?? []).map((label) => [label.key, label.value]));
  const base = {
    name: metricKey.name,
    tags,
  };

  if (MetricState.isCounterState(metricState)) {
    return {
      ...base,
      type: "counter",
      value: metricState.count,
    };
  }

  if (MetricState.isGaugeState(metricState)) {
    return {
      ...base,
      type: "gauge",
      value: metricState.value,
    };
  }

  if (MetricState.isFrequencyState(metricState)) {
    return {
      ...base,
      type: "frequency",
      occurrences: Object.fromEntries(metricState.occurrences),
    };
  }

  if (MetricState.isHistogramState(metricState)) {
    return {
      ...base,
      type: "histogram",
      count: metricState.count,
      min: metricState.min,
      max: metricState.max,
      sum: metricState.sum,
      buckets: metricState.buckets,
    };
  }

  if (MetricState.isSummaryState(metricState)) {
    return {
      ...base,
      type: "summary",
      count: metricState.count,
      min: metricState.min,
      max: metricState.max,
      sum: metricState.sum,
      error: metricState.error,
      quantiles: metricState.quantiles,
    };
  }

  return {
    ...base,
    type: "unknown",
    state: metricState,
  };
};

/**
 * Periodically snapshots Effect's global metric registry and prints the values to console.
 */
export const consoleMetricsLayer = (options?: ConsoleMetricsOptions) =>
  Layer.scopedDiscard(
    Effect.acquireRelease(
      Effect.sync(() => {
        const intervalMs = options?.intervalMs ?? 10_000;
        const timer = setInterval(() => {
          const snapshot = Metric.globalMetricRegistry.snapshot();
          if (snapshot.length === 0) {
            return;
          }

          const payload = snapshot.map(formatMetricPair);
          console.log("[METRICS]", JSON.stringify(payload));
        }, intervalMs);

        return timer;
      }),
      (timer) =>
        Effect.sync(() => {
          clearInterval(timer);
        }),
    ),
  );

/**
 * Creates a layer that forwards metric snapshots to a custom handler.
 */
export const createMetricsObserverLayer = (
  handler: (metrics: ReadonlyArray<MetricPair.MetricPair.Untyped>) => void,
  options?: ConsoleMetricsOptions,
) =>
  Layer.scopedDiscard(
    Effect.acquireRelease(
      Effect.sync(() => {
        const intervalMs = options?.intervalMs ?? 10_000;
        const timer = setInterval(() => {
          const snapshot = Metric.globalMetricRegistry.snapshot();
          handler(snapshot);
        }, intervalMs);
        return timer;
      }),
      (timer) =>
        Effect.sync(() => {
          clearInterval(timer);
        }),
    ),
  );

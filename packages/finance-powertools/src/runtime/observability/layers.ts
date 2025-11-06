import { Layer } from "effect";
import { consoleLoggerLayer, structuredConsoleLoggerLayer } from "./logger";
import { consoleMetricsLayer, createMetricsObserverLayer } from "./metrics";
import { nativeTracerLayer, otelTracerLayer, type OtelTracerLayerConfig } from "./tracing";

export interface DevelopmentObservabilityOptions {
  readonly metricsIntervalMs?: number;
  readonly structured?: boolean;
}

export const developmentObservabilityLayer = (options?: DevelopmentObservabilityOptions) => {
  const loggerLayer = options?.structured ? structuredConsoleLoggerLayer() : consoleLoggerLayer();
  const metricsLayer =
    options?.metricsIntervalMs !== undefined
      ? consoleMetricsLayer({ intervalMs: options.metricsIntervalMs })
      : consoleMetricsLayer();

  return Layer.mergeAll(loggerLayer, nativeTracerLayer(), metricsLayer);
};

export interface ProductionObservabilityOptions {
  readonly loggerLayer?: Layer.Layer<never>;
  readonly tracerConfig: OtelTracerLayerConfig;
  readonly metricsLayer?: Layer.Layer<never>;
}

export const productionObservabilityLayer = (options: ProductionObservabilityOptions) => {
  const loggerLayer = options.loggerLayer ?? structuredConsoleLoggerLayer();
  const tracerLayer = otelTracerLayer(options.tracerConfig);
  const metricsLayer = options.metricsLayer ?? createMetricsObserverLayer(() => {});

  return Layer.mergeAll(loggerLayer, tracerLayer, metricsLayer);
};

import { Context, Effect, Layer, Tracer } from "effect";
import type { Span, SpanKind, SpanLink, SpanStatus } from "effect/Tracer";

export interface OtelSpanLike {
  end(endTime?: number): void;
  recordException(error: unknown): void;
  setAttribute(key: string, value: unknown): void;
  addEvent(name: string, attributes?: Record<string, unknown>, startTime?: number): void;
  spanContext(): { spanId: string; traceId: string };
  addLink?(
    context: { traceId: string; spanId: string },
    attributes?: Record<string, unknown>,
  ): void;
}

export interface OtelTracerLike {
  startSpan(
    name: string,
    options?: {
      readonly startTime?: number;
      readonly kind?: SpanKind;
      readonly attributes?: Record<string, unknown>;
      readonly links?: ReadonlyArray<{
        context: { traceId: string; spanId: string };
        attributes?: Record<string, unknown>;
      }>;
    },
  ): OtelSpanLike;
}

export interface OtelTracerLayerConfig {
  readonly serviceName: string;
  readonly getTracer: (serviceName: string) => OtelTracerLike;
}

const toEpochMillis = (value: bigint) => Number(value) / 1_000_000;

const toLinkContext = (link: SpanLink) => {
  const span = link.span;
  if (span._tag === "ExternalSpan") {
    return { traceId: span.traceId, spanId: span.spanId };
  }
  return { traceId: span.traceId, spanId: span.spanId };
};

/**
 * Layer bridging Effect tracer signals to an OpenTelemetry tracer instance.
 * Consumers supply their configured OTEL tracer via `getTracer`.
 */
export const otelTracerLayer = (config: OtelTracerLayerConfig) =>
  Layer.effect(
    Tracer.Tracer,
    Effect.sync(() => {
      const tracer = config.getTracer(config.serviceName);

      return Tracer.make({
        span: (
          name: string,
          parent,
          context: Context.Context<never>,
          links,
          startTime,
          kind: SpanKind,
        ): Span => {
          const otelLinks = links.map((link) => ({
            context: toLinkContext(link),
            attributes: link.attributes,
          }));

          const otelSpan = tracer.startSpan(name, {
            startTime: toEpochMillis(startTime),
            kind,
            links: otelLinks,
          });

          const spanContext = otelSpan.spanContext();
          const attributes = new Map<string, unknown>();
          const collectedLinks = [...links];
          const status: SpanStatus = { _tag: "Started", startTime };

          const span: Span = {
            _tag: "Span",
            name,
            spanId: spanContext.spanId,
            traceId: spanContext.traceId,
            parent,
            context,
            status,
            attributes,
            links: collectedLinks,
            sampled: true,
            kind: kind ?? "internal",
            end: (endTime, exit) => {
              if (exit._tag === "Failure") {
                otelSpan.recordException(exit.cause);
              }
              otelSpan.end(toEpochMillis(endTime));
            },
            attribute: (key, value) => {
              attributes.set(key, value);
              otelSpan.setAttribute(key, value);
            },
            event: (eventName, eventStart, eventAttributes) => {
              otelSpan.addEvent(eventName, eventAttributes, toEpochMillis(eventStart));
            },
            addLinks: (newLinks) => {
              for (const link of newLinks) {
                collectedLinks.push(link);
                if (otelSpan.addLink) {
                  otelSpan.addLink(toLinkContext(link), link.attributes);
                }
              }
            },
          };

          return span;
        },
        context: (f) => f(),
      });
    }),
  );

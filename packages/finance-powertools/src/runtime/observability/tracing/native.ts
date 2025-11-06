import { randomBytes } from "node:crypto";

import { Context, Layer, Option, Tracer } from "effect";
import type { Span, SpanKind, SpanLink } from "effect/Tracer";

const randomHex = (bytes: number) => randomBytes(bytes).toString("hex");

const randomTraceId = () => randomHex(16);
const randomSpanId = () => randomHex(8);

/**
 * Lightweight tracer implementation that stores span data in memory and logs lifecycle events.
 * Useful for local development and as a base tracer when no third-party provider is configured.
 */
export const nativeTracerLayer = () =>
  Layer.succeed(
    Tracer.Tracer,
    Tracer.make({
      span: (
        name: string,
        parent: Option.Option<Tracer.AnySpan>,
        context: Context.Context<never>,
        links: ReadonlyArray<SpanLink>,
        startTime: bigint,
        kind: SpanKind,
      ): Span => {
        const spanId = randomSpanId();
        const traceId = parent._tag === "Some" ? parent.value.traceId : randomTraceId();
        const attributes = new Map<string, unknown>();
        const collectedLinks = [...links];
        const status: Span["status"] = { _tag: "Started", startTime };

        console.log(
          `[TRACE] start ${name} trace=${traceId} span=${spanId} kind=${kind ?? "internal"}`,
        );

        const span: Span = {
          _tag: "Span",
          name,
          spanId,
          traceId,
          parent,
          context,
          status,
          attributes,
          links: collectedLinks,
          sampled: true,
          kind: kind ?? "internal",
          end: (_endTime, exit) => {
            console.log(`[TRACE] end ${name} trace=${traceId} span=${spanId} outcome=${exit._tag}`);
          },
          attribute: (key, value) => {
            attributes.set(key, value);
            console.log(`[TRACE] attr span=${spanId} ${key}=${JSON.stringify(value)}`);
          },
          event: (eventName, eventStart, eventAttributes) => {
            console.log(
              `[TRACE] event span=${spanId} name=${eventName} at=${eventStart.toString()} data=${JSON.stringify(
                eventAttributes ?? {},
              )}`,
            );
          },
          addLinks: (newLinks) => {
            collectedLinks.push(...newLinks);
          },
        };

        return span;
      },
      context: (f) => f(),
    }),
  );

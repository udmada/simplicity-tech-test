/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Context, Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";

import {
  customPowertoolsLayer,
  developmentPowertoolsLayer,
  productionPowertoolsLayer,
} from "../src/layers";
import { Idempotency, inMemoryIdempotencyLayer } from "../src/runtime/resilience/idempotency";

const TestTag = Context.GenericTag<string>("powertools/TestExtra");

const withRuntime = async <A>(layer: Layer.Layer<never>, effect: Effect.Effect<A>) => {
  const runtime = ManagedRuntime.make(layer as any);
  try {
    return await runtime.runPromise(effect as any);
  } finally {
    await runtime.dispose();
  }
};

describe("developmentPowertoolsLayer", () => {
  it("exposes idempotency service", async () => {
    const { first, second } = await withRuntime(
      developmentPowertoolsLayer(),
      Effect.gen(function* (_) {
        const service = yield* _(Idempotency);
        const first = yield* _(service.execute("dev-key", Effect.succeed(1)));
        const second = yield* _(service.execute("dev-key", Effect.succeed(2)));
        return { first, second };
      }),
    );

    expect(first).toBe(1);
    expect(second).toBe(1);
  });

  it("merges extra layers", async () => {
    const value = await withRuntime(
      developmentPowertoolsLayer({ extraLayers: Layer.succeed(TestTag, "extra") }),
      TestTag,
    );

    expect(value).toBe("extra");
  });
});

describe("productionPowertoolsLayer", () => {
  it("supports custom tracer and idempotency layers", async () => {
    const tracerStub = {
      startSpan: () => ({
        end: () => {},
        recordException: () => {},
        setAttribute: () => {},
        addEvent: () => {},
        spanContext: () => ({ spanId: "span", traceId: "trace" }),
        addLink: () => {},
      }),
    };

    const layer = productionPowertoolsLayer({
      observability: {
        tracerConfig: {
          serviceName: "test-service",
          getTracer: () => tracerStub,
        },
      },
      idempotencyLayer: inMemoryIdempotencyLayer(),
      extraLayers: Layer.succeed(TestTag, "prod-extra"),
    });

    const { extra, result } = await withRuntime(
      layer,
      Effect.gen(function* (_) {
        const service = yield* _(Idempotency);
        const extra = yield* _(TestTag);
        const result = yield* _(service.execute("prod-key", Effect.succeed("ok")));
        return { extra, result };
      }),
    );

    expect(extra).toBe("prod-extra");
    expect(result).toBe("ok");
  });
});

describe("customPowertoolsLayer", () => {
  it("composes observability and idempotency layers", async () => {
    const layer = customPowertoolsLayer(
      Layer.succeed(TestTag, "custom-extra"),
      inMemoryIdempotencyLayer(),
    );

    const value = await withRuntime(
      layer,
      Effect.gen(function* (_) {
        const service = yield* _(Idempotency);
        yield* _(service.execute("custom", Effect.void));
        return yield* _(TestTag);
      }),
    );

    expect(value).toBe("custom-extra");
  });
});

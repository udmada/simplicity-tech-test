import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  createCustomRuntime,
  createDevelopmentRuntime,
  withPowertools,
  withProductionPowertools,
} from "../src/managed";
import { inMemoryIdempotencyLayer } from "../src/runtime/resilience/idempotency";

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

describe("managed runtime helpers", () => {
  it("createDevelopmentRuntime runs effects", async () => {
    const runtime = createDevelopmentRuntime();

    const result = await runtime.runPromise(Effect.succeed("ok"));

    expect(result).toBe("ok");
  });

  it("createCustomRuntime composes provided layers", async () => {
    const runtime = createCustomRuntime(
      Layer.empty,
      inMemoryIdempotencyLayer(),
    );

    const result = await runtime.runPromise(Effect.succeed("custom-ok"));

    expect(result).toBe("custom-ok");
  });

  it("withPowertools yields effect result", async () => {
    const result = await withPowertools(Effect.succeed(42));

    expect(result).toBe(42);
  });

  it("withProductionPowertools supports custom tracer config", async () => {
    const result = await withProductionPowertools(Effect.succeed("prod"), {
      observability: {
        tracerConfig: {
          serviceName: "test-service",
          getTracer: () => tracerStub,
        },
      },
      idempotencyLayer: inMemoryIdempotencyLayer(),
    });

    expect(result).toBe("prod");
  });
});

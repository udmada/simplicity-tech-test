/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Effect, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";

import {
  Idempotency,
  inMemoryIdempotencyLayer,
  noOpIdempotencyLayer,
} from "../src/runtime/resilience/idempotency";

const withRuntime = async <A>(layer: Layer.Layer<never>, effect: Effect.Effect<A>) => {
  const runtime = ManagedRuntime.make(layer as any);
  try {
    return await runtime.runPromise(effect as any);
  } finally {
    await runtime.dispose();
  }
};

describe("inMemoryIdempotencyLayer", () => {
  it("caches successful results", async () => {
    let calls = 0;

    const program = Effect.gen(function* (_) {
      const service = yield* _(Idempotency);
      const first = yield* _(service.execute("key-1", Effect.sync(() => ++calls)));
      const second = yield* _(service.execute("key-1", Effect.sync(() => ++calls)));
      return { first, second };
    });

    const { first, second } = await withRuntime(inMemoryIdempotencyLayer(), program);

    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(calls).toBe(1);
  });

  it("clears cached entries", async () => {
    let calls = 0;

    const program = Effect.gen(function* (_) {
      const service = yield* _(Idempotency);
      const first = yield* _(service.execute("key-1", Effect.sync(() => ++calls)));
      yield* _(service.clear("key-1"));
      const second = yield* _(service.execute("key-1", Effect.sync(() => ++calls)));
      return { first, second };
    });

    const { first, second } = await withRuntime(inMemoryIdempotencyLayer(), program);

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(calls).toBe(2);
  });
});

describe("noOpIdempotencyLayer", () => {
  it("executes effects every time", async () => {
    let calls = 0;

    const program = Effect.gen(function* (_) {
      const service = yield* _(Idempotency);
      yield* _(service.execute("key-1", Effect.sync(() => ++calls)));
      yield* _(service.execute("key-1", Effect.sync(() => ++calls)));
      return calls;
    });

    const result = await withRuntime(noOpIdempotencyLayer, program);

    expect(result).toBe(2);
  });
});

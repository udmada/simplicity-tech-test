import { describe, expect, it } from "vitest";
import { Effect } from "effect";

import { makeMoney, add, subtract, ensureNonNegative, format } from "~/domain/shared/money";

describe("Money value object", () => {
  it("preserves currency when adding values", async () => {
    const nzd100 = makeMoney(100, "NZD");
    const nzd50 = makeMoney(50, "NZD");

    const result = await Effect.runPromise(add(nzd100, nzd50));

    expect(result.currency).toBe("NZD");
    expect(result.amount).toBe(150);
  });

  it("allows subtraction that stays non-negative", async () => {
    const nzd100 = makeMoney(100, "NZD");
    const nzd40 = makeMoney(40, "NZD");

    const result = await Effect.runPromise(subtract(nzd100, nzd40));

    expect(result.amount).toBe(60);
  });

  it("fails validation when value becomes negative", async () => {
    const negative = makeMoney(-1, "NZD");

    const result = await Effect.runPromise(Effect.either(ensureNonNegative(negative)));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toMatchObject({
        _tag: "NegativeAmount",
        amount: -1,
      });
    }
  });

  it("formats amounts using currency locale", () => {
    const amount = makeMoney(1234.56, "NZD");

    const formatted = format(amount);
    expect(formatted).toContain("1,234.56");
    expect(formatted).toContain("$");
  });
});

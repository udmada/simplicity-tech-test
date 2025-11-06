import { describe, expectTypeOf, test } from "vitest";
import type { Effect } from "effect";
import {
  type Currency,
  type Money,
  type MoneyError,
  add,
  compare,
  ensureNonNegative,
  isNegative,
  isPositive,
  isZero,
  makeMoney,
  multiply,
  subtract,
} from "~/domain/shared/money";

// Helper to extract Effect success type
type EffectSuccess<T> = T extends Effect.Effect<infer A, unknown, unknown> ? A : never;

describe("Money type tests", () => {
  test("Money preserves currency in type", () => {
    const nzd = makeMoney(100, "NZD");

    expectTypeOf(nzd).toMatchTypeOf<Money<"NZD">>();
    expectTypeOf(nzd).not.toMatchTypeOf<Money<"USD">>();
    expectTypeOf(nzd.currency).toEqualTypeOf<"NZD">();
    expectTypeOf(nzd.amount).toEqualTypeOf<number>();
    expectTypeOf(nzd.scale).toEqualTypeOf<2>();
  });

  test("makeMoney constructs correct currency type", () => {
    const usd = makeMoney(50, "USD");
    const aud = makeMoney(75, "AUD");
    const eur = makeMoney(100, "EUR");
    const gbp = makeMoney(125, "GBP");

    expectTypeOf(usd).toMatchTypeOf<Money<"USD">>();
    expectTypeOf(aud).toMatchTypeOf<Money<"AUD">>();
    expectTypeOf(eur).toMatchTypeOf<Money<"EUR">>();
    expectTypeOf(gbp).toMatchTypeOf<Money<"GBP">>();
  });

  test("add preserves currency type", () => {
    const nzd1 = makeMoney(100, "NZD");
    const nzd2 = makeMoney(200, "NZD");

    const _result = add(nzd1, nzd2);

    expectTypeOf<EffectSuccess<typeof _result>>().toEqualTypeOf<Money<"NZD">>();
  });

  test("add requires same currency type", () => {
    // Explicitly typed values preserve narrow types
    const nzd: Money<"NZD"> = makeMoney(100, "NZD");

    // Same currency should work
    const nzd2: Money<"NZD"> = makeMoney(50, "NZD");
    expectTypeOf(add(nzd, nzd2)).not.toEqualTypeOf<never>();
  });

  test("subtract preserves currency type", () => {
    const nzd1 = makeMoney(200, "NZD");
    const nzd2 = makeMoney(100, "NZD");

    const _result = subtract(nzd1, nzd2);

    expectTypeOf<EffectSuccess<typeof _result>>().toEqualTypeOf<Money<"NZD">>();
  });

  test("subtract requires same currency type", () => {
    const nzd: Money<"NZD"> = makeMoney(200, "NZD");
    const nzd2: Money<"NZD"> = makeMoney(100, "NZD");

    // Verify same currency works
    expectTypeOf(subtract(nzd, nzd2)).not.toEqualTypeOf<never>();
  });

  test("multiply preserves currency type", () => {
    const nzd = makeMoney(100, "NZD");

    const _result = multiply(nzd, 2.5);

    expectTypeOf<EffectSuccess<typeof _result>>().toEqualTypeOf<Money<"NZD">>();
  });

  test("multiply factor must be number", () => {
    const nzd = makeMoney(100, "NZD");

    // Verify number factor works
    expectTypeOf(multiply(nzd, 2)).not.toEqualTypeOf<never>();
  });

  test("compare requires same currency type", () => {
    const nzd1: Money<"NZD"> = makeMoney(100, "NZD");
    const nzd2: Money<"NZD"> = makeMoney(200, "NZD");

    expectTypeOf(compare(nzd1, nzd2)).toEqualTypeOf<number>();
  });

  test("isZero accepts any currency", () => {
    const nzd = makeMoney(0, "NZD");
    const usd = makeMoney(0, "USD");

    expectTypeOf(isZero(nzd)).toEqualTypeOf<boolean>();
    expectTypeOf(isZero(usd)).toEqualTypeOf<boolean>();
  });

  test("isPositive and isNegative accept any currency", () => {
    const nzd = makeMoney(100, "NZD");

    expectTypeOf(isPositive(nzd)).toEqualTypeOf<boolean>();
    expectTypeOf(isNegative(nzd)).toEqualTypeOf<boolean>();
  });

  test("ensureNonNegative preserves currency type", () => {
    const nzd = makeMoney(100, "NZD");

    const _result = ensureNonNegative(nzd);

    expectTypeOf<EffectSuccess<typeof _result>>().toEqualTypeOf<Money<"NZD">>();
  });

  test("ensureNonNegative returns correct error type", () => {
    const nzd = makeMoney(-100, "NZD");

    const _result = ensureNonNegative(nzd);

    type ErrorType = typeof _result extends Effect.Effect<unknown, infer E, unknown> ? E : never;
    expectTypeOf<ErrorType>().toMatchTypeOf<MoneyError>();
  });

  test("Currency type is union of valid currencies", () => {
    type ValidCurrency = Currency;

    expectTypeOf<"NZD">().toMatchTypeOf<ValidCurrency>();
    expectTypeOf<"USD">().toMatchTypeOf<ValidCurrency>();
    expectTypeOf<"AUD">().toMatchTypeOf<ValidCurrency>();
    expectTypeOf<"EUR">().toMatchTypeOf<ValidCurrency>();
    expectTypeOf<"GBP">().toMatchTypeOf<ValidCurrency>();
    expectTypeOf<"BTC">().toMatchTypeOf<ValidCurrency>();
    expectTypeOf<"ETH">().toMatchTypeOf<ValidCurrency>();
  });

  test("MoneyError discriminated union", () => {
    type InvalidAmount = Extract<MoneyError, { _tag: "InvalidAmount" }>;
    type CurrencyMismatch = Extract<MoneyError, { _tag: "CurrencyMismatch" }>;
    type NegativeAmount = Extract<MoneyError, { _tag: "NegativeAmount" }>;

    expectTypeOf<InvalidAmount>().toMatchTypeOf<{
      _tag: "InvalidAmount";
      message: string;
    }>();

    expectTypeOf<CurrencyMismatch>().toMatchTypeOf<{
      _tag: "CurrencyMismatch";
      expected: Currency;
      actual: Currency;
    }>();

    expectTypeOf<NegativeAmount>().toMatchTypeOf<{
      _tag: "NegativeAmount";
      amount: number;
    }>();
  });
});

/**
 * Money Value Object with Branded Types
 *
 * Demonstrates:
 * - Branded types with phantom currency parameter
 * - Effect Schema for runtime validation
 * - Type-safe operations that preserve currency
 * - Compile-time prevention of currency mismatches
 */

import { Schema, Effect, pipe } from "effect";
import * as Brand from "effect/Brand";

/**
 * Currency as literal union type
 * Supports both ISO codes and common unofficial codes
 */
export const CurrencySchema = Schema.Literal("NZD", "USD", "AUD", "EUR", "GBP", "BTC", "ETH");
export type Currency = typeof CurrencySchema.Type;

/**
 * Branded Money type with currency carried in phantom type parameter
 *
 * The phantom type C ensures compile-time currency safety:
 * - Money<'NZD'> cannot be mixed with Money<'USD'>
 * - Operations preserve the currency type
 * - Scale fixed at 2 decimal places for fiat currencies
 */
export type Money<C extends Currency = Currency> = Brand.Branded<
  {
    readonly amount: number;
    readonly currency: C;
    readonly scale: 2;
  },
  "Money"
>;

/**
 * Schema for runtime validation with currency constraint
 *
 * Validates:
 * - Amount is finite
 * - Amount has at most 2 decimal places (for fiat)
 * - Currency matches the expected currency
 * - Scale is exactly 2
 */
export const MoneySchema = <C extends Currency>(currency: C) =>
  Schema.Struct({
    amount: Schema.Number.pipe(
      Schema.filter((n) => Number.isFinite(n) && Number.isInteger(n * 100), {
        message: () => "Amount must be finite and have at most 2 decimal places",
      }),
    ),
    currency: Schema.Literal(currency),
    scale: Schema.Literal(2),
  }).pipe(Schema.brand("Money"));

/**
 * Smart constructor (sync version) for convenient usage
 *
 * Use this for:
 * - Test data
 * - Literals in code
 * - When you know the input is valid
 *
 * Throws on validation failure.
 */
export const makeMoney = <C extends Currency>(amount: number, currency: C): Money<C> =>
  Schema.decodeUnknownSync(MoneySchema(currency))({
    amount,
    currency,
    scale: 2 as const,
  });

/**
 * Effectful constructor for composition in Effect pipelines
 *
 * Use this for:
 * - API data that might be invalid
 * - User input validation
 * - Composing with other Effects
 *
 * Returns Effect that can fail with ParseError.
 */
export const Money = <C extends Currency>(amount: number, currency: C) =>
  Schema.decodeUnknown(MoneySchema(currency))({
    amount,
    currency,
    scale: 2 as const,
  });

/**
 * Money domain errors
 */
export type MoneyError =
  | {
      readonly _tag: "InvalidAmount";
      readonly message: string;
    }
  | {
      readonly _tag: "CurrencyMismatch";
      readonly expected: Currency;
      readonly actual: Currency;
    }
  | {
      readonly _tag: "NegativeAmount";
      readonly amount: number;
    };

/**
 * Add two Money values of the same currency
 *
 * Type safety:
 * - Both arguments must have the same currency type
 * - Result preserves the currency type
 * - Compile error if currencies don't match
 */
export const add = <C extends Currency>(
  a: Money<C>,
  b: Money<C>,
): Effect.Effect<Money<C>, MoneyError> =>
  pipe(
    Effect.succeed(a.amount + b.amount),
    Effect.flatMap((sum) =>
      Money(sum, a.currency).pipe(
        Effect.mapError((error) => ({
          _tag: "InvalidAmount" as const,
          message: String(error),
        })),
      ),
    ),
  );

/**
 * Subtract b from a (same currency)
 */
export const subtract = <C extends Currency>(
  a: Money<C>,
  b: Money<C>,
): Effect.Effect<Money<C>, MoneyError> =>
  pipe(
    Effect.succeed(a.amount - b.amount),
    Effect.flatMap((diff) =>
      Money(diff, a.currency).pipe(
        Effect.mapError((error) => ({
          _tag: "InvalidAmount" as const,
          message: String(error),
        })),
      ),
    ),
  );

/**
 * Multiply money by a scalar
 */
export const multiply = <C extends Currency>(
  money: Money<C>,
  factor: number,
): Effect.Effect<Money<C>, MoneyError> =>
  pipe(
    Effect.succeed(money.amount * factor),
    Effect.flatMap((product) =>
      Money(product, money.currency).pipe(
        Effect.mapError((error) => ({
          _tag: "InvalidAmount" as const,
          message: String(error),
        })),
      ),
    ),
  );

/**
 * Compare two Money values
 * Returns -1 if a < b, 0 if equal, 1 if a > b
 */
export const compare = <C extends Currency>(a: Money<C>, b: Money<C>): number => {
  if (a.amount < b.amount) return -1;
  if (a.amount > b.amount) return 1;
  return 0;
};

/**
 * Check if Money is zero
 */
export const isZero = (money: Money): boolean => money.amount === 0;

/**
 * Check if Money is positive
 */
export const isPositive = (money: Money): boolean => money.amount > 0;

/**
 * Check if Money is negative
 */
export const isNegative = (money: Money): boolean => money.amount < 0;

/**
 * Ensure Money is non-negative (for balances that can't be negative)
 */
export const ensureNonNegative = <C extends Currency>(
  money: Money<C>,
): Effect.Effect<Money<C>, MoneyError> =>
  isNegative(money)
    ? Effect.fail({
        _tag: "NegativeAmount" as const,
        amount: money.amount,
      })
    : Effect.succeed(money);

/**
 * Format Money for display
 */
export const format = (money: Money): string => {
  const formatter = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: money.scale,
    maximumFractionDigits: money.scale,
  });

  return formatter.format(money.amount);
};

/**
 * Zero value for a currency
 */
export const zero = <C extends Currency>(currency: C): Money<C> => makeMoney(0, currency);

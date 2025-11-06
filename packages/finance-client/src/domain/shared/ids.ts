/**
 * Branded ID types for type safety
 *
 * Prevents accidentally passing the wrong ID type:
 * - Can't pass TransactionId where AccountId is expected
 * - Can't pass raw string where branded ID is expected
 * - Compiler enforces correct usage
 */

import * as Brand from "effect/Brand";
import { Schema } from "effect";

/**
 * Account ID - opaque branded string
 */
export type AccountId = Brand.Branded<string, "AccountId">;

export const AccountIdSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Account ID cannot be empty" }),
  Schema.brand("AccountId"),
);

export const AccountId = (id: string): AccountId => Schema.decodeUnknownSync(AccountIdSchema)(id);

/**
 * Transaction ID - opaque branded string
 */
export type TransactionId = Brand.Branded<string, "TransactionId">;

export const TransactionIdSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Transaction ID cannot be empty" }),
  Schema.brand("TransactionId"),
);

export const TransactionId = (id: string): TransactionId =>
  Schema.decodeUnknownSync(TransactionIdSchema)(id);

/**
 * Item ID - represents a Plaid connection
 */
export type ItemId = Brand.Branded<string, "ItemId">;

export const ItemIdSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Item ID cannot be empty" }),
  Schema.brand("ItemId"),
);

export const ItemId = (id: string): ItemId => Schema.decodeUnknownSync(ItemIdSchema)(id);

/**
 * Institution ID - represents a financial institution
 */
export type InstitutionId = Brand.Branded<string, "InstitutionId">;

export const InstitutionIdSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Institution ID cannot be empty" }),
  Schema.brand("InstitutionId"),
);

export const InstitutionId = (id: string): InstitutionId =>
  Schema.decodeUnknownSync(InstitutionIdSchema)(id);

/**
 * Security ID - for investment holdings
 */
export type SecurityId = Brand.Branded<string, "SecurityId">;

export const SecurityIdSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Security ID cannot be empty" }),
  Schema.brand("SecurityId"),
);

export const SecurityId = (id: string): SecurityId =>
  Schema.decodeUnknownSync(SecurityIdSchema)(id);

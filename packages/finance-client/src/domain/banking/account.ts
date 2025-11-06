/**
 * Account Aggregate Root
 *
 * Demonstrates:
 * - DDD aggregate pattern with business rules
 * - State-dependent types (Account<'active'> vs Account<'frozen'>)
 * - Effect-based operations that can fail
 * - Type narrowing with refinement predicates
 */

import { Schema, Effect, pipe } from "effect";
import type { AccountId, InstitutionId, ItemId } from "../shared/ids.js";
import type { Money, Currency } from "../shared/money.js";
import { subtract, add, isNegative, ensureNonNegative, makeMoney } from "../shared/money.js";

/**
 * Account types and subtypes from Plaid
 */
export const AccountTypeSchema = Schema.Literal("depository", "credit", "loan", "investment");
export type AccountType = typeof AccountTypeSchema.Type;

export const AccountSubtypeSchema = Schema.Literal(
  // Depository
  "checking",
  "savings",
  "hsa",
  "cd",
  "money market",
  "cash management",
  // Credit
  "credit card",
  // Loan
  "mortgage",
  "student",
  // Investment
  "ira",
  "401k",
);
export type AccountSubtype = typeof AccountSubtypeSchema.Type;

/**
 * Account state lifecycle
 */
export const AccountStateSchema = Schema.Literal("active", "frozen", "closed");
export type AccountState = typeof AccountStateSchema.Type;

/**
 * Holder category - personal vs business
 */
export const HolderCategorySchema = Schema.Literal("personal", "business");
export type HolderCategory = typeof HolderCategorySchema.Type;

/**
 * Account aggregate with state-dependent type parameter
 *
 * Generic parameter S allows type narrowing:
 * - Account<'active'> - only active accounts
 * - Account<'frozen'> - only frozen accounts
 * - Account - any state
 */
export type Account<S extends AccountState = AccountState> = {
  readonly id: AccountId;
  readonly state: S;
  readonly type: AccountType;
  readonly subtype: AccountSubtype;
  readonly name: string;
  readonly officialName: string | null;
  readonly mask: string; // Last 4 digits
  readonly holderCategory: HolderCategory | null;

  // Balance semantics depend on account type:
  // - Depository: positive = money you have
  // - Credit: positive = money you owe
  // - Loan: positive = money you owe
  readonly currentBalance: Money;
  readonly availableBalance: Money | null; // Not all account types have available balance
  readonly creditLimit: Money | null; // Only for credit accounts

  // Plaid integration metadata
  readonly itemId: ItemId;
  readonly institutionId: InstitutionId;
  readonly institutionName: string;

  // Audit fields
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastSyncedAt: number | null;
};

/**
 * Type aliases for common states
 */
export type ActiveAccount = Account<"active">;
export type FrozenAccount = Account<"frozen">;
export type ClosedAccount = Account<"closed">;

/**
 * Type guards for state narrowing
 */
export const isActive = (account: Account): account is ActiveAccount => account.state === "active";

export const isFrozen = (account: Account): account is FrozenAccount => account.state === "frozen";

export const isClosed = (account: Account): account is ClosedAccount => account.state === "closed";

/**
 * Account errors
 */
export type AccountError =
  | {
      readonly _tag: "AccountNotActive";
      readonly accountId: AccountId;
      readonly currentState: AccountState;
    }
  | {
      readonly _tag: "InsufficientFunds";
      readonly accountId: AccountId;
      readonly available: Money;
      readonly requested: Money;
    }
  | {
      readonly _tag: "NegativeBalanceNotAllowed";
      readonly accountId: AccountId;
      readonly accountType: AccountType;
    }
  | {
      readonly _tag: "OperationNotSupported";
      readonly accountId: AccountId;
      readonly operation: string;
      readonly reason: string;
    };

/**
 * Business Rules
 */

/**
 * Check if account supports withdrawals
 */
const supportsWithdrawals = (account: Account): boolean => {
  return account.type === "depository" && account.subtype !== "cd";
};

/**
 * Check if account can have negative balance
 */
const canHaveNegativeBalance = (account: Account): boolean => {
  // Only credit and loan accounts can have "negative" balances
  // (though they're represented as positive amounts owed)
  return account.type === "credit" || account.type === "loan";
};

/**
 * Update account balance
 *
 * Business rules:
 * - Account must be active
 * - Balance must be non-negative for depository accounts
 * - Updates the lastSyncedAt timestamp
 */
export const updateBalance = <C extends Currency>(
  account: Account,
  newBalance: Money<C>,
): Effect.Effect<ActiveAccount, AccountError> =>
  pipe(
    // Ensure account is active
    Effect.succeed(account),
    Effect.filterOrFail(isActive, () => ({
      _tag: "AccountNotActive" as const,
      accountId: account.id,
      currentState: account.state,
    })),

    // Validate balance based on account type
    Effect.tap((activeAccount) =>
      !canHaveNegativeBalance(activeAccount) && isNegative(newBalance)
        ? Effect.fail({
            _tag: "NegativeBalanceNotAllowed" as const,
            accountId: activeAccount.id,
            accountType: activeAccount.type,
          })
        : Effect.succeed(undefined),
    ),

    // Update the balance
    Effect.map((activeAccount) => ({
      ...activeAccount,
      currentBalance: newBalance,
      updatedAt: Date.now(),
      lastSyncedAt: Date.now(),
    })),
  );

/**
 * Withdraw from account
 *
 * Business rules:
 * - Account must be active
 * - Account must support withdrawals
 * - Available balance must be sufficient
 * - New balance must be non-negative
 */
export const withdraw = <C extends Currency>(
  account: Account,
  amount: Money<C>,
): Effect.Effect<ActiveAccount, AccountError> =>
  pipe(
    // Ensure account is active
    Effect.succeed(account),
    Effect.filterOrFail(isActive, () => ({
      _tag: "AccountNotActive" as const,
      accountId: account.id,
      currentState: account.state,
    })),

    // Ensure account supports withdrawals
    Effect.filterOrFail(
      (activeAccount) => supportsWithdrawals(activeAccount),
      (activeAccount) => ({
        _tag: "OperationNotSupported" as const,
        accountId: activeAccount.id,
        operation: "withdraw",
        reason: `${activeAccount.type}/${activeAccount.subtype} accounts do not support withdrawals`,
      }),
    ),

    // Check available balance
    Effect.flatMap((activeAccount) => {
      const available = activeAccount.availableBalance ?? activeAccount.currentBalance;
      return pipe(
        subtract(available as Money<C>, amount),
        Effect.flatMap(ensureNonNegative),
        Effect.mapError(() => ({
          _tag: "InsufficientFunds" as const,
          accountId: activeAccount.id,
          available: available,
          requested: amount,
        })),
        Effect.flatMap((newBalance) => updateBalance(activeAccount, newBalance)),
      );
    }),
  );

/**
 * Deposit to account
 *
 * Business rules:
 * - Account must be active
 * - Amount must be positive
 */
export const deposit = <C extends Currency>(
  account: Account,
  amount: Money<C>,
): Effect.Effect<ActiveAccount, AccountError> =>
  pipe(
    // Ensure account is active
    Effect.succeed(account),
    Effect.filterOrFail(isActive, () => ({
      _tag: "AccountNotActive" as const,
      accountId: account.id,
      currentState: account.state,
    })),

    // Add to balance
    Effect.flatMap((activeAccount) =>
      pipe(
        add(activeAccount.currentBalance as Money<C>, amount),
        Effect.mapError(() => ({
          _tag: "OperationNotSupported" as const,
          accountId: activeAccount.id,
          operation: "deposit",
          reason: "Failed to add amounts",
        })),
        Effect.flatMap((newBalance) => updateBalance(activeAccount, newBalance)),
      ),
    ),
  );

/**
 * Freeze account (suspend operations)
 */
export const freeze = (account: Account): Effect.Effect<FrozenAccount, AccountError> =>
  pipe(
    Effect.succeed(account),
    Effect.filterOrFail(
      (acc) => acc.state === "active",
      (acc) => ({
        _tag: "OperationNotSupported" as const,
        accountId: acc.id,
        operation: "freeze",
        reason: `Cannot freeze account in ${acc.state} state`,
      }),
    ),
    Effect.map(
      (acc): FrozenAccount => ({
        ...acc,
        state: "frozen",
        updatedAt: Date.now(),
      }),
    ),
  );

/**
 * Unfreeze account (resume operations)
 */
export const unfreeze = (account: Account): Effect.Effect<ActiveAccount, AccountError> =>
  pipe(
    Effect.succeed(account),
    Effect.filterOrFail(
      (acc) => acc.state === "frozen",
      (acc) => ({
        _tag: "OperationNotSupported" as const,
        accountId: acc.id,
        operation: "unfreeze",
        reason: `Cannot unfreeze account in ${acc.state} state`,
      }),
    ),
    Effect.map(
      (acc): ActiveAccount => ({
        ...acc,
        state: "active",
        updatedAt: Date.now(),
      }),
    ),
  );

/**
 * Close account
 */
export const close = (account: Account): Effect.Effect<ClosedAccount, AccountError> =>
  pipe(
    Effect.succeed(account),
    Effect.filterOrFail(
      (acc) => acc.state !== "closed",
      (acc) => ({
        _tag: "OperationNotSupported" as const,
        accountId: acc.id,
        operation: "close",
        reason: "Account is already closed",
      }),
    ),
    Effect.map(
      (acc): ClosedAccount => ({
        ...acc,
        state: "closed",
        updatedAt: Date.now(),
      }),
    ),
  );

/**
 * Get effective balance for spending
 * - For depository: available balance if exists, otherwise current
 * - For credit: credit limit minus current balance
 * - For loan/investment: not applicable
 */
export const getSpendableBalance = (account: Account): Money | null => {
  switch (account.type) {
    case "depository":
      return account.availableBalance ?? account.currentBalance;
    case "credit":
      // credit limit - amount owed = available credit
      if (!account.creditLimit) {
        return null;
      }

      const available = account.creditLimit.amount - account.currentBalance.amount;
      const normalized = available >= 0 ? available : 0;

      return makeMoney(normalized, account.creditLimit.currency);
    case "loan":
    case "investment":
      return null;
  }
};

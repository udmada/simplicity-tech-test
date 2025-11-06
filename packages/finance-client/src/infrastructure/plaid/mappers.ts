import { Effect, pipe } from "effect";
import type { AccountBase, Transaction as PlaidTransaction } from "plaid";

import type {
  Account,
  AccountSubtype,
  AccountType,
  HolderCategory,
} from "../../domain/banking/account.js";
import {
  AccountId,
  type InstitutionId,
  type ItemId,
  TransactionId,
} from "../../domain/shared/ids.js";
import {
  Money,
  type Currency,
  type Money as MoneyValue,
} from "../../domain/shared/money.js";

export interface PlaidAccountContext {
  readonly itemId: ItemId;
  readonly institutionId: InstitutionId;
  readonly institutionName: string;
  readonly syncedAt?: number;
}

export type PlaidAccountMappingError =
  | {
      readonly _tag: "AccountMissingCurrency";
      readonly accountId: string;
    }
  | {
      readonly _tag: "AccountUnsupportedCurrency";
      readonly accountId: string;
      readonly currency: string;
    }
  | {
      readonly _tag: "AccountUnsupportedType";
      readonly accountId: string;
      readonly type: string | null | undefined;
    }
  | {
      readonly _tag: "AccountBalanceMissing";
      readonly accountId: string;
      readonly field: "current" | "available" | "limit";
    }
  | {
      readonly _tag: "AccountBalanceInvalid";
      readonly accountId: string;
      readonly field: "current" | "available" | "limit";
      readonly message: string;
    };

export type PlaidTransactionMappingError =
  | {
      readonly _tag: "TransactionMissingCurrency";
      readonly transactionId: string;
    }
  | {
      readonly _tag: "TransactionUnsupportedCurrency";
      readonly transactionId: string;
      readonly currency: string;
    }
  | {
      readonly _tag: "TransactionInvalidAmount";
      readonly transactionId: string;
      readonly message: string;
    };

export type PlaidMappingError =
  | PlaidAccountMappingError
  | PlaidTransactionMappingError;

export interface PlaidTransactionDomain {
  readonly id: ReturnType<typeof TransactionId>;
  readonly accountId: ReturnType<typeof AccountId>;
  readonly amount: MoneyValue;
  readonly name: string;
  readonly merchantName: string | null;
  readonly date: string;
  readonly pending: boolean;
  readonly category: ReadonlyArray<string>;
  readonly paymentChannel: PlaidTransaction["payment_channel"];
}

const SUPPORTED_CURRENCIES = new Set<Currency>([
  "NZD",
  "USD",
  "AUD",
  "EUR",
  "GBP",
  "BTC",
  "ETH",
]);

const SUPPORTED_ACCOUNT_TYPES = new Set<AccountType>([
  "depository",
  "credit",
  "loan",
  "investment",
]);

const SUPPORTED_ACCOUNT_SUBTYPES = new Set<AccountSubtype>([
  "checking",
  "savings",
  "hsa",
  "cd",
  "money market",
  "cash management",
  "credit card",
  "mortgage",
  "student",
  "ira",
  "401k",
]);

const isCurrency = (value: string | null | undefined): value is Currency =>
  typeof value === "string" && SUPPORTED_CURRENCIES.has(value as Currency);

const isAccountType = (
  value: string | null | undefined,
): value is AccountType =>
  typeof value === "string" && SUPPORTED_ACCOUNT_TYPES.has(value as AccountType);

const isAccountSubtype = (
  value: string | null | undefined,
): value is AccountSubtype =>
  typeof value === "string" &&
  SUPPORTED_ACCOUNT_SUBTYPES.has(value as AccountSubtype);

const isHolderCategory = (
  value: string | null | undefined,
): value is HolderCategory =>
  value === "personal" || value === "business";

const defaultSubtypeForType = (type: AccountType): AccountSubtype => {
  switch (type) {
    case "depository":
      return "checking";
    case "credit":
      return "credit card";
    case "loan":
      return "mortgage";
    case "investment":
      return "ira";
    default:
      return "checking";
  }
};

const formatParseError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const mapPlaidAccountToDomain = (
  plaidAccount: AccountBase,
  context: PlaidAccountContext,
): Effect.Effect<Account, PlaidAccountMappingError> => {
  const accountId = AccountId(plaidAccount.account_id);

  const typeLiteral = plaidAccount.type as unknown as string | null | undefined;

  if (!isAccountType(typeLiteral)) {
    return Effect.fail({
      _tag: "AccountUnsupportedType",
      accountId: plaidAccount.account_id,
      type: plaidAccount.type,
    });
  }

  const accountType: AccountType = typeLiteral;

  const currencyLiteral =
    plaidAccount.balances.iso_currency_code ??
    plaidAccount.balances.unofficial_currency_code;

  if (currencyLiteral === null || currencyLiteral === undefined) {
    return Effect.fail({
      _tag: "AccountMissingCurrency",
      accountId: plaidAccount.account_id,
    });
  }

  if (!isCurrency(currencyLiteral)) {
    return Effect.fail({
      _tag: "AccountUnsupportedCurrency",
      accountId: plaidAccount.account_id,
      currency: currencyLiteral,
    });
  }

  const currency: Currency = currencyLiteral;

  const subtypeLiteral = plaidAccount.subtype as unknown as string | null | undefined;
  const subtype = isAccountSubtype(subtypeLiteral)
    ? subtypeLiteral
    : defaultSubtypeForType(accountType);

  const holderCategory = isHolderCategory(plaidAccount.holder_category ?? null)
    ? (plaidAccount.holder_category as unknown as HolderCategory)
    : null;

  const syncedAt = context.syncedAt ?? Date.now();

  const parseRequiredBalance = (
    amount: number | null | undefined,
    field: "current" | "available" | "limit",
  ): Effect.Effect<MoneyValue, PlaidAccountMappingError> => {
    if (amount === null || amount === undefined) {
      return Effect.fail({
        _tag: "AccountBalanceMissing",
        accountId: plaidAccount.account_id,
        field,
      });
    }

    // Round to 2 decimal places to match Money schema constraint
    const roundedAmount = Math.round(amount * 100) / 100;

    return pipe(
      Money(roundedAmount, currency),
      Effect.mapError(
        (error): PlaidAccountMappingError => ({
          _tag: "AccountBalanceInvalid",
          accountId: plaidAccount.account_id,
          field,
          message: formatParseError(error),
        }),
      ),
    );
  };

  const parseOptionalBalance = (
    amount: number | null | undefined,
    field: "current" | "available" | "limit",
  ): Effect.Effect<MoneyValue | null, PlaidAccountMappingError> => {
    if (amount === null || amount === undefined) {
      return Effect.succeed<MoneyValue | null>(null);
    }

    // Round to 2 decimal places to match Money schema constraint
    const roundedAmount = Math.round(amount * 100) / 100;

    return pipe(
      Money(roundedAmount, currency),
      Effect.mapError(
        (error): PlaidAccountMappingError => ({
          _tag: "AccountBalanceInvalid",
          accountId: plaidAccount.account_id,
          field,
          message: formatParseError(error),
        }),
      ),
    );
  };

  return pipe(
    parseRequiredBalance(plaidAccount.balances.current, "current"),
    Effect.flatMap((currentBalance) =>
      pipe(
        parseOptionalBalance(plaidAccount.balances.available, "available"),
        Effect.flatMap((availableBalance) =>
          pipe(
            parseOptionalBalance(plaidAccount.balances.limit, "limit"),
            Effect.map((creditLimit) => ({
              id: accountId,
              state: "active" as const,
              type: accountType,
              subtype,
              name: plaidAccount.name,
              officialName: plaidAccount.official_name ?? null,
              mask: plaidAccount.mask ?? "****",
              holderCategory,
              currentBalance,
              availableBalance,
              creditLimit,
              itemId: context.itemId,
              institutionId: context.institutionId,
              institutionName: context.institutionName,
              createdAt: syncedAt,
              updatedAt: syncedAt,
              lastSyncedAt: context.syncedAt ?? syncedAt,
            })),
          ),
        ),
      ),
    ),
  );
};

export const mapPlaidTransactionToDomain = (
  plaidTransaction: PlaidTransaction,
): Effect.Effect<PlaidTransactionDomain, PlaidTransactionMappingError> => {
  const currencyLiteral =
    plaidTransaction.iso_currency_code ??
    plaidTransaction.unofficial_currency_code;

  if (currencyLiteral === null || currencyLiteral === undefined) {
    return Effect.fail({
      _tag: "TransactionMissingCurrency",
      transactionId: plaidTransaction.transaction_id,
    });
  }

  if (!isCurrency(currencyLiteral)) {
    return Effect.fail({
      _tag: "TransactionUnsupportedCurrency",
      transactionId: plaidTransaction.transaction_id,
      currency: currencyLiteral,
    });
  }

  const currency: Currency = currencyLiteral;

  // Round to 2 decimal places to match Money schema constraint
  const roundedAmount = Math.round(plaidTransaction.amount * 100) / 100;

  return pipe(
    Money(roundedAmount, currency),
    Effect.mapError(
      (error): PlaidTransactionMappingError => ({
        _tag: "TransactionInvalidAmount",
        transactionId: plaidTransaction.transaction_id,
        message: formatParseError(error),
      }),
    ),
    Effect.map((amount) => ({
      id: TransactionId(plaidTransaction.transaction_id),
      accountId: AccountId(plaidTransaction.account_id),
      amount,
      name: plaidTransaction.name,
      merchantName: plaidTransaction.merchant_name ?? null,
      date: plaidTransaction.date,
      pending: plaidTransaction.pending,
      category: plaidTransaction.category ?? [],
      paymentChannel: plaidTransaction.payment_channel,
    })),
  );
};

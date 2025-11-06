import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { AccountId, InstitutionId, ItemId, TransactionId } from "~/domain/shared/ids";
import {
  mapPlaidAccountToDomain,
  mapPlaidTransactionToDomain,
} from "~/infrastructure/plaid/mappers";
import { plaidAccountFixture, plaidTransactionFixture } from "../../fixtures/plaid-responses";

describe("Plaid mappers", () => {
  const context = {
    itemId: ItemId("item-123"),
    institutionId: InstitutionId("ins-123"),
    institutionName: "Plaid Bank",
    syncedAt: 1700000000000,
  };

  it("maps Plaid account to domain Account", async () => {
    const result = await Effect.runPromise(mapPlaidAccountToDomain(plaidAccountFixture, context));

    expect(result.id).toEqual(AccountId("acc-123"));
    expect(result.type).toBe("depository");
    expect(result.subtype).toBe("checking");
    expect(result.name).toBe("Everyday Checking");
    expect(result.currentBalance.amount).toBeCloseTo(200.75);
    expect(result.currentBalance.currency).toBe("USD");
    expect(result.availableBalance?.amount).toBeCloseTo(150.25);
    expect(result.creditLimit).toBeNull();
    expect(result.institutionName).toBe("Plaid Bank");
    expect(result.createdAt).toBe(1700000000000);
    expect(result.lastSyncedAt).toBe(1700000000000);
  });

  it("maps optional balances to null when source values are missing", async () => {
    const account = {
      ...plaidAccountFixture,
      balances: {
        ...plaidAccountFixture.balances,
        available: null,
        limit: null,
      },
    };

    const result = await Effect.runPromise(mapPlaidAccountToDomain(account, context));

    expect(result.availableBalance).toBeNull();
    expect(result.creditLimit).toBeNull();
  });

  it("fails when currency is missing on account", async () => {
    const account = {
      ...plaidAccountFixture,
      balances: {
        ...plaidAccountFixture.balances,
        iso_currency_code: null,
        unofficial_currency_code: null,
      },
    };

    const outcome = await Effect.runPromise(
      Effect.either(mapPlaidAccountToDomain(account, context)),
    );

    expect(outcome._tag).toBe("Left");
    if (outcome._tag === "Left") {
      expect(outcome.left).toMatchObject({
        _tag: "AccountMissingCurrency",
        accountId: "acc-123",
      });
    }
  });

  it("maps Plaid transaction to domain type", async () => {
    const result = await Effect.runPromise(mapPlaidTransactionToDomain(plaidTransactionFixture));

    expect(result.id).toEqual(TransactionId("txn-123"));
    expect(result.accountId).toEqual(AccountId("acc-123"));
    expect(result.amount.amount).toBeCloseTo(42.12);
    expect(result.amount.currency).toBe("USD");
    expect(result.pending).toBe(false);
    expect(result.category).toEqual(["Food and Drink", "Restaurants"]);
    expect(result.paymentChannel).toBe(plaidTransactionFixture.payment_channel);
  });

  it("fails when transaction currency missing", async () => {
    const txn = {
      ...plaidTransactionFixture,
      iso_currency_code: null,
      unofficial_currency_code: null,
    };

    const outcome = await Effect.runPromise(Effect.either(mapPlaidTransactionToDomain(txn)));

    expect(outcome._tag).toBe("Left");
    if (outcome._tag === "Left") {
      expect(outcome.left).toMatchObject({
        _tag: "TransactionMissingCurrency",
        transactionId: "txn-123",
      });
    }
  });
});

import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { Effect } from "effect";

import { withdraw, deposit, freeze, unfreeze, type Account } from "~/domain/banking/account";
import { makeMoney } from "~/domain/shared/money";
import { AccountId, ItemId, InstitutionId } from "~/domain/shared/ids";

let now = 1700000000000;

beforeEach(() => {
  now = 1700000000000;
  vi.spyOn(Date, "now").mockImplementation(() => (now += 100));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const createActiveAccount = (): Account => ({
  id: AccountId("acc-123"),
  state: "active",
  type: "depository",
  subtype: "checking",
  name: "Everyday Account",
  officialName: "Everyday Account",
  mask: "1234",
  holderCategory: "personal",
  currentBalance: makeMoney(200, "NZD"),
  availableBalance: makeMoney(150, "NZD"),
  creditLimit: null,
  itemId: ItemId("item-1"),
  institutionId: InstitutionId("ins-1"),
  institutionName: "Test Bank",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastSyncedAt: null,
});

describe("Account aggregate", () => {
  it("withdraws funds when account is active and has balance", async () => {
    const account = createActiveAccount();

    const result = await Effect.runPromise(withdraw(account, makeMoney(50, "NZD")));

    expect(result.currentBalance.amount).toBe(100);
    expect(result.state).toBe("active");
    expect(result.updatedAt).toBeGreaterThan(0);
  });

  it("fails to withdraw when balance insufficient", async () => {
    const account = createActiveAccount();

    const result = await Effect.runPromise(Effect.either(withdraw(account, makeMoney(500, "NZD"))));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toMatchObject({
        _tag: "InsufficientFunds",
        accountId: account.id,
      });
    }
  });

  it("deposits funds and updates balance", async () => {
    const account = createActiveAccount();

    const result = await Effect.runPromise(deposit(account, makeMoney(25, "NZD")));

    expect(result.currentBalance.amount).toBe(225);
    expect(result.state).toBe("active");
  });

  it("transitions between frozen and active states", async () => {
    const account = createActiveAccount();

    const frozen = await Effect.runPromise(freeze(account));
    expect(frozen.state).toBe("frozen");

    const unfrozen = await Effect.runPromise(unfreeze(frozen));
    expect(unfrozen.state).toBe("active");
  });
});

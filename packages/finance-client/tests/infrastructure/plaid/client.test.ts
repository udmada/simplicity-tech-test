import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import { PlaidClientLive } from "~/infrastructure/plaid/client";

type PlaidApiDependency = ConstructorParameters<typeof PlaidClientLive>[0];

describe("PlaidClientLive", () => {
  it("wraps accountsGet with Effect and returns response data", async () => {
    const mockResponse = {
      data: {
        accounts: [{ account_id: "acc-1" }],
        item: {} as unknown,
        request_id: "req-1",
      },
    };
    const accountsGet = vi.fn().mockResolvedValue(mockResponse);
    const plaidApi = {
      accountsGet,
      transactionsGet: vi.fn(),
    } as unknown as PlaidApiDependency;

    const client = new PlaidClientLive(plaidApi);

    const result = await Effect.runPromise(
      client.accountsGet({ access_token: "token" }),
    );

    expect(accountsGet).toHaveBeenCalledWith({ access_token: "token" });
    expect(result).toEqual(mockResponse.data);
  });

  it("wraps transactionsGet with Effect and returns response data", async () => {
    const mockResponse = {
      data: {
        transactions: [{ transaction_id: "txn-1" }],
        accounts: [],
        total_transactions: 1,
        item: {} as unknown,
        request_id: "req-2",
      },
    };
    const transactionsGet = vi.fn().mockResolvedValue(mockResponse);
    const plaidApi = {
      accountsGet: vi.fn(),
      transactionsGet,
    } as unknown as PlaidApiDependency;

    const client = new PlaidClientLive(plaidApi);

    const result = await Effect.runPromise(
      client.transactionsGet({
        access_token: "token",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
      }),
    );

    expect(transactionsGet).toHaveBeenCalledWith({
      access_token: "token",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
    });
    expect(result).toEqual(mockResponse.data);
  });

  it("maps SDK errors through mapPlaidSdkError", async () => {
    const sdkError = {
      isAxiosError: true,
      message: "Plaid failure",
      response: {
        status: 400,
        data: {
          error_type: "INVALID_REQUEST",
          error_code: "INVALID_FIELD",
          error_message: "Bad account",
        },
      },
    };

    const accountsGet = vi.fn().mockRejectedValue(sdkError);
    const plaidApi = {
      accountsGet,
      transactionsGet: vi.fn(),
    } as unknown as PlaidApiDependency;

    const client = new PlaidClientLive(plaidApi);

    const result = await Effect.runPromise(
      Effect.either(client.accountsGet({ access_token: "token" })),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toEqual({
        _tag: "PlaidApiError",
        type: "INVALID_REQUEST",
        code: "INVALID_FIELD",
        message: "Bad account",
        httpStatus: 400,
      });
    }
  });
});

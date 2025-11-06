import { describe, expect, it } from "vitest";
import { mapPlaidSdkError } from "~/infrastructure/plaid/errors";

describe("mapPlaidSdkError", () => {
  it("maps Plaid API error responses to PlaidApiError", () => {
    const error = {
      isAxiosError: true,
      message: "Invalid request",
      response: {
        status: 400,
        data: {
          error_type: "INVALID_REQUEST",
          error_code: "INVALID_FIELD",
          error_message: "Invalid account_id",
        },
      },
    };

    const result = mapPlaidSdkError(error);

    expect(result).toEqual({
      _tag: "PlaidApiError",
      type: "INVALID_REQUEST",
      code: "INVALID_FIELD",
      message: "Invalid account_id",
      httpStatus: 400,
    });
  });

  it("maps transport failures to NetworkError", () => {
    const error = {
      isAxiosError: true,
      message: "Network timeout while calling Plaid",
      code: "ETIMEDOUT",
    };

    const result = mapPlaidSdkError(error);

    expect(result).toEqual({
      _tag: "NetworkError",
      message: "Network timeout while calling Plaid",
    });
  });

  it("falls back to UnexpectedError for unknown inputs", () => {
    const input = new Error("something unexpected happened");

    const result = mapPlaidSdkError(input);

    expect(result).toEqual({
      _tag: "UnexpectedError",
      error: input,
    });
  });
});

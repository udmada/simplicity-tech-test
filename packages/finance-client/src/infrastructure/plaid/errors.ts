type PlaidErrorPayload = {
  readonly error_type?: string;
  readonly error_code?: string;
  readonly error_message?: string;
};

type PlaidClientError = {
  readonly isAxiosError: true;
  readonly message: string;
  readonly code?: string;
  readonly response?: {
    readonly status?: number;
    readonly data?: PlaidErrorPayload;
  };
};

export type PlaidError =
  | {
      readonly _tag: "PlaidApiError";
      readonly type: string;
      readonly code: string;
      readonly message: string;
      readonly httpStatus?: number;
    }
  | {
      readonly _tag: "NetworkError";
      readonly message: string;
    }
  | {
      readonly _tag: "UnexpectedError";
      readonly error: unknown;
    };

const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENETUNREACH",
]);

const isPlaidClientError = (
  error: unknown,
): error is PlaidClientError => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as Partial<PlaidClientError>;
  return (
    candidate.isAxiosError === true &&
    typeof candidate.message === "string"
  );
};

const isLikelyNetworkFailure = (
  error: PlaidClientError,
): boolean => {
  const code = error.code ?? "";
  if (NETWORK_ERROR_CODES.has(code)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection")
  );
};

export const mapPlaidSdkError = (error: unknown): PlaidError => {
  if (isPlaidClientError(error)) {
    const data = error.response?.data;

    if (data) {
      const type = data.error_type ?? "UNKNOWN";
      const code = data.error_code ?? "UNKNOWN";
      const message =
        data.error_message ?? "Unknown Plaid API error";
      const httpStatus = error.response?.status;

      return {
        _tag: "PlaidApiError",
        type,
        code,
        message,
        ...(httpStatus !== undefined ? { httpStatus } : {}),
      };
    }

    if (isLikelyNetworkFailure(error)) {
      return {
        _tag: "NetworkError",
        message: error.message,
      };
    }
  }

  return {
    _tag: "UnexpectedError",
    error,
  };
};

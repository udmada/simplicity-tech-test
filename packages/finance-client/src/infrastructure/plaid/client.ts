import { Context, Effect, pipe } from "effect";
import {
  type AccountsGetRequest,
  type AccountsGetResponse,
  type PlaidApi,
  type TransactionsGetRequest,
  type TransactionsGetResponse,
} from "plaid";

import type { PlaidError } from "./errors.js";
import { mapPlaidSdkError } from "./errors.js";

export interface PlaidClientService {
  readonly accountsGet: (
    request: AccountsGetRequest,
  ) => Effect.Effect<AccountsGetResponse, PlaidError>;
  readonly transactionsGet: (
    request: TransactionsGetRequest,
  ) => Effect.Effect<TransactionsGetResponse, PlaidError>;
}

export const PlaidClient = Context.GenericTag<PlaidClientService>("PlaidClient");

export class PlaidClientLive implements PlaidClientService {
  constructor(private readonly plaidApi: PlaidApi) {}

  accountsGet(
    request: AccountsGetRequest,
  ): Effect.Effect<AccountsGetResponse, PlaidError> {
    return pipe(
      Effect.tryPromise({
        try: () => this.plaidApi.accountsGet(request),
        catch: mapPlaidSdkError,
      }),
      Effect.map((response) => response.data),
    );
  }

  transactionsGet(
    request: TransactionsGetRequest,
  ): Effect.Effect<TransactionsGetResponse, PlaidError> {
    return pipe(
      Effect.tryPromise({
        try: () => this.plaidApi.transactionsGet(request),
        catch: mapPlaidSdkError,
      }),
      Effect.map((response) => response.data),
    );
  }
}

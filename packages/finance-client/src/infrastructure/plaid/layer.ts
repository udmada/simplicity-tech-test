import { Layer } from "effect";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

import { PlaidClient, PlaidClientLive } from "./client.js";

export type PlaidEnvironment = keyof typeof PlaidEnvironments;

export interface PlaidConfig {
  readonly clientId: string;
  readonly secret: string;
  readonly environment: PlaidEnvironment;
  readonly plaidVersion?: string;
}

const DEFAULT_PLAID_VERSION = "2020-09-14";

export const PlaidClientLayer = (
  config: PlaidConfig,
) => {
  const basePath = PlaidEnvironments[config.environment];

  if (basePath === undefined) {
    throw new Error(
      `Unsupported Plaid environment: ${String(config.environment)}`,
    );
  }

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": config.clientId,
        "PLAID-SECRET": config.secret,
        "Plaid-Version": config.plaidVersion ?? DEFAULT_PLAID_VERSION,
      },
    },
  });

  return Layer.succeed(
    PlaidClient,
    new PlaidClientLive(new PlaidApi(configuration)),
  );
};

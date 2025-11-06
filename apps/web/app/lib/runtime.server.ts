import { Layer } from "effect";
import { PlaidClientLayer, type PlaidConfig } from "@udmada/finance-client";
import {
  developmentPowertoolsLayer,
  productionPowertoolsLayer,
} from "@udmada/finance-powertools";

/**
 * Create runtime layer for Remix loaders
 * Combines Plaid client + observability layers
 */
export const createRuntimeLayer = (plaidConfig: PlaidConfig) => {
  const plaidLayer = PlaidClientLayer(plaidConfig);

  const isProd =
    process.env.NODE_ENV === "production" ||
    plaidConfig.environment === "production";

  const observabilityLayer = isProd
    ? productionPowertoolsLayer({
        observability: {
       	  tracerConfig: {
            serviceName: "finance-web",
            getTracer: () => ({
              startSpan: () => ({
                end: () => {},
                recordException: () => {},
                setAttribute: () => {},
                addEvent: () => {},
                spanContext: () => ({
                  spanId: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
                  traceId: crypto.randomUUID().replace(/-/g, ""),
                }),
                addLink: () => {},
              }),
            }),
          },
        },
      })
    : developmentPowertoolsLayer({
        observability: {
          structured: true,
          metricsIntervalMs: 5000,
        },
        idempotency: {
          ttlMs: 300000,
        },
      });

  return Layer.mergeAll(plaidLayer, observabilityLayer);
};

/**
 * Get Plaid config from Cloudflare env
 */
export const getPlaidConfig = (env: {
  PLAID_CLIENT_ID?: string;
  PLAID_SECRET?: string;
  PLAID_ENV?: string;
}): PlaidConfig => {
  const clientId = env.PLAID_CLIENT_ID;
  const secret = env.PLAID_SECRET;
  const environment = (env.PLAID_ENV || "sandbox") as "sandbox" | "development" | "production";

  if (!clientId || !secret) {
    throw new Error(
      "Missing Plaid credentials. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables.",
    );
  }

  return {
    clientId,
    secret,
    environment,
  };
};

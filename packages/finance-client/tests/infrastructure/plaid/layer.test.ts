import { Layer } from "effect";
import { describe, expect, it, vi } from "vitest";

import { PlaidClientLayer } from "~/infrastructure/plaid/layer";

const plaidMock = vi.hoisted(() => {
  const instances: Array<{
    readonly basePath?: string;
    readonly baseOptions?: { readonly headers?: Record<string, string> };
  }> = [];

  class MockConfiguration {
    readonly basePath: string | undefined;
    readonly baseOptions:
      | {
          readonly headers?: Record<string, string>;
        }
      | undefined;

    constructor(params?: {
      readonly basePath?: string;
      readonly baseOptions?: { readonly headers?: Record<string, string> };
    }) {
      this.basePath = params?.basePath;
      this.baseOptions = params?.baseOptions;
    }
  }

  class MockPlaidApi {
    constructor(config: {
      readonly basePath?: string;
      readonly baseOptions?: { readonly headers?: Record<string, string> };
    }) {
      instances.push(config);
    }
  }

  return {
    instances,
    PlaidEnvironments: {
      sandbox: "https://sandbox.plaid.com",
      development: "https://development.plaid.com",
      production: "https://production.plaid.com",
    },
    Configuration: MockConfiguration,
    PlaidApi: MockPlaidApi,
  };
});

vi.mock("plaid", () => ({
  PlaidEnvironments: plaidMock.PlaidEnvironments,
  Configuration: plaidMock.Configuration,
  PlaidApi: plaidMock.PlaidApi,
}));

describe("PlaidClientLayer", () => {
  it("creates Plaid client service with expected Plaid configuration", () => {
    const layer = PlaidClientLayer({
      clientId: "test-client-id",
      secret: "test-secret",
      environment: "sandbox",
    });

    expect(Layer.isLayer(layer)).toBe(true);

    expect(plaidMock.instances).toHaveLength(1);

    const [configuration] = plaidMock.instances;
    expect(configuration).toBeDefined();
    if (!configuration) {
      throw new Error("Expected configuration to be defined");
    }

    expect(configuration.basePath).toBe(plaidMock.PlaidEnvironments.sandbox);
    expect(configuration.baseOptions?.headers).toMatchObject({
      "PLAID-CLIENT-ID": "test-client-id",
      "PLAID-SECRET": "test-secret",
      "Plaid-Version": "2020-09-14",
    });
  });
});

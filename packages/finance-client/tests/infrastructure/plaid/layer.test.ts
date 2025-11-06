import { Layer as EffectLayer } from "effect";
import { describe, expect, it } from "vitest";

import { PlaidClientLayer } from "~/infrastructure/plaid/layer";

describe("PlaidClientLayer", () => {
  it("returns a layer providing PlaidClient", () => {
    const layer = PlaidClientLayer({
      clientId: "test-client-id",
      secret: "test-secret",
      environment: "sandbox",
    });

    expect(EffectLayer.isLayer(layer)).toBe(true);
  });
});

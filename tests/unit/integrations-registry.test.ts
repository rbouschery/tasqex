import { describe, expect, it } from "vitest";
import {
  configureIntegration,
  getIntegrationDefinition,
  integrationKeys,
} from "@server/integrations";

describe("integration registry", () => {
  it("ships with no integrations", () => {
    expect(integrationKeys).toEqual([]);
    expect(getIntegrationDefinition("resend")).toBeNull();
  });
});

describe("configureIntegration", () => {
  it("returns null for an unknown integration", () => {
    expect(
      configureIntegration("resend", {}, { enabled: true }),
    ).toBeNull();
  });
});

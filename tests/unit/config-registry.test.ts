import { describe, expect, it } from "vitest";
import {
  isChannelOperational,
  validateTasqexConfig,
  type TasqexConfig,
} from "@server/config";

const emptyConfig: TasqexConfig = {
  version: 1,
  channels: {},
  integrations: {},
};

describe("validateTasqexConfig", () => {
  it("accepts an empty channel and integration config", () => {
    const result = validateTasqexConfig(emptyConfig, {});
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects unknown channel keys", () => {
    const result = validateTasqexConfig({
      version: 1,
      channels: {
        email: { enabled: true, integration: "resend" },
      },
      integrations: {
        resend: { enabled: true },
      },
    });

    expect(result.ok).toBe(false);
    expect(
      result.issues.some((issue) => issue.path === "channels.email"),
    ).toBe(true);
  });
});

describe("isChannelOperational", () => {
  it("returns false when no channels are registered", () => {
    expect(isChannelOperational("email", { config: emptyConfig, env: {} })).toBe(
      false,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  isChannelOperational,
  validateTicqexConfig,
  type TicqexConfig,
} from "@server/config";

const emptyConfig: TicqexConfig = {
  version: 1,
  channels: {},
  integrations: {},
};

describe("validateTicqexConfig", () => {
  it("accepts an empty channel and integration config", () => {
    const result = validateTicqexConfig(emptyConfig, {});
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects unknown channel keys", () => {
    const result = validateTicqexConfig({
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

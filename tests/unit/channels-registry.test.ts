import { describe, expect, it } from "vitest";
import {
  buildTicketCardSurface,
  channelKeys,
  findMissingRequiredFields,
  getChannelDefinition,
  assertChannelFields,
  getMissingChannelFields,
} from "@server/channels";
import type { ChannelFieldPolicy } from "@shared/channels";

const requiredCustomField: ChannelFieldPolicy = {
  key: "priority",
  label: "Priority",
  group: "ticket",
  type: "text",
  requiredWhen: "on_create",
};

describe("channel registry", () => {
  it("ships with no channels", () => {
    expect(channelKeys).toEqual([]);
    expect(getChannelDefinition("email")).toBeNull();
  });
});

describe("task card surface", () => {
  it("builds custom-field chips and a preview", () => {
    const surface = buildTicketCardSurface({
      kind: "task",
      custom_fields: { priority: "high", region: "eu" },
      preview: "Task preview",
    });

    expect(surface.badges).toEqual([]);
    expect(surface.preview).toBe("Task preview");
    expect(surface.chips).toEqual([
      { sourceKey: "priority", label: "priority", value: "high" },
      { sourceKey: "region", label: "region", value: "eu" },
    ]);
  });
});

describe("field policy helpers", () => {
  it("finds missing required custom fields", () => {
    const missing = findMissingRequiredFields(
      [requiredCustomField],
      { custom_fields: {} },
      "on_create",
    );
    expect(missing).toEqual([{ key: "priority", label: "Priority" }]);

    expect(
      findMissingRequiredFields(
        [requiredCustomField],
        { custom_fields: { priority: "high" } },
        "on_create",
      ),
    ).toEqual([]);
  });
});

describe("field policy enforcement", () => {
  it("ignores unknown channels", () => {
    expect(() =>
      assertChannelFields("email", "on_create", { custom_fields: {} }),
    ).not.toThrow();
    expect(
      getMissingChannelFields("email", "on_create", { custom_fields: {} }),
    ).toEqual([]);
  });
});

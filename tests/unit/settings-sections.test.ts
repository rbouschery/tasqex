import { describe, expect, it } from "vitest";
import { collectChannelSettingsSections } from "@server/channels/settings-sections";
import { CORE_SETTINGS_SECTIONS } from "@shared/settings/core-sections";
import {
  isKnownSettingsComponentKey,
  SETTINGS_COMPONENT_KEYS,
} from "@shared/settings/types";
import {
  resolveSettingsSectionId,
  resolveSettingsSections,
} from "@shared/settings/resolve";

describe("resolveSettingsSections", () => {
  it("returns only core sections when no channels are registered", () => {
    const sections = resolveSettingsSections(
      {},
      collectChannelSettingsSections(),
    );
    expect(sections.map((s) => s.id)).toEqual(
      CORE_SETTINGS_SECTIONS.map((s) => s.id),
    );
    expect(collectChannelSettingsSections()).toEqual([]);
  });
});

describe("isKnownSettingsComponentKey", () => {
  it("recognizes shipped renderer keys", () => {
    for (const key of SETTINGS_COMPONENT_KEYS) {
      expect(isKnownSettingsComponentKey(key)).toBe(true);
    }
  });

  it("rejects unknown keys", () => {
    expect(isKnownSettingsComponentKey("settings.unknown")).toBe(false);
    expect(isKnownSettingsComponentKey("settings.email")).toBe(false);
  });
});

describe("resolveSettingsSectionId", () => {
  const sections = CORE_SETTINGS_SECTIONS;

  it("falls back to the first section when param is missing", () => {
    expect(resolveSettingsSectionId(sections, null)).toBe("appearance");
  });

  it("falls back when param is invalid", () => {
    expect(resolveSettingsSectionId(sections, "not-a-section")).toBe("appearance");
  });

  it("keeps a valid section id", () => {
    expect(resolveSettingsSectionId(sections, "custom-fields")).toBe(
      "custom-fields",
    );
  });
});

export const TASQEX_CONFIG_VERSION = 1 as const;

export type { ChannelKey, IntegrationKey } from "@shared/tasqex-keys";

export type ChannelBinding = {
  enabled: boolean;
  integration: string | null;
};

export type IntegrationBinding = {
  enabled: boolean;
};

export type TasqexConfig = {
  version: typeof TASQEX_CONFIG_VERSION;
  channels: Record<string, ChannelBinding>;
  integrations: Record<string, IntegrationBinding>;
};

export type ConfigValidationIssue = {
  path: string;
  message: string;
};

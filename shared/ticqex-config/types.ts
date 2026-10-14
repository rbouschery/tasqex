export const TICQEX_CONFIG_VERSION = 1 as const;

export type { ChannelKey, IntegrationKey } from "@shared/ticqex-keys";

export type ChannelBinding = {
  enabled: boolean;
  integration: string | null;
};

export type IntegrationBinding = {
  enabled: boolean;
};

export type TicqexConfig = {
  version: typeof TICQEX_CONFIG_VERSION;
  channels: Record<string, ChannelBinding>;
  integrations: Record<string, IntegrationBinding>;
};

export type ConfigValidationIssue = {
  path: string;
  message: string;
};

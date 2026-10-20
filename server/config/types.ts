export {
  TASQEX_CONFIG_VERSION,
  type ChannelKey,
  type ConfigValidationIssue,
  type IntegrationKey,
  type TasqexConfig,
} from "@shared/tasqex-config/types";

export type ChannelBinding = {
  enabled: boolean;
  integration: string | null;
};

export type IntegrationBinding = {
  enabled: boolean;
};

export type ConfigValidationResult = {
  ok: boolean;
  config: import("@shared/tasqex-config/types").TasqexConfig;
  issues: import("@shared/tasqex-config/types").ConfigValidationIssue[];
};

export type {
  ChannelBinding,
  ConfigValidationIssue,
  ConfigValidationResult,
  IntegrationBinding,
  TicqexConfig,
} from "@server/config/types";
export {
  defaultTicqexConfig,
  loadTicqexConfig,
  resolveConfigPath,
} from "@server/config/load";
export {
  resolveChannelRuntime,
  validateTicqexConfig,
  type ChannelRuntime,
} from "@server/config/resolve";
export {
  loadRuntimeConfig,
  requireChannelRuntime,
  summarizeActiveRuntime,
} from "@server/config/runtime";
export {
  channelUnavailableWebhookResult,
  isChannelOperational,
} from "@server/config/channel-gate";

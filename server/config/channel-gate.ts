import { resolveChannelRuntime } from "@server/config/resolve";
import type { TasqexConfig } from "@server/config/types";
import type { IntegrationWebhookResult } from "@server/integrations/types";

/** True when the channel is enabled in config and its integration is configured. */
export function isChannelOperational(
  channelKey: string,
  options: {
    env?: NodeJS.ProcessEnv;
    config?: TasqexConfig;
  } = {},
): boolean {
  const runtime = resolveChannelRuntime(channelKey, {
    env: options.env ?? process.env,
    config: options.config,
  });
  if (!runtime) return false;

  return (
    runtime.binding.enabled &&
    Boolean(runtime.integrationKey) &&
    Boolean(runtime.integration?.configured)
  );
}

export function channelUnavailableWebhookResult(
  message = "Channel is disabled or its integration is not configured",
): IntegrationWebhookResult {
  return {
    status: 503,
    body: {
      error: {
        code: "channel_unavailable",
        message,
      },
    },
  };
}

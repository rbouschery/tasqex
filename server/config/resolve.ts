import { listChannelKeys } from "@server/channels";
import {
  getChannelDefinition,
  type ChannelDefinition,
} from "@server/channels";
import {
  configureIntegration,
  listIntegrationKeys,
  type IntegrationRuntime,
} from "@server/integrations";
import { loadTasqexConfig } from "@server/config/load";
import type {
  ConfigValidationIssue,
  ConfigValidationResult,
  TasqexConfig,
} from "@server/config/types";
import {
  validateAppEnv,
  validateConfigBindings,
} from "@shared/tasqex-config/validate";
import { assertConfigShape } from "@shared/tasqex-config/load";

export type ChannelRuntime = {
  channel: ChannelDefinition;
  binding: TasqexConfig["channels"][keyof TasqexConfig["channels"]];
  integration: IntegrationRuntime | null;
  integrationKey: string | null;
};

function validateIntegrationEnv(
  config: TasqexConfig,
  env: NodeJS.ProcessEnv,
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  for (const [channelKey, binding] of Object.entries(config.channels)) {
    if (!binding.enabled || !binding.integration) continue;

    const integrationBinding =
      config.integrations[
        binding.integration as keyof TasqexConfig["integrations"]
      ];
    if (!integrationBinding?.enabled) {
      issues.push({
        path: `channels.${channelKey}`,
        message: `Channel "${channelKey}" is enabled but integration "${binding.integration}" is disabled or missing`,
      });
      continue;
    }

    const runtime = configureIntegration(binding.integration, env, {
      enabled: integrationBinding.enabled,
    });
    if (!runtime) continue;

    if (!runtime.configured) {
      for (const envKey of runtime.missingEnv) {
        issues.push({
          path: `env.${envKey}`,
          message: `Missing required env var for ${binding.integration} (${channelKey} channel)`,
        });
      }
    }
  }

  return issues;
}

function configShapeIssues(config: TasqexConfig): ConfigValidationIssue[] {
  try {
    assertConfigShape(config);
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [{ path: "config", message }];
  }
}

export function validateTasqexConfig(
  config: TasqexConfig,
  env: NodeJS.ProcessEnv = process.env,
): ConfigValidationResult {
  const issues = [
    ...configShapeIssues(config),
    ...validateConfigBindings(
      config,
      listChannelKeys(),
      listIntegrationKeys(),
    ),
    ...validateIntegrationEnv(config, env),
    ...validateAppEnv(),
  ];

  return {
    ok: issues.length === 0,
    config,
    issues,
  };
}

export function resolveChannelRuntime(
  channelKey: string,
  options: {
    config?: TasqexConfig;
    configPath?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): ChannelRuntime | null {
  const config = options.config ?? loadTasqexConfig(options.configPath);
  const env = options.env ?? process.env;
  const channel = getChannelDefinition(channelKey);
  const binding =
    config.channels[channelKey as keyof TasqexConfig["channels"]];

  if (!channel || !binding) return null;

  let integration: IntegrationRuntime | null = null;
  const integrationKey = binding.integration;

  if (binding.enabled && integrationKey) {
    const integrationBinding =
      config.integrations[
        integrationKey as keyof TasqexConfig["integrations"]
      ];
    if (integrationBinding) {
      integration = configureIntegration(integrationKey, env, {
        enabled: integrationBinding.enabled,
      });
    }
  }

  return {
    channel,
    binding,
    integration,
    integrationKey,
  };
}


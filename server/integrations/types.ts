import type { IntegrationKey } from "@shared/tasqex-keys";

export type { IntegrationKey } from "@shared/tasqex-keys";

export type IntegrationCapability = string;

export type IntegrationRuntime = {
  key: IntegrationKey;
  label: string;
  capabilities: IntegrationCapability[];
  /** True when all required env vars for this integration are present. */
  configured: boolean;
  missingEnv: string[];
};

export type IntegrationBindingConfig = {
  enabled: boolean;
};

export type IntegrationWebhookResult = {
  status: number;
  body: Record<string, unknown>;
};

export type IntegrationWebhookEventHandler = (
  rawBody: string,
  headers: Headers,
) => Promise<IntegrationWebhookResult>;

export type IntegrationDefinition = {
  key: IntegrationKey;
  label: string;
  capabilities: IntegrationCapability[];
  requiredEnv: readonly string[];
  optionalEnv?: readonly string[];
  configure(
    env: NodeJS.ProcessEnv,
    config?: IntegrationBindingConfig,
  ): IntegrationRuntime;
  webhooks?: Partial<Record<string, IntegrationWebhookEventHandler>>;
};

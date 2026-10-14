import type {
  IntegrationDefinition,
  IntegrationRuntime,
} from "@server/integrations/types";
import { createRegistry } from "@shared/registry";

export type {
  IntegrationDefinition,
  IntegrationRuntime,
} from "@server/integrations/types";
export type { IntegrationKey } from "@shared/ticqex-keys";

const integrations = createRegistry<string, IntegrationDefinition>({});

export const integrationRegistry = integrations.registry;
export const integrationKeys = integrations.keys;

export const listIntegrationKeys = integrations.listKeys;
export const getIntegrationDefinition = integrations.get;
export const listIntegrationDefinitions = integrations.list;

export function configureIntegration(
  key: string,
  env: NodeJS.ProcessEnv,
  config?: { enabled?: boolean },
): IntegrationRuntime | null {
  const definition = getIntegrationDefinition(key);
  if (!definition) return null;
  return definition.configure(env, { enabled: config?.enabled ?? true });
}

import type { ChannelDefinition } from "@server/channels/types";
import { createRegistry } from "@shared/registry";

export type {
  ChannelDefinition,
  ChannelKey,
  TicketCardSurface,
} from "@server/channels/types";
export type { IntegrationKey } from "@shared/tasqex-keys";
export { buildTicketCardSurface } from "@shared/channels/card-surface";
export {
  findMissingRequiredFields,
  isFieldLocked,
  isFieldVisible,
  policyAppliesWhen,
} from "@shared/channels/field-policy";
export {
  assertChannelFields,
  assertChannelFieldUpdatesAllowed,
  assertChannelReadyToSend,
  assertSendRecipientMatchesLockedFields,
  getMissingChannelFields,
} from "@server/channels/field-enforcement";

const channels = createRegistry<string, ChannelDefinition>({});

export const channelRegistry = channels.registry;
export const channelKeys = channels.keys;

export const listChannelKeys = channels.listKeys;
export const getChannelDefinition = channels.get;
export const listChannelDefinitions = channels.list;

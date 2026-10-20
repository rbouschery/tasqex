/** Canonical channel keys compiled into the app. None ship today. */
export const CHANNEL_KEYS = [] as const satisfies readonly string[];

/** Canonical integration keys compiled into the app. None ship today. */
export const INTEGRATION_KEYS = [] as const satisfies readonly string[];

export type ChannelKey = (typeof CHANNEL_KEYS)[number];
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export function isChannelKey(value: string): value is ChannelKey {
  return (CHANNEL_KEYS as readonly string[]).includes(value);
}

export function isIntegrationKey(value: string): value is IntegrationKey {
  return (INTEGRATION_KEYS as readonly string[]).includes(value);
}

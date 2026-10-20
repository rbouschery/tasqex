import type {
  ChannelCardTicketContext,
  TicketCardSurface,
} from "./types";

function buildCustomFieldChips(
  customFields: ChannelCardTicketContext["custom_fields"],
): TicketCardSurface["chips"] {
  return Object.entries(customFields)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => ({
      sourceKey: key,
      label: key,
      value: String(value),
    }));
}

export function buildTicketCardSurface(
  context: ChannelCardTicketContext,
): TicketCardSurface {
  return {
    badges: [],
    warning_badges: [],
    preview: context.preview ?? "",
    chips: buildCustomFieldChips(context.custom_fields),
  };
}

import { createAdminClient } from "@server/lib/supabase-admin";
import {
  listDefinitions,
  loadCustomFieldsMap,
} from "@server/services/custom-fields";
import { getSettings } from "@server/services/settings";
import { getTicketForContext } from "@server/services/tickets";
import {
  resolveCopyContextSettings,
  type CopyContextSettings,
} from "@shared/copy-context";
import type { CustomFieldDefinition } from "@shared/custom-fields";
import {
  formatCustomFieldValue,
  hasCustomFieldValue,
} from "@shared/custom-fields/format";

function appendCustomFieldLines(
  lines: string[],
  definitions: CustomFieldDefinition[],
  values: Record<string, unknown>,
) {
  for (const definition of definitions) {
    const value = values[definition.key];
    if (!hasCustomFieldValue(value)) continue;
    lines.push(
      `**${definition.label}:** ${formatCustomFieldValue(definition.type, value, "export")}`,
    );
  }
}

export function buildTicketContextMarkdown(
  ticket: Awaited<ReturnType<typeof getTicketForContext>>,
  settings: CopyContextSettings,
  contactFieldDefinitions: CustomFieldDefinition[],
  ticketFieldDefinitions: CustomFieldDefinition[],
  contactFields: Record<string, unknown>,
): string {
  const lines: string[] = [];
  const prepend = settings.prepend_text.trim();

  if (prepend) {
    lines.push(prepend, "");
  }

  lines.push(`# ${ticket.title}`, "");

  if (settings.append_contact) {
    const contactLabel = ticket.contact?.username ?? "Unknown";
    lines.push(`**Contact:** ${contactLabel}`);

    if (settings.append_contact_custom_fields) {
      appendCustomFieldLines(lines, contactFieldDefinitions, contactFields);
    }
  }

  const tagNames = ticket.tags.map((tag) => tag.name).join(", ") || "none";
  lines.push(
    `**Status:** ${ticket.status?.name ?? "Unknown"}`,
    `**Tags:** ${tagNames}`,
  );

  if (settings.append_custom_fields) {
    appendCustomFieldLines(lines, ticketFieldDefinitions, ticket.custom_fields);
  }

  lines.push("", "---", "");

  if (ticket.body) {
    lines.push(String(ticket.body), "");
  }

  lines.push("---");
  return lines.join("\n");
}

export async function getTicketContext(id: string) {
  const [ticket, globalSettings] = await Promise.all([
    getTicketForContext(id),
    getSettings(),
  ]);
  const settings = resolveCopyContextSettings(globalSettings.copy_context);
  const db = createAdminClient();

  const contactId = ticket.contact_id as string | undefined;
  const contactFields = contactId
    ? (await loadCustomFieldsMap(db, "contact", [contactId])).get(contactId) ??
      {}
    : {};

  const [contactFieldDefinitions, ticketFieldDefinitions] = await Promise.all([
    settings.append_contact && settings.append_contact_custom_fields
      ? listDefinitions(db, "contact")
      : Promise.resolve([]),
    settings.append_custom_fields
      ? listDefinitions(db, "ticket")
      : Promise.resolve([]),
  ]);

  return buildTicketContextMarkdown(
    ticket,
    settings,
    contactFieldDefinitions,
    ticketFieldDefinitions,
    contactFields,
  );
}

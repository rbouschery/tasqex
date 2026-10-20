import { buildTicketCardSurface } from "@server/channels";
import { createAdminClient } from "@server/lib/supabase-admin";
import { initials, messagePreview } from "@server/lib/utils";
import type { BoardTicketRow } from "@server/domain/ticket";
import {
  listDefinitions,
  loadCustomFieldsMap,
} from "@server/services/custom-fields";
import { resolveOpenContactFieldsForDisplay } from "@shared/custom-fields/format";
import { loadTagsForTickets } from "@server/services/tags";
import {
  filterTicketCardSurface,
  type ResolvedTicketFieldLayout,
  type TicketCustomFieldDefinition,
} from "@shared/ticket-fields";

export async function enrichTicketsForBoard(
  ticketRows: BoardTicketRow[],
  _userId?: string,
  layout?: ResolvedTicketFieldLayout,
  customFieldDefinitions?: TicketCustomFieldDefinition[],
) {
  const db = createAdminClient();
  const ids = ticketRows.map((t) => t.id);
  const contactIds = [
    ...new Set(
      ticketRows
        .map((t) => t.contact_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const [fieldsMap, tagsMap, openContactFieldDefinitions] = await Promise.all([
    loadCustomFieldsMap(db, "ticket", ids),
    loadTagsForTickets(ids),
    listDefinitions(db, "contact", { showOpenInTicket: true }),
  ]);

  const openContactFieldIds = openContactFieldDefinitions.map((def) => def.id);
  const contactFieldsMap =
    openContactFieldIds.length > 0 && contactIds.length > 0
      ? await loadCustomFieldsMap(db, "contact", contactIds, {
          fieldIds: openContactFieldIds,
        })
      : new Map<string, Record<string, unknown>>();

  const previews = new Map<string, string>();

  for (const t of ticketRows) {
    const body = (t.body ?? "").trim();
    if (body) previews.set(t.id, messagePreview(body));
  }

  return ticketRows.map((t) => {
    const tags = tagsMap.get(t.id) ?? [];
    const custom_fields = fieldsMap.get(t.id) ?? {};
    const contact = t.contacts
      ? { username: t.contacts.username, initials: initials(t.contacts.username) }
      : null;
    const assignee = t.users
      ? { username: t.users.username, initials: initials(t.users.username) }
      : null;

    const preview = previews.get(t.id) ?? "";
    let card_surface = buildTicketCardSurface({
      kind: t.kind,
      custom_fields,
      preview,
      origin: t.origin,
    });

    if (layout && customFieldDefinitions) {
      card_surface = filterTicketCardSurface(
        card_surface,
        layout,
        customFieldDefinitions,
      );
    }

    const contact_open_fields =
      t.contact_id != null
        ? resolveOpenContactFieldsForDisplay(
            openContactFieldDefinitions,
            contactFieldsMap.get(t.contact_id) ?? {},
          )
        : [];

    return {
      id: t.id,
      title: t.title,
      kind: t.kind,
      origin: t.origin,
      contact_id: t.contact_id,
      assignee_id: t.assignee_id,
      preview,
      contact,
      assignee,
      custom_fields,
      contact_open_fields,
      tags,
      card_surface,
      created_at: t.created_at,
      updated_at: t.updated_at,
      unread_count: 0,
    };
  });
}

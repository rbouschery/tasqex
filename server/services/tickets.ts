import { buildTicketCardSurface } from "@server/channels";
import { notifyBoardRefresh } from "@server/lib/board-broadcast";
import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";
import { parsePagination } from "@server/lib/utils";
import {
  loadTicketRow,
  TICKET_LIST_SELECT,
  type TicketListRow,
} from "@server/domain/ticket";
import { findOrCreateContact } from "@server/services/contacts";
import { getDefaultStatusId } from "@server/services/statuses";
import {
  filterTicketIdsByCustomFields,
  loadCustomFieldsMap,
  setCustomFields,
} from "@server/services/custom-fields";
import {
  loadTagsForTickets,
  setTicketTags,
} from "@server/services/tags";
import {
  removeTicketFromAllLaneOrders,
  syncTicketLaneOrderOnStatusChange,
} from "@server/services/board-lane-orders";
import { invalidateLaneSortCache } from "@server/services/board-lane-sort-cache";
import { touchTicket } from "@server/services/ticket-touch";
import {
  deriveTicketUpdateDiffScope,
  diffTicketActivity,
  loadTicketUpdateActivitySnapshot,
  recordTicketCreatedActivity,
  recordTicketDeletedActivity,
  recordTicketUpdatedActivity,
} from "@server/services/ticket-activity";
import type { AuthContext } from "@server/middleware/auth";
import type { createTicketSchema } from "@server/lib/validation/schemas";
import type { z } from "zod";

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export async function listTickets(
  searchParams: URLSearchParams,
  meta: { filters: Record<string, unknown> },
) {
  const db = createAdminClient();
  const { page, perPage, offset } = parsePagination(searchParams);

  const customFieldFilters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("custom_fields.")) {
      customFieldFilters[key.slice("custom_fields.".length)] = value;
    }
  }

  const filteredIds = await filterTicketIdsByCustomFields(db, customFieldFilters);
  if (filteredIds !== null && filteredIds.length === 0) {
    return { tickets: [], total: 0, page, perPage };
  }

  let query = db
    .from("tickets")
    .select(TICKET_LIST_SELECT, { count: "exact" })
    .order("updated_at", { ascending: false });

  const statusId = searchParams.get("status_id");
  const assigneeId = searchParams.get("assignee_id");
  const contactId = searchParams.get("contact_id");
  const origin = searchParams.get("origin");
  const kind = searchParams.get("kind");
  const tag = searchParams.get("tag");

  if (statusId) query = query.eq("status_id", statusId);
  if (assigneeId) query = query.eq("assignee_id", assigneeId);
  if (contactId) query = query.eq("contact_id", contactId);
  if (origin) query = query.eq("origin", origin);
  if (kind) query = query.eq("kind", kind);
  if (filteredIds) query = query.in("id", filteredIds);

  if (tag) {
    const { data: tagRow } = await db.from("tags").select("id").eq("name", tag).maybeSingle();
    if (!tagRow) return { tickets: [], total: 0, page, perPage };
    const { data: links } = await db
      .from("ticket_tags")
      .select("ticket_id")
      .eq("tag_id", tagRow.id);
    const ids = (links ?? []).map((l) => l.ticket_id);
    if (!ids.length) return { tickets: [], total: 0, page, perPage };
    query = query.in("id", ids);
  }

  const { data, count, error } = await query.range(offset, offset + perPage - 1);
  if (error) throw ApiError.internal(error.message);

  const rows = (data ?? []) as TicketListRow[];
  const ticketIds = rows.map((t) => t.id);
  const fieldsMap = await loadCustomFieldsMap(db, "ticket", ticketIds);
  const tagsMap = await loadTagsForTickets(ticketIds);

  return {
    tickets: rows.map((t) => formatTicketListItem(t, fieldsMap, tagsMap)),
    total: count ?? 0,
    page,
    perPage,
    meta: { ...meta, filters: { ...meta.filters, ...customFieldFilters } },
  };
}

function formatTicketListItem(
  t: TicketListRow,
  fieldsMap: Map<string, Record<string, unknown>>,
  tagsMap: Map<string, { id: string; name: string; color: string }[]>,
) {
  const custom_fields = fieldsMap.get(t.id) ?? {};
  const preview = t.body?.trim()
    ? t.body.trim().replace(/\s+/g, " ").slice(0, 120)
    : "";

  return {
    id: t.id,
    title: t.title,
    kind: t.kind,
    body: t.body ?? null,
    origin: t.origin,
    contact_id: t.contact_id,
    status_id: t.status_id,
    assignee_id: t.assignee_id,
    created_at: t.created_at,
    updated_at: t.updated_at,
    contact: t.contacts
      ? { id: t.contacts.id, username: t.contacts.username }
      : null,
    assignee: t.users
      ? { id: t.users.id, username: t.users.username }
      : null,
    status: t.status_types,
    custom_fields,
    tags: tagsMap.get(t.id) ?? [],
    card_surface: buildTicketCardSurface({
      kind: t.kind,
      custom_fields,
      preview,
      origin: t.origin,
    }),
  };
}

export async function getTicketSummary(id: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("tickets")
    .select(
      "*, contacts(id, username), users:assignee_id(id, username, email), status_types(id, name, color)",
    )
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Ticket not found");

  const row = data as TicketListRow;
  const [fieldsMap, tagsMap] = await Promise.all([
    loadCustomFieldsMap(db, "ticket", [id]),
    loadTagsForTickets([id]),
  ]);
  const base = formatTicketListItem(row, fieldsMap, tagsMap);
  return { ...base, unread_count: 0 };
}

export async function getTicket(id: string) {
  return getTicketSummary(id);
}

/** Ticket for markdown context export. */
export async function getTicketForContext(id: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("tickets")
    .select(
      "id, title, kind, body, contact_id, contacts(id, username), status_types(id, name)",
    )
    .eq("id", id)
    .single();

  if (error || !data) throw ApiError.notFound("Ticket not found");

  const row = data as unknown as {
    id: string;
    title: string;
    kind: TicketListRow["kind"];
    body: string | null;
    contact_id: string | null;
    contacts: TicketListRow["contacts"];
    status_types: { id: string; name: string } | null;
  };

  const fieldsMap = await loadCustomFieldsMap(db, "ticket", [id]);
  const tagsMap = await loadTagsForTickets([id]);

  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    body: row.body ?? null,
    contact_id: row.contact_id,
    contact: row.contacts
      ? { id: row.contacts.id, username: row.contacts.username }
      : null,
    status: row.status_types,
    custom_fields: fieldsMap.get(id) ?? {},
    tags: tagsMap.get(id) ?? [],
  };
}

export type CreateTicketResult = {
  ticket: Awaited<ReturnType<typeof getTicket>>;
};

export async function createTicket(
  input: CreateTicketInput,
  auth: AuthContext,
): Promise<CreateTicketResult> {
  return createTaskTicket(input, auth);
}

async function createTaskTicket(
  input: Extract<CreateTicketInput, { kind: "task" }>,
  auth: AuthContext,
): Promise<CreateTicketResult> {
  const db = createAdminClient();
  const statusId =
    input.status_id?.trim() || (await getDefaultStatusId());

  const contactId = input.contact?.username
    ? (await findOrCreateContact(input.contact.username)).id
    : null;

  const { data: ticket, error } = await db
    .from("tickets")
    .insert({
      title: input.title,
      kind: "task",
      body: input.body?.trim() || null,
      contact_id: contactId,
      status_id: statusId,
      assignee_id: input.assignee_id ?? null,
      origin: input.origin ?? "manual",
    })
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  invalidateLaneSortCache([statusId]);

  if (input.tags?.length) await setTicketTags(ticket.id, input.tags);
  await setCustomFields(db, "ticket", ticket.id, input.custom_fields);

  await recordTicketCreatedActivity(
    { id: ticket.id, title: ticket.title, kind: ticket.kind },
    auth,
  );

  return { ticket: await getTicket(ticket.id) };
}

export async function updateTicket(
  id: string,
  input: {
    title?: string;
    body?: string | null;
    status_id?: string;
    assignee_id?: string | null;
    tags?: string[];
    custom_fields?: Record<string, unknown>;
  },
  options?: { auth?: AuthContext; boardMoveHandled?: boolean },
) {
  const ticket = await loadTicketRow(id);

  const shouldRecordActivity = Boolean(options?.auth);
  const diffScope = shouldRecordActivity
    ? deriveTicketUpdateDiffScope(input)
    : null;
  const beforeSnapshot = shouldRecordActivity
    ? await loadTicketUpdateActivitySnapshot(id)
    : null;

  const previousStatusId = ticket.status_id;
  const db = createAdminClient();

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.status_id !== undefined) patch.status_id = input.status_id;
  if (input.assignee_id !== undefined) patch.assignee_id = input.assignee_id;
  if (
    input.status_id !== undefined &&
    previousStatusId &&
    previousStatusId !== input.status_id
  ) {
    patch.updated_at = new Date().toISOString();
  }

  const hasScalarPatch = Object.keys(patch).length > 0;
  const hasTagsPatch = input.tags !== undefined;
  const hasCustomFieldsPatch =
    input.custom_fields !== undefined &&
    Object.keys(input.custom_fields).length > 0;

  if (hasScalarPatch) {
    const { error } = await db.from("tickets").update(patch).eq("id", id);
    if (error) throw ApiError.internal(error.message);
  }

  if (input.tags) await setTicketTags(id, input.tags);
  if (input.custom_fields !== undefined) {
    await setCustomFields(db, "ticket", id, input.custom_fields);
  }

  if (
    !hasScalarPatch &&
    (hasTagsPatch || hasCustomFieldsPatch)
  ) {
    await touchTicket(id);
  }

  if (
    options?.auth?.userId &&
    !options.boardMoveHandled &&
    input.status_id !== undefined &&
    previousStatusId &&
    previousStatusId !== input.status_id
  ) {
    await syncTicketLaneOrderOnStatusChange(
      options.auth.userId,
      id,
      previousStatusId,
      input.status_id,
    );
  }

  if (shouldRecordActivity && beforeSnapshot && diffScope && options?.auth) {
    const afterSnapshot = await loadTicketUpdateActivitySnapshot(id);
    const changes = diffTicketActivity(beforeSnapshot, afterSnapshot, diffScope);
    if (changes.length) {
      await recordTicketUpdatedActivity(
        { ...ticket, title: afterSnapshot.title },
        changes,
        options.auth,
      );
    }
  }

  if (
    !options?.boardMoveHandled &&
    input.status_id !== undefined &&
    previousStatusId &&
    previousStatusId !== input.status_id
  ) {
    notifyBoardRefresh();
  }

  return getTicket(id);
}

export async function deleteTicket(id: string, auth?: AuthContext) {
  const ticket = await loadTicketRow(id);

  const db = createAdminClient();

  const { error: customFieldError } = await db
    .from("custom_field_values")
    .delete()
    .eq("entity_type", "ticket")
    .eq("entity_id", id);
  if (customFieldError) throw ApiError.internal(customFieldError.message);

  await removeTicketFromAllLaneOrders(id);

  const { error } = await db.from("tickets").delete().eq("id", id);
  if (error) throw ApiError.internal(error.message);

  if (auth) {
    await recordTicketDeletedActivity(ticket, auth);
  }
}

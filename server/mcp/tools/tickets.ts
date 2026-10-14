import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  commentInputSchema,
  commentUpdateSchema,
  createTicketMcpInputSchema,
  createTicketSchema,
  parseBody,
  updateTicketSchema,
} from "@server/lib/validation/schemas";
import {
  createTicketComment,
  deleteTicketComment,
  listTicketComments,
  updateTicketComment,
} from "@server/services/comments";
import { getTicketContext } from "@server/services/ticket-context";
import {
  createTicket,
  deleteTicket,
  getTicket,
  getTicketSummary,
  listTickets,
  updateTicket,
} from "@server/services/tickets";
import {
  paginationInput,
  paramsFrom,
  registerAuthedTool,
  toolResult,
  uuid,
} from "../core";

export function registerTicketTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_tickets",
    {
      title: "List Tickets",
      description: "List tickets using the same filters as GET /api/v1/tickets.",
      inputSchema: {
        ...paginationInput,
        status_id: uuid.optional(),
        assignee_id: uuid.optional(),
        contact_id: uuid.optional(),
        origin: z.string().optional(),
        kind: z.string().optional(),
        tag: z.string().optional(),
        custom_fields: z.record(z.string(), z.string()).optional(),
      },
    },
    async (input) => toolResult(await listTickets(paramsFrom(input), { filters: {} })),
  );

  registerAuthedTool(
    server,
    "ticqex_create_ticket",
    {
      title: "Create Ticket",
      description: "Create a task ticket.",
      inputSchema: createTicketMcpInputSchema.shape,
    },
    async (input, auth) => {
      const mcpInput = parseBody(createTicketMcpInputSchema, input);
      const { ticket } = await createTicket(
        parseBody(createTicketSchema, mcpInput),
        auth,
      );
      return toolResult(ticket);
    },
  );

  registerAuthedTool(
    server,
    "ticqex_get_ticket",
    {
      title: "Get Ticket",
      description: "Get a ticket.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => toolResult(await getTicket(id)),
  );

  registerAuthedTool(
    server,
    "ticqex_get_ticket_summary",
    {
      title: "Get Ticket Summary",
      description: "Get a ticket summary.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => toolResult(await getTicketSummary(id)),
  );

  registerAuthedTool(
    server,
    "ticqex_get_ticket_context",
    {
      title: "Get Ticket Context",
      description: "Get a markdown context export for a ticket.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => toolResult({ markdown: await getTicketContext(id) }),
  );

  registerAuthedTool(
    server,
    "ticqex_update_ticket",
    {
      title: "Update Ticket",
      description: "Update ticket fields, tags, and custom fields.",
      inputSchema: { id: uuid, patch: updateTicketSchema },
    },
    async ({ id, patch }, auth) =>
      toolResult(
        await updateTicket(id, parseBody(updateTicketSchema, patch), { auth }),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_ticket",
    {
      title: "Delete Ticket",
      description: "Delete a ticket.",
      inputSchema: { id: uuid },
    },
    async ({ id }, auth) => {
      await deleteTicket(id, auth);
      return toolResult({ deleted: true });
    },
  );

  registerAuthedTool(
    server,
    "ticqex_list_ticket_comments",
    {
      title: "List Ticket Comments",
      description: "List internal comments for a ticket using GET /api/v1/tickets/:id/comments.",
      inputSchema: { ticket_id: uuid, ...paginationInput },
    },
    async ({ ticket_id, ...input }, auth) =>
      toolResult(
        await listTicketComments(ticket_id, paramsFrom(input), auth),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_create_ticket_comment",
    {
      title: "Create Ticket Comment",
      description: "Create an internal markdown comment on a ticket.",
      inputSchema: { ticket_id: uuid, comment: commentInputSchema },
    },
    async ({ ticket_id, comment }, auth) =>
      toolResult(
        await createTicketComment(
          ticket_id,
          parseBody(commentInputSchema, comment),
          auth,
        ),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_update_ticket_comment",
    {
      title: "Update Ticket Comment",
      description: "Update an internal ticket comment.",
      inputSchema: {
        ticket_id: uuid,
        comment_id: uuid,
        comment: commentUpdateSchema,
      },
    },
    async ({ ticket_id, comment_id, comment }, auth) =>
      toolResult(
        await updateTicketComment(
          ticket_id,
          comment_id,
          parseBody(commentUpdateSchema, comment),
          auth,
        ),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_ticket_comment",
    {
      title: "Delete Ticket Comment",
      description: "Hard-delete an internal ticket comment.",
      inputSchema: { ticket_id: uuid, comment_id: uuid },
    },
    async ({ ticket_id, comment_id }, auth) =>
      toolResult(await deleteTicketComment(ticket_id, comment_id, auth)),
  );

}

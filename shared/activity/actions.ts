export const ACTIVITY_ACTIONS = {
  API_REQUEST_SUCCEEDED: "api.request.succeeded",
  API_REQUEST_FAILED: "api.request.failed",
  MCP_TOOL_SUCCEEDED: "mcp.tool.succeeded",
  MCP_TOOL_FAILED: "mcp.tool.failed",
  TICKET_CREATED: "ticket.created",
  TICKET_UPDATED: "ticket.updated",
  TICKET_DELETED: "ticket.deleted",
  TICKET_STATUS_CHANGED: "ticket.status_changed",
  COMMENT_CREATED: "comment.created",
  COMMENT_UPDATED: "comment.updated",
  COMMENT_DELETED: "comment.deleted",
} as const;

export type ActivityAction =
  (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS];

export const ACTIVITY_OUTCOMES = {
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;

export type ActivityOutcome =
  (typeof ACTIVITY_OUTCOMES)[keyof typeof ACTIVITY_OUTCOMES];

export const ACTIVITY_SOURCES = {
  UI: "ui",
  API: "api",
  MCP: "mcp",
  SYSTEM: "system",
} as const;

export type ActivitySource =
  (typeof ACTIVITY_SOURCES)[keyof typeof ACTIVITY_SOURCES];

export const ACTIVITY_ACTOR_TYPES = {
  STAFF: "staff",
  API_KEY: "api_key",
  CONTACT: "contact",
  SYSTEM: "system",
  ANONYMOUS: "anonymous",
} as const;

export type ActivityActorType =
  (typeof ACTIVITY_ACTOR_TYPES)[keyof typeof ACTIVITY_ACTOR_TYPES];

/** Activity-read endpoints hidden by default in global UI to reduce refresh noise. */
export const SELF_REFERENTIAL_ACTIVITY_OPERATIONS = new Set([
  "tasqex_list_activity",
  "tasqex_list_ticket_activity",
]);

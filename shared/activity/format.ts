import {
  ACTIVITY_ACTIONS,
  type ActivityAction,
  type ActivitySource,
} from "@shared/activity/actions";

const ACTION_LABELS: Record<ActivityAction, string> = {
  [ACTIVITY_ACTIONS.API_REQUEST_SUCCEEDED]: "API request",
  [ACTIVITY_ACTIONS.API_REQUEST_FAILED]: "API request failed",
  [ACTIVITY_ACTIONS.MCP_TOOL_SUCCEEDED]: "MCP tool",
  [ACTIVITY_ACTIONS.MCP_TOOL_FAILED]: "MCP tool failed",
  [ACTIVITY_ACTIONS.TICKET_CREATED]: "Task created",
  [ACTIVITY_ACTIONS.TICKET_UPDATED]: "Task updated",
  [ACTIVITY_ACTIONS.TICKET_DELETED]: "Task deleted",
  [ACTIVITY_ACTIONS.TICKET_STATUS_CHANGED]: "Status changed",
  [ACTIVITY_ACTIONS.COMMENT_CREATED]: "Comment added",
  [ACTIVITY_ACTIONS.COMMENT_UPDATED]: "Comment updated",
  [ACTIVITY_ACTIONS.COMMENT_DELETED]: "Comment deleted",
};

export function formatActivityAction(action: ActivityAction): string {
  return ACTION_LABELS[action];
}

export function formatActivitySource(source: ActivitySource): string {
  switch (source) {
    case "ui":
      return "UI";
    case "api":
      return "API";
    case "mcp":
      return "MCP";
    case "system":
      return "System";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

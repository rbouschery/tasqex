import type { Tag } from "@/components/tags/types";
import type { TicketOrigin } from "@shared/channels";

export type TicketSummary = {
  id: string;
  title: string;
  kind: "task";
  origin: TicketOrigin;
  contact_id: string | null;
  assignee_id: string | null;
  preview: string;
  contact: { id: string; username: string } | null;
  assignee: { id: string; username: string } | null;
  custom_fields: Record<string, unknown>;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  unread_count: number;
  body: string | null;
  status_id: string;
  status: { id: string; name: string; color: string } | null;
  card_surface?: import("@shared/channels").TicketCardSurface;
};

export function isTaskSummary(summary: TicketSummary): summary is TicketSummary {
  return summary.kind === "task";
}

export type TicketDetail = TicketSummary;

export function isTaskDetail(ticket: TicketDetail): ticket is TicketDetail {
  return ticket.kind === "task";
}

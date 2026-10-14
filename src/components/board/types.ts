import type { TicketOrigin } from "@shared/channels";

export type {
  TicketCardBadge,
  TicketCardBadgeVariant,
  TicketCardChip,
  TicketCardSurface,
} from "@shared/channels";

export type BoardLane = {
  status: { id: string; name: string; color: string };
  tickets: BoardTicket[];
  total_count?: number;
  has_more?: boolean;
};

type BoardTicketBase = {
  id: string;
  title: string;
  is_pending?: boolean;
  origin: TicketOrigin;
  contact_id: string | null;
  assignee_id: string | null;
  preview: string;
  contact: { username: string; initials: string } | null;
  assignee: { username: string; initials: string } | null;
  custom_fields: Record<string, unknown>;
  contact_open_fields: { label: string; value: string }[];
  tags: { id: string; name: string; color: string }[];
  card_surface: import("@shared/channels").TicketCardSurface;
  created_at: string;
  updated_at: string;
  unread_count: number;
};

export type BoardTicket = BoardTicketBase & {
  kind: "task";
};

export type { TicketDetail } from "@/types/tickets";
export { isTaskDetail } from "@/types/tickets";

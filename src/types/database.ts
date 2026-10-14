export type UserRole = "admin" | "agent";

export type TicketKind = "task";

export type CommentAuthorType = "agent" | "api_key";

export type CommentDbRow = {
  id: string;
  ticket_id: string;
  body: string;
  author_type: CommentAuthorType;
  author_id: string | null;
  api_key_id: string | null;
  created_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type { ActivityDbRow as ActivityEventDbRow } from "@shared/activity/types";

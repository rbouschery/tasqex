import type { z } from "zod";
import {
  boardLaneOrderSchema,
  boardMoveTicketSchema,
  commentInputSchema,
  commentUpdateSchema,
  acceptOrganizationInviteSchema,
  createApiKeySchema,
  createContactSchema,
  createOrganizationInviteSchema,
  createCustomFieldSchema,
  createStatusSchema,
  createTagSchema,
  createTicketSchema,
  deleteStatusSchema,
  patchSettingsSchema,
  reorderCustomFieldsSchema,
  redeemOrganizationInviteSchema,
  reorderStatusesSchema,
  seedManualLaneOrdersSchema,
  updateContactSchema,
  updateCustomFieldSchema,
  updateStatusSchema,
  updateTagSchema,
  updateOrganizationSchema,
  updateTicketSchema,
  updateUserRoleSchema,
} from "@server/lib/validation/schemas";

export type RequestBodyKind =
  | { kind: "json"; schema: z.ZodType }
  | { kind: "optional-json"; schema: z.ZodType };

/** REST request bodies keyed by operation name. */
export const REQUEST_BODY_BY_OPERATION: Record<string, RequestBodyKind> = {
  tasqex_create_ticket: { kind: "json", schema: createTicketSchema },
  tasqex_update_ticket: { kind: "json", schema: updateTicketSchema },
  tasqex_create_ticket_comment: { kind: "json", schema: commentInputSchema },
  tasqex_update_ticket_comment: { kind: "json", schema: commentUpdateSchema },
  tasqex_set_board_lane_order: { kind: "json", schema: boardLaneOrderSchema },
  tasqex_seed_manual_board_orders: {
    kind: "json",
    schema: seedManualLaneOrdersSchema,
  },
  tasqex_move_ticket_on_board: { kind: "json", schema: boardMoveTicketSchema },
  tasqex_create_contact: { kind: "json", schema: createContactSchema },
  tasqex_update_contact: { kind: "json", schema: updateContactSchema },
  tasqex_create_tag: { kind: "json", schema: createTagSchema },
  tasqex_update_tag: { kind: "json", schema: updateTagSchema },
  tasqex_create_status: { kind: "json", schema: createStatusSchema },
  tasqex_update_status: { kind: "json", schema: updateStatusSchema },
  tasqex_delete_status: { kind: "optional-json", schema: deleteStatusSchema },
  tasqex_reorder_statuses: { kind: "json", schema: reorderStatusesSchema },
  tasqex_create_custom_field: { kind: "json", schema: createCustomFieldSchema },
  tasqex_update_custom_field: { kind: "json", schema: updateCustomFieldSchema },
  tasqex_reorder_custom_fields: {
    kind: "json",
    schema: reorderCustomFieldsSchema,
  },
  tasqex_patch_settings: { kind: "json", schema: patchSettingsSchema },
  tasqex_create_api_key: { kind: "json", schema: createApiKeySchema },
  tasqex_update_organization: { kind: "json", schema: updateOrganizationSchema },
  tasqex_create_organization_invite: {
    kind: "json",
    schema: createOrganizationInviteSchema,
  },
  tasqex_redeem_organization_invite: {
    kind: "json",
    schema: redeemOrganizationInviteSchema,
  },
  tasqex_accept_organization_invite: {
    kind: "json",
    schema: acceptOrganizationInviteSchema,
  },
  tasqex_update_user_role: { kind: "json", schema: updateUserRoleSchema },
};

export function listOperationsWithRequestBodies(): string[] {
  return Object.keys(REQUEST_BODY_BY_OPERATION);
}

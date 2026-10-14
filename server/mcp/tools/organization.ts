import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  acceptOrganizationInviteSchema,
  createOrganizationInviteSchema,
  parseBody,
  updateOrganizationSchema,
} from "@server/lib/validation/schemas";
import {
  acceptInvite,
  createInvite,
  getOrganization,
  listInvites,
  revokeInvite,
  updateOrganizationName,
} from "@server/services/organization";
import { registerAuthedTool, toolResult, uuid } from "../core";

export function registerOrganizationTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_get_organization",
    {
      title: "Get Organization",
      description: "Return the workspace organization.",
      inputSchema: {},
    },
    async () => toolResult(await getOrganization()),
  );

  registerAuthedTool(
    server,
    "ticqex_update_organization",
    {
      title: "Update Organization",
      description: "Rename the workspace. Admin only.",
      inputSchema: updateOrganizationSchema.shape,
      admin: true,
    },
    async (input) =>
      toolResult(
        await updateOrganizationName(parseBody(updateOrganizationSchema, input).name),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_list_organization_invites",
    {
      title: "List Organization Invites",
      description: "List pending invite links. Admin only.",
      inputSchema: {},
      admin: true,
    },
    async () => toolResult(await listInvites()),
  );

  registerAuthedTool(
    server,
    "ticqex_create_organization_invite",
    {
      title: "Create Organization Invite",
      description:
        "Create or refresh an invite link for an email address. The link is returned; it is not emailed. Admin only.",
      inputSchema: createOrganizationInviteSchema.shape,
      admin: true,
    },
    async (input, auth) => {
      const body = parseBody(createOrganizationInviteSchema, input);
      return toolResult(
        await createInvite({
          email: body.email,
          role: body.role,
          invitedBy: auth.userId,
        }),
      );
    },
  );

  registerAuthedTool(
    server,
    "ticqex_revoke_organization_invite",
    {
      title: "Revoke Organization Invite",
      description: "Revoke a pending invite. Admin only.",
      inputSchema: { id: uuid },
      admin: true,
    },
    async (input) => toolResult(await revokeInvite(input.id)),
  );

  registerAuthedTool(
    server,
    "ticqex_accept_organization_invite",
    {
      title: "Accept Organization Invite",
      description:
        "Accept an invite as the signed-in user. The account email must match the invite.",
      inputSchema: acceptOrganizationInviteSchema.shape,
    },
    async (input, auth) =>
      toolResult(
        await acceptInvite({
          token: parseBody(acceptOrganizationInviteSchema, input).token,
          userId: auth.userId,
        }),
      ),
  );
}

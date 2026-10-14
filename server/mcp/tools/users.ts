import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { parseBody, updateUserRoleSchema } from "@server/lib/validation/schemas";
import { removeMember, updateMemberRole } from "@server/services/organization";
import { registerAuthedTool, toolResult, uuid } from "../core";
import { getMe, listUsers } from "@server/services/users";

export function registerUserTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_get_me",
    {
      title: "Get Current User",
      description: "Return the Ticqex user associated with the API key.",
      inputSchema: {},
    },
    async (_input, auth) => toolResult(await getMe(auth.userId)),
  );

  registerAuthedTool(
    server,
    "ticqex_list_users",
    {
      title: "List Users",
      description: "List active members available for assignment.",
      inputSchema: {},
    },
    async () => toolResult(await listUsers()),
  );

  registerAuthedTool(
    server,
    "ticqex_update_user_role",
    {
      title: "Update User Role",
      description: "Change a member's role. Admin only. The last admin stays an admin.",
      inputSchema: { id: uuid, ...updateUserRoleSchema.shape },
      admin: true,
    },
    async (input) => {
      const body = parseBody(updateUserRoleSchema, { role: input.role });
      return toolResult(await updateMemberRole(input.id, body.role));
    },
  );

  registerAuthedTool(
    server,
    "ticqex_remove_user",
    {
      title: "Remove User",
      description:
        "Remove a member from the workspace. Admin only. The last admin cannot be removed.",
      inputSchema: { id: uuid },
      admin: true,
    },
    async (input, auth) => toolResult(await removeMember(auth.userId, input.id)),
  );
}

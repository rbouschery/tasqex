import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBoardTools } from "./tools/board";
import { registerContactTools } from "./tools/contacts";
import { registerOrganizationTools } from "./tools/organization";
import { registerCustomFieldTools } from "./tools/custom-fields";
import { registerSettingsTools } from "./tools/settings";
import { registerStatusTools } from "./tools/statuses";
import { registerTagTools } from "./tools/tags";
import { registerTicketTools } from "./tools/tickets";
import { registerUserTools } from "./tools/users";

export function registerTasqexTools(server: McpServer) {
  registerUserTools(server);
  registerOrganizationTools(server);
  registerTicketTools(server);
  registerBoardTools(server);
  registerContactTools(server);
  registerStatusTools(server);
  registerTagTools(server);
  registerCustomFieldTools(server);
  registerSettingsTools(server);
}

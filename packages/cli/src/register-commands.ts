import { Command } from "commander";
import { authLogin, authLogout, authStatus } from "./auth.js";
import { getOperation } from "./command-catalog.js";
import { executeOperation, type GlobalOptions } from "./execute.js";
import { CliUsageError } from "./output.js";

type CommandAction = (options: GlobalOptions, command: Command) => Promise<void>;

function collectUnknownOptions(
  command: Command,
  options: GlobalOptions,
): GlobalOptions {
  const merged: GlobalOptions = { ...options };
  const rawOptions = command.optsWithGlobals();

  for (const [key, value] of Object.entries(rawOptions)) {
    if (!(key in merged)) {
      merged[key] = value;
    }
  }

  return merged;
}

function bindOperation(operationName: string): CommandAction {
  return async (options, command) => {
    const merged = collectUnknownOptions(command, options);
    await executeOperation(operationName, merged);
  };
}

function bindAuth(
  handler: (options: GlobalOptions) => Promise<void>,
): CommandAction {
  return async (options, command) => {
    const merged = collectUnknownOptions(command, options);
    await handler(merged);
  };
}

function addGlobalOptions(command: Command): Command {
  return command
    .option("--instance <url>", "Tasqex instance URL")
    .option("--api-key <key>", "API key (tq_live_*)")
    .option("--json", "Output JSON (default: true)", true);
}

function addInputOption(command: Command): Command {
  return command.option("--input <json>", "JSON input object");
}

function registerOperationCommand(
  parent: Command,
  name: string,
  description: string,
  operationName: string,
): Command {
  const operation = getOperation(operationName);
  const cmd = parent.command(name).description(description);
  addInputOption(cmd);

  if (operation) {
    for (const param of operation.pathParams) {
      cmd.option(`--${param.replace(/_/g, "-")} <value>`, `${param} path parameter`);
    }
    for (const param of operation.queryParams) {
      cmd.option(`--${param.replace(/_/g, "-")} <value>`, `${param} query parameter`);
    }
  }

  cmd.action(bindOperation(operationName));
  return cmd;
}

export function createProgram(): Command {
  const program = addGlobalOptions(new Command());
  program
    .name("tasqex")
    .description("Tasqex REST API command-line interface")
    .showHelpAfterError("(use --help for usage)");

  const call = program.command("call").description("Execute a catalog operation by MCP name");
  addInputOption(call)
    .argument("<operation>", "Operation name (e.g. tasqex_get_me)")
    .action(async (operation: string, options: GlobalOptions, command: Command) => {
      const merged = collectUnknownOptions(command, options);
      await executeOperation(operation, merged);
    });

  const auth = program.command("auth").description("Manage stored API credentials");
  auth
    .command("login")
    .description("Store API key for an instance (requires --instance)")
    .action(bindAuth(authLogin));
  auth.command("logout").description("Clear stored credentials").action(bindAuth(authLogout));
  auth.command("status").description("Show auth status").action(bindAuth(authStatus));

  const users = program.command("users").description("User operations");
  registerOperationCommand(users, "me", "Get current user", "tasqex_get_me");
  registerOperationCommand(users, "list", "List users", "tasqex_list_users");
  registerOperationCommand(users, "update-role", "Change a member role", "tasqex_update_user_role");
  registerOperationCommand(users, "remove", "Remove a member", "tasqex_remove_user");

  const organization = program.command("organization").description("Organization and invites");
  registerOperationCommand(organization, "get", "Get the organization", "tasqex_get_organization");
  registerOperationCommand(
    organization,
    "update",
    "Rename the organization",
    "tasqex_update_organization",
  );
  const invites = organization.command("invites").description("Invite links");
  registerOperationCommand(invites, "list", "List pending invites", "tasqex_list_organization_invites");
  registerOperationCommand(invites, "create", "Create an invite link", "tasqex_create_organization_invite");
  registerOperationCommand(invites, "revoke", "Revoke an invite", "tasqex_revoke_organization_invite");
  registerOperationCommand(invites, "preview", "Preview an invite", "tasqex_preview_organization_invite");
  registerOperationCommand(invites, "redeem", "Create an account from an invite", "tasqex_redeem_organization_invite");
  registerOperationCommand(invites, "accept", "Accept an invite as the current user", "tasqex_accept_organization_invite");

  const tickets = program.command("tickets").description("Task operations");
  registerOperationCommand(tickets, "list", "List tasks", "tasqex_list_tickets");
  registerOperationCommand(tickets, "create", "Create task", "tasqex_create_ticket");
  registerOperationCommand(tickets, "get", "Get task", "tasqex_get_ticket");
  registerOperationCommand(tickets, "summary", "Get task summary", "tasqex_get_ticket_summary");
  registerOperationCommand(tickets, "context", "Get task context", "tasqex_get_ticket_context");
  registerOperationCommand(tickets, "update", "Update task", "tasqex_update_ticket");
  registerOperationCommand(tickets, "delete", "Delete task", "tasqex_delete_ticket");

  const ticketComments = tickets.command("comments").description("Task comment operations");
  registerOperationCommand(ticketComments, "list", "List comments", "tasqex_list_ticket_comments");
  registerOperationCommand(ticketComments, "create", "Create comment", "tasqex_create_ticket_comment");
  registerOperationCommand(ticketComments, "update", "Update comment", "tasqex_update_ticket_comment");
  registerOperationCommand(ticketComments, "delete", "Delete comment", "tasqex_delete_ticket_comment");

  const board = program.command("board").description("Board operations");
  registerOperationCommand(board, "get", "Get board", "tasqex_get_board");
  registerOperationCommand(
    board,
    "filter-options",
    "Get board filter options",
    "tasqex_get_board_filter_options",
  );
  registerOperationCommand(
    board,
    "move-ticket",
    "Move ticket on board",
    "tasqex_move_ticket_on_board",
  );
  registerOperationCommand(
    board,
    "seed-manual-order",
    "Seed manual board order",
    "tasqex_seed_manual_board_orders",
  );

  const boardLanes = board.command("lanes").description("Board lane operations");
  registerOperationCommand(
    boardLanes,
    "tickets",
    "List lane tasks",
    "tasqex_get_board_lane_tickets",
  );
  registerOperationCommand(
    boardLanes,
    "set-order",
    "Set lane order",
    "tasqex_set_board_lane_order",
  );

  const contacts = program.command("contacts").description("Contact operations");
  registerOperationCommand(contacts, "list", "List contacts", "tasqex_list_contacts");
  registerOperationCommand(contacts, "get", "Get contact", "tasqex_get_contact");
  registerOperationCommand(contacts, "create", "Create contact", "tasqex_create_contact");
  registerOperationCommand(contacts, "update", "Update contact", "tasqex_update_contact");
  registerOperationCommand(contacts, "delete", "Delete contact", "tasqex_delete_contact");

  const tags = program.command("tags").description("Tag operations");
  registerOperationCommand(tags, "list", "List tags", "tasqex_list_tags");
  registerOperationCommand(tags, "create", "Create tag", "tasqex_create_tag");
  registerOperationCommand(tags, "update", "Update tag", "tasqex_update_tag");
  registerOperationCommand(tags, "delete", "Delete tag", "tasqex_delete_tag");

  const statuses = program.command("statuses").description("Status operations");
  registerOperationCommand(statuses, "list", "List statuses", "tasqex_list_statuses");
  registerOperationCommand(statuses, "create", "Create status", "tasqex_create_status");
  registerOperationCommand(statuses, "update", "Update status", "tasqex_update_status");
  registerOperationCommand(statuses, "delete", "Delete status", "tasqex_delete_status");
  registerOperationCommand(statuses, "reorder", "Reorder statuses", "tasqex_reorder_statuses");

  const customFields = program.command("custom-fields").description("Custom field operations");
  registerOperationCommand(customFields, "list", "List custom fields", "tasqex_list_custom_fields");
  registerOperationCommand(customFields, "create", "Create custom field", "tasqex_create_custom_field");
  registerOperationCommand(customFields, "update", "Update custom field", "tasqex_update_custom_field");
  registerOperationCommand(customFields, "delete", "Delete custom field", "tasqex_delete_custom_field");
  registerOperationCommand(
    customFields,
    "reorder",
    "Reorder custom fields",
    "tasqex_reorder_custom_fields",
  );

  const settings = program.command("settings").description("Settings operations");
  registerOperationCommand(settings, "get", "Get settings", "tasqex_get_settings");
  registerOperationCommand(settings, "patch", "Patch settings", "tasqex_patch_settings");

  const apiKeys = program.command("api-keys").description("API key management (admin, REST-only)");
  registerOperationCommand(apiKeys, "list", "List API keys", "tasqex_list_api_keys");
  registerOperationCommand(apiKeys, "create", "Create API key", "tasqex_create_api_key");
  registerOperationCommand(apiKeys, "revoke", "Revoke API key", "tasqex_revoke_api_key");

  return program;
}

export async function runCli(argv: string[]): Promise<number> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof CliUsageError) {
      throw error;
    }
    throw error;
  }
}

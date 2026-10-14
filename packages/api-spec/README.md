# @tasqex/api-spec

Shared operation catalog for the Tasqex REST API (`/api/v1/*`).

Used by:

- `@tasqex/cli` — command routing
- `pnpm openapi:generate` — OpenAPI spec generation

Each operation maps an MCP tool name to an HTTP method and path template.
Invite preview and redeem are public REST operations and are not MCP tools.
API key management and the activity log are REST-only as well.

# @tasqex/cli

Headless command-line interface for the Tasqex REST API (`/api/v1`).

Full request schemas: [`docs/openapi.yaml`](../../docs/openapi.yaml) in the repo root (regenerate with `pnpm openapi:generate`).

## Install

From npm:

```bash
pnpm dlx @tasqex/cli --help
```

If you prefer a project dependency:

```bash
pnpm add -D @tasqex/cli
pnpm exec tasqex --help
```

From the monorepo:

```bash
pnpm --filter @tasqex/cli... build
node packages/cli/dist/main.js --help
```

For other local monorepo commands, replace `tasqex` with
`node packages/cli/dist/main.js`.

## Authentication

```bash
tasqex auth login --instance https://your-instance.example.com
tasqex auth status
tasqex auth logout
```

Credentials are stored in `~/.config/tasqex/config.json` (or `$XDG_CONFIG_HOME/tasqex/config.json`).

Precedence: CLI flags (`--instance`, `--api-key`) → env (`TASQEX_INSTANCE`, `TASQEX_API_KEY`) → stored config.

Create API keys in Tasqex under **Settings → API & MCP**. `auth login` prompts for the key after you pass `--instance`.

## Usage

Execute any MCP-parity operation by name from a shell, script, or agent runtime:

```bash
tasqex call tasqex_get_me
tasqex call tasqex_list_tickets --input '{"page":1,"per_page":20}'
tasqex call tasqex_create_ticket --input '{"title":"Login issue","kind":"task"}'
```

Friendly command groups mirror the API:

```bash
tasqex users me
tasqex tickets list --page 1 --per-page 20
tasqex organization invites create --input '{"email":"ada@example.com","role":"member"}'
tasqex board get
tasqex board move-ticket --input '{"ticket_id":"<uuid>","status_id":"<uuid>"}'
```

Output is JSON on stdout. Errors are JSON on stderr with exit code `1` (API) or `2` (usage).

## Notes

- The CLI talks to `/api/v1` on your Tasqex instance.
- `@tasqex/api-client` is a runtime dependency.
- `@tasqex/api-spec` is bundled into the CLI build and is not required at install time.

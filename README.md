<p align="center">
  <strong>A shared task board for people and agents — lanes, tasks, comments, and one workspace.</strong>
</p>

<hr />

<p align="center">
  <a href="https://github.com/rbouschery/tasqex/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/rbouschery/tasqex/ci.yml?branch=main&label=CI" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/rbouschery/tasqex" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/status-pre--1.0-orange" alt="Status: pre-1.0">
  <img src="https://img.shields.io/badge/open--source-free-brightgreen" alt="Open-Source · Free">
</p>

## What is Tasqex?

Tasqex is a small collaborative task manager. People and API clients work the same Kanban board: tasks move across lanes, comments stay on the task, and tags and custom fields are shared. Every board action is available in the admin UI, the REST API (`/api/v1`), MCP (`/api/mcp`), the TypeScript client, and the CLI.

One deployment is one organization. Admins invite people with a link, choose `admin` or `member`, and can remove members. Running another organization means running another instance.

Tasqex is built with Next.js and Supabase (Postgres, Auth, Realtime). Roughly based on [ticqex](https://github.com/rbouschery/ticqex).

<p align="center">
  Built by
  <a href="https://x.com/RBouschery"><img src="https://img.shields.io/badge/X-RBouschery-black?logo=x&logoColor=white" alt="X: @RBouschery"></a>
  <a href="https://www.linkedin.com/in/rbouschery"><img src="https://img.shields.io/badge/LinkedIn-rbouschery-0A66C2?logo=linkedin&logoColor=white" alt="LinkedIn: rbouschery"></a>
</p>

## Quick start (local)

Prerequisites: Node 20+ (dev pinned to 22, see `[.nvmrc](./.nvmrc)`), [pnpm](https://pnpm.io/), [Docker](https://www.docker.com/) (for local Supabase).

```bash
pnpm install       # also builds workspace packages (@tasqex/api-spec, etc.)
pnpm tasqex init   # interactive: local Supabase and env
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (not `127.0.0.1`), sign in with the `SEED_ADMIN_*` credentials from `.env.local`, and confirm [http://localhost:3000/api/health](http://localhost:3000/api/health) returns `"database":"ok"`.

What `init` does:

- **Supabase** — choose `local` to start Docker Supabase, write its keys to `.env.local`, bootstrap required board data, and optionally seed an admin user. Choose `skip` if the database is already set up (`pnpm tasqex init --supabase skip`). `start` applies pending migrations and bootstraps; `reset` wipes the local database first.
- **App URL** — `NEXT_PUBLIC_APP_URL`, used in invite links. `http://localhost:3000` is fine locally.
- **Config** — writes `config/tasqex.config.json` (`config/tasqex.config.example.json` is the template). Channels and integrations are empty.

`pnpm tasqex init` is local-only; for production see [Deploy](#deploy-supabase-cloud--vercel).

### Manual setup (without the CLI)

The explicit equivalent of `init`, useful for CI or full control:

```bash
pnpm install       # builds workspace packages
cp config/tasqex.config.example.json config/tasqex.config.json
cp .env.example .env.local
pnpm db:start        # local Supabase (Docker); if stale: pnpm db:stop && pnpm db:start
pnpm db:env          # write Supabase keys → .env.local
pnpm db:bootstrap    # required statuses, settings, and the organization row
pnpm db:seed-admin   # first admin from SEED_ADMIN_* in .env.local
pnpm config:check && pnpm env:verify
pnpm dev
```

## Organization and invites

Settings → Organization is admin-only.

- Rename the workspace.
- Invite by email and role (`admin` or `member`). Tasqex does not send the email. It returns a link, `/invite/<token>`, for you to copy. `NEXT_PUBLIC_APP_URL` is the link's origin. Links expire after 7 days. Creating another invite for the same address refreshes the pending link.
- The invited person opens the link, sets a password, and joins. Sign-in is limited to active members.
- Change a member's role, or remove them. Removal marks the account inactive, revokes their API keys, and blocks sign-in. The last admin cannot be removed or changed to a member.

The same actions are on the API and, except public redeem, on MCP. See [Connect an agent](#connect-an-agent-headless-api--mcp).

## Deploy (Supabase Cloud + Vercel)

You need a Supabase project, a Vercel project connected to this repo, and both CLIs logged in (`supabase login`, `vercel login`). Remote migrations change a real database.

1. **Prepare** — `pnpm install`, then create `config/tasqex.config.json` from the example.
2. **Supabase** — link and migrate against your project ref (from `https://<project-ref>.supabase.co`):
  ```bash
   supabase link --project-ref <project-ref>
   supabase db push --linked
   supabase db query --linked -f supabase/bootstrap.sql
  ```
3. **Vercel** — import the repo (or `vercel link`) and set the [environment variables](#environment-reference) for Production and Preview: the three Supabase keys (from Supabase **Project Settings → API Keys**) and `NEXT_PUBLIC_APP_URL` (your production URL, used in invite links). Deploy:
  ```bash
   vercel deploy --prod
  ```
4. **First admin** — with the cloud URL and secret key, plus `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, in the shell:
  ```bash
   pnpm db:seed-admin
  ```
   Further people join through invite links. Accounts created without an invite stay inactive and cannot sign in.
5. **Verify** — `https://<host>/api/health` returns `"database":"ok"`, then sign in as the seed admin and create an invite from Settings → Organization.

## Environment reference


| Variable                                   | Source                                                | Required for                                         |
| ------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                 | `pnpm db:env` / Supabase dashboard                    | App + API                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`     | `pnpm db:env` / Supabase dashboard                    | App auth (client)                                    |
| `SUPABASE_SECRET_KEY`                      | `pnpm db:env` / Supabase dashboard                    | Admin seed, server jobs                              |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `.env.example` defaults                               | `pnpm db:seed-admin`                                 |
| `NEXT_PUBLIC_APP_URL`                      | init / you                                            | Origin used in invite links                          |


## Connect an agent (headless API & MCP)

Agents and other headless clients connect like any automation: **REST** (`/api/v1/`*) or **MCP** (`/api/mcp`), both authenticated with a Bearer API key.

1. Sign in as an admin and open **Settings → API & MCP**.
2. Create an API key and copy it once (it is not shown again).
3. Point your client at `{NEXT_PUBLIC_APP_URL}/api/mcp` with `Authorization: Bearer <key>` — the settings page has copy-paste snippets for Cursor, Codex, Claude Code, and similar clients. HTTP-only integrations use the same key against `/api/v1/`*.

MCP tools cover tasks, comments, board moves, contacts, tags, statuses, custom fields, settings, the organization, invites, and member roles. Parity is checked in `tests/unit/mcp-api-parity.test.ts` and `tests/unit/cli-mcp-parity.test.ts`. API key lifecycle and the activity log stay on REST. Invite preview (`GET /organization/invites/preview`) and redeem (`POST /organization/invites/redeem`) are public and are not MCP tools. Request and response shapes are in [`docs/openapi.yaml`](docs/openapi.yaml).

### Published packages

Tasqex publishes two public npm packages:

- [`@tasqex/cli`](https://www.npmjs.com/package/@tasqex/cli) — a shell-friendly headless client for agents, scripts, and release checks.
- [`@tasqex/api-client`](https://www.npmjs.com/package/@tasqex/api-client) — a small TypeScript client for headless REST API integrations.

`@tasqex/api-spec` is intentionally internal. The CLI bundles the operation catalog it needs, so consumers do not need to install or depend on the spec package.

### Agent CLI (`@tasqex/cli`)

For shell-based agents and scripts, run the published CLI:

```bash
pnpm dlx @tasqex/cli --help
tasqex auth login --instance https://your-instance.example.com
tasqex tickets list --page 1 --json
tasqex call tasqex_create_ticket --input '{"title":"Write the brief","kind":"task"}'
tasqex organization invites list
```

`auth login` prompts for an API key from **Settings → API & MCP**. You can also skip stored credentials and pass `--instance` / `--api-key`, or set `TASQEX_INSTANCE` and `TASQEX_API_KEY`.

When developing from this repo, use `node packages/cli/dist/main.js` after `pnpm --filter @tasqex/cli... build`.

See [`packages/cli/README.md`](packages/cli/README.md). Request schemas: [`docs/openapi.yaml`](docs/openapi.yaml).

### TypeScript API client (`@tasqex/api-client`)

Install the client when you want to call Tasqex from an app, worker, integration, or agent runtime:

```bash
pnpm add @tasqex/api-client
```

```typescript
import { TasqexClient } from "@tasqex/api-client";

const client = new TasqexClient({
  baseUrl: "https://your-instance.example.com",
  apiKey: process.env.TASQEX_API_KEY!,
});

const tickets = await client.get("/tickets", { page: 1, per_page: 25 });
const created = await client.post("/tickets", {
  title: "Write the brief",
  kind: "task",
});
```

Paths are relative to `/api/v1`; the client adds that prefix for you. See [`packages/api-client/README.md`](packages/api-client/README.md).

OpenAPI spec: [`docs/openapi.yaml`](docs/openapi.yaml) — regenerate with `pnpm openapi:generate`, verify with `pnpm openapi:check`.

## Scripts


| Command                                        | Description                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev` / `build` / `lint`                  | Dev server, production build, ESLint                                    |
| `pnpm tasqex init`                             | Interactive local setup: Supabase, app URL, activation config           |
| `pnpm config:check`                            | Validate `config/tasqex.config.json` bindings and required env vars     |
| `pnpm config:sync`                             | Validate activation JSON and print planned channel field sync (dry-run) |
| `pnpm env:verify`                              | Check Supabase env vars                                                 |
| `pnpm db:start` / `db:stop` / `db:reset`       | Local Supabase lifecycle (`reset` wipes local data)                     |
| `pnpm db:env`                                  | Sync Supabase keys → `.env.local`                                       |
| `pnpm db:bootstrap`                            | Required statuses, settings, and the organization row                   |
| `pnpm db:seed-admin`                           | Create the first admin from `SEED_ADMIN_*`                              |
| `pnpm test` / `test:unit` / `test:integration` | Vitest suites under `tests/`                                            |
| `pnpm openapi:generate` / `openapi:check`      | Generate or verify `docs/openapi.yaml`                                  |
| `pnpm build:packages` / `test:packages`        | Build and test `@tasqex/*` workspace packages                           |
| `pnpm seed:board-load`                         | Optional: large board dataset for manual load testing                   |


## Tests

Unit tests run without Supabase; integration tests need local Supabase and a seed admin:

```bash
pnpm test:unit
pnpm db:start && pnpm db:env && pnpm db:seed-admin && pnpm test:integration
```

Integration tests call `server/services` directly, except the MCP route test which needs `pnpm dev` running on `http://localhost:3000` (override with `LOCAL_APP_URL`; set `SKIP_MCP_INTEGRATION=1` to skip it).

## Project layout


| Path                                | Purpose                                                             |
| ----------------------------------- | ------------------------------------------------------------------- |
| `src/app/`                          | Next.js App Router — admin UI, `/api/v1/*`, webhooks, MCP           |
| `src/components/`                   | React components (board, settings, account)                         |
| `server/services/`                  | Business logic (tasks, board, comments, organization, …)           |
| `server/channels/`                  | Channel registry (no channels ship in this build)                   |
| `server/integrations/`              | Integration registry (empty in this build)                          |
| `server/lib/`, `server/middleware/` | Route handlers, auth, validation, errors                            |
| `shared/`                           | Code shared between client and server (config, registries, schemas) |
| `config/`                           | Activation config (`tasqex.config.json`, committed)                 |
| `scripts/`                          | Setup/seed/verify CLIs (`pnpm tasqex`, `db:*`, `config:*`)          |
| `supabase/migrations/`              | Database schema                                                     |
| `tests/unit`, `tests/integration`   | Vitest suites (helpers in `tests/helpers/`)                         |


## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding standards, and the PR workflow. Security issues: see [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
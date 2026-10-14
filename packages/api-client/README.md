# @tasqex/api-client

TypeScript client for headless access to the [Tasqex](https://github.com/rbouschery/tasqex) REST API (`/api/v1`).

## Install

```bash
pnpm add @tasqex/api-client
```

## Quickstart

```typescript
import { TasqexClient } from "@tasqex/api-client";

const client = new TasqexClient({
  baseUrl: "https://your-instance.example.com",
  apiKey: process.env.TASQEX_API_KEY!,
});

const ticket = await client.get<{ id: string }>("/tickets/550e8400-e29b-41d4-a716-446655440000");

const created = await client.post("/tickets", {
  title: "Login issue",
  kind: "task",
});

const tickets = await client.get("/tickets", { page: 1, per_page: 25 });
```

Create API keys in Tasqex under **Settings → API & MCP**. Use the same key for REST, MCP, the CLI, and this client when running Tasqex headlessly.

## API

- `get(path, query?)`, `post(path, body?)`, `patch(path, body?)`, `put(path, body?)`, `delete(path, body?)`
- `request({ method, path, query?, body? })` for full control
- Paths are relative to `/api/v1` (e.g. `/tickets`, not `/api/v1/tickets`)
- `baseUrl` may include or omit a trailing slash and `/api/v1` suffix; both are normalized
- Errors throw `TasqexApiError` with `status`, `code`, and `message`

## Error handling

```typescript
import { TasqexApiError, TasqexClient } from "@tasqex/api-client";

const client = new TasqexClient({
  baseUrl: "https://your-instance.example.com",
  apiKey: process.env.TASQEX_API_KEY!,
});

try {
  await client.post("/tickets", { title: "Missing contact", kind: "task" });
} catch (error) {
  if (error instanceof TasqexApiError) {
    console.error(error.status, error.code, error.message);
  }
}
```

## Common calls

```typescript
await client.get("/users/me");
await client.get("/board");
await client.get("/tickets", { page: 1, per_page: 25 });
await client.post("/tickets", {
  title: "Login issue",
  kind: "task",
});
await client.patch("/tickets/<ticket-id>", {
  status_id: "<status-id>",
});
```

## Requirements

Node.js 20+ (uses native `fetch`).

## Development

```bash
pnpm build
pnpm test
```

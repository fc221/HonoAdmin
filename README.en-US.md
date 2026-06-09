# HonoAdmin

[中文](./README.md) | English

HonoAdmin is a front/back separated admin foundation. The server is a Hono API with native SQL, online migrations, and runtime adapters. The console is a Vue 3 SPA for `/admin/*` and `/user/*` built with Naive UI and Tailwind CSS. The public app is an Astro placeholder for future SEO pages.

Runtime resources are exposed through Hono Context as `c.runtime`, `c.db`, `c.cache`, `c.config`, and `c.now()`. Bun, Cloudflare Workers/D1, SQLite, MySQL, and PostgreSQL differences stay inside adapters.

## Stack

- Monorepo: Bun Workspaces.
- Server: Hono + TypeScript + Zod + OpenAPI metadata.
- Console: Vue 3 + Vite + Vue Router + Pinia + Naive UI + Tailwind CSS.
- Public: Astro placeholder.
- Database: native SQL + SQLite/D1, MySQL, PostgreSQL adapters and migrations.
- Runtime: Bun and Cloudflare Workers builds.

## Layout

```txt
apps/server   Hono API, services, migrations, Bun/Workers entries, backend utils
apps/console  Vue SPA with admin/user pages, router, stores, components
apps/public   Astro public app placeholder
packages/db   DBAdapter and SQLite/D1/MySQL/PostgreSQL implementations
packages/cache  CacheAdapter and memory/KV/noop implementations
packages/file-storage  file storage contract and local/S3 implementations
packages/runtime  runtime factory, bootstrap, security config, context types
packages/domain  reusable pure domain logic
docs          architecture, CRUD, security, deployment, performance guides
```

## Development

Install dependencies:

```bash
bun install
```

Run server and console in two terminals:

```bash
bun run dev:server
bun run dev:console
```

Default URLs:

- Server API: `http://127.0.0.1:3000`
- Console: `http://127.0.0.1:5173`
- Install: `http://127.0.0.1:5173/install`

If `5173` is occupied:

```bash
cd apps/console
bunx vite --host 127.0.0.1 --port 5175
```

## Auth

The console currently uses browser sessions:

- `/api/auth/login` writes the `hono_admin_session` httpOnly cookie.
- `/api/auth/session` reads the current user.
- `/api/auth/logout` clears the cookie.
- `/api/admin/*` and `/api/user/*` are protected by session middleware; admin paths also check menu/action permissions.
- The console client sends `credentials: 'include'`.

API tokens are reserved for external clients. `apps/server/src/service/user/api-token.ts` contains Bearer JWT issue/verify/revoke logic, but the console does not use it.

## Checks

```bash
bun run typecheck
bun run lint
bun test
bun run build
bun run build:bun
bun run build:workers
bun run audit:structure
```

See [Cloudflare Workers deployment](./docs/CLOUDFLARE_WORKERS.en-US.md) and [Security](./docs/SECURITY.en-US.md).

# HonoAdmin Architecture

## Summary

HonoAdmin is a front/back separated monorepo:

- `apps/server`: Hono API, Bun and Workers entrypoints, service layer, migrations, and backend utilities.
- `apps/console`: Vue 3 SPA for both Admin (`/admin/*`) and User (`/user/*`).
- `apps/public`: plain HTML placeholder, reserved for future SSR Vue or hand-written HTML. It ships a single `index.html` until the public scope starts.
- `apps/console/src/components`: Naive UI wrappers plus Tailwind CSS layout primitives.
- `packages/runtime`: runtime factory, bootstrap, security config, and runtime context types.
- `packages/db`: DB adapter contract and SQLite/D1/MySQL/PostgreSQL adapters.
- `packages/cache`: cache adapter contract and memory/KV/noop adapters.
- `packages/file-storage`: file storage contract and local/S3 adapters.
- `packages/domain`: reusable pure domain targets.

Console pages are Vue routes, not server-rendered route files.

## Layers

- `apps/server/src/api`: Hono API route entries, OpenAPI registration, API boundary validation, and route grouping.
- `apps/server/src/api/schema.ts`, `client.ts`, and `openapi.ts`: shared API DTO schemas, the typed API client used by console, and documentation metadata.
- `apps/server/src/service`: business workflows and middleware. This layer consumes context resources but does not detect runtime details.
- `apps/server/src/migrations`: append-only database migrations and migration runner.
- `apps/server/src/utils`: backend helpers, errors, response shapes, and small shared utilities.
- `apps/console/src/views`: route-view level data loading and Vue composition.
- `apps/console/src/components`: shared layout primitives, theme tokens, menu/sidebar/header, forms, tables, modals, drawers, tabs, upload, and common controls.
- `packages/runtime`: runtime creation, bootstrap config, security runtime config, and runtime context types.
- `packages/db`, `packages/cache`, `packages/file-storage`: adapter contracts and implementations.
- `docs`: persistent architecture and implementation guidance.

## Runtime Context

Runtime resources are created by `packages/runtime` and attached by `apps/server/src/service/middleware/context`.

Handlers should read:

- `c.runtime` for the full runtime object.
- `c.db` for SQL access.
- `c.cache` for cache access.
- `c.config` for runtime configuration.
- `c.now()` for request-time epoch millisecond timestamps.

Business code must not inspect `Bun`, Cloudflare bindings, or environment globals directly. Runtime detection belongs in runtime factories and adapters.

The direct context fields are a project-level Hono `Context` extension. Do not introduce new core resources by ad-hoc assignment in route files. Add the field to the runtime/context type, attach it in `service/middleware/context`, and document the extension point here.

## Database

The database layer uses native SQL behind `DBAdapter` from `@hono-admin/db`.

Current targets:

- Bun local/runtime development: SQLite, MySQL, and PostgreSQL.
- Cloudflare Workers deployment: D1.

The database adapter exposes dialect, query, first-row query, execute, insert-and-return-id, transaction-like callback, batch, and optional close behavior. SQL should stay explicit and close to the feature that owns it.

## Online Migrations

Migrations run online before business handlers depend on schema.

Migration rules:

- Use an append-only migration registry.
- Never edit an already-applied migration.
- Store applied migrations in `_migrations`.
- Make each migration deterministic and idempotent at the application level.
- Add new migrations to `apps/server/src/migrations/sqlite`, `apps/server/src/migrations/mysql`, and `apps/server/src/migrations/pg` with the same id, name, and order.
- D1 uses the SQLite migration dialect. MySQL and PostgreSQL migrations are Bun runtime only.

## OpenAPI And Validation

Standalone API validation and documentation use `hono-openapi + zod`.

For Admin/User work, APIs are the frontend integration boundary. Define the route in `apps/server/src/api`, validate with local Zod schemas, and keep business logic in `apps/server/src/service`.

Small route modules may stay as a single file while they have one obvious responsibility. Once a route grows into multiple concerns, split it by surface and feature directory before adding more behavior.

API route rules:

- Define request schemas with Zod.
- Define response schemas or response metadata with OpenAPI annotations.
- Validate at the route boundary.
- Keep business services typed from validated input, not raw request data.
- Expose generated docs from a stable documentation route.

## Import Boundaries

Core modules should import from package barrels or stable package subpaths.

Allowed:

```ts
import type { DBAdapter } from '@hono-admin/db'
import { MemoryCacheAdapter } from '@hono-admin/cache/adapter/memory'
import { createAppRuntime } from '@hono-admin/runtime/factory'
```

Avoid:

```ts
import type { DBAdapter } from '@hono-admin/db'
import { MemoryCacheAdapter } from '../../some/infra/cache/adapter/memory'
```

Adapter implementations may be imported directly only by runtime factories or their own package-local factory modules.

## Extension Methods

### Add A Database Adapter

1. Add an implementation under `packages/db/src/adapter`.
2. Export shared types from `packages/db/src/index.ts`.
3. Wire the adapter in `packages/runtime/src/local-sqlite.ts` or the relevant runtime factory.
4. Add typecheck/build coverage for the target runtime.

### Add A Cache Adapter

1. Add an implementation under `packages/cache/src/adapter`.
2. Keep the public contract in `packages/cache/src/types.ts`.
3. Wire the adapter in the relevant runtime factory.

### Add A File Storage Adapter

1. Add an implementation under `packages/file-storage/src/adapter`.
2. Keep the public contract in `packages/file-storage/src/types.ts`.
3. Register the adapter in `packages/file-storage/src/factory.ts`.

### Add A Migration

1. Add the same ordered id and name under `apps/server/src/migrations/sqlite`, `apps/server/src/migrations/mysql`, and `apps/server/src/migrations/pg`.
2. Keep D1 compatible with the SQLite migration.
3. Register each dialect file in its local registry.
4. Verify repeated startup does not rerun the migration.

### Add An API Route

1. Add Zod schemas for params/query/body and response.
2. Register validation at the route boundary.
3. Attach OpenAPI metadata.
4. Keep business logic in `apps/server/src/service` if it is reusable or non-trivial.

### Add A Strategy Or Type

1. Add the implementation in its own module.
2. Register it in a typed registry or factory map.
3. Avoid adding scattered conditionals to core code.

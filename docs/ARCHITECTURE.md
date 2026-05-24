# HonoAdmin Architecture

## Summary

HonoAdmin is a HonoX application with a small runtime core, native SQL database access, context-based dependency passing, and API validation/documentation through `hono-openapi + zod`.

The architecture should make common extension work additive: adding a runtime, database adapter, cache adapter, migration, API route, or business strategy should not require rewriting core request flow.

## Layers

- `app/routes`: HonoX route entries, pages, API route entries, renderers, SSR components, and browser behavior.
- `app/service`: business workflows and middleware. This layer consumes context resources but does not detect runtime details.
- `app/infra`: adapters and runtime factories for database, cache, and platform bindings.
- `app/utils`: framework-independent helpers, errors, response shapes, and small shared utilities.
- `docs`: persistent architecture and implementation guidance.

## Runtime Context

Runtime resources are created by `infra/runtime` and attached by `service/middleware/context`.

Handlers should read:

- `c.runtime` for the full runtime object.
- `c.db` for SQL access.
- `c.cache` for cache access.
- `c.config` for runtime configuration.
- `c.now()` for request-time epoch millisecond timestamps.

Business code must not inspect `Bun`, Cloudflare bindings, or environment globals directly. Runtime detection belongs in runtime factories and adapters.

The direct context fields are a project-level Hono `Context` extension. Do not introduce new core resources by ad-hoc assignment in route files. Add the field to the runtime/context type, attach it in `service/middleware/context`, and document the extension point here.

## HonoX Pages And Browser Behavior

HonoX pages should render meaningful initial state on the server when data is available through context resources.

Shared SSR markup lives in `app/routes/-/components`. These components output HTML, daisyUI/Tailwind classes, forms, tables, modals, menus, and `data-*` hooks.

Browser-only behavior lives in `app/routes/-/browser`. This directory owns Turbo setup, Stimulus controllers, loading/confirm/CSRF helpers, upload behavior, and lifecycle code that touches `window`, `document`, `fetch`, or `localStorage`.

When a feature is only used by the HonoX page, prefer integrated mode:

- `GET /feature` renders the page from context resources.
- `POST /feature` handles form actions and redirects back to the page.
- No client-side `fetch` or standalone API is introduced unless another client needs that contract.

Admin feature pages use feature folders:

- `app/routes/admin/system/config`: configuration management page and local components.
- `app/routes/admin/system/user`: user management page and local components.

Avoid large mixed files that combine route rendering, API clients, forms, tables, and unrelated domain panels. Split page-specific UI into local `-components`, and move shared admin UI into `app/routes/admin/-components`.

Feature constants live beside the module that owns them. Layout components render their local navigation constants instead of duplicating labels, paths, or icons.

For the full admin extension checklist, see `docs/ADMIN_FEATURE_CONTRACT.md`.

## Admin Layout Cache

Admin layout data is cached in two layers:

- request-level cache avoids duplicate session/layout work during one render.
- cache-adapter TTL cache stores header profile, active menu set, roles, and site title for repeated page visits.

The cache key includes the user id, active role id, and a layout cache version. Services that change layout-visible data must call `bumpAdminLayoutCacheVersion(ctx)` so later requests use fresh data. This applies to user, role, and site config changes.

## Database

The database layer uses native SQL behind `DBAdapter`.

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
- Add new migrations to `app/migrations/sqlite`, `app/migrations/mysql`, and `app/migrations/pg` with the same id, name, and order.
- D1 uses the SQLite migration dialect. MySQL and PostgreSQL migrations are Bun runtime only.

## OpenAPI And Validation

Standalone API validation and documentation use `hono-openapi + zod`.

Do not add an API just because a page submits data. Use HonoX same-route actions first. Add APIs only when the feature needs external clients, generated documentation, or a separated integration boundary.

API route rules:

- Define request schemas with Zod.
- Define response schemas or response metadata with OpenAPI annotations.
- Validate at the route boundary.
- Keep business services typed from validated input, not raw request data.
- Expose generated docs from a stable documentation route.

## Import Boundaries

Core modules should import from package directories through `index.ts` barrels.

Allowed:

```ts
import { DatabaseError } from '../../utils'
import type { DBAdapter } from '../database'
```

Avoid:

```ts
import { DatabaseError } from '../../utils/errors'
import type { DBAdapter } from '../database/types'
import type { DBAdapter } from '../database/types.ts'
```

Adapter implementations may be imported directly only by runtime factories or adapter composition modules.

## Extension Methods

### Add A Database Adapter

1. Add an implementation under `app/infra/database/adapter`.
2. Export shared types from `app/infra/database/index.ts` only.
3. Wire the adapter in the relevant runtime factory.
4. Add typecheck/build coverage for the target runtime.

### Add A Cache Adapter

1. Add an implementation under `app/infra/cache/adapter`.
2. Keep the public contract in `CacheAdapter`.
3. Wire the adapter in the relevant runtime factory.

### Add A Migration

1. Add the same ordered id and name under `app/migrations/sqlite`, `app/migrations/mysql`, and `app/migrations/pg`.
2. Keep D1 compatible with the SQLite migration.
3. Register each dialect file in its local registry.
4. Verify repeated startup does not rerun the migration.

### Add An API Route

1. Add Zod schemas for params/query/body and response.
2. Register validation at the route boundary.
3. Attach OpenAPI metadata.
4. Keep business logic in `service` if it is reusable or non-trivial.

### Add A Strategy Or Type

1. Add the implementation in its own module.
2. Register it in a typed registry or factory map.
3. Avoid adding scattered conditionals to core code.

# HonoAdmin Architecture

## Summary

HonoAdmin is a HonoX application with a small runtime core, native SQL database access, context-based dependency passing, and API validation/documentation through `hono-openapi + zod`.

The architecture should make common extension work additive: adding a runtime, database adapter, cache adapter, migration, API route, or business strategy should not require rewriting core request flow.

## Layers

- `app/routes`: HonoX route entries, pages, API route entries, renderers, and island components.
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
- `c.now()` for request-time timestamps.

Business code must not inspect `Bun`, Cloudflare bindings, or environment globals directly. Runtime detection belongs in runtime factories and adapters.

The direct context fields are a project-level Hono `Context` extension. Do not introduce new core resources by ad-hoc assignment in route files. Add the field to the runtime/context type, attach it in `service/middleware/context`, and document the extension point here.

## HonoX Pages And Islands

HonoX pages should render meaningful initial state on the server when data is available through context resources. Islands should be limited to client-only interaction such as form state, local storage tokens, optimistic updates, and refresh actions.

Admin feature pages use feature folders:

- `app/routes/admin/config`: configuration management page and local components.
- `app/routes/admin/user`: user management page and local components.

Avoid large mixed files that combine route rendering, API clients, forms, tables, and unrelated domain panels. Split page-specific UI into local `_components`, and move shared admin UI into `app/routes/admin/_components`.

## Database

The database layer uses native SQL behind `DBAdapter`.

Current targets:

- Bun local/runtime development: SQLite.
- Cloudflare Workers deployment: D1.

The database adapter exposes query, first-row query, execute, transaction-like callback, batch, and optional close behavior. SQL should stay explicit and close to the feature that owns it.

## Online Migrations

Migrations run online before business handlers depend on schema.

Migration rules:

- Use an append-only migration registry.
- Never edit an already-applied migration.
- Store applied migrations in `_migrations`.
- Make each migration deterministic and idempotent at the application level.
- Keep migration SQL runtime-compatible with SQLite and D1 unless a migration is explicitly runtime-specific.

## OpenAPI And Validation

API validation and documentation use `hono-openapi + zod`.

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

1. Add a new migration entry with a unique ordered id.
2. Use SQL that works in both SQLite and D1 when possible.
3. Verify repeated startup does not rerun the migration.

### Add An API Route

1. Add Zod schemas for params/query/body and response.
2. Register validation at the route boundary.
3. Attach OpenAPI metadata.
4. Keep business logic in `service` if it is reusable or non-trivial.

### Add A Strategy Or Type

1. Add the implementation in its own module.
2. Register it in a typed registry or factory map.
3. Avoid adding scattered conditionals to core code.

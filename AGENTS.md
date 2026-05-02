# HonoAdmin Agent Rules

This file is the persistent project contract for agents and contributors. Read it before changing code.

## Non-Negotiable Architecture

- Use HonoX as the application framework.
- Use native SQL through the project database adapter. Do not introduce an ORM unless the project contract is changed.
- Support Bun for local/runtime development and Cloudflare Workers for deployment.
- Pass core runtime resources through the project Hono context extension: `c.runtime`, `c.db`, `c.cache`, `c.config`, and `c.now()`.
- Use `hono-openapi + zod` for API validation and documentation.
- Use online migrations. The app must ensure database migrations have run before business handlers depend on tables.

## Code Quality Rules

- Keep structure clear and modular. A file should have one obvious responsibility.
- Do not pack unrelated page rendering, client state, forms, tables, schemas, and service logic into one large file. Split by feature and responsibility once a file owns more than one domain concept.
- Prefer feature folders for admin pages, for example `app/routes/admin/user` and `app/routes/admin/config`, with local `_components` for page-specific islands and widgets.
- Keep functions small and single-purpose. Extract only when it reduces real complexity.
- Keep core logic extensible. Adding a new type, strategy, field, adapter, or runtime should add a module or registration entry, not rewrite the main flow.
- Keep naming explicit and stable. Prefer domain names over generic names like `handler`, `data`, or `item` when the domain is known.
- Keep configuration separated from business logic.
- Add comments only where they clarify non-obvious decisions, runtime constraints, or extension points.
- Include baseline error handling for runtime configuration, database, cache, validation, and unexpected failures.

## Import And Export Rules

- Prefer directory barrels. For example, import utilities from `app/utils`, not `app/utils/errors`.
- Do not include `.ts` or `.tsx` in import specifiers.
- Non-adapter modules must not import adapter implementations directly.
- `adapter` directories are the exception. Runtime factories may import exact adapter implementations from `infra/*/adapter/*`.
- HonoX route files and island files under `app/routes` may use direct local component imports because the file names are part of HonoX routing and island conventions.
- HonoX pages should use server rendering for initial data when the data is available from context resources. Use islands only for interactive client behavior.

## Extension Rules

- New database implementation: add a `DBAdapter` implementation under `infra/database/adapter`, then wire it in the runtime factory.
- New cache implementation: add a `CacheAdapter` implementation under `infra/cache/adapter`, then wire it in the runtime factory.
- New migration: add a migration entry to the migration registry. Do not edit old applied migrations.
- New API: define Zod schemas and OpenAPI metadata beside the route or feature module, then register the route.
- New business strategy: add a strategy module and register it through a map or factory. Do not add conditionals throughout core code.
- New field: update schema, migration, validation, response shape, and tests together.

## Required Final Output

When implementing a task, the final response must include:

- Code changes: what changed and where.
- Structure notes: how the change fits the architecture.
- Extension method: how to add the next type/strategy/field/adapter.
- Verification: commands run and any remaining risk.

Before sending the final response after code changes, run the relevant checks yourself. For runtime-affecting changes, do not stop at `build`; also start the dev server or exercise the affected request path so loader/runtime errors are caught.

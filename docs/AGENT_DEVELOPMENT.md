# Agent Development Workflow

This guide turns the project contract in `AGENTS.md` into a repeatable workflow for agents changing HonoAdmin.

## Start Of Session

1. Read `AGENTS.md`.
2. Read the guide for the affected surface:
   - Architecture or layer boundary: `docs/ARCHITECTURE.md`.
   - Admin CRUD or feature page: `docs/ADMIN_CRUD.md` and `docs/ADMIN_FEATURE_CONTRACT.md`.
   - Searchable list or table growth: `docs/PERFORMANCE_BOUNDARIES.md`.
   - Auth, CSRF, upload, or secrets: `docs/SECURITY.md`.
   - Worker/runtime behavior: `docs/CLOUDFLARE_WORKERS.md`.
3. Inspect the existing owner files before editing. Copy the closest working pattern instead of inventing a parallel flow.
4. Decide the owner layer before writing code:
   - `apps/server/src/bun.ts` and `apps/server/src/worker.ts`: Bun and Workers runtime entrypoints only.
   - `apps/server/src/api`: Hono API route composition, validation boundary, OpenAPI registration.
   - `apps/server/src/service`: business workflows, validation DTOs, entities, native SQL, cache invalidation.
   - `apps/server/src/migrations`: append-only database schema changes for SQLite/D1, MySQL, and PostgreSQL.
   - `apps/server/src/utils`: backend helpers only.
   - `packages/runtime/src`: runtime factory/bootstrap/security wiring.
   - `packages/db`, `packages/cache`, and `packages/file-storage`: adapter contracts and implementations.

## Responsibility Split

Use this split as the default shape for new admin features:

```text
apps/console/src/
  views/                     # route-view level API loading and composition for /admin and /user
  router/                    # Vue Router entries and guards
  stores/                    # Pinia stores for app state

apps/server/src/service/admin/<area>/<feature>/
  dto.ts                     # zod schemas and typed input/output contracts
  entity.ts                  # database row/entity types and mapping helpers
  enum.ts                    # stable domain enums when needed
  constants.ts               # domain constants when needed
  index.ts                   # public service API and orchestration
```

Do not move a feature into this exact shape mechanically if it is smaller than the split. Single-file route modules are acceptable while the feature stays small and has one obvious responsibility. The split becomes mandatory once one file starts owning multiple concerns: rendering plus form state, form parsing plus SQL, table layout plus modal state, or runtime details plus business logic.

## Large File Guardrails

The goal is not an arbitrary line limit. The goal is one obvious responsibility per file.

- Route entries should stay thin. If a route starts defining tables, forms, modals, schema parsing, and action logic, split it before adding more behavior.
- `-components` can contain visual complexity, but split tables, forms, panels, selectors, and upload widgets into separate files.
- API handlers should translate request data into service calls and typed responses. Move domain rules and SQL to `apps/server/src/service`.
- Service `index.ts` should expose the feature API. If it becomes a long mix of list queries, mutations, mapping, cache invalidation, and validation helpers, split private helpers beside it.
- Browser-only behavior should stay inside the owning Vue app or `apps/console/src/components`, not inside standalone page scripts.
- Existing large files are debt, not examples. When a task touches one, either keep the edit small and localized or extract the behavior you are changing.

Run the structure audit before finalizing:

```bash
bun run audit:structure
```

For broad refactors or release checks, scan the whole source tree:

```bash
bun run audit:structure --all
```

The audit reports changed TypeScript/TSX files that are likely to be too broad. A warning can be acceptable for a focused patch, but the final response must explain why it is acceptable or where the split was made.

## Implementation Defaults

- Admin/User pages should prefer Vue Router pages backed by typed API calls.
- Mutating Admin/User forms should use Naive UI form controls, console component primitives, and API pending/error states.
- Search forms should use GET and normal anchors for pagination.
- Standalone APIs require an external/client integration reason, Zod validation, and OpenAPI metadata.
- SQL stays behind the project `DBAdapter`. Do not import adapter implementations outside adapter/runtime wiring.
- New schema fields require migration, validation, entity/DTO updates, response shape updates, and focused tests together.
- Menu/navigation additions must be made in the configured menu constants, not repeated in layouts.

## Verification

Pick checks by blast radius:

- Documentation or skill-only change: validate the skill/document shape and inspect the diff.
- Type or route shape change: `bun run typecheck`.
- UI or browser behavior change: `bun run lint`, `bun test`, `bun run build`, then start the dev server and exercise the affected route.
- Runtime/database/migration change: `bun run check`, relevant runtime build (`bun run build:bun` or `bun run build:workers`), and a request path that proves migrations/bootstrap run before the handler.
- CRUD/search/list growth: add or update focused tests for schema, action result, service SQL, and bounded pagination behavior.

Always include the commands run and remaining risk in the final response.

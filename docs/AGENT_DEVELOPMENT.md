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
   - `app/routes`: HonoX route entries, SSR composition, route-local actions, feature components, browser hooks.
   - `app/service`: business workflows, validation DTOs, entities, native SQL, cache invalidation.
   - `app/infra`: runtime factories and database/cache/file-storage adapters.
   - `app/migrations`: append-only database schema changes for SQLite/D1, MySQL, and PostgreSQL.
   - `app/utils`: framework-independent helpers only.

## Responsibility Split

Use this split as the default shape for new admin features:

```text
app/routes/admin/<area>/<feature>/
  index.tsx                 # GET render only
  add.tsx / edit.tsx         # dedicated forms when the workflow has edit pages
  -actions.ts                # POST parsing, service calls, action redirects
  -components/               # page-local tables, forms, panels, selectors

app/service/admin/<area>/<feature>/
  dto.ts                     # zod schemas and typed input/output contracts
  entity.ts                  # database row/entity types and mapping helpers
  enum.ts                    # stable domain enums when needed
  constants.ts               # domain constants when needed
  index.ts                   # public service API and orchestration
```

Do not move a feature into this exact shape mechanically if it is smaller than the split. The split becomes mandatory once one file starts owning multiple concerns: rendering plus form state, form parsing plus SQL, table layout plus modal state, or runtime details plus business logic.

## Large File Guardrails

The goal is not an arbitrary line limit. The goal is one obvious responsibility per file.

- Route entries should stay thin. If a route starts defining tables, forms, modals, schema parsing, and action logic, split it before adding more behavior.
- `-components` can contain visual complexity, but split tables, forms, panels, selectors, and upload widgets into separate files.
- `-actions.ts` should translate request data into service calls and action redirects. Move domain rules and SQL to `app/service`.
- Service `index.ts` should expose the feature API. If it becomes a long mix of list queries, mutations, mapping, cache invalidation, and validation helpers, split private helpers beside it.
- Browser controllers should own one interactive behavior. Shared helpers belong in `app/routes/-/browser`, not inside a feature route.
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

- Admin pages should prefer HonoX `GET` render plus same-route or route-local `POST` actions.
- Mutating admin forms should use native submission, CSRF fields, and shared action redirect helpers from `app/routes/-/utils/form`.
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

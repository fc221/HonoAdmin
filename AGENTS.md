# HonoAdmin Agent Rules

This file is the persistent project contract for agents and contributors. Read it before changing code.

## Session Workflow

- Start every code-changing session by reading this file and the relevant project guide: `docs/AGENT_DEVELOPMENT.md`, plus `docs/ARCHITECTURE.md`, `docs/ADMIN_CRUD.md`, `docs/ADMIN_FEATURE_CONTRACT.md`, `docs/PERFORMANCE_BOUNDARIES.md`, or `docs/SECURITY.md` when the task touches that area.
- Before editing, identify the owning layer and existing pattern you are extending. Keep route rendering, local components, service SQL, schemas, migrations, and browser behavior in their own modules.
- Prefer changing the smallest existing feature folder that owns the behavior. Do not create parallel implementations or new client/API flows when the current HonoX route/action pattern already fits.
- While implementing, keep an eye on changed file size and responsibility creep with `bun run audit:structure`. Warnings are not automatically failures, but they require either a split or a short explanation in the final response.
- End runtime-affecting work with the relevant checks and at least one request-path exercise, not only a static build.

## Non-Negotiable Architecture

- Use HonoX as the application framework.
- Use native SQL through the project database adapter. Do not introduce an ORM unless the project contract is changed.
- Support Bun for local/runtime development and Cloudflare Workers for deployment.
- Pass core runtime resources through the project Hono context extension: `c.runtime`, `c.db`, `c.cache`, `c.config`, and `c.now()`.
- Prefer HonoX integrated rendering/action routes when a feature does not explicitly need a standalone API. Do not create client-fetch API flows by default.
- Use `hono-openapi + zod` for standalone API validation and documentation.
- Use online migrations. The app must ensure database migrations have run before business handlers depend on tables.

## Code Quality Rules

- Keep structure clear and modular. A file should have one obvious responsibility.
- Do not pack unrelated page rendering, client state, forms, tables, schemas, and service logic into one large file. Split by feature and responsibility once a file owns more than one domain concept.
- Existing large files are not templates to copy. When touching a large legacy file, avoid adding a new responsibility to it; extract the touched behavior if the edit would make the file harder to scan.
- Prefer feature folders for admin pages, for example `app/routes/admin/user` and `app/routes/admin/config`, with local `-components` for page-specific islands and widgets.
- Keep HonoX route entries thin: load request data, call services/actions, and compose components. Move tables, forms, panels, modals, and local view helpers into the feature `-components` directory.
- Keep POST parsing and redirect logic in route-local `-actions.ts` files when it is non-trivial or shared by add/edit/list actions.
- Keep browser-only state in `app/routes/-/browser` and split Stimulus controllers by behavior instead of growing one cross-feature controller.
- Keep service `index.ts` files as the public service surface. Split DTO, entity, enum, constants, query helpers, and write/read helpers once SQL branches or mapping logic start to dominate the file.
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
- Menus and navigation entries must be configured from `app/consts`, not hard-coded repeatedly inside layout components.

## Admin Form And History Rules

- Admin form compatibility target is modern Chrome, Edge, Safari, and Firefox. Forms should use native browser submission with server-side `303` redirects and alert query parameters.
- Do not add full-page interception or global DOM replacement for ordinary admin create, edit, delete, search, or save workflows. Use HonoX islands only for local interactive state inside a component.
- For POST actions, use the shared action response helper from `app/routes/-/utils/form`; success and failure both redirect with an alert.
- POST failure may redirect back to the relevant page with an alert. Backend Zod remains the source of truth, while HTML constraints and local island state are only lightweight client-side guards.
- Admin forms may configure client-side validation timing with `data-validate-trigger="blur"` or `data-validate-trigger="change"` on the form, field container, or field. Field errors should reuse the existing label/help-text slot when possible instead of inserting extra vertical content.
- Create workflows with an edit page should redirect to the new record edit URL. If a create workflow returns to a list instead, that list must be chosen so the newly created record is visible.
- Edit workflows with an edit page should stay on the current edit URL after a successful save so users can continue editing.
- Search forms should use GET and ordinary full-page navigation. Pagination links should be normal anchors so page navigation remains reversible.

Exception for the explicit admin/user SPA migration:

- `/admin/*` and `/user/*` may be served by a HonoX SSR shell with React CSR navigation when the task explicitly targets the SPA migration.
- Preserve the existing UI first. React components must copy the existing Hono JSX structure, Tailwind/daisyUI classes, data attributes, spacing, modal/table/card markup, and menu behavior instead of redesigning screens.
- Until a route is fully ported to React data APIs, use the legacy SSR fragment bridge with the `X-HonoAdmin-SSR: 1` request header so the old page markup remains the visual source of truth.
- During any bridged or React mutation, set the shared pending lock and block modal close, backdrop close, menu navigation, refresh, and browser unload until the request resolves.
- Do not delete old admin/user SSR routes or POST actions until an equivalent React page, same-origin API, validation path, permission check, and test coverage exist.

## Extension Rules

- New database implementation: add a `DBAdapter` implementation under `infra/database/adapter`, then wire it in the runtime factory.
- New cache implementation: add a `CacheAdapter` implementation under `infra/cache/adapter`, then wire it in the runtime factory.
- New migration: add a migration entry to the migration registry. Do not edit old applied migrations.
- New page workflow: prefer `GET` render + same-route `POST` action before adding a standalone API.
- New admin CRUD: start from `bun run scaffold:crud` or follow `docs/ADMIN_CRUD.md`; keep service SQL portable through `ctx.db`, then add schema/action/service tests.
- New searchable list: follow `docs/PERFORMANCE_BOUNDARIES.md`; keep pagination bounded and add indexes through new migrations once list tables can grow.
- New API: only add when another client or external integration needs it. Define Zod schemas and OpenAPI metadata beside the route or feature module, then register the route.
- New business strategy: add a strategy module and register it through a map or factory. Do not add conditionals throughout core code.
- New field: update schema, migration, validation, response shape, and tests together.

## Required Final Output

When implementing a task, the final response must include:

- Code changes: what changed and where.
- Structure notes: how the change fits the architecture.
- Extension method: how to add the next type/strategy/field/adapter.
- Verification: commands run, request paths exercised for runtime-affecting changes, structure audit result, and any remaining risk.

Before sending the final response after code changes, run the relevant checks yourself. For runtime-affecting changes, do not stop at `build`; also start the dev server or exercise the affected request path so loader/runtime errors are caught.

# HonoAdmin Agent Rules

This file is the persistent project contract for agents and contributors. Read it before changing code.

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
- Menus and navigation entries must be configured from `app/consts`, not hard-coded repeatedly inside layout components.

## Admin Form And History Rules

- Admin form compatibility target is modern Chrome, Edge, Safari, and Firefox. AJAX/PJAX is the enhanced path; native form POST with `303` redirect must remain the fallback.
- Add `data-pjax="true"` to admin forms that should submit without a full page load. Do not create standalone API endpoints for ordinary admin create, edit, delete, search, or save workflows.
- For POST actions, use the shared action response helper from `app/routes/_utils/form`. PJAX success returns a structured action result; non-PJAX success redirects with an alert.
- PJAX POST failure must not replace the current page, change the URL, or write browser history. Show the error in-page and preserve current form fields.
- PJAX validation errors should preserve backend Zod as the source of truth. Return field errors through the shared action helper and show them next to matching form fields; use HTML constraints only as a lightweight client-side guard.
- Admin forms may configure client-side validation timing with `data-validate-trigger="blur"` or `data-validate-trigger="change"` on the form, field container, or field. Field errors should reuse the existing label/help-text slot when possible instead of inserting extra vertical content.
- PJAX POST success may refresh or navigate to the target view, but must default to replacing history rather than pushing a new entry. When returning from an add/edit page to its originating list, avoid creating duplicate list entries in browser history.
- Create workflows with an edit page should redirect PJAX success to the new record edit URL and replace the current add URL. If a create workflow returns to a list instead, that list must be chosen so the newly created record is visible.
- Edit workflows with an edit page should stay on the current edit URL after a successful save so users can continue editing.
- Search forms should use GET with `data-pjax-replace="true"` so repeated searches do not create noisy history entries. Pagination links may push history so page navigation remains reversible.

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
- Verification: commands run and any remaining risk.

Before sending the final response after code changes, run the relevant checks yourself. For runtime-affecting changes, do not stop at `build`; also start the dev server or exercise the affected request path so loader/runtime errors are caught.

# Admin Feature Contract

This document is the extension contract for adding or changing admin features.

## Page Shape

Use HonoX server-first pages by default:

- `GET` route renders SSR HTML from `c.db`, `c.cache`, `c.config`, and `c.now()`.
- `POST` route handles the same feature workflow and returns a `303` through the shared action helpers.
- Search forms use `GET` and normal query strings.
- List search and pagination may target `admin-list-frame`.
- Mutating forms submit as top-level Turbo replace visits with `topLevelFormTurboAttrs`.

Do not add a standalone API for an ordinary admin form unless an external client needs that contract.

## Architecture Boundaries

Admin features follow the server-first Hotwire split:

- HonoX SSR owns routing, layout, permissions, menus, table HTML, form HTML, redirects, and data queries.
- Turbo Drive owns normal link navigation and browser history.
- Turbo Frame owns bounded partial updates such as list panels, search results, pagination, and modal bodies.
- Stimulus owns browser lifecycle behavior that needs setup and teardown.
- Vanilla TypeScript owns small global behaviors such as confirm, flash alert cleanup, loading, CSRF headers, and fetch helpers.
- daisyUI and Tailwind own the visual layer. Keep existing classes, DOM shape, spacing, icons, and copy stable unless the task explicitly asks for UI changes.

Do not reintroduce HonoX islands, client hydration, PJAX-style global DOM replacement, or React/SPA flows for ordinary admin CRUD. The only React/SPA exception remains an explicit admin/user SPA migration task with its own compatibility contract.

## Directory Responsibilities

Use these ownership rules when adding or moving code:

- `app/routes/admin/**`: admin HonoX route files, page-level data loading, action wiring, and feature-local SSR components under `-components`.
- `app/routes/user/**`: user-facing HonoX route files and user feature-local SSR components.
- `app/routes/-/components`: shared SSR components that render HTML and data attributes, without browser-only state.
- `app/routes/-/browser`: browser entry, Turbo setup, Stimulus controllers, and small browser utilities. This directory may touch `window`, `document`, and DOM APIs.
- `app/routes/-/utils`: route/render/form helpers that are shared by routes and components.
- `app/service/**`: domain services, SQL access through `ctx.db`, cache invalidation, permissions, security, and runtime-facing business logic.
- `app/consts/**`: menu and navigation definitions. Do not hard-code repeated menu entries inside layout components.

If a file starts owning more than one concept, split it by feature responsibility before adding more behavior.

## Browser Behavior Rules

Start with SSR markup and add browser behavior only at the smallest useful boundary:

- Add `data-controller` and `data-action` to existing SSR markup when a component needs lifecycle behavior.
- Put reusable lifecycle logic in a Stimulus controller under `app/routes/-/browser/controllers`.
- Put one-off global behavior in a small module under `app/routes/-/browser`.
- Keep forms as native HTML submissions unless the workflow specifically needs a bounded Turbo Frame or XHR upload.
- Do not add client-side data fetching for data that is already available from `c.db`, `c.cache`, `c.config`, or `c.now()`.
- Do not change UI classes or layout while moving behavior between SSR, Turbo, Stimulus, and browser utilities.

## File Shape

Recommended feature folder:

```text
app/routes/admin/<domain>/<feature>/
  index.tsx
  add.tsx
  edit.tsx
  -actions.ts
  -components/
    <feature>-panel.tsx
    <feature>-table.tsx
    <feature>-form.tsx

app/service/admin/<domain>/<feature>/
  dto.ts
  entity.ts
  index.ts
```

Shared SSR markup goes in `app/routes/-/components`.
Browser lifecycle behavior goes in `app/routes/-/browser`.

## Required Security

Every non-GET HTML form must include:

```tsx
<CsrfField />
```

The root middleware validates `POST`, `PUT`, `PATCH`, and `DELETE` requests
outside `/api/*` with the signed CSRF cookie plus the submitted token.

Turbo and XHR requests also send the token through `X-HonoAdmin-CSRF`.

## Required Permissions

Every new admin page or action needs a permission seed:

- `GET /admin/...` view permission.
- `POST /admin/...` action permission.
- Use `action_key` to distinguish `create`, `update`, `delete`, `upload`, or other form intents.
- Add the permission seed in append-only migrations for every SQL dialect.
- Add a test that `listPermissions` contains the new permission.

## Required Cache Invalidation

If a feature changes layout-visible data, bump the admin layout cache version:

```ts
await bumpAdminLayoutCacheVersion(ctx)
```

This is required for:

- user profile, username, avatar, status, or roles
- role names, role menus, or role permissions
- site title/config values shown in layout

Domain caches should remain close to their owning service. Layout cache is only
for header/menu/site-title data shared across pages.

## Required Tests

Add focused coverage for:

- DTO/schema validation
- service CRUD and SQL behavior
- action redirect/flash alert behavior
- permission registration
- SSR output for important `data-*`, Turbo frame, CSRF, and core classes

Run:

```bash
bun run typecheck
bun run lint
bun test
bun run build
```

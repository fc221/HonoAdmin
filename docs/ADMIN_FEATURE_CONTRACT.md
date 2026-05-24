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

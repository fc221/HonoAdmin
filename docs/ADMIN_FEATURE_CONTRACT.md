# Admin Feature Contract

Admin/User features are built from a Hono API boundary, a service layer, API-owned schemas/client exports, and Vue pages in the console app.

## Ownership

- `apps/server/src/api/admin/**`: admin API route registration and validation boundary.
- `apps/server/src/api/admin/system/user.ts`: backend user-management API surface, mounted at `/api/admin/system/user`.
- `apps/server/src/api/user/**`: user-facing API route registration and validation boundary.
- `apps/server/src/service/**`: business rules, permissions, SQL orchestration, cache invalidation, and DTO/entity mapping.
- `apps/server/src/migrations/**`: append-only database schema changes.
- `apps/server/src/api/schema.ts`、`menu.ts`、`openapi.ts`：schema/menu 纯聚合 barrel 与 OpenAPI 元数据；typed client 在 console 的 `apps/console/src/api/client.ts`（`hc<AppType>`）。
- `apps/console/src/components/**`: shared Naive UI + Tailwind layout/control primitives.
- `apps/console/src/views/**`: route-view level loading, pending/error state, and composition.

## UI Contract

- Preserve stable layout results from v1 where relevant, but do not copy daisyUI classes.
- Use Naive UI built-ins before creating custom controls.
- Tailwind CSS owns layout, spacing, responsive behavior, and density.
- Theme tokens are centralized in `apps/console/src/components/theme`; business pages must not invent local themes.
- Empty table data must still render headers and stable table dimensions.
- Sidebar/header/menu/dropdown states must not jump, overflow, or lose selected/hover readability.

## API Contract

- Route modules should be small and grouped by surface/feature when the feature has enough moving parts. Small single-purpose routes may stay as single files until they become harder to scan.
- Request inputs and response outputs must be validated through API-owned or service-owned Zod schemas.
- Business code must not live in API route handlers once it involves SQL, permission, cache, or mapping logic.
- New client-facing APIs should have OpenAPI metadata when they are part of the public/admin contract.

## Verification Contract

- Run `bun run audit:structure` before finalizing.
- Run typecheck, lint, tests, and build for code changes.
- For runtime changes, exercise at least one request path.
- For UI changes, verify rendered behavior in the browser at desktop and mobile-relevant widths when possible.

# HonoAdmin 前后端分离架构

## Goal

HonoAdmin separates product surfaces without changing the backend persistence model:

- Server: Hono API, native SQL, Zod API schemas, Bun runtime, and Cloudflare Workers build.
- Console: one Vue 3 SPA for `/admin/*` and `/user/*`, using Naive UI controls and Tailwind CSS layout.
- Public: plain HTML placeholder reserved for future SSR Vue or hand-written HTML. The current scope ships a single `index.html` only.

The production path is `apps/server`, `apps/console`, and `apps/public`.

## Workspace Layout

```text
apps/
  server/
    src/api/
      admin/system/
      admin/web/
      user/
    src/service/
    src/migrations/
    src/utils/
  console/
  public/
packages/
  db/
  cache/
  file-storage/
  runtime/
```

## Frontend Rules

- Do not copy or preserve daisyUI classes.
- Use Tailwind CSS for layout, spacing, responsive behavior, and density.
- Use Naive UI for controls such as menu, dropdown, form fields, tables, dialogs, notifications, drawers, selectors, and uploads.
- Business pages must compose shared console components from `apps/console/src/components` instead of directly building complex third-party component stacks.
- Every page must avoid header/sidebar jumps, content overflow, table misalignment, button text overflow, modal overlap, broken active menu state, and theme drift.

## API Rules

- `apps/server/src/entry/bun.ts` and `apps/server/src/entry/worker.ts` are the runtime entrypoints; local dev uses `apps/server/src/entry/dev.ts`.
- `apps/server/src/api` owns API route composition, auth/session/resource endpoints, and OpenAPI registration.
- Split routes by surface and feature: `api/admin/(system|web)`（用户管理为 `api/admin/system/user`）and `api/user`.
- `apps/server/src/service` owns business services, SQL orchestration, permissions, validation DTOs, and cache invalidation.
- `apps/server/src/migrations` owns append-only migration registries and the migration runner.
- `apps/server/src/utils` owns backend-only helpers and error response shaping.
- `packages/runtime` owns runtime factory/bootstrap/security wiring only.
- `packages/db`, `packages/cache`, and `packages/file-storage` own adapter contracts and implementations.
- Frontend apps call the typed client in `apps/console/src/api/client.ts`（基于 `hc<AppType>`）; the server exposes `AppType` and the schema/menu barrels.
- Route inputs and outputs are validated with Zod schemas owned by the feature's schema file (aggregated by `apps/server/src/api/schema.ts`) or the owning service DTO.
- New business rules belong in `apps/server/src/service`.
- Native SQL and online migrations remain the database model. Do not introduce an ORM.

## Public App Rule

`apps/public` is a plain HTML placeholder. Future SSR Vue or hand-written HTML pages will live here; do not add homepage, pricing, docs, blog, or content demos until the public scope is explicitly started.

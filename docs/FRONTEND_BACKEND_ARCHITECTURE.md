# HonoAdmin 前后端分离架构

## Goal

HonoAdmin separates product surfaces without changing the backend persistence model:

- Server: Hono API, native SQL, Zod API schemas, Bun runtime, and Cloudflare Workers build.
- Console: one Vue 3 SPA for `/admin/*` and `/user/*`, using Naive UI controls and Tailwind CSS layout.
- Public: Astro app reserved for SEO pages. The current scope keeps it buildable and documented.

The production path is `apps/server`, `apps/console`, and `apps/public`.

## Workspace Layout

```text
apps/
  server/
    src/api/
      admin/
      admin/user/
      user/
    src/service/
    src/migrations/
    src/utils/
  console/
  public/
packages/
  domain/
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

- `apps/server/src/bun.ts` and `apps/server/src/worker.ts` are the runtime entrypoints.
- `apps/server/src/api` owns API route composition, auth/session/resource endpoints, and OpenAPI registration.
- Split routes by surface and feature: `api/admin`, `api/admin/user`, and `api/user`.
- `apps/server/src/service` owns business services, SQL orchestration, permissions, validation DTOs, and cache invalidation.
- `apps/server/src/migrations` owns append-only migration registries and the migration runner.
- `apps/server/src/utils` owns backend-only helpers and error response shaping.
- `packages/runtime` owns runtime factory/bootstrap/security wiring only.
- `packages/db`, `packages/cache`, and `packages/file-storage` own adapter contracts and implementations.
- Frontend apps call the typed client exported from `@hono-admin/server/api/client`.
- Route inputs and outputs are validated with Zod schemas owned by `apps/server/src/api/schema.ts` or the owning service DTO.
- New business rules belong in `apps/server/src/service`; reusable pure domain rules can move into `packages/domain`.
- Native SQL and online migrations remain the database model. Do not introduce an ORM.

## Public App Rule

`apps/public` is intentionally a buildable placeholder. Do not add homepage, pricing, docs, or content demos until the public SEO scope is explicitly started.

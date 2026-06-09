# Admin CRUD Guide

Admin CRUD is API-first and Vue-rendered. Do not add server-rendered console route files.

## Required Shape

```text
apps/server/src/api/admin/<feature>/
  index.ts                  # route registration and request/response boundary
apps/server/src/service/admin/<area>/<feature>/
  dto.ts                    # zod schemas and typed input/output contracts
  entity.ts                 # database row/entity types and mapping helpers
  enum.ts                   # stable domain enums when needed
  constants.ts              # domain constants when needed
  index.ts                  # public service API and orchestration
apps/console/src/views/
  <feature>.vue             # route-view level API loading and composition
apps/console/src/components/
  ...                       # reusable table/form/modal/layout primitives
```

## Rules

- Keep route handlers thin. Parse request data, validate Zod schemas, call services, and return typed responses.
- Small single-purpose API modules may stay as single files. Split by feature directory once routes, schemas, resource config, and mutations begin to crowd the same file.
- Keep SQL and permission/domain rules in `apps/server/src/service`.
- Keep Vue pages focused on loading state and composition. Reusable tables, forms, filters, drawers, and modals belong in `apps/console/src/components`.
- Frontend pages must call the typed API client from `@hono-admin/server/api/client`.
- Do not copy daisyUI classes. Use Naive UI components plus Tailwind CSS layout utilities.
- Add or update tests for schema validation, service SQL behavior, permissions, list pagination, and mutations.

## Add The Next CRUD

1. Add or extend API schemas in `apps/server/src/api/schema.ts` or the owning service DTO.
2. Add service DTO/entity/index modules under `apps/server/src/service`.
3. Add the API route module under `apps/server/src/api/admin/<feature>`.
4. Register the route from `apps/server/src/api/admin/index.ts`.
5. Add the Vue page and route in `apps/console`.
6. Use `apps/console/src/components` primitives for table, search, form, modal, drawer, and pagination.
7. Run `bun run typecheck`, `bun run lint`, focused tests, `bun run build`, and browser verification for the page.

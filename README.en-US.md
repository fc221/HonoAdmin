# HonoAdmin

[中文](./README.md) | English

HonoAdmin is a modern admin framework built on Hono and HonoX. It targets AnyAdmin, CloudflareAdmin, HonoxAdmin, and similar admin-console use cases where teams need a lightweight, fast, runtime-portable system that can run locally with Bun and deploy to Cloudflare Workers.

It is not a template locked to one platform. HonoAdmin is a Hono-based framework designed for any runtime: runtime capabilities are injected through adapters, while business code reads shared Hono Context resources such as `c.runtime`, `c.db`, `c.cache`, `c.config`, and `c.now()`. This keeps pages, forms, permissions, migrations, and native SQL access portable.

## Keywords

AnyAdmin, CloudflareAdmin, HonoxAdmin, HonoAdmin, Hono, HonoX, Cloudflare Workers, Bun, D1, SQLite, MySQL, PostgreSQL, native SQL, runtime agnostic admin framework.

## Features

- Server-rendered HonoX pages with same-route actions.
- Bun for local development and Cloudflare Workers for deployment.
- Adapter-based SQLite, Cloudflare D1, MySQL, PostgreSQL, cache, and file storage support.
- Native SQL by default, with no ORM lock-in.
- Online database migrations checked before business handlers run.
- Built-in admin modules for users, roles, permissions, menus, configs, files, operation logs, and updates.
- A user panel and admin console in the same product; admins can switch into admin features.
- Native form fallback plus PJAX-enhanced admin interactions.
- Standalone APIs can use `hono-openapi + zod` for validation and documentation.
- Tailwind CSS and daisyUI for a lightweight, customizable interface.

## Architecture

```txt
app/routes      HonoX routes, pages, actions, layouts, and components
app/service     Business services, DTOs, permissions, sessions, migrations, responses
app/infra       Database, cache, file storage, and runtime adapters
app/utils       Framework-independent utilities, errors, and formatting helpers
app/migrations  Append-only database migrations split by sqlite/mysql/pg dialect
docs            Architecture, CRUD, and performance boundary notes
```

Runtime resources are created in `app/infra/runtime` and attached to the Hono Context by middleware. Pages and services depend on context resources only, so they do not need to know whether the current runtime is Bun, Cloudflare Workers, or another adapter-backed target.

## Quick Start

```bash
bun install
cp .env.example .env
bun run dev
```

Adjust `.env` as needed, then open the local app and visit `/install` to complete runtime configuration, database migrations, and administrator creation.

`bun run dev` uses the Bun runtime and supports SQLite, MySQL, and PostgreSQL. Use `bun run dev:workers` or `bun run preview` when testing Cloudflare Workers/D1 locally. The default `bun run build` emits a Cloudflare Workers build; use `bun run build:bun` for Bun production runtime builds.

Useful commands:

```bash
bun run typecheck
bun run lint
bun test
bun run build
bun run build:bun
bun run dev:workers
```

For Cloudflare Workers deployment, see the [deployment guide](./docs/CLOUDFLARE_WORKERS.en-US.md).

## Admin Modules

- User management: accounts, status, roles, profile fields, avatar, and password flows.
- Role permissions: menu permissions and operation permissions are separated for fine-grained admin access.
- Config management: site, system, and file configuration.
- File management: local storage and object storage adapters.
- Operation logs: login, logout, business operations, and error records.
- Update management: online migration status and execution.
- Web management: pages, notifications, and feedback entries.

## Extension Points

- Add a runtime: create a runtime factory under `app/infra/runtime` and expose resources through context.
- Add a database: implement `DBAdapter` and wire it into the runtime factory.
- Add a cache: implement `CacheAdapter` and register it with the runtime.
- Add a migration: create matching migration ids/names/orders in `app/migrations/sqlite`, `app/migrations/mysql`, and `app/migrations/pg`, then append them to each registry.
- Add an admin CRUD: start with `bun run scaffold:crud`, then add migration, menu entry, service export, and tests.
- Add a normal admin form: prefer HonoX `GET` render + same-route `POST` action before adding an API.

See [Architecture](./docs/ARCHITECTURE.md), [Admin CRUD](./docs/ADMIN_CRUD.md), and [Performance Boundaries](./docs/PERFORMANCE_BOUNDARIES.md) for more details.

## Deployment And Security

- [Live demo](https://hono-admin-demo.wkuola.workers.dev)
- [Cloudflare Workers deployment](./docs/CLOUDFLARE_WORKERS.en-US.md)
- [Default security configuration](./docs/SECURITY.en-US.md)
- [MIT License](./LICENSE)

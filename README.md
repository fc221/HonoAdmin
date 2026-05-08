# HonoAdmin

中文 | [English](./README.en-US.md)

HonoAdmin 是一个基于 Hono / HonoX 的现代中后台框架。它面向 AnyAdmin、CloudflareAdmin、HonoxAdmin 这一类需要轻量、快速、可部署到不同运行时的管理系统场景，核心目标是用一套清晰的服务端渲染与原生 SQL 架构，支撑从本地 Bun 开发到 Cloudflare Workers 部署的完整后台应用。

它不是绑定单一平台的后台模板，而是一个基于 Hono 开发、面向任何运行时的框架：运行时能力通过 adapter 注入，业务代码通过统一的 Hono Context 使用 `c.runtime`、`c.db`、`c.cache`、`c.config` 和 `c.now()`，从而让页面、表单、权限、迁移和数据访问保持可移植。

## 关键词

AnyAdmin, CloudflareAdmin, HonoxAdmin, HonoAdmin, Hono, HonoX, Cloudflare Workers, Bun, D1, SQLite, MySQL, PostgreSQL, native SQL, runtime agnostic admin framework.

## 特性

- 基于 HonoX 的服务端渲染页面和同路由 action。
- 支持 Bun 本地开发和 Cloudflare Workers 部署。
- 通过 adapter 支持 SQLite、Cloudflare D1、MySQL、PostgreSQL、缓存和文件存储扩展。
- 使用原生 SQL，不强绑定 ORM，查询逻辑清晰可控。
- 在线数据库迁移，业务处理前检查迁移状态。
- 管理后台内置用户、角色、权限、菜单、配置、文件、操作日志和更新管理。
- 用户面板与后台菜单共存，管理员可切换到后台功能。
- 表单支持原生提交 fallback，同时用 PJAX 提供更顺滑的后台体验。
- 独立 API 使用 `hono-openapi + zod` 做校验和文档。
- UI 使用 Tailwind CSS 与 daisyUI，保持轻量和可定制。

## 架构

```txt
app/routes   HonoX 路由、页面、action、布局和组件
app/service  业务服务、DTO、权限、会话、迁移和通用响应
app/infra    数据库、缓存、文件存储和运行时 adapter
app/utils    与框架无关的工具、错误和格式化方法
app/migrations  按 sqlite/mysql/pg 拆分的追加式数据库迁移
docs         架构、CRUD 和性能边界文档
```

运行时资源由 `app/infra/runtime` 创建，再由中间件挂载到 Hono Context。页面和服务只依赖上下文资源，不直接判断当前是 Bun、Cloudflare Workers 还是其他运行时。

## 快速开始

```bash
bun install
cp .env.example .env
bun run dev
```

按需调整 `.env` 后打开本地地址，进入 `/install` 完成运行时配置、数据库迁移和管理员创建。

`bun run dev` 使用 Bun runtime，支持 SQLite、MySQL 和 PostgreSQL。本地调试 Cloudflare Workers/D1 时使用 `bun run dev:workers` 或 `bun run preview`。默认 `bun run build` 输出 Cloudflare Workers 产物；Bun 生产运行使用 `bun run build:bun`。

常用命令：

```bash
bun run typecheck
bun run lint
bun test
bun run build
bun run build:bun
bun run dev:workers
```

Cloudflare Workers 部署请参考 [部署文档](./docs/CLOUDFLARE_WORKERS.md)。

## 后台能力

- 用户管理：账号、状态、角色、个人资料、头像和密码管理。
- 角色权限：菜单权限和操作权限分离，适合中后台细粒度授权。
- 配置管理：站点、系统和文件配置。
- 文件管理：本地与对象存储 adapter 扩展。
- 操作日志：登录、退出、业务操作和异常记录。
- 更新管理：在线迁移状态检查与执行。
- 网站管理：页面、公告和反馈等内容管理入口。

## 扩展方式

- 新增运行时：在 `app/infra/runtime` 添加 runtime factory，并通过 context 暴露资源。
- 新增数据库：实现 `DBAdapter`，再在 runtime factory 中接入。
- 新增缓存：实现 `CacheAdapter`，并注册到运行时。
- 新增迁移：在 `app/migrations/sqlite`、`app/migrations/mysql`、`app/migrations/pg` 添加同 id/name/order 的 migration，并追加到对应 registry。
- 新增后台 CRUD：优先使用 `bun run scaffold:crud`，再补迁移、菜单、服务导出和测试。
- 新增普通后台表单：优先使用 HonoX `GET` 渲染 + 同路由 `POST` action，不默认新增 API。

更多约束见 [架构文档](./docs/ARCHITECTURE.md)、[CRUD 文档](./docs/ADMIN_CRUD.md) 和 [性能边界](./docs/PERFORMANCE_BOUNDARIES.md)。

## 发布与安全

- [在线演示](https://hono-admin-demo.wkuola.workers.dev)
- [Cloudflare Workers 部署](./docs/CLOUDFLARE_WORKERS.md)
- [默认安全配置](./docs/SECURITY.md)
- [MIT License](./LICENSE)

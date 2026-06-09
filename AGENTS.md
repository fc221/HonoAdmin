# HonoAdmin Agent 规则

本文件是 HonoAdmin 的长期项目合同。任何 agent 或贡献者在改代码前必须先读本文件，再读相关 `docs/*` 指南。除非用户明确修改项目合同，否则按这里执行。

## 官方文档和 LLM 入口

优先使用官方文档。涉及下列技术栈时，先看对应 LLM 文档或官方文档，不凭过期记忆改实现。

- Hono docs: https://hono.dev/docs/
- Hono LLM docs index: https://hono.dev/llms.txt
- Hono full LLM documentation: https://hono.dev/llms-full.txt
- Vue LLM docs index: https://vuejs.org/llms.txt
- Vue full LLM documentation: https://vuejs.org/llms-full.txt
- Vue Router LLM docs index: https://router.vuejs.org/llms.txt
- Vite LLM docs index: https://vite.dev/llms.txt
- Vite full LLM documentation: https://vite.dev/llms-full.txt
- Astro LLM docs index: https://docs.astro.build/llms.txt
- Astro full LLM documentation: https://docs.astro.build/llms-full.txt
- Bun LLM docs index: https://bun.com/llms.txt
- Zod LLM docs index: https://zod.dev/llms.txt
- Zod full LLM documentation: https://zod.dev/llms-full.txt
- Cloudflare docs LLM directory: https://developers.cloudflare.com/llms.txt
- Cloudflare Workers LLM docs index: https://developers.cloudflare.com/workers/llms.txt
- Cloudflare D1 LLM docs index: https://developers.cloudflare.com/d1/llms.txt
- Tailwind CSS docs: https://tailwindcss.com/docs
- Naive UI docs: https://www.naiveui.com/
- Pinia docs: https://pinia.vuejs.org/
- TypeScript docs: https://www.typescriptlang.org/docs/

使用规则：

- 改 Hono 路由、middleware、验证、Vite dev-server、Bun/Workers 运行时前，优先查 Hono LLM 文档。
- 改 Vue、Vue Router、Vite、Astro、Bun、Zod、Cloudflare Workers/D1 时，优先查对应 LLM 文档。
- 某技术没有确认可用的 LLM 文档时，只使用官方文档，不补假链接。

## 会话流程

- 代码改动前必须读本文件，以及相关指南：`docs/AGENT_DEVELOPMENT.md`、`docs/ARCHITECTURE.md`、`docs/FRONTEND_BACKEND_ARCHITECTURE.md`、`docs/ADMIN_CRUD.md`、`docs/ADMIN_FEATURE_CONTRACT.md`、`docs/PERFORMANCE_BOUNDARIES.md`、`docs/SECURITY.md`、`docs/CLOUDFLARE_WORKERS.md`。
- 先确定归属层，再动文件。API 路由、Vue 页面、service SQL、schema、migration、runtime factory、adapter、UI primitive 不能混在一个文件里。
- 优先改已有 owner 目录，不创建平行实现，不保留旧规范桥接。
- 大改后运行 `bun run audit:structure`。警告不自动等于失败，但必须拆分或在最终回复解释。
- 影响运行时的改动不能只跑 build；必须启动 dev server 或请求实际路径。

## 不可变架构

- 当前项目是前后端分离 Monorepo：`apps/server`、`apps/console`、`apps/public`、`packages/*`。
- `apps/server`：Hono API、Bun/Workers 入口、service、migrations、backend utils。
- `apps/console`：Vue 3 SPA，同时承载 `/admin/*` 和 `/user/*`。
- `apps/public`：Astro SEO app，当前只保持架构和 build 能力，不做业务 demo。
- `apps/console/src/components`、`layout`、`theme`：Naive UI + Tailwind CSS 的布局、主题和通用控件封装。
- `packages/runtime`：runtime factory、bootstrap、安全配置和运行时上下文。
- `packages/db`、`packages/cache`、`packages/file-storage`：adapter contract 和实现。
- `packages/domain`：纯领域逻辑。没有明确复用价值时不要乱放业务代码。
- 生产路径只允许 `apps/server`、`apps/console`、`apps/public`。
- 不允许恢复已移除的 contracts、config、独立 UI workspace 包。API schema、typed client、OpenAPI 文档归 `apps/server/src/api`。
- 数据库使用 native SQL + `@hono-admin/db` adapter。除非项目合同变更，不引入 ORM。
- 本地和 Bun runtime 必须可用，Cloudflare Workers build 必须可用。
- runtime 资源通过 Hono context 传递：`c.runtime`、`c.db`、`c.cache`、`c.config`、`c.now()`。

## Hono API 规则

- 使用 Hono 原生组合方式：子模块 `const featureApi = new Hono<AppEnv>()`，默认导出；父模块只用 `app.route('/feature', featureApi)` 组合。
- 不写 `registerXXXRoutes(app)` 这种把子路由注入父 app 的函数。
- `apps/server/src/api/index.ts` 只组合 `/auth`、`/install`、`/admin`、`/user`、`/health`、`/openapi.json`。
- `apps/server/src/api/admin/index.ts` 只组合 admin 下级路由组，例如 `/user`、`/system/*`、`/web/*`。
- `apps/server/src/api/user/index.ts` 只组合 user 下级路由组，例如 `/profile`。
- `apps/server/src/api` 根层只保留组合入口、schema、typed client、OpenAPI 文档配置；共享 helper 放 `api/shared`。业务能力默认按 feature 目录组织；功能很小且职责单一时可以先放单文件，复杂后必须拆目录。
- API handler 只做请求解析、Zod 校验、调用 service、返回 response。SQL、权限规则、cache 失效、实体映射放 `apps/server/src/service`。
- 独立 API 必须有 Zod validation 和 OpenAPI 元数据。小的 route-local schema 可放 feature 内；跨 console 使用的 DTO 放 `apps/server/src/api/schema.ts`。
- 前端只能通过 `@hono-admin/server/api/client` 调 API，不能直接依赖 DB 字段或 service 内部结构。

## Server Dev 规则

- 本地开发 server 使用 `apps/server/vite.config.ts` + `@hono/vite-dev-server`，入口是 `apps/server/src/dev.ts`。
- `apps/server/src/dev.ts` 只负责配置 runtime context middleware 并默认导出 Hono app。
- `apps/server/src/bun.ts` 是 Bun build/start 入口，不再作为热更新开发入口。
- `apps/server/src/worker.ts` 是 Cloudflare Workers 入口。
- console Vite dev server 通过 proxy 访问 `127.0.0.1:3000` 的 `/api` 和 `/uploads`。

## UI 规则

- Admin/User UI 在 `apps/console` 内实现，必须保持既有布局结果稳定，但不复制 daisyUI class。
- 使用 Naive UI 组件实现 menu、dropdown、table、form、modal、drawer、tabs、upload、notification、loading 等控件。
- 使用 Tailwind CSS 做页面布局、间距、响应式、密度控制。
- 复杂布局、主题、表格、表单、弹窗、上传、菜单行为优先封装在 `apps/console/src/components`，layout 统一放 `apps/console/src/components/layout`。
- `apps/console/src/components` 和 `apps/console/src/components/layout` 不建 `index.ts` 聚合导出；页面直接 import 具体组件文件。
- 业务页面不得各自改 Naive UI theme token，不得造成主题漂移。
- 不允许 header/sidebar 抖动、内容溢出、表格错位、按钮文字溢出、弹窗遮挡、菜单激活态错误、hover 覆盖选中态、主题色块错乱。
- 空数据表格也必须显示表头和稳定尺寸。

## 代码质量规则

- 文件必须职责清晰。不要把 API 注册、client state、表单、表格、schema、service SQL 混进一个大文件。
- 新增功能默认按 surface/feature 拆目录，例如 `apps/server/src/api/admin/system/file`；功能很小且职责单一时可以先放单文件，复杂到路由、schema、状态或业务流程混杂后必须拆分。
- service `index.ts` 是公开服务面；DTO、entity、enum、constants、query helper、write/read helper 复杂后必须拆文件。
- 函数保持小而单一。只有能降低真实复杂度时才抽象。
- 新类型、策略、字段、adapter、runtime 应通过新增模块或注册项扩展，不在主流程堆条件分支。
- 命名要稳定明确，已知业务语义时不要用 `handler`、`data`、`item` 这类泛名。
- 配置和业务逻辑分离。
- 注释只解释非显而易见的决策、运行时约束或扩展点。
- 必须覆盖运行时配置、数据库、缓存、验证、异常失败的基础错误处理。

## Import 和 Export 规则

- 优先使用 package barrel 或稳定子路径：`@hono-admin/runtime`、`@hono-admin/db`、`@hono-admin/cache`、`@hono-admin/file-storage`、`@hono-admin/server/api/client`、`@hono-admin/server/api/schema`。
- import specifier 不写 `.ts`、`.tsx`、`.vue` 后缀。
- 非 adapter/runtime factory 模块不得直接 import adapter 实现。
- runtime factory 可以 import `@hono-admin/db/adapter/*`、`@hono-admin/cache/adapter/*`。
- file storage factory 可以在包内 import `packages/file-storage/src/adapter/*`。
- 菜单和导航项来自 server menu constants/API schema，不在 layout 或页面里重复硬编码。

## 扩展规则

- 新 DB adapter：加到 `packages/db/src/adapter`，再在 `packages/runtime/src` 接入。
- 新 cache adapter：加到 `packages/cache/src/adapter`，再在 `packages/runtime/src` 接入。
- 新 file storage adapter：加到 `packages/file-storage/src/adapter`，再在 `packages/file-storage/src/factory.ts` 注册。
- 新 migration：SQLite/D1、MySQL、PostgreSQL 三套 registry 都加同序号迁移；不要改已应用迁移。
- 新 API：优先在 `apps/server/src/api/<surface>/<feature>` 新建子 Hono app，默认导出，由父级 `.route()` 组合；小型单职责接口可以先用单文件，复杂后拆为 feature 目录。
- 新 Admin/User 页面：在 `apps/console/src/views` 加 Vue route view，通过 `@hono-admin/server/api/client` 调用 API，用 console 内部 components 组合 UI。
- 新业务策略：新增策略模块并通过 map/factory 注册，不在核心流程散落条件判断。
- 新字段：schema、migration、validation、response shape、UI、测试一起更新。

## 验证要求

- 常规代码改动：运行 `bun run typecheck`、`bun run lint`、`bun test`、`bun run build`。
- Runtime 相关改动：额外运行 `bun run build:bun` 或 `bun run build:workers`，并请求至少一个实际路径。
- 结构相关改动：运行 `bun run audit:structure`。
- UI 相关改动：用浏览器验证关键页面，至少覆盖当前用户指出的问题路径；必要时做桌面/移动宽度截图。
- Public 仅占位阶段：确认 `apps/public` 可 typecheck/build，不新增业务 demo。

## 最终回复要求

实现任务后的最终回复必须包含：

- Code changes：改了什么、在哪些文件。
- Structure notes：这些改动如何符合当前架构。
- Extension method：下一个类型、策略、字段、adapter 或页面怎么加。
- Verification：实际运行的命令、请求过的路径、`audit:structure` 结果、剩余风险。

不要在未验证时声称通过。遇到无法运行的检查，要明确说明原因。

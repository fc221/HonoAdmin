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
- 改 Vue、Vue Router、Vite、Bun、Zod、Cloudflare Workers/D1 时，优先查对应 LLM 文档。
- 某技术没有确认可用的 LLM 文档时，只使用官方文档，不补假链接。

## 会话流程

- 代码改动前必须读本文件，以及相关指南：`docs/AGENT_DEVELOPMENT.md`、`docs/ARCHITECTURE.md`、`docs/FRONTEND_BACKEND_ARCHITECTURE.md`、`docs/ADMIN_CRUD.md`、`docs/ADMIN_FEATURE_CONTRACT.md`、`docs/PERFORMANCE_BOUNDARIES.md`、`docs/SECURITY.md`、`docs/CLOUDFLARE_WORKERS.md`。
- 先确定归属层，再动文件。API 路由、Vue 页面、service SQL、schema、migration、runtime factory、adapter、UI primitive 不能混在一个文件里。
- 优先改已有 owner 目录，不创建平行实现，不保留旧规范桥接。
- 大改后运行 `bun run audit:structure`。行数警告不自动等于失败，但必须拆分或在最终回复解释；位置白名单违规直接失败。
- 影响运行时的改动不能只跑 build；必须启动 dev server 或请求实际路径。

## 不可变架构

- 当前项目是前后端分离 Monorepo：`apps/server`、`apps/console`、`apps/public`、`packages/*`。
- `apps/server`：Hono API、Bun/Workers 入口、service、migrations、backend utils。
- `apps/console`：Vue 3 SPA，同时承载 `/admin/*` 和 `/user/*`。
- `apps/public`：纯 HTML 占位目录，预留未来 SSR Vue 或手写 HTML 实现，当前不做业务 demo。
- `apps/console/src/components`、`layout`、`theme`：Naive UI + Tailwind CSS 的布局、主题和通用控件封装。
- `packages/runtime`：runtime factory、bootstrap、安全配置和运行时上下文。
- `packages/db`、`packages/cache`、`packages/file-storage`：adapter contract 和实现。
- 生产路径只允许 `apps/server`、`apps/console`、`apps/public`。
- 不允许恢复已移除的 contracts、config、独立 UI workspace 包。API schema 聚合、OpenAPI 文档归 `apps/server/src/api`；typed client 在 console（`apps/console/src/api/client.ts`，基于 `hc<AppType>`）。
- 数据库使用 native SQL + `@hono-admin/db` adapter。除非项目合同变更，不引入 ORM。
- 本地和 Bun runtime 必须可用，Cloudflare Workers build 必须可用。
- runtime 资源通过 Hono context 传递：`c.runtime`、`c.db`、`c.cache`、`c.config`、`c.now()`。

## 目录地图与落点决策表

结构由 `scripts/audit-agent-structure.ts` 的位置白名单机器强制（`bun run audit:structure`，已纳入 `bun run check`）。新文件放错位置会硬失败，先看这里再落盘。

### 目录地图：apps/server/src

```text
app.ts / hono-context.d.ts          # Hono app 组装 + Context 类型扩展
api/
  index.ts / openapi.ts             # 组合入口、OpenAPI 文档配置
  menu.ts / schema.ts               # 纯聚合 barrel，禁止定义 schema 或引入 zod
  shared/                           # resource 工厂、api-session、layout(-schema)、dashboard-schema、openapi、session
  auth/ install/                    # 各自 {index,schema}.ts
  user/index.ts、user/profile/{index,schema}.ts
  admin/index.ts                    # 只组合 /system/*、/web/*
  admin/(system|web)/               # 每个资源一个平铺 <name>.ts；仅当资源有专属 schema 时才 <name>/{index,schema}.ts；index.ts 是 barrel
entry/                              # bun/dev/node/worker/static/diagnostics 运行时入口
migrations/                         # migrator/registry/types + (sqlite|mysql|pg)/NNNN_*.ts
public/                             # page.ts
service/
  types.ts
  common/                           # 跨域共享业务 helper（分页/别名/查询）
  system/(middleware|security|statistics)/   # 服务器基础设施命名空间
  (admin|user)/                     # surface 业务域，feature 目录如 service/admin/system/<name>/{index,dto,entity,enum,...}.ts
utils/                              # 后端小工具
```

### 目录地图：apps/console/src

```text
App.vue / main.ts / env.d.ts
api/client.ts                       # 基于 hc<AppType> 的 typed client
components/                         # 仅共享组件，含 ResourcePage.vue、layout/、theme/ 子树
composables/                        # 共享前端逻辑
icons/ router/ stores/ styles/
views/                              # 定制页面 + 页面私有 .vue 组件；通用 CRUD 页面没有 view 文件
```

### 单一注册点

`apps/server/src/service/admin/system/menu/consts.ts` 是唯一注册点。菜单叶子的 `routePath` 同时驱动：console 路由、侧边栏、resource key、前端 API URL（`/api` + routePath）、admin 权限目标。`api/shared/api-session.ts` 的 adminFeaturePaths 和 console client 的 resourcePaths 都由 `flattenMenuItems` 推导——不要再手写映射表。菜单项不写 `component` 字段 ⇒ 渲染通用 ResourcePage（CRUD 页面零前端文件）；写 `component` ⇒ 映射到 `views/<component>.vue`。

### 落点决策表

| 新增 X | 放哪 + 要动的文件 |
| --- | --- |
| Admin CRUD 资源 | 4 个落点：① service 模块 `service/admin/<group>/<name>/` ② api 资源文件 `api/admin/<group>/<name>.ts` ③ `api/admin/<group>/index.ts` 加一行导出 + `api/admin/index.ts` 加一行 `.route()` ④ menu consts 加一个菜单项。另加三方言迁移 + 测试。权限映射/前端 URL 从 menu consts 自动推导，不要再手写映射表。详见 `docs/ADMIN_CRUD.md`。 |
| 通用 CRUD 页面 | 零 `.vue` 文件：菜单项不写 `component`，由 `components/ResourcePage.vue` 承载。 |
| 定制页面 | `apps/console/src/views/<component>.vue` + 菜单项写 `component`。 |
| 页面私有组件 | 与页面同放 `views/` 目录。 |
| 共享组件 | `apps/console/src/components/`。 |
| 共享前端逻辑 | `apps/console/src/composables/`。 |
| server 中间件 | `apps/server/src/service/system/middleware/`。 |
| 安全原语 | `apps/server/src/service/system/security/`。 |
| 共享 service helper | `apps/server/src/service/common/`。 |
| 统计/指标 | `apps/server/src/service/system/statistics/`。 |
| migration | `migrations/(sqlite|mysql|pg)/` 三方言同序号，并登记各自 registry。 |
| DB/cache/storage adapter | `packages/*`；业务代码禁止直接 import adapter 实现。 |

## Hono API 规则

- 使用 Hono 原生组合方式：子模块 `const featureApi = new Hono<AppEnv>()`，默认导出；父模块只用 `app.route('/feature', featureApi)` 组合。
- 不写 `registerXXXRoutes(app)` 这种把子路由注入父 app 的函数。
- `apps/server/src/api/index.ts` 只组合 `/auth`、`/install`、`/admin`、`/user`、`/health`、`/openapi.json`。
- `apps/server/src/api/admin/index.ts` 只组合 `/system/*`、`/web/*` 路由组（用户管理挂在 `/system/user`）。
- `apps/server/src/api/user/index.ts` 只组合 user 下级路由组，例如 `/profile`。
- `apps/server/src/api` 根层只保留组合入口、schema、typed client、OpenAPI 文档配置；共享 helper 放 `api/shared`。业务能力默认按 feature 目录组织；功能很小且职责单一时可以先放单文件，复杂后必须拆目录。
- API handler 只做请求解析、Zod 校验、调用 service、返回 response。SQL、权限规则、cache 失效、实体映射放 `apps/server/src/service`。
- 独立 API 必须有 Zod validation 和 OpenAPI 元数据。小的 route-local schema 可放 feature 内；跨端 DTO 放所属 feature 的 schema 文件（如 `api/auth/schema.ts`、`api/shared/layout-schema.ts`），由 `api/schema.ts` barrel 聚合。`api/schema.ts`、`api/menu.ts` 是纯聚合入口，禁止在其中定义 schema 或引入 zod。
- 前端只能通过 console 的 typed client（`apps/console/src/api/client.ts`，基于 `hc<AppType>`）调 API，不能直接依赖 DB 字段或 service 内部结构。

## Server Dev 规则

- 本地开发 server 使用 `apps/server/vite.config.ts` + `@hono/vite-dev-server`，入口是 `apps/server/src/entry/dev.ts`。
- `apps/server/src/entry/dev.ts` 只负责配置 runtime context middleware 并默认导出 Hono app。
- `apps/server/src/entry/bun.ts` 是 Bun build/start 入口，不再作为热更新开发入口。
- `apps/server/src/entry/worker.ts` 是 Cloudflare Workers 入口。
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
- 通用 CRUD 页面由 `apps/console/src/components/ResourcePage.vue` 承载；`action.danger` 动作一律确认弹窗；行级自定义动作走 `runResourceItemAction` 通用分发，不在页面里手写分支。

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

- 优先使用 package barrel 或稳定子路径：`@hono-admin/runtime`、`@hono-admin/db`、`@hono-admin/cache`、`@hono-admin/file-storage`、`@hono-admin/server/api/schema`、`@hono-admin/server/api/menu`。
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
- 新 Admin/User 页面：通用 CRUD 页零前端文件，只在 menu consts 加菜单项（不写 `component`）；定制页在 `apps/console/src/views` 加 view 并在菜单项写 `component`，通过 `api/client.ts` 的 typed client 调用 API，用 console 内部 components 组合 UI。
- 新业务策略：新增策略模块并通过 map/factory 注册，不在核心流程散落条件判断。
- 新字段：schema、migration、validation、response shape、UI、测试一起更新。

## 验证要求

- 常规代码改动：运行 `bun run typecheck`、`bun run lint`、`bun test`、`bun run build`。
- Runtime 相关改动：额外运行 `bun run compile:bun` 或 `bun run build:workers`，并请求至少一个实际路径。
- 结构相关改动：运行 `bun run audit:structure`（`bun run check` 已包含它，位置违规会硬失败）。
- UI 相关改动：用浏览器验证关键页面，至少覆盖当前用户指出的问题路径；必要时做桌面/移动宽度截图。
- Public 仅占位阶段：确认 `apps/public` 的占位 HTML 可被构建拷贝到 server 静态目录，不新增业务 demo。

## 最终回复要求

实现任务后的最终回复必须包含：

- Code changes：改了什么、在哪些文件。
- Structure notes：这些改动如何符合当前架构。
- Extension method：下一个类型、策略、字段、adapter 或页面怎么加。
- Verification：实际运行的命令、请求过的路径、`audit:structure` 结果、剩余风险。

不要在未验证时声称通过。遇到无法运行的检查，要明确说明原因。

## Agent skills

### Issue tracker

Issues live in GitHub Issues (github.com/fc221/HonoAdmin); external PRs are NOT a triage surface. Uses the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

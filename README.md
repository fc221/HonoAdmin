# HonoAdmin

中文 | [English](./README.en-US.md)

HonoAdmin 是一个前后端分离的中后台基础项目。Server 使用 Hono API、原生 SQL、在线迁移和运行时 adapter；Console 使用 Vue 3、Naive UI、Tailwind CSS 承载 `/admin/*` 和 `/user/*`；Public 是纯 HTML 占位目录，预留 SSR Vue / 手写 HTML 扩展点。

业务代码通过 Hono Context 使用 `c.runtime`、`c.db`、`c.cache`、`c.config` 和 `c.now()`，本地 Bun、Cloudflare Workers/D1、SQLite、MySQL、PostgreSQL 等运行时差异都收在 adapter 层。

## 技术栈

- Monorepo：Bun Workspaces。
- Server：Hono + TypeScript + Zod + OpenAPI metadata。
- Console：Vue 3 + Vite + Vue Router + Pinia + Naive UI + Tailwind CSS。
- Public：纯 HTML 占位，预留 SSR Vue / 手写 HTML 扩展点。
- Database：native SQL + SQLite/D1、MySQL、PostgreSQL adapter/migrations。
- Runtime：Bun 本地/生产入口，Cloudflare Workers build。

## 目录

```txt
apps/server   Hono API、service、migrations、Bun/Workers 入口、backend utils
apps/console  Vue SPA，包含 admin/user 页面、路由、store、components
apps/public   纯 HTML 占位目录，预留 SSR Vue / 手写 HTML
packages/db   DBAdapter 与 SQLite/D1/MySQL/PostgreSQL 实现
packages/cache  CacheAdapter 与 memory/KV/noop 实现
packages/file-storage  文件存储 contract 与 local/S3 实现
packages/runtime  runtime factory、bootstrap、安全配置、context types
packages/domain  可复用纯领域逻辑
docs          架构、CRUD、安全、部署和性能边界文档
```

## 启动

首次安装：

```bash
bun install
```

开发需要同时启动 server 和 console，建议两个终端分别运行：

```bash
bun run dev:server
bun run dev:console
```

默认地址：

- Server API：`http://127.0.0.1:3000`
- Console：`http://127.0.0.1:5173`
- Install：`http://127.0.0.1:5173/install`

如果 `5173` 被占用，可以进入 `apps/console` 临时指定端口：

```bash
cd apps/console
bunx vite --host 127.0.0.1 --port 5175
```

## 安装流程

1. 打开 `/install`。
2. 生成或填写 `JWT_SECRET`、`SESSION_SECRET`、数据库 URL、缓存命名空间、时区。
3. 执行迁移。
4. 创建第一个 root 管理员。
5. 进入 `/admin/login` 登录后台，或 `/user/login` 登录用户中心。

## 当前鉴权

Console 当前使用浏览器 session 方案：

- `/api/auth/login` 校验账号密码后写入 `hono_admin_session` httpOnly cookie。
- `/api/auth/session` 读取当前登录用户。
- `/api/auth/logout` 清除 session cookie。
- `/api/admin/*` 和 `/api/user/*` 目前通过 `requireApiSession` 读取 session cookie，并在 admin 路径上继续检查菜单/操作权限。
- Console API client 使用 `credentials: 'include'`，所以同源或 Vite proxy 下自动携带 session cookie。

API token 方案定位为外部客户端/开放 API：

- `apps/server/src/service/user/api-token.ts` 已提供 Bearer JWT 的签发、验证、过期和 cache 撤销能力。
- 当前 console 不使用 API token；浏览器后台仍走 session cookie。
- 后续接外部客户端时，在 `apps/server/src/api/user` 下新增 token 路由，并让对应 API middleware 读取 `Authorization: Bearer <token>`。

## 常用检查

```bash
bun run typecheck
bun run lint
bun test
bun run build
bun run build:bun
bun run build:workers
bun run audit:structure
```

Cloudflare Workers 部署见 [部署文档](./docs/CLOUDFLARE_WORKERS.md)，安全默认值见 [安全文档](./docs/SECURITY.md)。

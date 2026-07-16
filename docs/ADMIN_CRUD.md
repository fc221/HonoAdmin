# Admin CRUD Guide

Admin CRUD 是 API-first、Vue 渲染的。不要新增服务端渲染的 console 路由文件。

## Required Shape

新增一个 admin CRUD 资源恰好触碰 4 个显式落点（外加迁移与测试）：

```text
① apps/server/src/service/admin/<group>/<name>/
     index.ts                  # 公开服务面与编排
     dto.ts / entity.ts / enum.ts / constants.ts   # 按需拆分
② apps/server/src/api/admin/<group>/<name>.ts      # 平铺资源路由文件（resource 工厂）
③ apps/server/src/api/admin/<group>/index.ts       # barrel 加一行导出
   apps/server/src/api/admin/index.ts              # 加一行 .route()
④ apps/server/src/service/admin/system/menu/consts.ts   # 加一个菜单项
```

- `<group>` 是 `system` 或 `web`；路由挂载在 `/api/admin/<group>/<name>`（用户管理即 `/api/admin/system/user`）。
- api 层资源规则：默认平铺单文件 `<name>.ts`；仅当资源拥有专属 schema 时才拆成 `<name>/{index.ts,schema.ts}`（现状：`config/`、`update/` 有 schema 目录，role/user/cron/file/operate-log/feedback/notification/page 均平铺）。
- 通用 CRUD 页面零前端文件：菜单项不写 `component`，由 `apps/console/src/components/ResourcePage.vue` 渲染；只有定制页面才在 `apps/console/src/views/<component>.vue` 加 view 并在菜单项写 `component`。

## Rules

- 菜单叶子的 `routePath` 是单一事实来源，同时驱动 console 路由、侧边栏、resource key、前端 API URL（`/api` + routePath）和 admin 权限目标。
- 不要手改 `api/shared/api-session.ts` 的权限映射或 console `api/client.ts` 的 resourcePaths，它们由 menu consts 的 `flattenMenuItems` 推导。
- route handler 保持薄：解析请求、Zod 校验、调 service、返回 typed response。SQL、权限规则、cache 失效、实体映射放 `apps/server/src/service`。
- 跨端 DTO 放所属 feature 的 schema 文件，由 `api/schema.ts` barrel 聚合；不要在 `api/schema.ts` 里定义 schema。
- `action.danger` 动作一律确认弹窗；行级自定义动作走 `runResourceItemAction` 通用分发，不在页面里手写分支。
- 漏掉任何落点都是响亮失败（typecheck 报错 / 请求 404 / 菜单缺失），不会静默降级。
- 为 schema 校验、service SQL 行为、权限、列表分页和 mutation 增补测试。

## Add The Next CRUD

1. 在 `apps/server/src/service/admin/<group>/<name>/` 新建 service 模块（index 为公开面，dto/entity/enum 按需拆分）。
2. 在 `apps/server/src/api/admin/<group>/<name>.ts` 用 resource 工厂注册路由；有专属 schema 才拆 `<name>/{index,schema}.ts`。
3. `api/admin/<group>/index.ts` 加一行导出；`api/admin/index.ts` 加一行 `.route()`。
4. 在 menu consts 加菜单项：通用 CRUD 页不写 `component`；定制页写 `component` 并新建 `views/<component>.vue`。
5. 需要新表/新字段时，在 `migrations/(sqlite|mysql|pg)/` 加同序号迁移并登记各自 registry。
6. 增补测试；运行 `bun run check`（含 `audit:structure` 位置校验），UI 相关改动用浏览器验证页面。

---
name: add-resource
description: 新增 HonoAdmin 后台 CRUD 资源/管理页时使用，按 docs/ADMIN_CRUD.md 的 checklist 执行
---

按 `docs/ADMIN_CRUD.md` 的 checklist 执行，恰好 4 个落点：

1. service 模块 `apps/server/src/service/admin/<group>/<name>/`
2. api 资源文件 `apps/server/src/api/admin/<group>/<name>.ts`（仅有专属 schema 时才拆 `<name>/{index,schema}.ts`）
3. `api/admin/<group>/index.ts` 加一行导出 + `api/admin/index.ts` 加一行 `.route()`
4. menu consts 加一个菜单项（通用 CRUD 页不写 `component`，零前端文件）

另加三方言迁移（同序号 + registry）与测试。权限映射/前端 URL 由 menu consts 推导，不要手写；目录落点规则见 AGENTS.md 的目录地图与落点决策表。

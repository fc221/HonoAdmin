// 纯聚合 barrel:console 通过 `@hono-admin/server/api/schema` 拿全部跨端 DTO。
// 禁止在这里定义 schema 或引入 zod —— 定义放所属 feature 的 schema 文件(audit:structure 会拦)。
export type { MenuItem } from '../service/admin/system/menu/consts'

export * from './admin/system/config/schema'
export * from './admin/system/update/schema'
export * from './auth/schema'
export * from './install/schema'
export * from './shared/dashboard-schema'
export * from './shared/layout-schema'
export * from './shared/resource-schema'
export * from './user/profile/schema'

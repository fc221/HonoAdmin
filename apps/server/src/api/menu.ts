// 纯 menu 常量入口,独立于 api/schema.ts(后者 re-export 了带 zod 运行时的 schema 模块)。
// console 的 router 只需要菜单数据,从这里导入可以避免把 zod 整包(数百 kB)拉进前端 bundle。
// 见 tests/console-build-chunks.test.ts 的 chunk 体积守护。
export { adminMenus, userMenus } from '../service/admin/system/menu/consts'
export type { MenuBreadcrumbItem, MenuItem } from '../service/admin/system/menu/consts'

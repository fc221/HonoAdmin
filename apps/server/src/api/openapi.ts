import type { GenerateSpecOptions } from 'hono-openapi'

/**
 * OpenAPI 文档元信息。具体 paths 不再手写,由 openAPIRouteHandler 遍历
 * 已组合的路由 + 各路由就近声明的 describeRoute/validator 自动生成。
 */
export const openApiDocumentation: GenerateSpecOptions['documentation'] = {
  openapi: '3.1.0',
  info: {
    title: 'HonoAdmin API',
    version: '2.0.0',
  },
  tags: [
    { name: 'system', description: '系统/健康检查' },
    { name: 'auth', description: '认证与会话' },
    { name: 'install', description: '安装引导' },
    { name: 'layout', description: '布局' },
    { name: 'dashboard', description: '仪表盘' },
    { name: 'admin', description: '后台资源' },
    { name: 'profile', description: '用户中心' },
  ],
}

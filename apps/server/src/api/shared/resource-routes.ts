import type { AppEnv } from '@hono-admin/runtime'
import type { Hono } from 'hono'
import type { ResourceDefinition } from './resource'
import { describeRoute, jsonResponse, validate } from './openapi'
import {
  createResource,
  deleteResource,
  getResourceDetail,
  listResource,
  updateResource,
} from './resource'
import {
  resourceBodySchema,
  resourceDetailSchema,
  resourceIdParamSchema,
  resourceListSchema,
  resourceMutationSchema,
  resourceQuerySchema,
} from './resource-schema'

interface ResourceRouteOptions {
  tag: string
  /** 列表标题,用于 OpenAPI summary,默认取 definition.title。 */
  title?: string
}

/**
 * 按 ResourceDefinition 的能力(get/create/update/delete)注册标准 CRUD 路由,
 * 每条路由就近声明 describeRoute(响应 schema)+ validator(param/query/json)。
 * 自定义路由(如 /panel、/upload、/clear、/password)仍由各 feature 显式声明。
 */
export function registerResourceRoutes(
  app: Hono<AppEnv>,
  definition: ResourceDefinition,
  options: ResourceRouteOptions,
): void {
  const tags = [options.tag]
  const title = options.title ?? definition.title

  app.get(
    '/',
    describeRoute({
      tags,
      summary: `${title} - 列表`,
      responses: { 200: jsonResponse(resourceListSchema, '资源列表') },
    }),
    validate('query', resourceQuerySchema),
    async (c) => c.json(await listResource(definition, c)),
  )

  if (definition.get) {
    app.get(
      '/:id',
      describeRoute({
        tags,
        summary: `${title} - 详情`,
        responses: { 200: jsonResponse(resourceDetailSchema, '资源详情') },
      }),
      validate('param', resourceIdParamSchema),
      async (c) => c.json(await getResourceDetail(definition, c, c.req.valid('param').id)),
    )
  }

  if (definition.create) {
    app.post(
      '/',
      describeRoute({
        tags,
        summary: `${title} - 新增`,
        responses: { 200: jsonResponse(resourceMutationSchema, '创建成功') },
      }),
      validate('json', resourceBodySchema),
      async (c) => c.json(await createResource(definition, c, c.req.valid('json'))),
    )
  }

  if (definition.update) {
    app.put(
      '/:id',
      describeRoute({
        tags,
        summary: `${title} - 更新`,
        responses: { 200: jsonResponse(resourceMutationSchema, '更新成功') },
      }),
      validate('param', resourceIdParamSchema),
      validate('json', resourceBodySchema),
      async (c) => c.json(await updateResource(definition, c, c.req.valid('param').id, c.req.valid('json'))),
    )
  }

  if (definition.delete) {
    app.delete(
      '/:id',
      describeRoute({
        tags,
        summary: `${title} - 删除`,
        responses: { 200: jsonResponse(resourceMutationSchema, '删除成功') },
      }),
      validate('param', resourceIdParamSchema),
      async (c) => c.json(await deleteResource(definition, c, c.req.valid('param').id)),
    )
  }
}

import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceDefinition } from './resource'
import { Hono } from 'hono'
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
 * 构建一个仅包含标准 CRUD 路由的 Hono sub-app(链式,带完整类型)。
 * 总是注册 5 条路由;definition 未提供的能力,运行时返回 404。
 * 这样保证 Hono RPC 的 AppType 形态稳定,client 端 hc<AppType> 一致可用。
 */
export function buildResourceApp(definition: ResourceDefinition, options: ResourceRouteOptions) {
  const tags = [options.tag]
  const title = options.title ?? definition.title

  return new Hono<AppEnv>()
    .get(
      '/',
      describeRoute({
        tags,
        summary: `${title} - 列表`,
        responses: { 200: jsonResponse(resourceListSchema, '资源列表') },
      }),
      validate('query', resourceQuerySchema),
      async (c) => c.json(await listResource(definition, c)),
    )
    .get(
      '/:id',
      describeRoute({
        tags,
        summary: `${title} - 详情`,
        responses: { 200: jsonResponse(resourceDetailSchema, '资源详情') },
      }),
      validate('param', resourceIdParamSchema),
      async (c) => {
        if (!definition.get) {
          return c.json({ message: '该资源不支持详情查询。' }, 404)
        }
        return c.json(await getResourceDetail(definition, c, c.req.valid('param').id))
      },
    )
    .post(
      '/',
      describeRoute({
        tags,
        summary: `${title} - 新增`,
        responses: { 200: jsonResponse(resourceMutationSchema, '创建成功') },
      }),
      validate('json', resourceBodySchema),
      async (c) => {
        if (!definition.create) {
          return c.json({ message: '该资源不支持新增。' }, 404)
        }
        return c.json(await createResource(definition, c, c.req.valid('json')))
      },
    )
    .put(
      '/:id',
      describeRoute({
        tags,
        summary: `${title} - 更新`,
        responses: { 200: jsonResponse(resourceMutationSchema, '更新成功') },
      }),
      validate('param', resourceIdParamSchema),
      validate('json', resourceBodySchema),
      async (c) => {
        if (!definition.update) {
          return c.json({ message: '该资源不支持更新。' }, 404)
        }
        return c.json(await updateResource(definition, c, c.req.valid('param').id, c.req.valid('json')))
      },
    )
    .delete(
      '/:id',
      describeRoute({
        tags,
        summary: `${title} - 删除`,
        responses: { 200: jsonResponse(resourceMutationSchema, '删除成功') },
      }),
      validate('param', resourceIdParamSchema),
      async (c) => {
        if (!definition.delete) {
          return c.json({ message: '该资源不支持删除。' }, 404)
        }
        return c.json(await deleteResource(definition, c, c.req.valid('param').id))
      },
    )
}

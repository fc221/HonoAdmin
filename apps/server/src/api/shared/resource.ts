import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import type { PaginatedResult } from '../../service/common/pagination'
import type {
  ResourceAction,
  ResourceDetail,
  ResourceField,
  ResourceList,
  ResourceMutation,
} from '../schema'
import { resourceDetailSchema, resourceListSchema, resourceMutationSchema } from '../schema'

export type ResourceDefinition = {
  actions?: ResourceAction[]
  columns: Array<[string, string]>
  create?: (c: Context<AppEnv>, input: Record<string, unknown>) => Promise<Record<string, unknown>>
  createFields?: FieldSource
  delete?: (c: Context<AppEnv>, id: number) => Promise<void>
  editFields?: FieldSource
  get?: (c: Context<AppEnv>, id: number) => Promise<Record<string, unknown>>
  list: (c: Context<AppEnv>) => Promise<PaginatedResult<Record<string, unknown>> | Record<string, unknown>[]>
  rowActions?: ResourceAction[]
  title: string
  update?: (c: Context<AppEnv>, id: number, input: Record<string, unknown>) => Promise<Record<string, unknown>>
}

export type FieldSource = ResourceField[] | ((c: Context<AppEnv>) => ResourceField[] | Promise<ResourceField[]>)

export const createAction: ResourceAction = { key: 'create', label: '新增' }
export const editAction: ResourceAction = { key: 'edit', label: '编辑' }
export const deleteAction: ResourceAction = { danger: true, key: 'delete', label: '删除' }
export const uploadAction: ResourceAction = { key: 'upload', label: '上传文件' }

export async function listResource(definition: ResourceDefinition, c: Context<AppEnv>): Promise<ResourceList> {
  return toResourceList(definition, await definition.list(c), c)
}

export async function getResourceDetail(definition: ResourceDefinition, c: Context<AppEnv>, id: number): Promise<ResourceDetail> {
  if (!definition.get) {
    throw new Error('资源不支持编辑。')
  }

  return resourceDetailSchema.parse({
    data: await definition.get(c, id),
    fields: await resolveFields(definition.editFields, c),
    title: definition.title,
  })
}

export async function createResource(definition: ResourceDefinition, c: Context<AppEnv>, input: Record<string, unknown>): Promise<ResourceMutation> {
  if (!definition.create) {
    throw new Error('资源不支持新增。')
  }

  return mutationResult('创建成功。', await definition.create(c, input))
}

export async function updateResource(definition: ResourceDefinition, c: Context<AppEnv>, id: number, input: Record<string, unknown>): Promise<ResourceMutation> {
  if (!definition.update) {
    throw new Error('资源不支持编辑。')
  }

  return mutationResult('保存成功。', await definition.update(c, id, input))
}

export async function deleteResource(definition: ResourceDefinition, c: Context<AppEnv>, id: number): Promise<ResourceMutation> {
  if (!definition.delete) {
    throw new Error('资源不支持删除。')
  }

  await definition.delete(c, id)
  return mutationResult('删除成功。', null)
}

export function mutationResult(message: string, data: Record<string, unknown> | null): ResourceMutation {
  return resourceMutationSchema.parse({ data, message, ok: true })
}

export function listInput(c: Context<AppEnv>) {
  return {
    keyword: c.req.query('keyword') ?? '',
    page: Number(c.req.query('page') ?? 1),
    pageSize: Number(c.req.query('pageSize') ?? 10),
    uploadType: c.req.query('uploadType') ?? '',
  }
}

export function resourceId(c: Context<AppEnv>): number {
  const id = Number(c.req.param('id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('资源 ID 不正确。')
  }

  return id
}

async function toResourceList(
  definition: ResourceDefinition,
  input: PaginatedResult<Record<string, unknown>> | Record<string, unknown>[],
  c: Context<AppEnv>,
): Promise<ResourceList> {
  const paginated = Array.isArray(input)
    ? { items: input, page: 1, pageSize: input.length || 10, total: input.length, totalPages: 1 }
    : input

  return resourceListSchema.parse({
    actions: definition.actions ?? [],
    columns: definition.columns.map(([key, title]) => ({ key, title })),
    createFields: await resolveFields(definition.createFields, c),
    editFields: await resolveFields(definition.editFields, c),
    pagination: {
      page: paginated.page,
      pageSize: paginated.pageSize,
      total: paginated.total,
      totalPages: paginated.totalPages,
    },
    rowActions: definition.rowActions ?? [],
    rows: paginated.items.map((item) => formatRow(item, definition.columns.map(([key]) => key))),
    title: definition.title,
  })
}

async function resolveFields(
  fields: FieldSource | undefined,
  c: Context<AppEnv>,
): Promise<ResourceField[]> {
  return typeof fields === 'function' ? fields(c) : fields ?? []
}

function formatRow(row: Record<string, unknown>, keys: string[]) {
  const result: Record<string, unknown> = {}

  for (const key of keys) {
    const value = row[key]
    result[key] = typeof value === 'number' && key.toLowerCase().endsWith('at')
      ? new Date(value).toLocaleString('zh-CN')
      : value
  }

  return result
}
